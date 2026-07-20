from __future__ import annotations

import hashlib
import http.client
import ipaddress
import json
import os
import re
import socket
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

from .config import CrawlerConfig
from .db import Database, utc_now


SAFE_RESPONSE_HEADERS = {
    "content-length",
    "content-type",
    "content-range",
    "etag",
    "last-modified",
    "date",
    "server",
    "accept-ranges",
}
CONTENT_RANGE_PATTERN = re.compile(r"^bytes\s+(\d+)-(\d+)/(\d+|\*)$", re.I)


class DownloadError(RuntimeError):
    pass


def _host_allowed(host: str, allowed_hosts: tuple[str, ...]) -> bool:
    host = host.lower().rstrip(".")
    return any(host == allowed or host.endswith("." + allowed) for allowed in allowed_hosts)


def validate_url(url: str, config: CrawlerConfig) -> None:
    parsed = urllib.parse.urlsplit(url)
    if parsed.username or parsed.password:
        raise DownloadError("URLs containing credentials are not permitted")
    if parsed.scheme not in ({"https", "http"} if config.allow_http else {"https"}):
        raise DownloadError(f"URL scheme is not permitted: {parsed.scheme or '(missing)'}")
    host = (parsed.hostname or "").lower().rstrip(".")
    if not host or not _host_allowed(host, config.allowed_hosts):
        raise DownloadError(f"URL host is not allowlisted: {host or '(missing)'}")
    if config.allow_private_networks:
        return
    try:
        addresses = {
            result[4][0]
            for result in socket.getaddrinfo(host, parsed.port or 443, type=socket.SOCK_STREAM)
        }
    except socket.gaierror as exc:
        raise DownloadError(f"DNS resolution failed for {host}: {exc}") from exc
    for address in addresses:
        parsed_address = ipaddress.ip_address(address)
        if (
            parsed_address.is_private
            or parsed_address.is_loopback
            or parsed_address.is_link_local
            or parsed_address.is_multicast
            or parsed_address.is_reserved
            or parsed_address.is_unspecified
        ):
            raise DownloadError(f"URL resolved to a non-public address: {host}")


class SafeRedirectHandler(urllib.request.HTTPRedirectHandler):
    def __init__(self, config: CrawlerConfig):
        self.config = config
        super().__init__()

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        validate_url(newurl, self.config)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def _response_headers(response: Any) -> dict[str, str]:
    return {
        key.lower(): value
        for key, value in response.headers.items()
        if key.lower() in SAFE_RESPONSE_HEADERS
    }


def _artifact_relpath(sha256: str) -> Path:
    return Path(sha256[:2]) / sha256[2:4] / f"{sha256}.pdf"


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _write_spool_metadata(path: Path, metadata: dict[str, Any]) -> None:
    temp_path = path.with_suffix(path.suffix + ".tmp")
    with temp_path.open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(metadata, handle, sort_keys=True)
        handle.write("\n")
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(temp_path, path)


def _validate_complete_pdf(path: Path, config: CrawlerConfig, expected_size: int | None) -> None:
    size = path.stat().st_size
    if expected_size is not None and size != expected_size:
        raise DownloadError(f"incomplete response: received {size} bytes, expected {expected_size}")
    if size < config.min_pdf_bytes:
        raise DownloadError(f"response is too small to be a complete PDF: {size} bytes")
    with path.open("rb") as handle:
        if handle.read(5) != b"%PDF-":
            raise DownloadError("response does not begin with a PDF signature")
        if config.require_pdf_eof_marker:
            handle.seek(max(0, size - 1_048_576))
            if b"%%EOF" not in handle.read():
                raise DownloadError("PDF end marker was not found near the end of the response")


def _expected_total(response: Any, existing_size: int, append: bool) -> int | None:
    content_range = response.headers.get("Content-Range")
    if content_range:
        match = CONTENT_RANGE_PATTERN.match(content_range.strip())
        if not match:
            raise DownloadError(f"invalid Content-Range: {content_range}")
        start, _end, total = match.groups()
        if int(start) != existing_size:
            raise DownloadError(
                f"server resumed at byte {start}, but local partial has {existing_size} bytes"
            )
        return None if total == "*" else int(total)
    content_length = response.headers.get("Content-Length")
    if content_length is None:
        return None
    response_length = int(content_length)
    return existing_size + response_length if append else response_length


def _record_failed_fetch(
    db: Database,
    fetch_id: int,
    outcome: str,
    error: str,
    bytes_received: int | None,
) -> None:
    db.connection.execute(
        """
        UPDATE source_fetches
        SET completed_at = ?, outcome = ?, error = ?,
            bytes_received = COALESCE(?, bytes_received)
        WHERE fetch_id = ?
        """,
        (utc_now(), outcome, error[:4000], bytes_received, fetch_id),
    )


def download_source(
    db: Database,
    config: CrawlerConfig,
    source_id: str,
    manifest_sha256: str | None = None,
) -> str:
    source = db.fetch_source(source_id)
    url = source["canonical_url"]
    validate_url(url, config)
    config.ensure_directories()
    manifest_sha256 = manifest_sha256 or source["manifest_sha256"]

    spool_name = hashlib.sha256(source_id.encode("utf-8")).hexdigest() + ".part"
    spool_path = config.spool_root / spool_name
    spool_metadata_path = spool_path.with_suffix(".part.json")
    spool_metadata: dict[str, Any] = {}
    if spool_metadata_path.is_file():
        try:
            spool_metadata = json.loads(spool_metadata_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            spool_metadata = {}
    resumable_validator = spool_metadata.get("etag") or spool_metadata.get("last_modified")
    can_resume = (
        spool_path.is_file()
        and spool_metadata.get("url") == url
        and bool(resumable_validator)
    )
    existing_size = spool_path.stat().st_size if can_resume else 0
    request_headers = {
        "User-Agent": config.user_agent,
        "Accept": "application/pdf,application/octet-stream;q=0.8",
        "Accept-Encoding": "identity",
    }
    if existing_size:
        request_headers["Range"] = f"bytes={existing_size}-"
        request_headers["If-Range"] = str(resumable_validator)

    now = utc_now()
    cursor = db.connection.execute(
        """
        INSERT INTO source_fetches (
            source_id, manifest_sha256, requested_url, requested_at,
            response_headers_json, outcome
        ) VALUES (?, ?, ?, ?, '{}', 'started')
        """,
        (source_id, manifest_sha256, url, now),
    )
    fetch_id = int(cursor.lastrowid)
    opener = urllib.request.build_opener(SafeRedirectHandler(config))

    try:
        host = urllib.parse.urlsplit(url).hostname or ""
        delay = db.reserve_host_slot(host.lower(), config.min_request_interval_seconds)
        if delay:
            time.sleep(delay)
        request = urllib.request.Request(url, headers=request_headers, method="GET")
        with opener.open(request, timeout=config.request_timeout_seconds) as response:
            final_url = response.geturl()
            validate_url(final_url, config)
            status = int(getattr(response, "status", response.getcode()))
            append = existing_size > 0 and status == 206
            if existing_size > 0 and status not in (200, 206):
                raise DownloadError(f"unexpected resume response status: {status}")
            if status not in (200, 206):
                raise DownloadError(f"unexpected HTTP response status: {status}")
            if not append:
                existing_size = 0
            response_etag = response.headers.get("ETag")
            response_last_modified = response.headers.get("Last-Modified")
            if append and spool_metadata.get("etag") and response_etag:
                if spool_metadata["etag"] != response_etag:
                    raise DownloadError("origin ETag changed during a resumed response")
            if append and spool_metadata.get("last_modified") and response_last_modified:
                if spool_metadata["last_modified"] != response_last_modified:
                    raise DownloadError("origin Last-Modified changed during a resumed response")
            expected_total = _expected_total(response, existing_size, append)
            if expected_total is not None and expected_total > config.max_download_bytes:
                raise DownloadError(
                    f"declared response exceeds max_download_bytes: {expected_total}"
                )

            _write_spool_metadata(
                spool_metadata_path,
                {
                    "source_id": source_id,
                    "url": url,
                    "etag": response_etag,
                    "last_modified": response_last_modified,
                    "expected_total": expected_total,
                },
            )
            mode = "ab" if append else "wb"
            bytes_received = existing_size
            with spool_path.open(mode) as output:
                while True:
                    try:
                        chunk = response.read(1024 * 1024)
                    except http.client.IncompleteRead as exc:
                        if exc.partial:
                            bytes_received += len(exc.partial)
                            if bytes_received > config.max_download_bytes:
                                raise DownloadError(
                                    "response exceeded max_download_bytes while streaming"
                                ) from exc
                            output.write(exc.partial)
                            output.flush()
                            os.fsync(output.fileno())
                        raise DownloadError(
                            f"origin closed the response early at {bytes_received} bytes"
                        ) from exc
                    if not chunk:
                        break
                    bytes_received += len(chunk)
                    if bytes_received > config.max_download_bytes:
                        raise DownloadError("response exceeded max_download_bytes while streaming")
                    output.write(chunk)
                output.flush()
                os.fsync(output.fileno())

            headers = _response_headers(response)
            db.connection.execute(
                """
                UPDATE source_fetches SET final_url = ?, http_status = ?,
                    bytes_received = ?, expected_bytes = ?, etag = ?,
                    last_modified = ?, response_headers_json = ?
                WHERE fetch_id = ?
                """,
                (
                    final_url,
                    status,
                    bytes_received,
                    expected_total,
                    headers.get("etag"),
                    headers.get("last-modified"),
                    json.dumps(headers, sort_keys=True),
                    fetch_id,
                ),
            )

        _validate_complete_pdf(spool_path, config, expected_total)
        sha256 = _sha256_file(spool_path)
        relpath = _artifact_relpath(sha256)
        object_path = config.object_root / relpath
        object_path.parent.mkdir(parents=True, exist_ok=True)
        if object_path.exists():
            if object_path.stat().st_size != spool_path.stat().st_size:
                raise DownloadError("existing content-addressed object has the wrong size")
            if _sha256_file(object_path) != sha256:
                raise DownloadError("existing content-addressed object failed its hash check")
            spool_path.unlink()
        else:
            os.replace(spool_path, object_path)
        spool_metadata_path.unlink(missing_ok=True)

        with db.transaction(immediate=True) as conn:
            conn.execute(
                """
                INSERT OR IGNORE INTO artifacts (
                    sha256, byte_length, media_type, object_relpath,
                    integrity_status, created_at
                ) VALUES (?, ?, 'application/pdf', ?, 'complete', ?)
                """,
                (sha256, object_path.stat().st_size, relpath.as_posix(), utc_now()),
            )
            conn.execute(
                "UPDATE source_artifacts SET is_current = 0 WHERE source_id = ?",
                (source_id,),
            )
            conn.execute(
                """
                INSERT INTO source_artifacts (
                    source_id, artifact_sha256, fetch_id, is_current, linked_at
                ) VALUES (?, ?, ?, 1, ?)
                ON CONFLICT(source_id, artifact_sha256) DO UPDATE SET
                    fetch_id = excluded.fetch_id,
                    is_current = 1,
                    linked_at = excluded.linked_at
                """,
                (source_id, sha256, fetch_id, utc_now()),
            )
            conn.execute(
                """
                UPDATE source_fetches SET artifact_sha256 = ?, completed_at = ?,
                    outcome = 'complete', error = NULL
                WHERE fetch_id = ?
                """,
                (sha256, utc_now(), fetch_id),
            )
        return sha256
    except Exception as exc:
        if isinstance(exc, urllib.error.HTTPError):
            headers = _response_headers(exc)
            db.connection.execute(
                """
                UPDATE source_fetches SET final_url = ?, http_status = ?,
                    response_headers_json = ?, etag = ?, last_modified = ?
                WHERE fetch_id = ?
                """,
                (
                    exc.geturl(),
                    exc.code,
                    json.dumps(headers, sort_keys=True),
                    headers.get("etag"),
                    headers.get("last-modified"),
                    fetch_id,
                ),
            )
        outcome = "incomplete" if spool_path.exists() else "failed"
        partial_size = spool_path.stat().st_size if spool_path.exists() else None
        _record_failed_fetch(db, fetch_id, outcome, str(exc), partial_size)
        raise
