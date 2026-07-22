from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path
from typing import Any

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
RELEASE_TAG = "brochure-source-archive-v1"
RELEASE_BASE = (
    "https://github.com/ipadmom/chevrolet-color-archive/releases/download/"
    f"{RELEASE_TAG}/"
)
STAGING = ROOT / "tmp" / "release-staging" / RELEASE_TAG
MANIFEST_PATH = ROOT / "data" / "sources" / "brochure-source-release-manifest.json"
ARTIFACT_LEDGER_PATH = (
    ROOT / "data" / "sources" / "gm-heritage-chevrolet-artifacts.json"
)
MODERN_SOURCE_LEDGER_PATH = (
    ROOT / "data" / "sources" / "modern-chevrolet-color-source-candidates.json"
)
CRAWLER_OBJECT_ROOT = ROOT / "tmp" / "crawler-state" / "objects" / "sha256"

EXPECTED_RETAINED_SOURCE_ASSET_COUNT = 97
EXPECTED_PRESERVED_ASSET_COUNT = 28
EXPECTED_NON_CHECKSUM_ASSET_COUNT = 125
EXPECTED_ASSET_COUNT = 126
EXPECTED_PDF_COUNT = 102
EXPECTED_PDF_BYTES = 1_226_505_194
EXPECTED_PDF_PAGE_COUNT = 7_904


PRESERVED_EXISTING_ASSET_NAMES = (
    "1982-chevrolet-suburban-brochure-xr793.pdf",
    "1989-chevrolet-suburban-brochure-xr793.pdf",
    "1989-chevrolet-trucks-full-line-xr793.pdf",
    *(
        f"1993-chevrolet-blazer-suburban-brochure-image-{index:02d}.jpg"
        for index in range(1, 17)
    ),
    "1993-chevrolet-blazer-suburban-brochure-poshmark-listing.html",
    "1993-chevrolet-full-line-brochure-xr793.pdf",
    "1993-chevrolet-light-duty-truck-graphic-information-booklet-gmt400-info.pdf",
    "1993-chevrolet-trucks-brochure-xr793.pdf",
    "2002-chevrolet-suburban-brochure-auto-brochures.pdf",
    "2003-chevrolet-suburban-brochure-auto-brochures.pdf",
    "2004-chevrolet-suburban-service-color-table.png",
    "2004-sherwin-williams-north-american-color-manual.pdf",
    "suburban-1982-1989-1993-source-audit.md",
)


MODERN_SOURCES = (
    (
        "gm-fleet-guide-us-2008-v2",
        "2008-gm-fleet-guide-v2-mirror.pdf",
        "controlling_qualified_palette_fleet_guide",
    ),
    (
        "gm-fleet-guide-us-2009-v2",
        "2009-gm-fleet-guide-v2-mirror.pdf",
        "controlling_qualified_palette_fleet_guide",
    ),
    (
        "gm-fleet-guide-us-2010",
        "2010-gm-fleet-guide-mirror.pdf",
        "controlling_qualified_palette_fleet_guide",
    ),
    (
        "gm-fleet-guide-us-2011",
        "2011-gm-fleet-guide-mirror.pdf",
        "controlling_qualified_palette_fleet_guide",
    ),
    (
        "gm-fleet-guide-us-2012",
        "2012-gm-car-truck-guide-mirror.pdf",
        "controlling_qualified_palette_fleet_guide",
    ),
    (
        "gm-fleet-guide-us-2013",
        "2013-gm-car-truck-guide-mirror.pdf",
        "controlling_qualified_palette_fleet_guide",
    ),
    (
        "gm-fleet-guide-us-2014",
        "2014-gm-fleet-car-truck-guide-mirror.pdf",
        "controlling_qualified_palette_fleet_guide",
    ),
    (
        "gm-fleet-guide-us-2015",
        "2015-gm-fleet-car-truck-guide-mirror.pdf",
        "controlling_qualified_palette_fleet_guide",
    ),
    (
        "gm-fleet-guide-us-2016-november",
        "2016-gm-fleet-guide-november-mirror.pdf",
        "controlling_qualified_palette_fleet_guide",
    ),
    (
        "gm-fleet-guide-us-2017",
        "2017-gm-fleet-guide-mirror.pdf",
        "controlling_qualified_palette_fleet_guide",
    ),
    (
        "gm-fleet-guide-us-2018",
        "2018-gm-fleet-guide-mirror.pdf",
        "controlling_qualified_palette_fleet_guide",
    ),
    (
        "gm-fleet-guide-us-2019",
        "2019-gm-fleet-guide-mirror.pdf",
        "controlling_qualified_palette_fleet_guide",
    ),
    (
        "gm-fleet-guide-us-2020",
        "2020-gm-fleet-guide-mirror.pdf",
        "controlling_qualified_palette_fleet_guide",
    ),
    (
        "gm-fleet-guide-us-2021-v3",
        "2021-gm-fleet-guide-v3-mirror.pdf",
        "controlling_qualified_palette_fleet_guide",
    ),
    (
        "gm-fleet-guide-us-2022-v6",
        "2022-gm-fleet-guide-v6-mirror.pdf",
        "controlling_qualified_palette_fleet_guide",
    ),
    (
        "gm-fleet-guide-us-2023-v3",
        "2023-gm-fleet-guide-v3-mirror.pdf",
        "controlling_qualified_palette_fleet_guide",
    ),
    (
        "gm-fleet-guide-us-2024-v3",
        "2024-gm-fleet-guide-v3-mirror.pdf",
        "controlling_qualified_palette_fleet_guide",
    ),
    (
        "gm-fleet-guide-us-2025-r2024-12-11",
        "2025-gm-fleet-guide-r2024-12-11.pdf",
        "controlling_qualified_palette_fleet_guide",
    ),
    (
        "gm-fleet-guide-us-2026-r2026-04-01",
        "2026-gm-fleet-guide-r2026-04-01.pdf",
        "controlling_qualified_palette_fleet_guide",
    ),
    (
        "chevrolet-ebrochure-us-2022-tahoe",
        "2022-chevrolet-tahoe-ebrochure.pdf",
        "controlling_qualified_palette_brochure",
    ),
    (
        "chevrolet-ebrochure-us-2023-colorado",
        "2023-chevrolet-colorado-ebrochure.pdf",
        "controlling_qualified_palette_brochure",
    ),
    (
        "chevrolet-ebrochure-us-2023-silverado-hd-commercial",
        "2023-chevrolet-silverado-hd-commercial-ebrochure.pdf",
        "controlling_qualified_palette_brochure",
    ),
    (
        "chevrolet-ebrochure-us-2023-silverado-4500-6500-hd",
        "2023-chevrolet-commercial-silverado-4500hd-5500hd-6500hd-ebrochure.pdf",
        "controlling_qualified_palette_brochure",
    ),
)


CRAWLER_SOURCES = (
    (
        "gm-heritage-1963-chevrolet-suburban",
        "1963-chevrolet-suburban-vehicle-information-kit-gm.pdf",
        "reviewed_no_chart_vehicle_information_kit",
    ),
    (
        "gm-heritage-1969-chevrolet-suburban",
        "1969-chevrolet-suburban-vehicle-information-kit-gm.pdf",
        "controlling_vehicle_information_kit",
    ),
    (
        "gm-heritage-1970-chevrolet-suburban",
        "1970-chevrolet-suburban-vehicle-information-kit-gm.pdf",
        "reviewed_no_chart_vehicle_information_kit",
    ),
    (
        "gm-heritage-1971-chevrolet-suburban",
        "1971-chevrolet-suburban-vehicle-information-kit-gm.pdf",
        "reviewed_no_chart_vehicle_information_kit",
    ),
    (
        "gm-heritage-1971-chevrolet-blazer",
        "1971-chevrolet-blazer-rv-full-size-vehicle-information-kit-gm.pdf",
        "comparison_vehicle_information_kit",
    ),
    (
        "gm-heritage-1972-chevrolet-suburban",
        "1972-chevrolet-suburban-vehicle-information-kit-gm.pdf",
        "controlling_vehicle_information_kit",
    ),
    (
        "gm-heritage-1973-chevrolet-suburban",
        "1973-chevrolet-suburban-vehicle-information-kit-gm.pdf",
        "controlling_vehicle_information_kit",
    ),
    (
        "gm-heritage-1974-chevrolet-suburban",
        "1974-chevrolet-suburban-vehicle-information-kit-gm.pdf",
        "controlling_vehicle_information_kit",
    ),
    (
        "gm-heritage-1975-chevrolet-suburban",
        "1975-chevrolet-suburban-vehicle-information-kit-gm.pdf",
        "controlling_vehicle_information_kit",
    ),
    (
        "gm-heritage-1976-chevrolet-suburban",
        "1976-chevrolet-suburban-vehicle-information-kit-gm.pdf",
        "controlling_vehicle_information_kit",
    ),
    (
        "gm-heritage-1982-chevrolet-suburban",
        "1982-chevrolet-suburban-vehicle-information-kit-gm.pdf",
        "supporting_vehicle_information_kit",
    ),
    (
        "gm-heritage-1989-chevrolet-suburban",
        "1989-chevrolet-suburban-vehicle-information-kit-gm.pdf",
        "supporting_vehicle_information_kit",
    ),
    (
        "gm-heritage-1993-chevrolet-suburban",
        "1993-chevrolet-suburban-vehicle-information-kit-gm.pdf",
        "supporting_vehicle_information_kit",
    ),
    (
        "gm-heritage-2000-chevrolet-suburban",
        "2000-chevrolet-suburban-vehicle-information-kit-gm.pdf",
        "controlling_vehicle_information_kit",
    ),
    (
        "gm-heritage-2001-chevrolet-suburban",
        "2001-chevrolet-suburban-vehicle-information-kit-gm.pdf",
        "controlling_vehicle_information_kit",
    ),
    (
        "gm-heritage-2002-chevrolet-suburban",
        "2002-chevrolet-suburban-vehicle-information-kit-gm.pdf",
        "supporting_vehicle_information_kit",
    ),
    (
        "gm-heritage-2003-chevrolet-suburban",
        "2003-chevrolet-suburban-vehicle-information-kit-gm.pdf",
        "supporting_vehicle_information_kit",
    ),
    (
        "gm-heritage-2004-chevrolet-suburban",
        "2004-chevrolet-suburban-vehicle-information-kit-gm.pdf",
        "supporting_vehicle_information_kit",
    ),
    (
        "gm-heritage-2005-chevrolet-suburban",
        "2005-chevrolet-suburban-vehicle-information-kit-gm.pdf",
        "controlling_vehicle_information_kit",
    ),
    (
        "gm-heritage-2007-chevrolet-suburban",
        "2007-chevrolet-suburban-vehicle-information-kit-gm.pdf",
        "controlling_vehicle_information_kit",
    ),
    (
        "gm-heritage-1995-chevrolet-tahoe",
        "1995-chevrolet-tahoe-vehicle-information-kit-gm.pdf",
        "controlling_vehicle_information_kit",
    ),
    (
        "gm-heritage-1996-chevrolet-tahoe",
        "1996-chevrolet-tahoe-vehicle-information-kit-gm.pdf",
        "controlling_vehicle_information_kit",
    ),
    (
        "gm-heritage-1997-chevrolet-tahoe",
        "1997-chevrolet-tahoe-vehicle-information-kit-gm.pdf",
        "controlling_vehicle_information_kit",
    ),
    (
        "gm-heritage-1998-chevrolet-tahoe",
        "1998-chevrolet-tahoe-vehicle-information-kit-gm.pdf",
        "controlling_vehicle_information_kit",
    ),
    (
        "gm-heritage-1999-chevrolet-tahoe",
        "1999-chevrolet-tahoe-vehicle-information-kit-gm.pdf",
        "controlling_vehicle_information_kit",
    ),
    (
        "gm-heritage-2000-chevrolet-tahoe",
        "2000-chevrolet-tahoe-vehicle-information-kit-gm.pdf",
        "controlling_variant_vehicle_information_kit",
    ),
    (
        "gm-heritage-2001-chevrolet-tahoe",
        "2001-chevrolet-tahoe-vehicle-information-kit-gm.pdf",
        "controlling_vehicle_information_kit",
    ),
    (
        "gm-heritage-2002-chevrolet-tahoe",
        "2002-chevrolet-tahoe-vehicle-information-kit-gm.pdf",
        "supporting_vehicle_information_kit",
    ),
    (
        "gm-heritage-2003-chevrolet-tahoe",
        "2003-chevrolet-tahoe-vehicle-information-kit-gm.pdf",
        "controlling_vehicle_information_kit",
    ),
    (
        "gm-heritage-2004-chevrolet-tahoe",
        "2004-chevrolet-tahoe-vehicle-information-kit-gm.pdf",
        "source_review_vehicle_information_kit",
    ),
    (
        "gm-heritage-2005-chevrolet-tahoe",
        "2005-chevrolet-tahoe-vehicle-information-kit-gm.pdf",
        "source_review_vehicle_information_kit",
    ),
    (
        "gm-heritage-2006-chevrolet-tahoe",
        "2006-chevrolet-tahoe-vehicle-information-kit-gm.pdf",
        "source_review_vehicle_information_kit",
    ),
    (
        "gm-heritage-2007-chevrolet-tahoe",
        "2007-chevrolet-tahoe-vehicle-information-kit-gm.pdf",
        "controlling_vehicle_information_kit",
    ),
)


LOCAL_SOURCES = (
    {
        "source_id": "chevrolet-sales-brochure-2002-tahoe",
        "asset_name": "2002-chevrolet-tahoe-brochure-motorologist.pdf",
        "role": "controlling_sales_brochure",
        "path": ROOT
        / "tmp"
        / "tahoe-source-research"
        / "2002-chevrolet-tahoe-brochure-motorologist.pdf",
        "url": "https://www.motorologist.com/wp-content/uploads/2002-Chevrolet-Tahoe-brochure.pdf",
        "retrieval_url": "https://web.archive.org/web/20240609071421id_/https://www.motorologist.com/wp-content/uploads/2002-Chevrolet-Tahoe-brochure.pdf",
        "sha256": "97ca38b885817e64e831d640b4167df2edf93838d29d407610df38efb797e522",
        "bytes": 2_777_275,
        "pdf_page_count": 20,
    },
    {
        "source_id": "chevrolet-sales-brochure-2003-tahoe",
        "asset_name": "2003-chevrolet-tahoe-brochure-auto-brochures.pdf",
        "role": "supporting_sales_brochure",
        "path": ROOT
        / "tmp"
        / "tahoe-source-research"
        / "2003-chevrolet-tahoe-brochure-auto-brochures.pdf",
        "url": "https://www.auto-brochures.com/makes/Chevrolet/Tahoe/Chevrolet_US%20Tahoe_2003.pdf",
        "retrieval_url": "https://web.archive.org/web/20240216125333id_/https://www.auto-brochures.com/makes/Chevrolet/Tahoe/Chevrolet_US%20Tahoe_2003.pdf",
        "sha256": "0d60ddd639614f5da8b85dcf3b438a5cd9d15c106cfa323d11467f82fe41b613",
        "bytes": 1_928_530,
        "pdf_page_count": 17,
    },
    {
        "source_id": "chevrolet-spec-sheet-us-2004-tahoe",
        "asset_name": "2004-chevrolet-tahoe-spec-sheet.pdf",
        "role": "controlling_us_specification_sheet",
        "path": ROOT
        / "tmp"
        / "tahoe-source-research"
        / "2004-chevrolet-tahoe-spec-sheet.pdf",
        "url": "https://xr793.com/wp-content/uploads/2023/07/2004-Chevrolet-Tahoe-Spec-Sheet.pdf",
        "retrieval_url": "https://web.archive.org/web/20240225052652id_/https://xr793.com/wp-content/uploads/2023/07/2004-Chevrolet-Tahoe-Spec-Sheet.pdf",
        "sha256": "68b41b618bae2a61c93ee80d1f4655a68f3b177e380611ef8243babc6177b514",
        "bytes": 252_651,
        "pdf_page_count": 2,
    },
    {
        "source_id": "chevrolet-spec-sheet-us-2005-tahoe",
        "asset_name": "2005-chevrolet-tahoe-spec-sheet.pdf",
        "role": "controlling_us_specification_sheet",
        "path": ROOT
        / "tmp"
        / "tahoe-source-research"
        / "2005-chevrolet-tahoe-spec-sheet.pdf",
        "url": "https://xr793.com/wp-content/uploads/2023/07/2005-Chevrolet-Tahoe-Spec-Sheet.pdf",
        "retrieval_url": "https://web.archive.org/web/20240421034221id_/https://xr793.com/wp-content/uploads/2023/07/2005-Chevrolet-Tahoe-Spec-Sheet.pdf",
        "sha256": "a7d04612d375b57aca0185e205461aff7cd3eeac96901f1c84152d2a632cc4aa",
        "bytes": 630_983,
        "pdf_page_count": 2,
    },
    {
        "source_id": "chevrolet-spec-sheet-us-2006-tahoe",
        "asset_name": "2006-chevrolet-tahoe-spec-sheet.pdf",
        "role": "controlling_us_specification_sheet",
        "path": ROOT
        / "tmp"
        / "tahoe-source-research"
        / "2006-chevrolet-tahoe-spec-sheet.pdf",
        "url": "https://xr793.com/wp-content/uploads/2023/07/2006-Chevrolet-Tahoe-Spec-Sheet.pdf",
        "retrieval_url": "https://web.archive.org/web/20240223151410id_/https://xr793.com/wp-content/uploads/2023/07/2006-Chevrolet-Tahoe-Spec-Sheet.pdf",
        "sha256": "e805cef5d6e04f465c84df5cbad85997cde1d5797692cb02113cba25f6ee358f",
        "bytes": 1_171_822,
        "pdf_page_count": 2,
    },
    {
        "source_id": "sherwin-williams-gm-2004-color-compatibility-guide",
        "asset_name": "2004-sherwin-williams-gm-color-compatibility-guide.pdf",
        "role": "supporting_tahoe_code_compatibility_guide",
        "path": ROOT
        / "tmp"
        / "tahoe-source-research"
        / "2004-sherwin-williams-gm-color-compatibility-guide.pdf",
        "url": "https://industrial.sherwin-williams.com/content/dam/pcg/sherwin-williams/automotive/emeai/nl/nl-nl/pdfs/swaf-2004_gm_ccg.pdf",
        "sha256": "3bd3709b52baae003adf94126fc63e49c64c7b9b46d817b4035910932b73bdd5",
        "bytes": 93_732,
        "pdf_page_count": 35,
    },
    {
        "source_id": "sherwin-williams-gm-2005-color-compatibility-guide",
        "asset_name": "2005-sherwin-williams-gm-color-compatibility-guide.pdf",
        "role": "supporting_tahoe_code_compatibility_guide",
        "path": ROOT
        / "tmp"
        / "tahoe-source-research"
        / "2005-sherwin-williams-gm-color-compatibility-guide.pdf",
        "url": "https://industrial.sherwin-williams.com/content/dam/pcg/sherwin-williams/automotive/emeai/nl/nl-nl/pdfs/swaf-2005_gm_ccg.pdf",
        "sha256": "bf617161ec0875b9dce9c9bc2be087541a5b95cf848fde59177255af7273afaa",
        "bytes": 108_739,
        "pdf_page_count": 43,
    },
    {
        "source_id": "sherwin-williams-gm-2006-color-compatibility-guide",
        "asset_name": "2006-sherwin-williams-gm-color-compatibility-guide.pdf",
        "role": "supporting_tahoe_code_compatibility_guide",
        "path": ROOT
        / "tmp"
        / "tahoe-source-research"
        / "2006-sherwin-williams-gm-color-compatibility-guide.pdf",
        "url": "https://industrial.sherwin-williams.com/content/dam/pcg/sherwin-williams/automotive/emeai/de/de-de/pdfs/marketing-uploads/swaf-2006_gm_ccg.pdf",
        "sha256": "e97ee68bca34867244a933db1bd6df11cf0e18781671207348db08bfb8cca31b",
        "bytes": 148_670,
        "pdf_page_count": 40,
    },
    {
        "source_id": "chevrolet-sales-brochure-canada-2005-tahoe-suburban",
        "asset_name": "2005-chevrolet-tahoe-suburban-canada.pdf",
        "role": "supporting_canadian_sales_brochure",
        "path": ROOT
        / "tmp"
        / "tahoe-source-research"
        / "2005-chevrolet-tahoe-suburban-canada.pdf",
        "url": "https://www.xr793.com/wp-content/uploads/2020/05/2005-Chevrolet-Tahoe-Suburban-CN.pdf",
        "retrieval_url": "https://web.archive.org/web/20240216130715id_/https://www.xr793.com/wp-content/uploads/2020/05/2005-Chevrolet-Tahoe-Suburban-CN.pdf",
        "sha256": "96e11797686f4c36e095d285c2a1608a0f7109769ea3a8f951ad756d20a7c966",
        "bytes": 2_430_499,
        "pdf_page_count": 28,
    },
    {
        "source_id": "chevrolet-sales-brochure-canada-2006-tahoe-suburban",
        "asset_name": "2006-chevrolet-tahoe-suburban-canada.pdf",
        "role": "supporting_canadian_sales_brochure",
        "path": ROOT
        / "tmp"
        / "tahoe-source-research"
        / "2006-chevrolet-tahoe-suburban-canada.pdf",
        "url": "https://xr793.com/wp-content/uploads/2017/07/2006-Chevrolet-Tahoe-CN.pdf",
        "retrieval_url": "https://web.archive.org/web/20240216125819id_/https://xr793.com/wp-content/uploads/2017/07/2006-Chevrolet-Tahoe-CN.pdf",
        "sha256": "6bb01616aa0ab6150ccdee2a8a4515d65e7dccc9bb26430c37ba0b74093562b3",
        "bytes": 4_129_100,
        "pdf_page_count": 28,
    },
    {
        "source_id": "new-jersey-tahoe-police-contract-2005",
        "asset_name": "2005-new-jersey-tahoe-police-contract.pdf",
        "role": "controlling_specialty_configuration_contract",
        "path": ROOT
        / "tmp"
        / "tahoe-source-research"
        / "2005-new-jersey-tahoe-police-contract.pdf",
        "url": "https://www.nj.gov/treasury/purchase/noa/attachments/a2097-section1.pdf",
        "sha256": "74f219fe7c2ccc7141e0a15098c421a02e2aad198421344effeb4f2c19897cfa",
        "bytes": 342_819,
        "pdf_page_count": 30,
    },
    {
        "source_id": "new-jersey-tahoe-police-contract-2006",
        "asset_name": "2006-new-jersey-tahoe-police-contract.pdf",
        "role": "controlling_specialty_configuration_contract",
        "path": ROOT
        / "tmp"
        / "tahoe-source-research"
        / "2006-new-jersey-tahoe-police-contract.pdf",
        "url": "https://www.nj.gov/treasury/purchase/noa/attachments/a2097-1a.pdf",
        "sha256": "9a6ce020fbd6ecdba97094ebc15c748118d7d1d95b5888f358f8d6436dbf0e7f",
        "bytes": 265_662,
        "pdf_page_count": 30,
    },
    {
        "source_id": "gm-1980-chevrolet-truck-color-trim",
        "asset_name": "1980-chevrolet-truck-vehicle-information-kit-gm.pdf",
        "role": "controlling_specialty_vehicle_information_kit",
        "path": ROOT
        / "tmp"
        / "specialty-color-sources"
        / "gm-truck-kits"
        / "1980-Chevrolet-Truck.pdf",
        "url": "https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1980-Chevrolet-Truck.pdf",
        "sha256": "b44e4e8af7bba172885d003d5f88d2dab55bcefb5a15d0ce124b9a181ed89008",
        "bytes": 4_390_128,
        "pdf_page_count": 125,
    },
    {
        "source_id": "gm-2011-police-manual",
        "asset_name": "2011-chevrolet-municipal-vehicles-technical-manual-gm.pdf",
        "role": "controlling_specialty_vehicle_manual",
        "path": ROOT
        / "tmp"
        / "specialty-color-research"
        / "historic-official-pdfs"
        / "gm-2011-police-manual.pdf",
        "url": "https://www.gmupfitter.com/wp-content/uploads/2021/07/2011_Chevrolet-Police-Technical-Manual.pdf",
        "sha256": "6c0eef224d9c67c4a841bbaf1fb68383bc74cc5a0ecc3c0d1a412683b6474534",
        "bytes": 8_346_299,
        "pdf_page_count": 182,
    },
    {
        "source_id": "gm-heritage-1979-chevrolet-blazer",
        "asset_name": "1979-chevrolet-blazer-vehicle-information-kit-gm.pdf",
        "role": "controlling_specialty_vehicle_information_kit",
        "path": CRAWLER_OBJECT_ROOT
        / "86"
        / "85"
        / "868566b1e9c3b1aebece1adfde7a9e3d6ce40661002275e8b4824c73ea333add.pdf",
        "url": "https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1979-Chevrolet-Blazer.pdf",
        "sha256": "868566b1e9c3b1aebece1adfde7a9e3d6ce40661002275e8b4824c73ea333add",
        "bytes": 1_739_347,
        "pdf_page_count": 22,
    },
    {
        "source_id": "gm-heritage-1993-chevrolet-s-10",
        "asset_name": "1993-chevrolet-s-10-vehicle-information-kit-gm.pdf",
        "role": "controlling_specialty_vehicle_information_kit",
        "path": CRAWLER_OBJECT_ROOT
        / "62"
        / "57"
        / "625756846b0c70441a808c737a2d3f93ce7ee25b0d52696d286252225d6c233f.pdf",
        "url": "https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1993-Chevrolet-S-10.pdf",
        "sha256": "625756846b0c70441a808c737a2d3f93ce7ee25b0d52696d286252225d6c233f",
        "bytes": 390_453,
        "pdf_page_count": 15,
    },
    {
        "source_id": "gm-2012-municipal-manual",
        "asset_name": "2012-chevrolet-municipal-vehicles-specifications-manual-gm.pdf",
        "role": "controlling_specialty_vehicle_manual",
        "path": ROOT
        / "tmp"
        / "specialty-color-research"
        / "historic-official-pdfs"
        / "gm-2012-municipal-manual.pdf",
        "url": "https://www.gmupfitter.com/wp-content/uploads/2021/05/2012-Police-Specifications-Manual-9-29-11.pdf",
        "sha256": "2bf54f148d063b69a2b114166163b7225641daf1fba62bc41ca20a4a7dd4473d",
        "bytes": 8_600_436,
        "pdf_page_count": 199,
    },
    {
        "source_id": "gm-2013-municipal-guide",
        "asset_name": "2013-chevrolet-municipal-vehicles-guide-gm.pdf",
        "role": "controlling_specialty_vehicle_manual",
        "path": ROOT
        / "tmp"
        / "specialty-color-research"
        / "historic-official-pdfs"
        / "gm-2013-municipal-guide.pdf",
        "url": "https://www.gmupfitter.com/wp-content/uploads/2021/07/2013-Municipal-Guide.pdf",
        "sha256": "1753082e7bcea94e29737e8d09470ee9e87059bd5fb8a560ffe463b850abc18c",
        "bytes": 10_595_751,
        "pdf_page_count": 197,
    },
    {
        "source_id": "gm-2014-police-guide",
        "asset_name": "2014-chevrolet-police-vehicles-technical-guide-gm.pdf",
        "role": "controlling_specialty_vehicle_manual",
        "path": ROOT
        / "tmp"
        / "specialty-color-research"
        / "historic-official-pdfs"
        / "gm-2014-police-guide.pdf",
        "url": "https://www.gmupfitter.com/wp-content/uploads/2021/06/2014_Police_Technical_Guide_FINAL.pdf",
        "sha256": "d21cdc63dc71d20295d94075573f083560be5c73204bba13b939c8699dd77fdc",
        "bytes": 9_610_503,
        "pdf_page_count": 147,
    },
    {
        "source_id": "gm-2015-caprice-9c1-specification-guide",
        "asset_name": "2015-chevrolet-caprice-ppv-9c1-specification-guide-gm.pdf",
        "role": "controlling_specialty_vehicle_specification_guide",
        "path": ROOT
        / "tmp"
        / "specialty-color-research"
        / "historic-official-pdfs"
        / "gm-2015-caprice-9c1-specification-guide.pdf",
        "url": "https://www.gmupfitter.com/wp-content/uploads/2021/07/2015_caprice_specification_guide_4_10.pdf",
        "sha256": "6f6431fa6f246e493c3f3da26b2bf05b463ec1d26c68a2ced3282c7ecf91823a",
        "bytes": 16_376_061,
        "pdf_page_count": 37,
    },
    {
        "source_id": "gm-2016-caprice-9c1-specification-guide",
        "asset_name": "2016-chevrolet-caprice-ppv-9c1-specification-guide-gm.pdf",
        "role": "controlling_specialty_vehicle_specification_guide",
        "path": ROOT
        / "tmp"
        / "specialty-color-research"
        / "historic-official-pdfs"
        / "gm-2016-caprice-9c1-specification-guide.pdf",
        "url": "https://www.gmupfitter.com/wp-content/uploads/2021/05/2016-Caprice-Specification-Guide.pdf",
        "sha256": "48c2d7112bede1f7aac294d3024fdd1002614fdcf6d5d34c1ce5c3b48a95c2e0",
        "bytes": 9_492_057,
        "pdf_page_count": 37,
    },
    {
        "source_id": "gm-2017-caprice-9c1-specification-guide",
        "asset_name": "2017-chevrolet-caprice-ppv-9c1-specification-guide-gm.pdf",
        "role": "controlling_specialty_vehicle_specification_guide",
        "path": ROOT
        / "tmp"
        / "specialty-color-research"
        / "historic-official-pdfs"
        / "gm-2017-caprice-9c1-specification-guide.pdf",
        "url": "https://www.gmupfitter.com/wp-content/uploads/2021/05/Caprice-9C1-Specification-Guide-2017.pdf",
        "sha256": "850e9f0196641ef73f0ab9e892047f25e7212d2e772999f4de545d63653c615d",
        "bytes": 37_298_379,
        "pdf_page_count": 40,
    },
    {
        "source_id": "gm-2023-bolt-euv-5w4",
        "asset_name": "2023-chevrolet-bolt-euv-ssv-specification-guide-gm.pdf",
        "role": "controlling_specialty_vehicle_specification_guide",
        "path": ROOT
        / "tmp"
        / "specialty-release-assets"
        / "2023-chevrolet-bolt-euv-ssv-specification-guide-gm.pdf",
        "url": "https://www.gmupfitter.com/wp-content/uploads/2022/12/2023-BOLT-EUV-SSV-1.pdf",
        "sha256": "65e753fc12bd6bc4d53c31c7738c9271516da6048082c06fcb079beb630fe047",
        "bytes": 12_264_737,
        "pdf_page_count": 35,
    },
    {
        "source_id": "gm-2024-blazer-ev-9c1-9c3",
        "asset_name": "2024-chevrolet-blazer-ev-9c1-specification-guide-gm.pdf",
        "role": "controlling_specialty_vehicle_specification_guide",
        "path": ROOT
        / "tmp"
        / "specialty-release-assets"
        / "2024-chevrolet-blazer-ev-9c1-specification-guide-gm.pdf",
        "url": "https://www.gmupfitter.com/wp-content/uploads/2023/12/2024-BLAZER-EV-9C1-Municipal-Specification-Guide-V112525.pdf",
        "sha256": "8f200edcf1471f031620fd985470ddcc69c3f977bb4e1f9d42a252a1d77c511b",
        "bytes": 14_926_196,
        "pdf_page_count": 54,
    },
    {
        "source_id": "gm-2025-blazer-ev-9c1-9c3-5w4",
        "asset_name": "2025-chevrolet-blazer-ev-9c1-specification-guide-gm.pdf",
        "role": "controlling_specialty_vehicle_specification_guide",
        "path": ROOT
        / "tmp"
        / "specialty-release-assets"
        / "2025-chevrolet-blazer-ev-9c1-specification-guide-gm.pdf",
        "url": "https://www.gmupfitter.com/wp-content/uploads/2024/12/2025-BLAZER-EV-9C1-Municipal-Specification-Guide-V042825.pdf",
        "sha256": "1c1ef303bda0ee42ec874a20d2d9926ccd119e21f45e6d830950d5d537310011",
        "bytes": 14_498_399,
        "pdf_page_count": 55,
    },
    {
        "source_id": "gm-order-guide-2025-blazer-ev-police-22887",
        "asset_name": "2025-chevrolet-blazer-ev-police-order-guide-gm.pdf",
        "role": "supporting_specialty_vehicle_order_guide_snapshot",
        "path": ROOT
        / "tmp"
        / "specialty-color-research"
        / "official-order-guides"
        / "2025-blazer-ev-police-package-22887.pdf",
        "url": "https://eog-api.musea2.azure.ext.gm.com/api/Pdf/GeneratePdf/22887/all/en-us",
        "sha256": "feb62128b5b002901f83d51d4ba69e85630d13baa301f13a26e7b7246bb26c5f",
        "bytes": 193_610,
        "pdf_page_count": 41,
    },
    {
        "source_id": "gm-2026-blazer-ev-9c1-9c3-5w4",
        "asset_name": "2026-chevrolet-blazer-ev-9c1-9c3-5w4-specification-guide-gm.pdf",
        "role": "controlling_specialty_vehicle_specification_guide",
        "path": ROOT
        / "tmp"
        / "specialty-release-assets"
        / "2026-chevrolet-blazer-ev-9c1-9c3-5w4-specification-guide-gm.pdf",
        "url": "https://www.gmupfitter.com/wp-content/uploads/2025/12/2026-BLAZER-EV-9C1-9C3-5W4-Specification-Guide-V041026.pdf",
        "sha256": "9cfbcb2fb053b0a48526c79a1a2c8617ed8a9b3525715ff2073d3dafe213f13c",
        "bytes": 21_290_909,
        "pdf_page_count": 57,
    },
    {
        "source_id": "gm-order-guide-2026-blazer-ev-police-23158",
        "asset_name": "2026-chevrolet-blazer-ev-police-order-guide-gm.pdf",
        "role": "supporting_specialty_vehicle_order_guide_snapshot",
        "path": ROOT
        / "tmp"
        / "specialty-color-research"
        / "official-order-guides"
        / "2026-blazer-ev-police-package-23158.pdf",
        "url": "https://eog-api.musea2.azure.ext.gm.com/api/Pdf/GeneratePdf/23158/all/en-us",
        "sha256": "923db29e3afb311fc812f2059c5196333c9dad0d4d119fbf3961316d57002753",
        "bytes": 200_912,
        "pdf_page_count": 45,
    },
    {
        "source_id": "gm-2026-silverado-9c1-041426",
        "asset_name": "2026-chevrolet-silverado-9c1-specification-guide-gm.pdf",
        "role": "controlling_specialty_vehicle_specification_guide",
        "path": ROOT
        / "tmp"
        / "specialty-release-assets"
        / "2026-chevrolet-silverado-9c1-specification-guide-gm.pdf",
        "url": "https://www.gmupfitter.com/wp-content/uploads/2026/04/2026-Silverado-9C1-Specification-Guide-041426.pdf",
        "sha256": "f752054c635fd45b3f27adc65631b19de2521a6e9441b8b4e348cfcbb8e310fc",
        "bytes": 21_324_144,
        "pdf_page_count": 41,
    },
    {
        "source_id": "gm-2026-silverado-5w4-041426",
        "asset_name": "2026-chevrolet-silverado-5w4-ssv-specification-guide-gm.pdf",
        "role": "controlling_specialty_vehicle_specification_guide",
        "path": ROOT
        / "tmp"
        / "specialty-release-assets"
        / "2026-chevrolet-silverado-5w4-ssv-specification-guide-gm.pdf",
        "url": "https://www.gmupfitter.com/wp-content/uploads/2026/04/2026-Silverado-SSV-Specification-Guide-041426.pdf",
        "sha256": "ff1940144fd4c8426ac98a2e7fc9d48a685ff68a2d8fe2be3e6aa3dfc51e50ba",
        "bytes": 16_899_437,
        "pdf_page_count": 38,
    },
    {
        "source_id": "chevrolet-sales-brochure-2000-tahoe-z71-colors-scan",
        "asset_name": "2000-chevrolet-tahoe-z71-brochure-colors.jpg",
        "role": "qualified_original_brochure_scan",
        "path": ROOT
        / "tmp"
        / "tahoe-source-research"
        / "2000-chevrolet-tahoe-z71-brochure-colors.jpg",
        "url": "https://www.gmt400.com/attachments/2000-z71-tahoe-brochure-colors-jpg.372777/",
        "retrieval_url": "https://www.gmt400.com/data/attachments/357/357680-9100c496d554e77aafac98846d23a7f5.jpg",
        "parent_source_url": "https://www.gmt400.com/threads/gmt400-tahoe-z71.67412/",
        "sha256": "bc150ee6d2c813fdca40d85e092ef1da03b87c102619bae0f48594a9fb4e4c4b",
        "bytes": 46_014,
    },
    {
        "source_id": "chevrolet-order-guide-2000-tahoe-z71-page-1-scan",
        "asset_name": "2000-chevrolet-tahoe-z71-order-guide-page-1.jpg",
        "role": "qualified_original_order_guide_scan",
        "path": ROOT
        / "tmp"
        / "tahoe-source-research"
        / "2000-chevrolet-tahoe-z71-order-guide-page-1.jpg",
        "url": "https://www.gmt400.com/attachments/truck-order-guide-z71-page-1-jpg.372780/",
        "retrieval_url": "https://www.gmt400.com/data/attachments/357/357683-9c9e15526d8cf50107fcf239b3a19b05.jpg",
        "parent_source_url": "https://www.gmt400.com/threads/gmt400-tahoe-z71.67412/",
        "sha256": "bd41f45e9cf3a5b2cc9eaef194a79cf14b1870948a0de754e3adcc28d9ca1bc9",
        "bytes": 33_965,
    },
    {
        "source_id": "chevrolet-order-guide-2000-tahoe-z71-page-2-scan",
        "asset_name": "2000-chevrolet-tahoe-z71-order-guide-page-2.jpg",
        "role": "qualified_original_order_guide_scan",
        "path": ROOT
        / "tmp"
        / "tahoe-source-research"
        / "2000-chevrolet-tahoe-z71-order-guide-page-2.jpg",
        "url": "https://www.gmt400.com/attachments/truck-order-guide-z71-page-2-jpg.372781/",
        "retrieval_url": "https://www.gmt400.com/data/attachments/357/357684-87675e51d982900ffa260fba4eed7cc1.jpg",
        "parent_source_url": "https://www.gmt400.com/threads/gmt400-tahoe-z71.67412/",
        "sha256": "2f79e8d60daeadea5048b8c2820871d451aaecdb4fca278bfb1ca6a022d6b2e1",
        "bytes": 27_615,
    },
    {
        "source_id": "chevrolet-order-guide-2000-tahoe-z71-page-3-scan",
        "asset_name": "2000-chevrolet-tahoe-z71-order-guide-page-3.jpg",
        "role": "qualified_original_order_guide_scan",
        "path": ROOT
        / "tmp"
        / "tahoe-source-research"
        / "2000-chevrolet-tahoe-z71-order-guide-page-3.jpg",
        "url": "https://www.gmt400.com/attachments/truck-order-guide-z71-page-3-jpg.372782/",
        "retrieval_url": "https://www.gmt400.com/data/attachments/357/357685-dad7ee20c9a933a0e2609c430ba8e7a8.jpg",
        "parent_source_url": "https://www.gmt400.com/threads/gmt400-tahoe-z71.67412/",
        "sha256": "3bf95389040eb7dcce18429f4a16caf22d64e9a51372fe177053b30de15ba390",
        "bytes": 27_121,
    },
    {
        "source_id": "gm-heritage-1963-chevrolet-truck",
        "asset_name": "1963-chevrolet-truck-vehicle-information-kit-gm.pdf",
        "role": "comparison_vehicle_information_kit",
        "path": ROOT
        / "tmp"
        / "source-gap-downloads"
        / "1963-chevrolet-truck-vehicle-information-kit-gm.pdf",
        "url": "https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1963-Chevrolet-Truck.pdf",
        "sha256": "a9388da4129296a00935a715fbf5e733b3cbdb2269b4a70a8a75827b0f49c08e",
        "bytes": 4_439_704,
        "pdf_page_count": 107,
    },
    {
        "source_id": "chevrolet-service-news-1963-truck-refinish-extract",
        "asset_name": "1963-chevrolet-service-news-paint-refinish-codes.pdf",
        "role": "comparison_refinish_extract",
        "path": ROOT
        / "tmp"
        / "source-gap-downloads"
        / "1963-chevrolet-service-news-paint-refinish-codes.pdf",
        "url": "http://www.corvair.org/chapters/corvanatics/files/resources/63-PntRefCodes.pdf",
        "retrieval_url": "https://web.archive.org/web/20171215004756id_/http://www.corvair.org/chapters/corvanatics/files/resources/63-PntRefCodes.pdf",
        "parent_source_url": "https://www.corvair.org/chapters/corvanatics/files/documents/manuals/ChevServNws/CSN-34-9.pdf",
        "sha256": "f4b7ff7f16a25af1d60a6c657937b052d5add3998cbc3124bccd544c97efcce3",
        "bytes": 66_513,
        "pdf_page_count": 2,
    },
    {
        "source_id": "chevrolet-service-news-volume-34-no-9",
        "asset_name": "1962-october-chevrolet-service-news-vol-34-no-9.pdf",
        "role": "parent_service_news_issue",
        "path": ROOT
        / "tmp"
        / "source-gap-downloads"
        / "1962-october-chevrolet-service-news-vol-34-no-9.pdf",
        "url": "https://www.corvair.org/chapters/corvanatics/files/documents/manuals/ChevServNws/CSN-34-9.pdf",
        "retrieval_url": "https://web.archive.org/web/20221017094958id_/https://www.corvair.org/chapters/corvanatics/files/documents/manuals/ChevServNws/CSN-34-9.pdf",
        "sha256": "a498ab3c02afd3186ade6e5edeabc3724346b8b3a2a1ef450f2a3901b65a896e",
        "bytes": 25_963_347,
        "pdf_page_count": 48,
    },
    {
        "source_id": "corvanatics-corvair95-paint-trim-refinish-codes",
        "asset_name": "corvair95-paint-trim-refinish-codes.pdf",
        "role": "comparison_refinish_compilation",
        "path": ROOT
        / "tmp"
        / "source-gap-downloads"
        / "corvair95-paint-trim-refinish-codes.pdf",
        "url": "https://www.corvair.org/chapters/corvanatics/files/resources/PainTrimRefinCodes.pdf",
        "retrieval_url": "https://web.archive.org/web/20240519115026id_/https://www.corvair.org/chapters/corvanatics/files/resources/PainTrimRefinCodes.pdf",
        "sha256": "083bbdc28cd5e2e494a4285fbd786487f081a48a62d8edeab49fb3d0df3fbca5",
        "bytes": 315_056,
        "pdf_page_count": 11,
    },
    {
        "source_id": "gm-heritage-1982-chevrolet-truck",
        "asset_name": "1982-chevrolet-truck-vehicle-information-kit-gm.pdf",
        "role": "comparison_vehicle_information_kit",
        "path": ROOT
        / "tmp"
        / "specialty-color-sources"
        / "gm-truck-kits"
        / "1982-Chevrolet-Truck.pdf",
        "url": "https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1982-Chevrolet-Truck.pdf",
        "sha256": "665d96d3115ef330fb232152c92d532a1f52ac63a6ec6b4e8e0387066c334b28",
        "bytes": 4_431_496,
        "pdf_page_count": 115,
    },
    {
        "source_id": "gm-heritage-1989-chevrolet-truck",
        "asset_name": "1989-chevrolet-truck-vehicle-information-kit-gm.pdf",
        "role": "comparison_vehicle_information_kit",
        "path": ROOT
        / "tmp"
        / "specialty-color-sources"
        / "gm-truck-kits"
        / "1989-Chevrolet-Truck.pdf",
        "url": "https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1989-Chevrolet-Truck.pdf",
        "sha256": "c224e4fb79f74f3906b771b268edc28848dfd55a1d5f1e28523d0092cf414996",
        "bytes": 1_683_159,
        "pdf_page_count": 35,
    },
    {
        "source_id": "gm-heritage-1993-chevrolet-truck",
        "asset_name": "1993-chevrolet-truck-vehicle-information-kit-gm.pdf",
        "role": "controlling_specialty_vehicle_information_kit",
        "path": ROOT
        / "tmp"
        / "specialty-color-sources"
        / "gm-truck-kits"
        / "1993-Chevrolet-Truck.pdf",
        "url": "https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1993-Chevrolet-Truck.pdf",
        "sha256": "5183176f4af0d61bd63cc7d6fb02117129c870c28c42bc9fe22abcc2eea52d3e",
        "bytes": 13_034_550,
        "pdf_page_count": 94,
    },
)


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def verified_metadata(path: Path, expected_sha256: str, expected_bytes: int) -> None:
    if not path.is_file():
        raise FileNotFoundError(path)
    if path.stat().st_size != expected_bytes:
        raise ValueError(f"byte-size mismatch: {path}")
    if sha256_file(path) != expected_sha256:
        raise ValueError(f"SHA-256 mismatch: {path}")


def crawler_entries() -> list[dict[str, Any]]:
    ledger = load_json(ARTIFACT_LEDGER_PATH)
    by_id = {entry["source_id"]: entry for entry in ledger["entries"]}
    result: list[dict[str, Any]] = []
    for source_id, asset_name, role in CRAWLER_SOURCES:
        source = by_id[source_id]
        path = CRAWLER_OBJECT_ROOT / Path(source["crawler_object_relpath"])
        result.append(
            {
                "source_id": source_id,
                "asset_name": asset_name,
                "role": role,
                "path": path,
                "url": source["canonical_url"],
                "sha256": source["artifact_sha256"],
                "bytes": int(source["byte_length"]),
                "pdf_page_count": int(source["pdf_page_count"]),
            }
        )
    return result


def modern_entries() -> list[dict[str, Any]]:
    ledger = load_json(MODERN_SOURCE_LEDGER_PATH)
    retained_sources = [
        source for source in ledger["sources"] if source.get("local_file_path")
    ]
    expected_source_ids = {source_id for source_id, _, _ in MODERN_SOURCES}
    actual_source_ids = {source["source_id"] for source in retained_sources}
    if actual_source_ids != expected_source_ids:
        missing = sorted(expected_source_ids - actual_source_ids)
        unexpected = sorted(actual_source_ids - expected_source_ids)
        raise ValueError(
            "modern retained-source set does not match the exact audited set: "
            f"missing={missing}, unexpected={unexpected}"
        )
    if len(retained_sources) != len(MODERN_SOURCES):
        raise ValueError(
            f"expected {len(MODERN_SOURCES)} modern retained sources, "
            f"found {len(retained_sources)}"
        )

    fleet_count = sum(
        source["source_type"] == "fleet_guide_pdf" for source in retained_sources
    )
    brochure_count = sum(
        source["source_type"] in {"consumer_brochure_pdf", "commercial_brochure_pdf"}
        for source in retained_sources
    )
    if (fleet_count, brochure_count) != (19, 4):
        raise ValueError(
            "modern retained sources must contain exactly 19 Fleet Guides and "
            f"four eBrochures, found {fleet_count} and {brochure_count}"
        )

    by_id = {source["source_id"]: source for source in retained_sources}
    result: list[dict[str, Any]] = []
    root = ROOT.resolve()
    for source_id, asset_name, role in MODERN_SOURCES:
        source = by_id[source_id]
        relative_path = Path(source["local_file_path"])
        if relative_path.is_absolute():
            raise ValueError(f"modern local_file_path must be relative: {source_id}")
        source_path = (ROOT / relative_path).resolve()
        try:
            source_path.relative_to(root)
        except ValueError as error:
            raise ValueError(
                f"modern local_file_path escapes the repository: {source_id}"
            ) from error
        result.append(
            {
                "source_id": source_id,
                "asset_name": asset_name,
                "role": role,
                "path": source_path,
                "url": source["retrieval_url"],
                "sha256": source["sha256"],
                "bytes": int(source["bytes"]),
                "pdf_page_count": int(source["page_count"]),
            }
        )
    return result


def assert_unique(
    entries: list[dict[str, Any]], key: str, label: str, *, allow_missing: bool = False
) -> None:
    seen: dict[Any, str] = {}
    for entry in entries:
        value = entry.get(key)
        if allow_missing and value is None:
            continue
        asset_name = entry["asset_name"]
        if value in seen:
            raise ValueError(
                f"duplicate {label} for {seen[value]} and {asset_name}: {value}"
            )
        seen[value] = asset_name


def release_entry(source: dict[str, Any]) -> dict[str, Any]:
    entry = {
        "asset_name": source["asset_name"],
        "archive_url": f"{RELEASE_BASE}{source['asset_name']}",
        "sha256": source["sha256"],
        "bytes": source["bytes"],
        "role": source["role"],
        "source_id": source["source_id"],
        "original_source_url": source["url"],
    }
    if source.get("pdf_page_count") is not None:
        entry["pdf_page_count"] = int(source["pdf_page_count"])
    for key in ("retrieval_url", "parent_source_url"):
        if source.get(key):
            entry[key] = source[key]
    return entry


def add_archive_metadata(source_by_id: dict[str, dict[str, Any]]) -> None:
    audit_paths = (
        ROOT / "data" / "audits" / "suburban-1969-1976.json",
        ROOT / "data" / "audits" / "suburban-2000-2007.json",
        ROOT / "data" / "audits" / "tahoe-1995-2000.json",
        ROOT / "data" / "audits" / "tahoe-2001-2007.json",
        ROOT / "data" / "sources" / "specialty-color-source-candidates.json",
        MODERN_SOURCE_LEDGER_PATH,
    )

    def walk(value: Any) -> None:
        if isinstance(value, list):
            for item in value:
                walk(item)
            return
        if not isinstance(value, dict):
            return
        source_id = value.get("source_id")
        source = source_by_id.get(source_id)
        if source:
            value["archive_asset_name"] = source["asset_name"]
            value["archive_url"] = f"{RELEASE_BASE}{source['asset_name']}"
            value["sha256"] = source["sha256"]
            value["bytes"] = int(source["bytes"])
            if source.get("pdf_page_count") is not None:
                value["pdf_page_count"] = int(source["pdf_page_count"])
        for item in value.values():
            walk(item)

    for audit_path in audit_paths:
        audit = load_json(audit_path)
        walk(audit)
        audit_path.write_text(
            json.dumps(audit, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
            newline="\n",
        )


def main() -> int:
    manifest = load_json(MANIFEST_PATH)
    existing_entries = manifest["entries"]
    assert_unique(existing_entries, "asset_name", "existing manifest asset name")
    assert_unique(existing_entries, "archive_url", "existing manifest archive URL")
    existing_by_name = {entry["asset_name"]: entry for entry in existing_entries}

    missing_preserved_assets = sorted(
        set(PRESERVED_EXISTING_ASSET_NAMES) - existing_by_name.keys()
    )
    if missing_preserved_assets:
        raise ValueError(
            "manifest is missing explicitly preserved legacy assets: "
            f"{missing_preserved_assets}"
        )
    if len(PRESERVED_EXISTING_ASSET_NAMES) != EXPECTED_PRESERVED_ASSET_COUNT:
        raise ValueError(
            f"expected {EXPECTED_PRESERVED_ASSET_COUNT} preserved asset names, "
            f"found {len(PRESERVED_EXISTING_ASSET_NAMES)}"
        )

    sources = [*crawler_entries(), *LOCAL_SOURCES, *modern_entries()]
    if len(sources) != EXPECTED_RETAINED_SOURCE_ASSET_COUNT:
        raise ValueError(
            f"expected {EXPECTED_RETAINED_SOURCE_ASSET_COUNT} retained source assets, "
            f"found {len(sources)}"
        )
    assert_unique(sources, "asset_name", "retained source asset name")
    assert_unique(sources, "source_id", "retained source ID")
    assert_unique(sources, "sha256", "retained source SHA-256")

    preserved_entries = [
        dict(existing_by_name[asset_name])
        for asset_name in PRESERVED_EXISTING_ASSET_NAMES
    ]
    preserved_names = {entry["asset_name"] for entry in preserved_entries}
    generated_names = {source["asset_name"] for source in sources}
    overlap = sorted(preserved_names & generated_names)
    if overlap:
        raise ValueError(
            f"preserved and regenerated Release asset sets overlap: {overlap}"
        )

    STAGING.mkdir(parents=True, exist_ok=True)
    generated_entries: list[dict[str, Any]] = []
    for source in sources:
        verified_metadata(source["path"], source["sha256"], source["bytes"])
        existing = existing_by_name.get(source["asset_name"])
        if existing and (
            existing["sha256"] != source["sha256"]
            or int(existing["bytes"]) != int(source["bytes"])
        ):
            raise ValueError(
                "existing manifest asset name resolves to different bytes: "
                f"{source['asset_name']}"
            )
        destination = STAGING / source["asset_name"]
        shutil.copy2(source["path"], destination)
        generated_entries.append(release_entry(source))

    final_non_checksum_entries = [*preserved_entries, *generated_entries]
    if len(final_non_checksum_entries) != EXPECTED_NON_CHECKSUM_ASSET_COUNT:
        raise ValueError(
            f"expected {EXPECTED_NON_CHECKSUM_ASSET_COUNT} non-checksum assets, "
            f"found {len(final_non_checksum_entries)}"
        )
    assert_unique(final_non_checksum_entries, "asset_name", "final asset name")
    assert_unique(final_non_checksum_entries, "archive_url", "final archive URL")
    assert_unique(final_non_checksum_entries, "sha256", "final SHA-256")
    assert_unique(
        final_non_checksum_entries,
        "source_id",
        "final source ID",
        allow_missing=True,
    )

    for entry in final_non_checksum_entries:
        if Path(entry["asset_name"]).suffix.casefold() != ".pdf":
            continue
        staged_path = STAGING / entry["asset_name"]
        verified_metadata(staged_path, entry["sha256"], int(entry["bytes"]))
        actual_page_count = len(PdfReader(staged_path, strict=False).pages)
        expected_page_count = entry.get("pdf_page_count")
        if (
            expected_page_count is not None
            and int(expected_page_count) != actual_page_count
        ):
            raise ValueError(
                f"PDF page-count mismatch: {entry['asset_name']} "
                f"expected {expected_page_count}, found {actual_page_count}"
            )
        entry["pdf_page_count"] = actual_page_count

    pdf_entries = [
        entry
        for entry in final_non_checksum_entries
        if Path(entry["asset_name"]).suffix.casefold() == ".pdf"
    ]
    pdf_bytes = sum(int(entry["bytes"]) for entry in pdf_entries)
    pdf_pages = sum(int(entry["pdf_page_count"]) for entry in pdf_entries)
    if (
        len(pdf_entries),
        pdf_bytes,
        pdf_pages,
    ) != (
        EXPECTED_PDF_COUNT,
        EXPECTED_PDF_BYTES,
        EXPECTED_PDF_PAGE_COUNT,
    ):
        raise ValueError(
            "final PDF closure mismatch: "
            f"found {len(pdf_entries)} PDFs, {pdf_bytes} bytes, and {pdf_pages} "
            f"pages; expected {EXPECTED_PDF_COUNT}, {EXPECTED_PDF_BYTES}, and "
            f"{EXPECTED_PDF_PAGE_COUNT}"
        )

    checksum_name = "source-sha256-manifest.txt"
    if checksum_name not in existing_by_name:
        raise ValueError(f"manifest is missing checksum asset: {checksum_name}")
    checksum_entry = dict(existing_by_name[checksum_name])
    ordered = sorted(final_non_checksum_entries, key=lambda entry: entry["asset_name"])
    checksum_text = "".join(
        f"{entry['sha256']}  {entry['asset_name']}\n" for entry in ordered
    )
    checksum_path = STAGING / checksum_name
    checksum_path.write_text(checksum_text, encoding="utf-8", newline="\n")
    checksum_entry["sha256"] = sha256_file(checksum_path)
    checksum_entry["bytes"] = checksum_path.stat().st_size
    if checksum_entry["asset_name"] != checksum_name:
        raise ValueError("checksum manifest entry has the wrong asset name")

    manifest["captured_at"] = "2026-07-22"
    manifest["scope"] = (
        "Retained governing, reviewed-no-chart, supporting, carrier, and comparison "
        "sources for the 1963, 1969-1976, 1982, 1989, 1993, and 2000-2007 "
        "Chevrolet Suburban color audits and the 1995-2007 Chevrolet Tahoe audits, "
        "including retained Tahoe sales brochures, specification sheets, code guides, "
        "and police-configuration contracts, plus the complete 1963 comparison record: "
        "the GM truck kit, exact Service News extract, its complete parent issue, and "
        "the Corvair 95 paint-and-trim compilation. The archive also retains the "
        "1979 Blazer and 1993 S-10 vehicle information kits, the 1980 Chevrolet "
        "truck color-and-trim kit, the 2011-2014 Chevrolet municipal and police "
        "manuals, the 2015-2017 Caprice PPV 9C1 specification guides, the 2023 "
        "Bolt EUV SSV guide, the 2024-2026 Blazer EV municipal "
        "guides, two dated Blazer EV order-guide snapshots, and the April 14, 2026 "
        "Silverado 9C1 and 5W4 guides. It also retains all 19 audited 2008-2026 GM "
        "Fleet Guides and four audited 2022-2023 Chevrolet eBrochures that govern "
        "qualified modern palette unions. Original, retrieval, and parent URLs are recorded separately "
        "where the live carrier is unavailable. No source or carrier states a reuse "
        "license."
    )
    manifest["entries"] = [*ordered, checksum_entry]
    if len(manifest["entries"]) != EXPECTED_ASSET_COUNT:
        raise ValueError(
            f"expected {EXPECTED_ASSET_COUNT} final assets, "
            f"found {len(manifest['entries'])}"
        )
    assert_unique(manifest["entries"], "asset_name", "manifest asset name")
    assert_unique(manifest["entries"], "archive_url", "manifest archive URL")
    assert_unique(manifest["entries"], "sha256", "manifest SHA-256")
    MANIFEST_PATH.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )

    add_archive_metadata({source["source_id"]: source for source in sources})
    retained_pdf_sources = [
        source
        for source in sources
        if Path(source["asset_name"]).suffix.casefold() == ".pdf"
    ]
    print(
        json.dumps(
            {
                "asset_count": len(manifest["entries"]),
                "retained_source_asset_count": len(sources),
                "retained_source_pdf_count": len(retained_pdf_sources),
                "retained_source_pdf_bytes": sum(
                    source["bytes"] for source in retained_pdf_sources
                ),
                "final_pdf_count": len(pdf_entries),
                "final_pdf_bytes": pdf_bytes,
                "final_pdf_page_count": pdf_pages,
                "checksum_covered_assets": len(ordered),
            },
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
