---
title: Chevrolet source and candidate data contract
visibility: public
classification: archive-internal
sources: crawler/chevy_archive
---

# Crawler data contract

## Source manifest

The source manifest is UTF-8 JSONL. Blank lines and lines beginning with `#`
are ignored. A crawl cannot discover and fetch arbitrary links on its own. New
URLs must first be reviewed and added to a manifest.

Required fields:

| Field | Meaning |
|---|---|
| `source_id` | Stable, human-readable source key |
| `canonical_url` | Direct URL to the complete PDF |
| `title` | Source title |
| `publisher` | Publishing entity |
| `source_type` | Such as `vehicle_information_kit` or `dealer_order_guide` |
| `make` | Normally `Chevrolet` |
| `model` | Model described by the source |
| `officiality` | `official`, `licensed`, `secondary`, or `unknown` |

Optional fields used by the pipeline:

| Field | Meaning |
|---|---|
| `year_start` | First model year described |
| `year_end` | Last model year described |
| `expected_media_type` | Must currently be `application/pdf` |
| `discovered_from` | Index page or provenance URL used to find the direct PDF |

If `year_start` and `year_end` are identical, extracted candidates receive that
model year. A document spanning multiple years produces
`needs_year_assignment`. The pipeline does not guess a year.

The canonical JSON of each line is hashed. Updating a manifest record produces
a new fetch job, while retrying the same record remains idempotent.

One document may cover several models or year scopes. Represent each scope with
a distinct `source_id`; those records may share the same `canonical_url`.
Content hashing deduplicates the stored bytes while preserving each scope and
its evidence relationship.

## Immutable source object

An artifact is admitted only after the complete response has been consumed and
validated. The object key is the lowercase SHA-256 digest of the source bytes:

```text
objects/sha256/ab/cd/abcdef....pdf
```

The database preserves:

- requested and final URL;
- request and completion time;
- HTTP status;
- received and declared byte counts;
- safe response headers, including ETag and Last-Modified;
- outcome, including incomplete attempts;
- source-to-artifact history and the current link.

Sensitive response headers, cookies, and authorization data are not stored.

An incomplete response stays in `spool/` and never receives an artifact row.
The next request asks the origin to resume at the current byte offset only when
the first response supplied an ETag or Last-Modified validator. The request
uses `If-Range`. Without a validator, the next attempt restarts at byte zero. If
the origin ignores the range request and returns `200`, the spool is safely
rewritten from byte zero. A `206` response must start at the exact local offset
and retain the saved validator.

## Page text

Text is extracted one PDF page at a time. Each record includes:

- artifact SHA-256;
- one-based PDF page number;
- method, `native` or `ocr`;
- extraction engine, such as `pdftotext`, `pypdf`, or
  `pdftoppm+tesseract`;
- relative path of the complete UTF-8 page text;
- SHA-256 of the text;
- character count;
- status, `usable`, `weak`, `empty`, or `unreadable`.

Native extraction is preferred. Weak or empty pages enqueue OCR. Native text is
not deleted when OCR succeeds.

## Normalized color candidate

JSONL export records have this shape:

```json
{
  "candidate_id": "sha256",
  "make": "Chevrolet",
  "model": "Camaro",
  "model_year": 1969,
  "color": {
    "name_raw": "HUGGER ORANGE",
    "name_normalized": "HUGGER ORANGE",
    "code_raw": "72",
    "code_normalized": "72"
  },
  "availability_claim": "listed_in_source_candidate",
  "record_status": "extracted_candidate",
  "verification_status": "unreviewed_candidate",
  "confidence": 0.92,
  "extraction": {
    "method": "native",
    "engine": "pdftotext"
  },
  "evidence_text": "72 - HUGGER ORANGE",
  "evidence_locator": {
    "source_id": "gm-heritage-camaro-1969",
    "source_url": "https://www.gm.com/example.pdf",
    "artifact_sha256": "sha256",
    "pdf_page": 51,
    "printed_page": null,
    "text_line_start": 10,
    "text_line_end": 10,
    "text_sha256": "sha256",
    "extraction_method": "native",
    "extraction_engine": "pdftotext"
  },
  "source": {
    "source_id": "gm-heritage-camaro-1969",
    "title": "1969 Chevrolet Camaro Vehicle Information Kit",
    "publisher": "General Motors",
    "source_type": "vehicle_information_kit",
    "officiality": "official",
    "canonical_url": "https://www.gm.com/example.pdf",
    "artifact_sha256": "sha256"
  },
  "parser_version": "chevrolet-color-table-v1"
}
```

## Honest status rules

The following distinctions are mandatory:

| Status | What it proves |
|---|---|
| `extracted_candidate` | A native-text table line matched the parser and has a single source year |
| `needs_review` | OCR or lower-confidence extraction found a possible row |
| `needs_year_assignment` | The source spans more than one model year |
| `verified` | A human reviewed the source image, row meaning, year, code, and restrictions |
| `rejected` | A reviewer or a later parser pass rejected the automated candidate |

`listed_in_source_candidate` means only that a line appears to list the color.
It does not prove unrestricted factory availability. Notes, body-style limits,
two-tone combinations, late revisions, cancellations, and region-specific
order guides require human review.

No negative availability status is emitted by this crawler. In particular:

- no parser match means `not yet extracted`, not `not offered`;
- an empty OCR result means `unreadable`, not `not offered`;
- one dated chart does not prove no later bulletin existed;
- two colors with the same name are not automatically merged across years;
- two codes are not automatically treated as equivalent.

The public year matrix should show “not offered” only after a reviewer confirms
that the governing table is complete for that model, year, market, body style,
and revision scope.
