#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
CRAWLER_ROOT = REPOSITORY_ROOT / "crawler"
if str(CRAWLER_ROOT) not in sys.path:
    sys.path.insert(0, str(CRAWLER_ROOT))

from chevy_archive.color_table_batch import main


if __name__ == "__main__":
    raise SystemExit(main())
