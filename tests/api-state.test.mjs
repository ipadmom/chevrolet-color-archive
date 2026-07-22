import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const root = new URL("../", import.meta.url);
const migrations = [
  "0000_tiny_human_robot.sql",
  "0001_polite_purple_man.sql",
  "0002_opposite_exodus.sql",
  "0003_gigantic_chimera.sql",
  "0004_right_omega_flight.sql",
  "0005_skinny_deadpool.sql",
  "0006_mixed_owl.sql",
  "0007_cuddly_nekra.sql",
  "0008_warm_daredevil.sql",
];

async function migration(name) {
  return readFile(new URL(`drizzle/${name}`, root), "utf8");
}

function applySql(db, source) {
  for (const statement of source.split("--> statement-breakpoint")) {
    if (statement.trim()) db.exec(statement);
  }
}

test("fresh D1-compatible migrations enforce active queue deduplication", async () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("PRAGMA foreign_keys=ON");
    for (const name of migrations.slice(0, 3)) {
      applySql(db, await migration(name));
    }
    const legacyInsert = db.prepare(`
      INSERT INTO photo_review_selections
        (model, year, color_id, candidate_ids_json, status)
      VALUES (?, ?, ?, ?, ?)
    `);
    legacyInsert.run("corvette", "1963", "riverside-red", "[7]", "queued");
    legacyInsert.run("corvette", "1963", "riverside-red", "[7]", "leased");
    for (const name of migrations.slice(3)) {
      applySql(db, await migration(name));
    }
    const migratedDuplicates = db
      .prepare(`
        SELECT status, last_error_code AS errorCode
        FROM photo_review_selections
        WHERE model = 'corvette' AND candidate_ids_json = '[7]'
        ORDER BY id
      `)
      .all()
      .map((row) => ({ ...row }));
    assert.deepEqual(migratedDuplicates, [
      {
        status: "failed",
        errorCode: "duplicate_active_selection_migrated",
      },
      { status: "leased", errorCode: null },
    ]);

    const insert = db.prepare(`
      INSERT INTO photo_review_selections
        (model, year, color_id, candidate_ids_json, status)
      VALUES (?, ?, ?, ?, ?)
    `);
    insert.run("camaro", "1969", "hugger-orange", "[1,2]", "queued");
    assert.throws(
      () =>
        insert.run("camaro", "1969", "hugger-orange", "[1,2]", "leased"),
      /UNIQUE constraint failed/,
    );
    insert.run("camaro", "1969", "hugger-orange", "[1,2]", "failed");
    assert.equal(
      db
        .prepare(
          "SELECT COUNT(*) AS count FROM photo_review_selections WHERE candidate_ids_json = '[1,2]'",
        )
        .get().count,
      2,
    );
    assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
    assert.equal(db.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
    const selectionColumns = db
      .prepare("PRAGMA table_info(photo_review_selections)")
      .all()
      .map((column) => column.name);
    assert.equal(selectionColumns.includes("last_error"), false);
    assert.equal(selectionColumns.includes("last_error_code"), true);
    assert.equal(selectionColumns.includes("archived_candidate_ids_json"), true);
    assert.equal(
      selectionColumns.includes("archived_selection_receipt_json"),
      true,
    );
    assert.equal(
      selectionColumns.includes("archived_selection_receipt_sha256"),
      true,
    );
    const candidateColumns = db
      .prepare("PRAGMA table_info(photo_candidates)")
      .all()
      .map((column) => column.name);
    assert.equal(candidateColumns.includes("published_sha256"), true);
    assert.equal(candidateColumns.includes("published_asset_path"), true);
    assert.equal(candidateColumns.includes("published_asset_bytes"), true);
    assert.equal(candidateColumns.includes("published_release_tag"), true);
    assert.equal(candidateColumns.includes("published_asset_name"), true);
    assert.equal(candidateColumns.includes("published_asset_url"), true);
    assert.equal(candidateColumns.includes("published_attribution_name"), true);
    assert.equal(candidateColumns.includes("published_attribution_url"), true);
    assert.equal(candidateColumns.includes("published_attribution_sha256"), true);
    assert.equal(candidateColumns.includes("published_attribution_bytes"), true);
    assert.equal(candidateColumns.includes("published_at"), true);
  } finally {
    db.close();
  }
});

test("curatorial receipts have independent canonical selection state", async () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("PRAGMA foreign_keys=ON");
    for (const name of migrations) applySql(db, await migration(name));
    const insert = db.prepare(`
      INSERT INTO photo_review_selections (
        model,
        year,
        color_id,
        candidate_ids_json,
        archived_candidate_ids_json,
        archived_selection_receipt_json,
        archived_selection_receipt_sha256,
        status,
        processed_at
      ) VALUES ('camaro', '1969', 'hugger-orange', '[]', ?, ?, ?, 'processed', CURRENT_TIMESTAMP)
    `);
    const sha = "a".repeat(64);
    insert.run('["commons-sha1-a"]', '{"receipt":1}', sha);
    insert.run('["commons-sha1-b"]', '{"receipt":2}', sha);
    assert.throws(
      () => insert.run('["commons-sha1-a"]', '{"receipt":1}', sha),
      /UNIQUE constraint failed/,
    );
    const rows = db
      .prepare(`
        SELECT archived_candidate_ids_json AS candidateIds,
               archived_selection_receipt_json AS receipt,
               archived_selection_receipt_sha256 AS receiptSha256,
               status,
               processed_at AS processedAt
        FROM photo_review_selections
        ORDER BY id
      `)
      .all();
    assert.equal(rows.length, 2);
    assert.equal(rows[0].receipt, '{"receipt":1}');
    assert.equal(rows[0].receiptSha256, sha);
    assert.equal(rows[0].status, "processed");
    assert.equal(typeof rows[0].processedAt, "string");
    assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
  } finally {
    db.close();
  }
});

test("enqueue SQL is all-or-none when one receipt is already consumed", async () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("PRAGMA foreign_keys=ON");
    for (const name of migrations) {
      applySql(db, await migration(name));
    }
    const candidate = db
      .prepare(`
        INSERT INTO photo_candidates (
          model, year, color_id, color_name, object_key, file_name,
          content_type, size_bytes, credit, license, status, sha256
        ) VALUES (
          'camaro', '1969', 'hugger-orange', 'Hugger Orange',
          'staged/camaro/1969/hugger-orange/hash.jpg', 'photo.jpg',
          'image/jpeg', 4, 'Fixture', 'CC BY 4.0', 'staged', 'hash'
        ) RETURNING id
      `)
      .get().id;
    const receipt = db.prepare(`
      INSERT INTO photo_upload_receipts
        (receipt_hash, candidate_id, created_at, consumed_at)
      VALUES (?, ?, datetime('now'), ?)
    `);
    receipt.run("receipt-a", candidate, "already-used");
    receipt.run("receipt-b", candidate, null);

    db.exec("BEGIN");
    try {
      db.prepare(`
        INSERT OR IGNORE INTO photo_review_selections (
          model, year, color_id, candidate_ids_json, status, attempt_count
        )
        SELECT 'camaro', '1969', 'hugger-orange', '[1]', 'queued', 0
        WHERE (
          SELECT COUNT(DISTINCT receipt_hash)
          FROM photo_upload_receipts
          WHERE receipt_hash IN ('receipt-a', 'receipt-b')
            AND consumed_at IS NULL
            AND datetime(created_at) >= datetime('now', '-1 day')
        ) = 2
      `).run();
      db.prepare(`
        UPDATE photo_upload_receipts
        SET consumed_at = 'new-claim'
        WHERE receipt_hash IN ('receipt-a', 'receipt-b')
          AND consumed_at IS NULL
          AND EXISTS (
            SELECT 1
            FROM photo_review_selections
            WHERE model = 'camaro'
              AND year = '1969'
              AND color_id = 'hugger-orange'
              AND candidate_ids_json = '[1]'
              AND status != 'failed'
          )
      `).run();
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }

    assert.equal(
      db.prepare("SELECT COUNT(*) AS count FROM photo_review_selections").get()
        .count,
      0,
    );
    assert.equal(
      db
        .prepare(
          "SELECT consumed_at FROM photo_upload_receipts WHERE receipt_hash = 'receipt-b'",
        )
        .get().consumed_at,
      null,
    );
  } finally {
    db.close();
  }
});

test("enqueue SQL rejects candidate overlap with an active selection", async () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("PRAGMA foreign_keys=ON");
    for (const name of migrations) {
      applySql(db, await migration(name));
    }
    const insertCandidate = db.prepare(`
      INSERT INTO photo_candidates (
        model, year, color_id, color_name, object_key, file_name,
        content_type, size_bytes, credit, license, status, sha256
      ) VALUES (
        'camaro', '1969', 'hugger-orange', 'Hugger Orange',
        ?, ?, 'image/jpeg', 4, 'Fixture', 'CC BY 4.0', 'staged', ?
      ) RETURNING id
    `);
    const first = insertCandidate.get("staged/first.jpg", "first.jpg", "first").id;
    const second = insertCandidate.get("staged/second.jpg", "second.jpg", "second").id;
    db.prepare(`
      INSERT INTO photo_upload_receipts
        (receipt_hash, candidate_id, created_at)
      VALUES (?, ?, datetime('now'))
    `).run("receipt-first", first);
    db.prepare(`
      INSERT INTO photo_upload_receipts
        (receipt_hash, candidate_id, created_at)
      VALUES (?, ?, datetime('now'))
    `).run("receipt-second", second);
    db.prepare(`
      INSERT INTO photo_review_selections
        (model, year, color_id, candidate_ids_json, status)
      VALUES ('camaro', '1969', 'hugger-orange', ?, 'queued')
    `).run(`[${first}]`);

    const attempted = db.prepare(`
      INSERT OR IGNORE INTO photo_review_selections (
        model, year, color_id, candidate_ids_json, status
      )
      SELECT 'camaro', '1969', 'hugger-orange', ?, 'queued'
      WHERE NOT EXISTS (
        SELECT 1
        FROM photo_review_selections AS active_selection,
          json_each(active_selection.candidate_ids_json) AS active_candidate
        WHERE active_selection.status IN ('queued', 'leased')
          AND CAST(active_candidate.value AS INTEGER) IN (?, ?)
      )
    `).run(`[${first},${second}]`, first, second);

    assert.equal(attempted.changes, 0);
    assert.equal(
      db.prepare("SELECT COUNT(*) AS count FROM photo_review_selections").get()
        .count,
      1,
    );
    assert.deepEqual(
      db
        .prepare(
          "SELECT consumed_at FROM photo_upload_receipts ORDER BY receipt_hash",
        )
        .all()
        .map((row) => row.consumed_at),
      [null, null],
    );
  } finally {
    db.close();
  }
});

test("route sources use D1 batches and published-only public visibility", async () => {
  const [photos, selections, security] = await Promise.all([
    readFile(new URL("app/api/photos/route.ts", root), "utf8"),
    readFile(new URL("app/api/selections/route.ts", root), "utf8"),
    readFile(new URL("app/api/archive-security.mjs", root), "utf8"),
  ]);

  assert.match(security, /PUBLIC_PHOTO_STATUSES = Object\.freeze\(\["published"\]\)/);
  assert.match(photos, /await db\.batch\(\[insertCandidate, insertReceipt\]\)/);
  assert.match(photos, /`\$\{sha256\}\.\$\{extensionForMime\(detectedType\)\}`/);
  assert.match(photos, /publishedAssetUrl/);
  assert.match(selections, /enqueueSelectionAtomically/);
  assert.match(selections, /const d1 = getD1Database\(\)/);
  assert.match(
    selections,
    /await d1\.batch\(\[\s*insertSelection,\s*consumeReceipts,\s*\]\)/s,
  );
  assert.doesNotMatch(selections, /const insertSelection = db\.run/);
  assert.match(selections, /photoCandidates\.status\} = 'staged'/);
  assert.match(selections, /status: queued\.created \? 201 : 200/);
  assert.match(selections, /insertResult\.meta\?\.changes/);
  assert.match(selections, /json_each\(active_selection\.candidate_ids_json\)/);
  assert.match(selections, /publishedAssets/);
  assert.match(selections, /published_sha256 = mapping\.published_sha256/);
  assert.match(
    selections,
    /candidate\.published_asset_url = mapping\.published_asset_url/,
  );
  assert.match(
    selections,
    /candidate\.published_attribution_sha256 = mapping\.published_attribution_sha256/,
  );
  assert.doesNotMatch(
    selections,
    /mapping\.published_asset_path/,
  );
  assert.match(selections, /rejectedCandidateIds/);
  assert.match(selections, /await d1\.batch\(\[\s*publishCandidates,\s*guardedSelectionUpdate/s);
  assert.match(
    selections,
    /await db\.batch\(\[\s*rejectCandidates,\s*guardedRejectionUpdate/s,
  );
  assert.match(selections, /lastErrorCode: "claim_hydration_failed"/);
  assert.match(
    selections,
    /hydrated\[0\]\.candidates\.length !== storedCandidateIds\.length/,
  );
  assert.match(selections, /cleanupExpiredUploadReceipts/);
  assert.match(selections, /rejectedObjectPurgeGraceSeconds/);
  assert.doesNotMatch(selections, /lastError:/);
  assert.doesNotMatch(selections, /normalizeQueueError/);
  assert.doesNotMatch(selections, /set\(\{ consumedAt: null \}\)/);
});
