from __future__ import annotations

import json
from dataclasses import dataclass, field, fields
from pathlib import Path
from typing import Any


DEFAULT_COMMANDS = {
    "pdfinfo": "pdfinfo",
    "pdftotext": "pdftotext",
    "pdftoppm": "pdftoppm",
    "tesseract": "tesseract",
}


@dataclass(frozen=True)
class CrawlerConfig:
    state_root: Path
    allowed_hosts: tuple[str, ...]
    user_agent: str = "ChevroletColorArchiveResearchBot/0.1 (+https://github.com/ipadmom)"
    request_timeout_seconds: int = 90
    max_download_bytes: int = 250_000_000
    min_pdf_bytes: int = 128
    require_pdf_eof_marker: bool = True
    min_request_interval_seconds: float = 1.0
    lease_seconds: int = 900
    max_job_attempts: int = 5
    retry_base_seconds: int = 30
    native_text_min_chars: int = 80
    allow_http: bool = False
    allow_private_networks: bool = False
    commands: dict[str, str] = field(default_factory=lambda: dict(DEFAULT_COMMANDS))

    @property
    def db_path(self) -> Path:
        return self.state_root / "queue.sqlite3"

    @property
    def object_root(self) -> Path:
        return self.state_root / "objects" / "sha256"

    @property
    def spool_root(self) -> Path:
        return self.state_root / "spool"

    @property
    def derived_root(self) -> Path:
        return self.state_root / "derived"

    @property
    def temp_root(self) -> Path:
        return self.state_root / "tmp"

    def ensure_directories(self) -> None:
        for path in (
            self.state_root,
            self.object_root,
            self.spool_root,
            self.derived_root,
            self.temp_root,
        ):
            path.mkdir(parents=True, exist_ok=True)

    @classmethod
    def from_file(cls, path: str | Path) -> "CrawlerConfig":
        config_path = Path(path).resolve()
        raw: dict[str, Any] = json.loads(config_path.read_text(encoding="utf-8"))
        if not isinstance(raw, dict):
            raise ValueError("configuration root must be a JSON object")
        required = {"state_root", "allowed_hosts"}
        missing = sorted(required - raw.keys())
        if missing:
            raise ValueError(f"configuration is missing: {', '.join(missing)}")
        known = {item.name for item in fields(cls)}
        unknown = sorted(raw.keys() - known)
        if unknown:
            raise ValueError(f"unknown configuration fields: {', '.join(unknown)}")
        state_root = Path(raw["state_root"])
        if not state_root.is_absolute():
            state_root = (config_path.parent / state_root).resolve()
        allowed_hosts = tuple(str(item).lower().strip(".") for item in raw["allowed_hosts"])
        if not allowed_hosts:
            raise ValueError("allowed_hosts must contain at least one host")
        values = dict(raw)
        values["state_root"] = state_root
        values["allowed_hosts"] = allowed_hosts
        commands = values.get("commands", {})
        if not isinstance(commands, dict):
            raise ValueError("commands must be a JSON object")
        merged_commands = dict(DEFAULT_COMMANDS)
        merged_commands.update({str(key): str(value) for key, value in commands.items()})
        values["commands"] = merged_commands
        config = cls(**values)
        if config.request_timeout_seconds <= 0:
            raise ValueError("request_timeout_seconds must be positive")
        if config.max_download_bytes <= 0 or config.min_pdf_bytes <= 0:
            raise ValueError("download byte limits must be positive")
        if config.min_pdf_bytes > config.max_download_bytes:
            raise ValueError("min_pdf_bytes cannot exceed max_download_bytes")
        if config.min_request_interval_seconds < 0:
            raise ValueError("min_request_interval_seconds cannot be negative")
        if config.lease_seconds <= 0 or config.max_job_attempts <= 0:
            raise ValueError("lease_seconds and max_job_attempts must be positive")
        if config.retry_base_seconds < 0 or config.native_text_min_chars < 0:
            raise ValueError("retry and text thresholds cannot be negative")
        return config
