# Reviewed community photo publication

The publication worker is the hard boundary between private staged uploads in
Sites and the public GitHub archive. It never infers permission from a filename,
vehicle selection, upload form, or automated label. A human must approve or
reject every candidate against the complete saved review snapshot.

Reviewed community uploads are published to the versioned GitHub Release
`community-photo-archive-v1`. They are not committed to the repository and are
not served from `raw.githubusercontent.com`.

## Existing archive choices

The example-photo chooser also accepts one or more candidate IDs from the
pinned Commons archive Release, `photo-archive-v1`. The selection endpoint
resolves every ID against `data/photos/commons-release-manifest.json` and
requires an exact model, year, and color selection context. A caller cannot
substitute an arbitrary URL or reuse a candidate under a different record.

An archive-only choice is stored immediately as a processed curatorial
selection. A mixed archive-and-upload choice stores the same archive receipt on
the queued upload selection. The canonical receipt records the Release owner,
repository, tag, asset name, pinned GitHub URL, digest, byte count,
attribution, license, and Commons description-page URL. Its SHA-256 is stored
beside it in D1. It does not contain Wikimedia image URLs or image bytes, and it
does not create another Release asset. Repeating the exact choice returns the
existing selection record.

## Credentials and protocol

The worker reads credentials only from its process environment:

- `SITES_BASE_URL`, the HTTPS Sites deployment origin;
- `PUBLISH_QUEUE_TOKEN`, the private bearer token for queue reads, claims,
  downloads, and acknowledgments;
- `GH_TOKEN`, required only for GitHub Release publication.

Tokens are never written, printed, placed in a URL, included in publication
metadata, or passed as a process argument. GitHub publication first calls the
authenticated user endpoint and requires the login to be exactly `ipadmom`.

The Sites protocol is:

1. Read every page of the authenticated `queued` selection list.
2. Save a new schema-version-4 review document. Existing review files are never
   replaced.
3. Claim one reviewed selection with a bounded lease.
4. Reconcile the claimed metadata against the saved review, then download each
   approved private R2 object through its authenticated API URL.
5. Verify the source digest and image type, decode and re-encode the image, and
   strip private container metadata.
6. Upload the deterministic image and attribution receipt to the GitHub Release.
7. Acknowledge `processed` only after every Release asset is confirmed.

A failure before confirmed Release publication is acknowledged as `retry` with
an enumerated error code. A rights rejection fails the whole selection and names
the rejected candidates. Free-form operational errors are not stored.

## Release asset contract

Each sanitized image has a content-addressed asset name:

```text
<published-sha256>.<jpg|png|gif|webp>
```

Its pinned public URL is:

```text
https://github.com/ipadmom/chevrolet-color-archive/releases/download/community-photo-archive-v1/<asset-name>
```

Each candidate also receives a deterministic JSON attribution receipt:

```text
publication-<selection-id>-<candidate-id>-<published-sha256>.json
```

The receipt preserves the reviewed vehicle context, public source provenance,
credit, license, rights basis, source and published digests, sanitizer version,
removed metadata classes, final dimensions, byte count, release tag, asset
name, and pinned URL. Private queue download URLs are removed. Query strings and
fragments are removed from public source URLs so temporary signatures cannot be
archived accidentally. The original review document remains the exact reviewer
receipt, including the source value the reviewer saw.

The worker computes and records SHA-256 and byte length for both the image and
the attribution receipt. D1 accepts a processed acknowledgment only when every
candidate is mapped exactly once and all of these fields pass the fixed Release
contract:

- release tag;
- image asset name and pinned URL;
- image SHA-256 and sanitized byte count;
- attribution asset name and pinned URL;
- attribution SHA-256 and byte count.

The candidate rows and queue selection transition atomically. Public list and
detail routes require all Release fields and redirect only to the pinned
`ipadmom` Release URL. The retired `published_asset_path` column remains solely
for migration audit and is set to null for new publications.

## Privacy and retention

The sanitizer decodes and re-encodes each accepted image through pinned
Sharp/libvips settings, then strips unapproved chunks again. EXIF, XMP,
comments, ICC payloads, private extensions, and other nonpixel container
metadata are deleted before public upload. Animated WebP is rejected. Other
animation is bounded by frame and aggregate decoded-pixel limits.

The original upload remains in private R2 after approval for audit and recovery.
It is never exposed to an anonymous request. A rejected candidate receives an
immediate D1 tombstone; its private object becomes eligible for bounded deletion
after the existing two-hour recovery grace period. Upload receipt cleanup does
not delete candidate metadata or approved image bytes.

## Idempotency and collision handling

Asset names contain the full sanitized SHA-256. On retry, the publisher lists
the existing Release assets and reuses a name only after verifying its state,
byte count, pinned URL, and SHA-256. It uses GitHub's digest when present and
otherwise downloads the public asset through a bounded reader and hashes the
bytes locally.

A matching asset is reused. A matching name with different size, URL, or digest
fails closed. A concurrent upload collision is reconciled by listing the
Release again and applying the same verification. The queue is never marked
processed on an unverified collision.

## Review and publication commands

Prepare a complete review:

```powershell
$env:SITES_BASE_URL = "https://the-deployed-sites-origin.example"
$env:PUBLISH_QUEUE_TOKEN = (Get-Content -Raw $approvedQueueTokenPath).Trim()
node crawler/publish/cli.mjs `
  --prepare-review work/photo-rights-review.json
```

For each candidate, record `approve` or `reject`. Approval requires reviewer,
timestamp, exact credit, exact license, approved source digest, reviewed source
URL, and a written rights basis. Do not delete rejected review items.

Run the local check:

```powershell
node crawler/publish/cli.mjs `
  --approvals work/photo-rights-review.json `
  --repo-root .
```

The local check downloads and sanitizes the approved bytes, then prepares the
exact image and receipt assets in memory. It neither writes photo blobs into the
repository nor contacts GitHub.

Publish after inspection:

```powershell
$env:GH_TOKEN = (Get-Content -Raw $approvedGitHubTokenPath).Trim()
node crawler/publish/cli.mjs `
  --approvals work/photo-rights-review.json `
  --repo-root . `
  --publish-release
```

`--push` remains a compatibility alias, but it performs the same Release upload
and never creates a Git commit. Remove both tokens from the environment after
the run.

## Offline verification

```powershell
npm --prefix crawler/publish test
npm --prefix crawler/publish run check
npm run typecheck
npm run build
node --test tests/api-security.test.mjs tests/api-state.test.mjs
node --test tests/api-routes.integration.mjs
```

The publisher tests mock GitHub. They do not read credentials, create a Release,
or upload live user data. The API integration test uses isolated Miniflare D1
and R2 instances and proves that a staged upload remains private until the full
Release mapping is atomically acknowledged.
