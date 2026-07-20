---
title: Chevrolet crawler VPS deployment and operations
visibility: public
classification: archive-internal
sources: crawler/README.md
---

# Crawler VPS runbook

This runbook stages the crawler on a dedicated Linux account. It does not
authorize using an existing shared production VPS. Confirm the target host and
storage budget before deployment.

## 1. Host prerequisites

Recommended minimum for an initial General Motors heritage pass:

- 2 vCPU;
- 4 GB RAM;
- 40 GB free disk, measured before each large manifest;
- Ubuntu 24.04 or equivalent;
- outbound HTTPS;
- no inbound public service.

Install the runtime and extraction tools:

```bash
sudo apt-get update
sudo apt-get install -y python3 poppler-utils tesseract-ocr sqlite3
```

Verify binaries:

```bash
python3 --version
pdfinfo -v
pdftotext -v
pdftoppm -v
tesseract --version
```

The Python code uses the standard library. `pypdf` is an optional page-count and
native-text fallback, not a required package.

## 2. Dedicated account and directories

```bash
sudo useradd --system --home /var/lib/chevy-colors \
  --shell /usr/sbin/nologin chevy-colors
sudo install -d -o chevy-colors -g chevy-colors -m 0750 \
  /var/lib/chevy-colors \
  /var/lib/chevy-colors/state \
  /var/lib/chevy-colors/exports
sudo install -d -o root -g chevy-colors -m 0750 /opt/chevy-color-archive
```

Deploy a reviewed repository checkout to `/opt/chevy-color-archive`. Keep the
checkout owned by root and read-only to the crawler account. Runtime state must
not be inside the checkout.

Create `/etc/chevy-color-archive/config.json`:

```json
{
  "state_root": "/var/lib/chevy-colors/state",
  "allowed_hosts": ["gm.com"],
  "user_agent": "ChevroletColorArchiveResearchBot/0.1 (+https://github.com/ipadmom)",
  "request_timeout_seconds": 90,
  "max_download_bytes": 250000000,
  "min_pdf_bytes": 128,
  "require_pdf_eof_marker": true,
  "min_request_interval_seconds": 1.0,
  "lease_seconds": 900,
  "max_job_attempts": 5,
  "retry_base_seconds": 30,
  "native_text_min_chars": 80,
  "allow_http": false,
  "allow_private_networks": false,
  "commands": {
    "pdfinfo": "pdfinfo",
    "pdftotext": "pdftotext",
    "pdftoppm": "pdftoppm",
    "tesseract": "tesseract"
  }
}
```

No credential belongs in this file. The official General Motors PDFs are
public. Set permissions:

```bash
sudo chown root:chevy-colors /etc/chevy-color-archive/config.json
sudo chmod 0640 /etc/chevy-color-archive/config.json
```

## 3. Preflight

Run these checks before enqueueing a large manifest:

```bash
df -h /var/lib/chevy-colors /tmp /dev/shm
sudo -u chevy-colors test -w /var/lib/chevy-colors/state
sudo -u chevy-colors python3 \
  /opt/chevy-color-archive/crawler/cli.py \
  --config /etc/chevy-color-archive/config.json init
sudo -u chevy-colors python3 -m unittest discover \
  -s /opt/chevy-color-archive/crawler/tests -v
```

Do not begin if the projected source corpus plus two working copies would leave
less than 20 percent free space. The second copy covers a partial download,
rendered OCR images, and backup overhead.

## 4. Review and enqueue a manifest

Inspect every manifest line before execution. Confirm:

- direct PDF URL;
- allowed official host;
- title, model, and year scope;
- `officiality`;
- source index in `discovered_from`;
- no duplicate source ID;
- any repeated URL intentionally represents a separate model or year scope.

Then enqueue:

```bash
sudo -u chevy-colors python3 \
  /opt/chevy-color-archive/crawler/cli.py \
  --config /etc/chevy-color-archive/config.json \
  enqueue \
  --manifest /opt/chevy-color-archive/crawler/manifests/gm-heritage-camaro-1967-1969.jsonl
```

Enqueueing is idempotent for the same manifest content.

## 5. Foreground validation

Process a bounded sample before starting a service:

```bash
sudo -u chevy-colors python3 \
  /opt/chevy-color-archive/crawler/cli.py \
  --config /etc/chevy-color-archive/config.json \
  work --max-jobs 10 --owner preflight

sudo -u chevy-colors python3 \
  /opt/chevy-color-archive/crawler/cli.py \
  --config /etc/chevy-color-archive/config.json status --json
```

Inspect the object count, job failures, a raw PDF, native page text, and an OCR
page before allowing an unattended run.

After a code update or state restoration, reconcile current objects before
restarting the timer:

```bash
sudo -u chevy-colors python3 \
  /opt/chevy-color-archive/crawler/cli.py \
  --config /etc/chevy-color-archive/config.json reconcile
```

## 6. systemd worker

Create `/etc/systemd/system/chevy-color-crawler.service`:

```ini
[Unit]
Description=Chevrolet Color Archive research crawler
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=chevy-colors
Group=chevy-colors
WorkingDirectory=/opt/chevy-color-archive
ExecStart=/usr/bin/python3 /opt/chevy-color-archive/crawler/cli.py --config /etc/chevy-color-archive/config.json work --max-jobs 50 --owner systemd-main
UMask=0027
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
ReadWritePaths=/var/lib/chevy-colors
LockPersonality=true
MemoryDenyWriteExecute=true
RestrictSUIDSGID=true
TimeoutStartSec=2h
```

Create `/etc/systemd/system/chevy-color-crawler.timer`:

```ini
[Unit]
Description=Run Chevrolet Color Archive queue

[Timer]
OnBootSec=2m
OnUnitActiveSec=5m
Persistent=true

[Install]
WantedBy=timers.target
```

Activate only after the foreground sample succeeds:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now chevy-color-crawler.timer
```

The bounded oneshot design avoids an immortal worker. An interrupted job keeps
its source bytes, partial download, or completed page text. Its lease becomes
eligible after `lease_seconds`.

## 7. Monitoring

```bash
sudo -u chevy-colors python3 \
  /opt/chevy-color-archive/crawler/cli.py \
  --config /etc/chevy-color-archive/config.json status

sudo journalctl -u chevy-color-crawler.service --since today
df -h /var/lib/chevy-colors
du -sh /var/lib/chevy-colors/state/objects \
  /var/lib/chevy-colors/state/spool \
  /var/lib/chevy-colors/state/derived
```

Investigate any `dead` job. Do not delete a partial spool, object, or derived
page to make the status look clean. Fix the cause, then requeue only that job:

```bash
sudo -u chevy-colors python3 \
  /opt/chevy-color-archive/crawler/cli.py \
  --config /etc/chevy-color-archive/config.json retry --job-id 123
```

## 8. Integrity audit and export

Run a metadata audit daily and a complete object rehash after each source batch:

```bash
sudo -u chevy-colors python3 \
  /opt/chevy-color-archive/crawler/cli.py \
  --config /etc/chevy-color-archive/config.json \
  audit --full-hash \
  --output /var/lib/chevy-colors/exports/audit.json
```

Export candidates:

```bash
sudo -u chevy-colors python3 \
  /opt/chevy-color-archive/crawler/cli.py \
  --config /etc/chevy-color-archive/config.json \
  export \
  --output /var/lib/chevy-colors/exports/color-candidates.jsonl
```

An export is not publishable availability data. It must pass human source-image
review. A missing candidate must remain “not verified,” never “not offered.”

## 9. Backup and recovery

Stop the timer before taking a coherent SQLite backup:

```bash
sudo systemctl stop chevy-color-crawler.timer
sudo -u chevy-colors sqlite3 \
  /var/lib/chevy-colors/state/queue.sqlite3 \
  ".backup '/var/lib/chevy-colors/exports/queue-backup.sqlite3'"
sudo systemctl start chevy-color-crawler.timer
```

Back up all of:

- `queue-backup.sqlite3`;
- `objects/sha256/`;
- `spool/`;
- `derived/text/`;
- the exact manifest and code revision used.

Never restore the SQLite file without its corresponding object and derived-text
trees. After restoration, run `audit --full-hash` before resuming workers.

## 10. Stop conditions

Stop the timer and preserve state if:

- free disk falls below 20 percent;
- an official host begins returning HTML, access challenges, or rate limits;
- object or page-text hashes fail;
- redirects leave the allowlisted host;
- OCR failures become systematic;
- a manifest year or model scope is wrong;
- the queue repeatedly produces dead jobs.

Do not broaden the host allowlist or disable integrity checks to force progress.
Correct the manifest or tool failure, audit the preserved state, then resume.
