from __future__ import annotations

import hashlib
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

from .config import CrawlerConfig
from .db import Database, utc_now


class ExtractionError(RuntimeError):
    pass


def artifact_path(db: Database, config: CrawlerConfig, sha256: str) -> Path:
    row = db.fetch_artifact(sha256)
    path = config.object_root / row["object_relpath"]
    if not path.is_file():
        raise ExtractionError(f"artifact object is missing: {sha256}")
    return path


def _atomic_text_write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.with_suffix(path.suffix + ".tmp")
    with temp_path.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(temp_path, path)


def _command_available(command: str) -> bool:
    path = Path(command)
    return path.is_file() if path.parent != Path(".") else shutil.which(command) is not None


def _run(command: list[str], timeout: int = 300) -> subprocess.CompletedProcess[str]:
    try:
        result = subprocess.run(
            command,
            stdin=subprocess.DEVNULL,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise ExtractionError(f"command failed to start or timed out: {command[0]}") from exc
    if result.returncode != 0:
        detail = (result.stderr or result.stdout or "no diagnostic output").strip()
        raise ExtractionError(f"{command[0]} exited {result.returncode}: {detail[:1000]}")
    return result


def inspect_pdf(db: Database, config: CrawlerConfig, sha256: str) -> tuple[int, str]:
    path = artifact_path(db, config, sha256)
    pdfinfo = config.commands["pdfinfo"]
    if _command_available(pdfinfo):
        try:
            result = _run([pdfinfo, str(path)])
            match = re.search(r"^Pages:\s+(\d+)\s*$", result.stdout, flags=re.MULTILINE)
            if not match:
                raise ExtractionError("pdfinfo did not report a page count")
            return int(match.group(1)), "pdfinfo"
        except ExtractionError:
            pass
    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise ExtractionError("neither pdfinfo nor the optional pypdf module is available") from exc
    try:
        return len(PdfReader(str(path), strict=False).pages), "pypdf"
    except Exception as exc:
        raise ExtractionError(f"pypdf could not inspect the document: {exc}") from exc


def _extract_with_pypdf(path: Path, page_number: int) -> str:
    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise ExtractionError("pdftotext is unavailable and pypdf is not installed") from exc
    try:
        page = PdfReader(str(path), strict=False).pages[page_number - 1]
        return page.extract_text() or ""
    except Exception as exc:
        raise ExtractionError(f"pypdf failed on PDF page {page_number}: {exc}") from exc


def extract_native_page(
    db: Database, config: CrawlerConfig, sha256: str, page_number: int
) -> tuple[str, str, int]:
    path = artifact_path(db, config, sha256)
    pdftotext = config.commands["pdftotext"]
    if _command_available(pdftotext):
        try:
            with tempfile.TemporaryDirectory(dir=config.temp_root) as temp_dir:
                output_path = Path(temp_dir) / "page.txt"
                _run(
                    [
                        pdftotext,
                        "-f",
                        str(page_number),
                        "-l",
                        str(page_number),
                        "-layout",
                        "-enc",
                        "UTF-8",
                        str(path),
                        str(output_path),
                    ]
                )
                text = output_path.read_text(encoding="utf-8", errors="replace")
                extractor = "pdftotext"
        except ExtractionError:
            text = _extract_with_pypdf(path, page_number)
            extractor = "pypdf"
    else:
        text = _extract_with_pypdf(path, page_number)
        extractor = "pypdf"
    return store_page_text(
        db, config, sha256, page_number, "native", text, extractor=extractor
    )


def extract_ocr_page(
    db: Database, config: CrawlerConfig, sha256: str, page_number: int
) -> tuple[str, str, int]:
    path = artifact_path(db, config, sha256)
    pdftoppm = config.commands["pdftoppm"]
    tesseract = config.commands["tesseract"]
    if not _command_available(pdftoppm) or not _command_available(tesseract):
        raise ExtractionError("OCR requires both pdftoppm and tesseract")
    with tempfile.TemporaryDirectory(dir=config.temp_root) as temp_dir:
        prefix = Path(temp_dir) / "page"
        _run(
            [
                pdftoppm,
                "-f",
                str(page_number),
                "-l",
                str(page_number),
                "-singlefile",
                "-r",
                "300",
                "-png",
                str(path),
                str(prefix),
            ],
            timeout=600,
        )
        image_path = prefix.with_suffix(".png")
        if not image_path.is_file():
            raise ExtractionError("pdftoppm did not produce the expected page image")
        result = _run(
            [tesseract, str(image_path), "stdout", "-l", "eng", "--psm", "6"],
            timeout=600,
        )
        text = result.stdout
    return store_page_text(
        db,
        config,
        sha256,
        page_number,
        "ocr",
        text,
        extractor="pdftoppm+tesseract",
    )


def store_page_text(
    db: Database,
    config: CrawlerConfig,
    sha256: str,
    page_number: int,
    method: str,
    text: str,
    extractor: str | None = None,
) -> tuple[str, str, int]:
    normalized_text = text.replace("\r\n", "\n").replace("\r", "\n")
    character_count = len(normalized_text.strip())
    if character_count == 0:
        status = "empty"
    elif character_count < config.native_text_min_chars:
        status = "weak"
    else:
        status = "usable"
    relpath = (
        Path("text")
        / sha256[:2]
        / sha256
        / f"page-{page_number:05d}.{method}.txt"
    )
    output_path = config.derived_root / relpath
    _atomic_text_write(output_path, normalized_text)
    text_sha256 = hashlib.sha256(normalized_text.encode("utf-8")).hexdigest()
    db.connection.execute(
        """
        INSERT INTO page_text (
            artifact_sha256, page_number, method, extractor, text_relpath,
            text_sha256, character_count, extraction_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(artifact_sha256, page_number, method) DO UPDATE SET
            extractor = excluded.extractor,
            text_relpath = excluded.text_relpath,
            text_sha256 = excluded.text_sha256,
            character_count = excluded.character_count,
            extraction_status = excluded.extraction_status,
            created_at = excluded.created_at
        """,
        (
            sha256,
            page_number,
            method,
            extractor or method,
            relpath.as_posix(),
            text_sha256,
            character_count,
            status,
            utc_now(),
        ),
    )
    return status, text_sha256, character_count


def best_page_text(
    db: Database, config: CrawlerConfig, sha256: str, page_number: int
) -> tuple[str, str, str, str]:
    rows = db.connection.execute(
        """
        SELECT * FROM page_text
        WHERE artifact_sha256 = ? AND page_number = ?
        ORDER BY
            CASE extraction_status
                WHEN 'usable' THEN 0 WHEN 'weak' THEN 1
                WHEN 'empty' THEN 2 ELSE 3
            END,
            character_count DESC,
            CASE method WHEN 'ocr' THEN 0 ELSE 1 END
        """,
        (sha256, page_number),
    ).fetchall()
    if not rows:
        raise ExtractionError(f"no extracted text for {sha256} PDF page {page_number}")
    row = rows[0]
    text_path = config.derived_root / row["text_relpath"]
    if not text_path.is_file():
        raise ExtractionError(f"derived page text is missing: {row['text_relpath']}")
    return (
        text_path.read_text(encoding="utf-8"),
        row["method"],
        row["text_sha256"],
        row["extractor"],
    )
