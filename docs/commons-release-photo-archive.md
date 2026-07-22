---
title: Wikimedia Commons release-photo archive
visibility: public
classification: archive-internal
period: 1913-present
sources:
  - https://commons.wikimedia.org/w/api.php
  - https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia
---

# Wikimedia Commons release-photo archive

The Chevrolet Color Archive does not use Wikimedia image hotlinks. The crawler
copies each selected original into ignored local staging, computes its SHA-256,
and assigns a deterministic asset name under the GitHub Release tag
`photo-archive-v1`. After model-association review and release publication, the
site must use only the pinned `site_asset_url` recorded in the manifest. Web
delivery uses the content-addressed WebP preview; the exact Commons original
remains a separate asset in the same release.

The Commons page and original-file URLs remain in the manifest for source
verification, attribution, and archival acquisition. They are not site-serving
URLs.

## Files

- Crawler: `scripts/crawl-wikimedia-release-photos.mjs`
- Exact-title gap supplement runner: `scripts/apply-commons-gap-supplement.mjs`
- Gap review-sheet builder: `scripts/build-commons-gap-review-sheets.mjs`
- Review manifest: `data/photos/commons-release-manifest.json`
- Association audit: `data/photos/commons-candidate-audit.json`
- Exact-identity gap audit: `data/photos/commons-gap-supplement.json`
- Ignored binary staging: `tmp/commons-release-assets/`
- Ignored web-preview staging: `tmp/commons-release-previews/`
- Ignored complete supplement API records: `tmp/commons-gap-audit/selected-raw/`
- Pinned release: `ipadmom/chevrolet-color-archive`, tag `photo-archive-v1`

The binary staging directory is already covered by the repository's `/tmp/`
ignore rule. Do not add the original image bytes to git.

## Discovery and selection contract

The crawler queries the official MediaWiki API using `imageinfo` and
`extmetadata`. It keeps the source page, original URL, Commons page ID and SHA-1,
author, raw author metadata, credit, license and license URL, usage terms,
description, query, original filename, MIME type, dimensions, byte count, and
source timestamp.

Automatic staging is limited to raster originals that Commons identifies as:

- public domain or CC0;
- CC BY 1.0, 2.0, 2.5, 3.0, or 4.0; or
- CC BY-SA 1.0, 2.0, 2.5, 3.0, or 4.0.

Noncommercial, no-derivatives, fair-use, all-rights-reserved, unknown, and
GFDL-only records do not pass the gate. A candidate also needs an explicit
Chevrolet/model match, author metadata, a supported photo MIME type, and at
least 640 by 400 pixels. Obvious brochures, logos, toys, detail shots, and
similar non-vehicle images are rejected.

The model year is never inferred from a query or the catalog range. The crawler
records an `explicit_year` only when the Commons title, description, or category
metadata places a four-digit year next to Chevrolet and the model name. It also
recognizes an explicit apostrophe year such as `'76 Chevrolet Camaro` when the
resolved year falls within that model's catalog range.

Every retained record starts as `unreviewed_candidate`. The prepublication
audit checks the vehicle and catalog association. License compatibility and a
correct vehicle association still do not prove the pictured vehicle's factory
paint, trim, market, or lack of later repainting. Color classification always
requires separate review.

## Coverage targets

The default pass searches all 149 U.S. Chevrolet nameplates in the catalog and
selects up to two strong representative images per model. It also searches for
one exact-year candidate for each year supported by a complete or historically
qualified color audit:

- Camaro, 1967 through 1992;
- Chevelle, 1964 through 1967;
- Corvette, 1954 through 1962;
- Suburban, 1969, 1972 through 2005, and 2007; and
- Tahoe, 1995 through 2007.

That is 88 exact model-year targets. The initial crawl covered the earlier
43-slot queue. The manifest records that historical result separately from the
expanded target queue, which still requires a bounded targeted crawl and visual
review.

An empty result is valid. Sparse early and commercial nameplates are not filled
with a weak or ambiguous match.

The five preexisting static Camaro candidates are queried by exact Commons page
title and must all pass the same metadata and download gate. This includes the
1969 SS396 image that the prototype previously hotlinked. The four transformed
files already under `public/vehicle-photos/assets/` are not treated as Commons
originals; the release pipeline reacquires and hashes the original Commons
bytes.

## Run

From the repository root:

```powershell
node scripts\crawl-wikimedia-release-photos.mjs `
  --concurrency 4 `
  --download-concurrency 1 `
  --delay-ms 150
```

The crawler is restartable. Existing deterministic staging files are reused
only when their byte length matches current Commons metadata; the SHA-256 is
recomputed before the manifest is written. HTTP 429 responses trigger a long
cooldown and retry. Use `--refresh` to force a new original download.

The script does not create a release, upload an asset, edit the application, or
publish a candidate. A successful run prints and records the exact staged file
count and total bytes.

For the reviewed exact-title supplement, run without `--apply` first. That mode
stores the complete MediaWiki response, stages and rehashes each original, and
writes `tmp/commons-gap-audit/stage-audit.json` without changing the release
manifest. Build the contact sheets, inspect every complete image, and resolve
every `review` decision in the supplement before applying it:

```powershell
node scripts\apply-commons-gap-supplement.mjs
node scripts\build-commons-gap-review-sheets.mjs
node scripts\apply-commons-gap-supplement.mjs --apply
node scripts\build-release-photo-previews.mjs --concurrency 4
```

The apply command refuses unresolved reviews. It merges by Commons SHA-1, so a
photo already archived for another exact identity is shared rather than copied.
It does not create or modify a GitHub Release.

## Review and publication handoff

1. Review each candidate's Commons source page, rights fields, and attribution.
2. Verify the depicted Chevrolet model and any claimed exact model year.
3. Verify any color assignment separately. The photo manifest does not make a
   factory-paint claim.
4. Create or update the immutable `photo-archive-v1` release in the
   `ipadmom/chevrolet-color-archive` repository.
5. Upload every staged file using its exact `release_asset_name`.
6. Verify the uploaded byte count and SHA-256 against the manifest.
7. Change `github_release.published` only after every original and preview asset
   resolves.
8. Integrate the site using `site_asset_url` only. Never substitute
   `source_original_url`, a Commons redirect, or a thumbnail URL.

If any release file changes, use a new versioned tag and regenerate the
manifest. Do not silently replace a pinned asset.

## First full pass and prepublication audit

The initial first-pass manifest was generated on July 20, 2026:

- 149 catalog models searched through 232 successful MediaWiki API requests,
  with no API errors in the completed run;
- 126 models with at least one strong representative candidate;
- 286 unique Commons originals selected and staged; and
- all 5 legacy static Camaro candidates migrated from Commons originals.

The full metadata and local-image association audit then removed nine
incorrect or unusable assets and corrected three associations. The rejected
set included reused-name collisions, out-of-range model years, two detail-only
images, and one chassis-only image. The Vega Panel Express photo was moved to
its separate catalog model; incorrect Concours Estate and Kingswood Estate
cross-associations were removed. The complete decisions and evidence are in
`data/photos/commons-candidate-audit.json`.

The post-audit initial set was:

- 123 models with at least one audited representative candidate;
- 277 exact Commons originals totaling 833,996,674 bytes;
- 270 JPEG files and 7 PNG files;
- 129 CC BY-SA, 63 CC BY, 74 public-domain, and 11 CC0 assets;
- 277 WebP site previews totaling 56,006,512 bytes, a 93.28 percent delivery
  reduction while keeping every original; and
- all 5 legacy static Camaro candidates migrated from Commons originals.

The exact-year searches filled 41 of 43 verified-year query slots. The migrated
1981 Camaro candidate separately supplies an explicit 1981 asset, so Corvette
1962 is the only verified target year with no selected exact-year image in this
pass. That is a discovery gap, not permission to infer a year from another
photo.

Twenty-six nameplates had no publishable representative after the initial audit:
Classic Six, Baby Grand, Amesbury Special, Series F, Series FA, Series FB,
Copper-Cooled, Mercury, Beauville, Malibu Limited, Malibu Classic (2008),
Chevrolet Truck (pre-C/K), Canopy Express, Corvan, Loadside, P-Series / Step-Van,
B-Series Bus Chassis, Chevy 90, Bison, Bruin, Tiltmaster / W-Series, T-Series
Medium Duty, S-10 EV, Traverse Limited, BrightDrop 400, and BrightDrop 600.

## Exact-identity gap supplement

The July 21, 2026 follow-up audited those 26 empty identities using exact Commons
file titles and exact model categories. All 26 staged candidates were visually
inspected before selection. The audit rejected metadata traps including a hood
emblem mislabeled as an Advance Design vehicle, a printed Copper-Cooled
illustration, a windowed passenger vehicle in the Corvan category, distant or
substantially customized Tiltmaster images, GMC siblings offered for Bison and
Bruin, and generic modern vehicles that did not prove the Limited or 400
identity. The full selection and rejection evidence is in
`data/photos/commons-gap-supplement.json`; the complete MediaWiki response is
preserved under `tmp/commons-gap-audit/selected-raw/`.

The supplement selected 26 exact-identity associations across 17 formerly empty
models. Twenty-five were new originals. One 1933 Standard Mercury photo was
already archived for Standard and was shared with Mercury by its Commons SHA-1.
The 25 new originals and 25 previews were uploaded to the existing pinned
`photo-archive-v1` Release on July 21 and 22, 2026. The added exact matches
include a 1915 Model H4 Baby Grand and two views of a 1915 H-3 Amesbury Special.

The current manifest therefore contains:

- 140 models with at least one audited representative;
- 302 exact Commons originals totaling 922,817,135 bytes;
- 295 JPEG files and 7 PNG files;
- 140 CC BY-SA, 74 CC BY, 74 public-domain, and 14 CC0 assets; and
- 302 WebP site previews totaling 60,294,094 bytes, a 93.47 percent delivery
  reduction while preserving every original.

Nine identities remain empty because no strong exact photograph survived the
same gate: Series F, Copper-Cooled, Malibu Limited, Malibu Classic (2008), Chevy
90, Bison, Bruin, Traverse Limited, and BrightDrop 400. These are documented
discovery gaps. Do not fill them with siblings,
generic generation photos, illustrations, detail images, or reused names.

Every selected local file was rehashed after staging. All 302 original byte
lengths and SHA-256 values match the final manifest. The preview build also
reverified every original before encoding. All original and preview asset names
and candidate IDs are unique, all five legacy references resolve, and no
`site_asset_url` points to Wikimedia.

An earlier throttled attempt, the nine first-audit exclusions, and four new
visual-review rejections leave 20 unreferenced originals in the ignored staging
directory. They remain for reproducibility and are not part of the manifest.
The live Release was then enumerated through the GitHub API. All 604 expected
photo assets were present with exact byte counts and matching SHA-256 digests;
the Release contains one additional attribution-ledger asset, for 605 assets
total. The application may therefore use the pinned URLs in this manifest.
