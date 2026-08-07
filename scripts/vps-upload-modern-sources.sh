#!/usr/bin/env bash
set -euo pipefail

IFS= read -r GH_TOKEN
export GH_TOKEN

login=$(gh api user --jq .login)
if [[ "$login" != "ipadmom" ]]; then
  echo "wrong GitHub account" >&2
  exit 21
fi

root=/var/lib/chevy-colors/source-staging
verify=/var/lib/chevy-colors/source-verify
repo=ipadmom/chevrolet-color-archive
tag=brochure-source-archive-v1
mkdir -p "$root" "$verify"

unlink_exact() {
  python3 - "$@" <<'PY'
from pathlib import Path
import sys

allowed = (Path("/var/lib/chevy-colors/source-staging"), Path("/var/lib/chevy-colors/source-verify"))
for raw in sys.argv[1:]:
    path = Path(raw)
    resolved = path.resolve(strict=False)
    if not any(resolved.parent == root for root in allowed):
        raise SystemExit(f"refusing unexpected cleanup path: {resolved}")
    if resolved.exists():
        resolved.unlink()
PY
}

process_asset() {
  name=$1
  url=$2
  src="$root/$name"
  check="$verify/$name"
  unlink_exact "$src" "$check"
  curl --fail --location --retry 4 --retry-delay 2 --connect-timeout 30 \
    --user-agent 'Mozilla/5.0 (compatible; ChevroletColorArchive/1.0)' \
    --silent --show-error "$url" --output "$src"
  bytes=$(stat -c %s "$src")
  sha=$(sha256sum "$src" | awk '{print $1}')
  gh release upload "$tag" "$src" --repo "$repo" --clobber
  gh release download "$tag" --repo "$repo" --pattern "$name" --dir "$verify"
  vbytes=$(stat -c %s "$check")
  vsha=$(sha256sum "$check" | awk '{print $1}')
  if [[ "$bytes" != "$vbytes" || "$sha" != "$vsha" ]]; then
    echo "verification failed: $name" >&2
    exit 22
  fi
  unlink_exact "$src" "$check"
  printf '%s\t%s\t%s\thttps://github.com/%s/releases/download/%s/%s\n' \
    "$name" "$bytes" "$sha" "$repo" "$tag" "$name"
}

maybe_process() {
  index=$1
  shift
  if (( index >= ${MODERN_SOURCE_START:-1} )); then
    process_asset "$@"
  fi
}

maybe_process 1 '2016-chevrolet-cruze-brochure.pdf' 'https://cdn.dealereprocess.org/cdn/brochures/chevrolet/2016-cruze.pdf'
maybe_process 2 '2017-chevrolet-bolt-ev-brochure.pdf' 'https://evnet.ca/wp-content/uploads/2019/10/2017-Bolt.pdf'
maybe_process 3 '2019-chevrolet-blazer-brochure.pdf' 'https://cdn.dealereprocess.org/cdn/brochures/chevrolet/2019-blazer.pdf'
maybe_process 4 '2011-chevrolet-volt-brochure.pdf' 'https://www.auto-brochures.com/makes/Chevrolet/Volt/Chevrolet_US%20Volt_2011.pdf'
maybe_process 5 '2016-chevrolet-low-cab-forward-upfitter-guide.pdf' 'https://www.gmupfitter.com/wp-content/uploads/2021/07/FFF_2016_LCF_060716_V2.pdf'
maybe_process 6 '2023-chevrolet-traverse-brochure.pdf' 'https://www.auto-brochures.com/makes/Chevrolet/Traverse/Chevrolet_US%20Traverse_2023.pdf'
maybe_process 7 '2008-new-jersey-malibu-classic-fleet-contract.pdf' 'https://www.nj.gov/treasury/purchase/noa/attachments/a0099-Section2.pdf'
maybe_process 8 '2008-import-advanced-color-information.pdf' 'https://colornetws.com/InfinityMsdsPds/Standox%20Product%20Info/Color%20Charts/2008%20ADV%20INFO%20IMPORT%20NOV%2007.pdf'
maybe_process 9 '2015-chevrolet-captiva-sport-colors.html' 'https://www.autoweb.com/chevrolet/captiva-sport-fleet/2015'
maybe_process 10 '2015-chevrolet-captiva-sport-paint-fitment.html' 'https://www.gmpartsgiant.com/parts-list/2015-chevrolet-captiva_sport/front_end_sheet_metal_heater/paint_touch_up.html'
maybe_process 11 '2009-isuzu-n-series-colors.html' 'https://www.worktruckonline.com/news/isuzu-truck-announces-2009-n-series-low-cab-forward-trucks'
maybe_process 12 '2011-chevrolet-volt-ordering-workbook.html' 'https://www.slideshare.net/slideshow/2011-volt-brochure/7581535'
maybe_process 13 '2019-chevrolet-blazer-order-guide.pdf' 'https://gmauthority.com/blog/wp-content/uploads/2018/09/2019-Chevrolet-Blazer-Order-Guide-September-7-2018.pdf'
maybe_process 14 '2024-chevrolet-traverse-limited-carryover.txt' 'https://r.jina.ai/http://gmauthority.com/blog/gm/chevrolet/traverse/2024-chevrolet-traverse-limited/'
