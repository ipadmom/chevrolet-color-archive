# Reviewed photo publication

The publication worker is the hard boundary between public uploads in Sites and
the GitHub-hosted archive. It does not infer permission from a filename,
selection, upload form, or automated license label. A human must explicitly
approve or reject every selected candidate against a complete metadata
snapshot.

The worker lives in `crawler/publish/`. It uses Node.js plus the pinned Sharp
decoder/encoder. Its tests use a loopback fixture and make no live request.

## Credentials and API protocol

The worker reads these values only from its process environment:

- `SITES_BASE_URL`, the HTTPS Sites deployment origin;
- `PUBLISH_QUEUE_TOKEN`, the private bearer token for queue reads, claims,
  downloads, and acknowledgments;
- `GH_TOKEN`, required only for `--push`.

Neither token is written, printed, included in an error, placed in a URL, or
passed as a command argument.

The Sites protocol is:

1. `GET /api/selections?status=queued&limit=100` returns bounded pages shaped as
   `{items,nextCursor}`. Every page requires
   `Authorization: Bearer $PUBLISH_QUEUE_TOKEN`.
2. `PATCH /api/selections` with `{action:"claim",leaseSeconds:1800}` leases one
   atomic selection and returns `{leaseToken,selection}`. The hydrated selection
   contains candidate provenance (`originalUrl`), the stored `sha256`, and a
   private `downloadUrl`.
3. Each approved candidate is downloaded from its returned `downloadUrl` using
   the same bearer credential.
4. After GitHub confirms the push, the worker sends
   `{action:"ack",selectionId,leaseToken,outcome:"processed",publishedAssets}`
   with an exact candidate-to-content-addressed GitHub path and digest mapping.
5. A failure before confirmed GitHub publication is acknowledged as `retry`
   with a server-approved `errorCode`. A selection containing a rights
   rejection is acknowledged as `failed` with `rights_review_rejected` and the
   exact `rejectedCandidateIds`. Free-form errors are never stored.

Lease tokens remain in memory only. Queue and image URLs must stay on the exact
Sites origin, use HTTPS outside loopback tests, and contain no URL credentials.

## Publication guarantees

The worker:

- paginates through the complete authenticated queue when preparing a full
  review;
- creates a review document without replacing an existing review file;
- requires one explicit `approve` or `reject` decision for every candidate;
- rejects publication if saved candidate metadata or immutable selection
  metadata differs from the claimed record;
- binds approval to `originalUrl` and the stored SHA-256, then rejects a
  download whose bytes do not match that digest;
- verifies byte count, HTTP type, metadata type, image magic bytes, dimensions,
  a 40-million-pixel per-frame limit, at most 500 frames, and an 80-million
  aggregate decoded-pixel limit;
- decodes and re-encodes each image through pinned Sharp/libvips settings, then
  strips unapproved chunks again. This removes EXIF, XMP, comments, ICC
  payloads, private extensions, and other nonpixel container metadata before
  publication. Animated WebP is rejected; other accepted animation is bounded;
- records source and published digests, final dimensions, removed metadata
  classes, and sanitizer version;
- names assets by full SHA-256 at
  `public/vehicle-photos/assets/<sha256>.<extension>`;
- merges the reviewed selection, candidate provenance, attribution, rights
  review, and audited transform record into
  `public/vehicle-photos/attribution.json`; operational queue errors are omitted;
- removes the private queue download URL and strips every query string and
  fragment from public source provenance. The saved review still binds the
  reviewer to the exact original URL;
- rejects known or token-shaped credential material before a review document or
  attribution manifest can be written;
- never replaces different bytes at an existing hash path;
- commits and pushes only when `--push` is present;
- acknowledges `processed` only after the push succeeds.

The server’s acknowledgment is atomic for the whole selection. It cannot mark
only some selected candidates as published. If any candidate is rejected during
rights review, the worker fails the entire selection without downloading or
publishing any of its candidates and marks only the named rejected candidates
as rejected. Approved candidates in that failed selection remain staged. A
consumed receipt cannot be reused. To publish an approved subset, upload each
approved file again. An exact-byte duplicate reuses the canonical staged object
and issues a fresh one-use receipt, then the browser can submit a new selection.

For a processed selection, the acknowledgment must map every candidate to its
exact sanitized digest and canonical GitHub asset path. D1 stores that mapping
in the same atomic transition. Anonymous photo lists and detail redirects use
the pinned, content-addressed `ipadmom` GitHub asset. The original R2 object
remains private and is available only to the authenticated publisher for audit
and recovery.

Upload receipts expire 24 hours after issue. The browser retains unconsumed
receipts only in same-tab `sessionStorage`, never the staged image bytes. It
removes a receipt after successful queue submission and discards expired
receipts. If a tab is closed, storage is cleared, or a receipt expires, upload
the same bytes again to obtain a fresh receipt.

Expired receipt rows are pruned in bounded batches only after the 24-hour TTL
plus a seven-day grace period. Receipt cleanup never deletes candidate metadata
or image bytes. A rights rejection keeps a D1 tombstone immediately; its
private R2 object is eligible for bounded purge only after a two-hour grace
period, so ambiguous acknowledgments and in-flight recovery do not race an
immediate delete.

## 1. Prepare the rights review

Set the deployment origin and queue credential without echoing the credential:

```powershell
$env:SITES_BASE_URL = "https://the-deployed-sites-origin.example"
$env:PUBLISH_QUEUE_TOKEN = (Get-Content -Raw $approvedQueueTokenPath).Trim()
node crawler/publish/cli.mjs `
  --prepare-review work/photo-rights-review.json
```

The command follows all queue pages and writes
`"completeQueueSnapshot": true`. Use `--selection-id 7` one or more times only
for a bounded inspection or local check. A filtered review is marked incomplete
and cannot be used with `--push`, because the claim endpoint leases the next
queue item rather than a requested ID.

The command refuses to overwrite an existing review file. The review file
preserves the exact queue and candidate metadata supplied by Sites.

For every item, inspect the source record, actual image, authorship, stated
license or permission, attribution requirements, and whether the license covers
republication. Then edit `review`:

```json
{
  "decision": "approve",
  "reviewedBy": "Reviewer name",
  "reviewedAt": "2026-07-20T19:00:00.000Z",
  "approvedCredit": "Exact unchanged candidate credit",
  "approvedLicense": "Exact unchanged candidate license",
  "approvedSha256": "Exact lowercase SHA-256 from the candidate snapshot",
  "reviewedOriginalUrl": "Exact source URL from the candidate snapshot, or null",
  "rightsBasis": "What was checked and why republication is permitted",
  "reason": "",
  "notes": "Optional full review notes"
}
```

For a rejection, set `decision` to `reject` and supply a concrete `reason`.
Do not delete rejected items. An empty or missing decision stops the run before
any claim or image download.

For community uploads, verify the uploader’s authority to grant the stated
permission. A vehicle appearing to match a factory color is not rights evidence
and is not proof that the paint is original.

## 2. Run a local publication check

Run without `--push` first:

```powershell
node crawler/publish/cli.mjs `
  --approvals work/photo-rights-review.json `
  --repo-root .
```

This authenticated read-only queue pass downloads approved bytes through a
streaming hard byte cap and builds the local asset store and attribution
manifest. It does not claim or acknowledge a queue item, and it does not invoke
Git. It applies the same atomic-selection rule as the push path: any rejection
stops the local check before download. Inspect every new asset and the complete
attribution manifest.

The binary store is globally deduplicated by SHA-256. A prior
`selectionId:candidateId` publication record must remain identical on rerun.
The default file limit is 25 MB. Oversized files are rejected in full, never
partially saved.

## 3. Claim, commit, push, and acknowledge

After inspection, set `GH_TOKEN` from the approved credential source without
echoing it:

```powershell
$env:GH_TOKEN = (Get-Content -Raw $approvedGitHubTokenPath).Trim()
node crawler/publish/cli.mjs `
  --approvals work/photo-rights-review.json `
  --repo-root . `
  --push
```

Before claiming anything, the worker verifies:

- `gh api --hostname github.com user` identifies the token owner as exactly
  `ipadmom`;
- the current branch is exactly `main`;
- every fetch and push URL for `origin` is exactly
  `https://github.com/ipadmom/chevrolet-color-archive.git`; SSH remotes, URL
  rewrites, HTTP authorization headers, and alternate `pushurl` destinations
  are rejected;
- the supplied repository root is Git’s actual top level;
- the worktree is clean before review publication begins;
- fetched `origin/main` is an ancestor of local `main`, rebasing a clean local
  branch before any claim when necessary;
- local `main` has no unpushed commits, except one exact publication-only retry
  commit whose paths stay under the canonical asset root.

For each reviewed selection, the worker claims a lease, rechecks the claimed
metadata, downloads with bearer authentication, writes or deduplicates the
assets, commits only the publication paths, and pushes. Only then does it
acknowledge `processed`.

Before claiming, it reconciles the review against authenticated `processed`,
`failed`, and `leased` queue pages. Already terminal selections are skipped,
which makes a complete multi-selection review reusable after a partial run. An
active lease on a reviewed selection stops the run before another claim.

One host-local filesystem publisher lock serializes manifest writes and queue
claims for the repository. A dead same-host owner is recovered by PID
verification; a fresh malformed or unowned lock fails closed. Git hooks are
disabled for publisher commands. Git child processes never inherit `GH_TOKEN`,
`PUBLISH_QUEUE_TOKEN`, trace settings, or credential, executable, proxy, TLS,
Node preload, or shell preload override variables. Executable paths are
resolved before credentialed work. A loopback credential broker supplies the
verified `ipadmom` token only when Git requests HTTPS credentials for the exact
repository path, without placing the token in a file, process argument, Git
configuration, or Git environment.

If a push fails, the worker acknowledges `retry`. If the commit succeeded
locally, a later run permits a push-only retry only for one exact
publication-only commit. If an earlier push reached GitHub but acknowledgment
did not, a later run first fetches `origin/main` and proves the reviewed
content-addressed files and manifest are already present, even when newer
commits have advanced the branch.

If GitHub publication succeeds but the processed acknowledgment fails, the
server lease remains authoritative. Reuse the original complete review after
the lease expires. The push is idempotent, and acknowledgment will be retried
without changing the reviewed manifest.

If a claimed selection is not in the completed review, the worker immediately
acknowledges `retry` and stops. It never applies approval from one queue item to
another.

Remove both tokens from the environment after the run:

```powershell
Remove-Item Env:PUBLISH_QUEUE_TOKEN
Remove-Item Env:GH_TOKEN
```

## Offline checks

```powershell
npm --prefix crawler/publish test
npm --prefix crawler/publish run check
node crawler/publish/cli.mjs --help
```

The tests cover authenticated pagination, claim ordering, bearer-protected
downloads, streamed size enforcement, processed and retry acknowledgments,
invalid-hydration lease recovery, atomic rights rejection, provenance and
SHA-256 drift, decode/re-encode metadata stripping, per-frame and aggregate
decompression limits, deduplication, overwrite refusal, exact GitHub
account/repository/branch guards, token-free Git environments, stale-lock
recovery, publisher locking, and credential-free URL policy. They use
directories under
`crawler/publish/test/.tmp/`, do not contact Sites or GitHub, do not read
credentials, and do not run Git.
