#!/usr/bin/env bash
set -euo pipefail

IFS= read -r GH_TOKEN
export GH_TOKEN

repo_root=/var/lib/chevy-colors/photo-run/repo
review_root="$repo_root/tmp/current-model-color-photo-review"
manifest="$review_root/review-manifest.json"
originals="$review_root/originals"
previews="$review_root/previews"
verify="$review_root/release-verify"
receipt_lines="$review_root/release-verification.jsonl"
receipt="$review_root/release-verification.json"
repo=ipadmom/chevrolet-color-archive
tag=photo-archive-v1

login=$(gh api user --jq .login)
if [[ "$login" != "ipadmom" ]]; then
  echo "wrong GitHub account" >&2
  exit 21
fi

mkdir -p "$verify"
: > "$receipt_lines"

python3 - "$manifest" "$repo" "$tag" <<'PY'
import json
from pathlib import Path
import sys

manifest_path = Path(sys.argv[1])
expected_repo = sys.argv[2]
expected_tag = sys.argv[3]
data = json.loads(manifest_path.read_text(encoding="utf-8"))
release = data.get("github_release", {})
actual_repo = f"{release.get('owner')}/{release.get('repository')}"
if actual_repo != expected_repo or release.get("tag") != expected_tag:
    raise SystemExit("manifest targets the wrong GitHub Release")
if release.get("published") is not False:
    raise SystemExit("staging manifest must not claim publication")
if len(data.get("assets", [])) != 8:
    raise SystemExit("expected exactly eight reviewed assets")
PY

unlink_exact() {
  python3 - "$@" <<'PY'
from pathlib import Path
import sys

allowed = (
    Path("/var/lib/chevy-colors/photo-run/repo/tmp/current-model-color-photo-review/originals").resolve(),
    Path("/var/lib/chevy-colors/photo-run/repo/tmp/current-model-color-photo-review/previews").resolve(),
    Path("/var/lib/chevy-colors/photo-run/repo/tmp/current-model-color-photo-review/release-verify").resolve(),
)
for raw in sys.argv[1:]:
    resolved = Path(raw).resolve(strict=False)
    if resolved.parent not in allowed:
        raise SystemExit(f"refusing unexpected cleanup path: {resolved}")
    if resolved.exists():
        if not resolved.is_file() or resolved.is_symlink():
            raise SystemExit(f"refusing non-regular cleanup target: {resolved}")
        resolved.unlink()
PY
}

validate_local() {
  local file=$1
  local expected_name=$2
  local expected_bytes=$3
  local expected_sha=$4
  local allowed_parent=$5
  python3 - "$file" "$expected_name" "$expected_bytes" "$expected_sha" "$allowed_parent" <<'PY'
from hashlib import sha256
from pathlib import Path
import sys

file = Path(sys.argv[1])
expected_name = sys.argv[2]
expected_bytes = int(sys.argv[3])
expected_sha = sys.argv[4]
allowed_parent = Path(sys.argv[5]).resolve()
resolved = file.resolve(strict=True)
if resolved.parent != allowed_parent or resolved.name != expected_name:
    raise SystemExit(f"unexpected staged path: {resolved}")
if not resolved.is_file() or resolved.is_symlink():
    raise SystemExit(f"staged asset is not a regular file: {resolved}")
data = resolved.read_bytes()
if len(data) != expected_bytes or sha256(data).hexdigest() != expected_sha:
    raise SystemExit(f"staged asset digest mismatch: {resolved.name}")
PY
}

release_asset_size() {
  local name=$1
  gh release view "$tag" --repo "$repo" --json assets |
    python3 -c 'import json,sys; name=sys.argv[1]; matches=[a for a in json.load(sys.stdin)["assets"] if a["name"]==name]; print(matches[0]["size"] if len(matches)==1 else "")' "$name"
}

record_receipt() {
  python3 -c 'import json,sys; print(json.dumps({"candidate_id":sys.argv[1],"kind":sys.argv[2],"asset_name":sys.argv[3],"bytes":int(sys.argv[4]),"sha256":sys.argv[5],"release_url":sys.argv[6],"verification":"github_reported_size_and_downloaded_sha256_match"},sort_keys=True))' "$@" >> "$receipt_lines"
}

process_asset() {
  local candidate_id=$1
  local kind=$2
  local relative_path=$3
  local name=$4
  local expected_bytes=$5
  local expected_sha=$6
  local expected_parent=$7
  local source="$repo_root/$relative_path"
  local check="$verify/$name"
  local url="https://github.com/$repo/releases/download/$tag/$name"

  validate_local "$source" "$name" "$expected_bytes" "$expected_sha" "$expected_parent"
  unlink_exact "$check"
  local reported_size
  reported_size=$(release_asset_size "$name")
  if [[ -z "$reported_size" ]]; then
    gh release upload "$tag" "$source" --repo "$repo"
    reported_size=$(release_asset_size "$name")
  fi
  if [[ "$reported_size" != "$expected_bytes" ]]; then
    echo "GitHub-reported size mismatch: $name" >&2
    exit 22
  fi
  gh release download "$tag" --repo "$repo" --pattern "$name" --dir "$verify"
  validate_local "$check" "$name" "$expected_bytes" "$expected_sha" "$verify"
  record_receipt "$candidate_id" "$kind" "$name" "$expected_bytes" "$expected_sha" "$url"
  unlink_exact "$source" "$check"
}

while IFS=$'\t' read -r candidate_id original_path original_name original_bytes original_sha preview_path preview_name preview_bytes preview_sha; do
  process_asset "$candidate_id" original "$original_path" "$original_name" "$original_bytes" "$original_sha" "$originals"
  process_asset "$candidate_id" preview "$preview_path" "$preview_name" "$preview_bytes" "$preview_sha" "$previews"
done < <(
  python3 - "$manifest" <<'PY'
import json
from pathlib import Path
import sys

data = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
for asset in data["assets"]:
    fields = [
        asset["candidate_id"],
        asset["local_path"],
        asset["release_asset_name"],
        str(asset["bytes"]),
        asset["sha256"],
        asset["preview_local_path"],
        asset["preview_release_asset_name"],
        str(asset["preview_bytes"]),
        asset["preview_sha256"],
    ]
    if any("\t" in value or "\n" in value for value in fields):
        raise SystemExit("unsafe manifest field")
    print("\t".join(fields))
PY
)

python3 - "$receipt_lines" "$receipt" <<'PY'
import json
from datetime import datetime, timezone
from pathlib import Path
import sys

rows = [json.loads(line) for line in Path(sys.argv[1]).read_text(encoding="utf-8").splitlines() if line]
if len(rows) != 16:
    raise SystemExit(f"expected 16 verified release assets, found {len(rows)}")
receipt = {
    "schema_version": 1,
    "verified_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    "github_account": "ipadmom",
    "repository": "ipadmom/chevrolet-color-archive",
    "release_tag": "photo-archive-v1",
    "asset_count": len(rows),
    "assets": rows,
    "vps_payload_cleanup": "Every listed original, preview, and downloaded verification copy was deleted immediately after its exact Release copy passed size and SHA-256 verification.",
}
Path(sys.argv[2]).write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
PY

rm -f "$receipt_lines"
printf '{"verified_release_assets":16,"deleted_vps_payload_files":24}\n'
