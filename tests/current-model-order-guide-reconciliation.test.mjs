import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function json(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

test("current-model Order Guide audit covers every current model and both bounded years", async () => {
  const [audit, catalog] = await Promise.all([
    json("data/audits/current-model-order-guide-reconciliation.json"),
    json("data/catalog/chevrolet-us-nameplates.json"),
  ]);

  const expectedCurrent = catalog.models
    .filter((model) => model.current)
    .map((model) => model.id)
    .sort();
  const auditedCurrent = audit.records.map((record) => record.model_id).sort();

  assert.deepEqual(auditedCurrent, expectedCurrent);
  assert.equal(audit.records.length, 18);
  assert.equal(
    audit.records.reduce((count, record) => count + record.years.length, 0),
    36,
  );

  for (const record of audit.records) {
    assert.equal(record.safe_to_upgrade_to_verified_complete, false);
    assert.deepEqual(
      record.years.map((year) => year.model_year),
      [2025, 2026],
      `${record.model_id} must have exact 2025 and 2026 audit rows`,
    );
    for (const year of record.years) {
      assert.ok(year.order_guide_vehicle_ids.length > 0);
      assert.equal(year.tracked_state, "reviewed_qualified_palette_union");
    }
  }
});

test("closed palette omissions and remaining source conflicts stay explicit", async () => {
  const audit = await json(
    "data/audits/current-model-order-guide-reconciliation.json",
  );
  const byModel = new Map(
    audit.records.map((record) => [record.model_id, record]),
  );

  assert.equal(audit.summary.substantive_regular_palette_omissions, 0);
  assert.equal(audit.summary.regular_palette_results_mostly_matching, 36);

  const blazerEv2025 = byModel
    .get("blazer-ev")
    .years.find((year) => year.model_year === 2025);
  assert.equal(blazerEv2025.tracked_color_count, 8);
  assert.equal(
    blazerEv2025.retained_completion_source_id,
    "gm-online-order-guide-pdf-22878",
  );
  assert.equal(blazerEv2025.retained_completion_pdf_page, 35);
  assert.match(blazerEv2025.completion_note, /GAG \/ WA-221K/);
  assert.match(blazerEv2025.completion_note, /SS-only/);

  const corvette2026 = byModel
    .get("corvette")
    .years.find((year) => year.model_year === 2026);
  assert.equal(corvette2026.tracked_color_count, 11);
  assert.equal(
    corvette2026.retained_completion_source_id,
    "gm-online-order-guide-pdf-23208",
  );
  assert.equal(corvette2026.retained_completion_pdf_page, 174);
  assert.match(corvette2026.completion_note, /GRF \/ WA-730S/);
  assert.match(corvette2026.completion_note, /ZRA/);
  assert.match(corvette2026.completion_note, /D30/);

  const lcf2025 = byModel
    .get("low-cab-forward")
    .years.find((year) => year.model_year === 2025);
  assert.equal(lcf2025.tracked_color_count, 6);
  assert.deepEqual(
    lcf2025.retained_completion_source_ids,
    [
      "gm-online-order-guide-pdf-22745",
      "gm-online-order-guide-pdf-22775",
      "gm-online-order-guide-pdf-22821",
    ],
  );
  assert.deepEqual(lcf2025.retained_completion_pdf_pages, [21, 20, 13]);
  assert.match(lcf2025.completion_note, /six-color model-year union/);
  assert.match(lcf2025.completion_note, /extra cost/);

  const colorado2025 = byModel
    .get("colorado")
    .years.find((year) => year.model_year === 2025);
  assert.equal(
    colorado2025.source_literal_conflicts[0].fleet_guide_literal,
    "Sterling Grey Metallic",
  );
  assert.equal(
    colorado2025.source_literal_conflicts[0].order_guide_literal,
    "Sterling Gray Metallic",
  );

  const equinox2026 = byModel
    .get("equinox")
    .years.find((year) => year.model_year === 2026);
  assert.equal(
    equinox2026.source_literal_conflicts[0].order_guide_literal,
    "Polar White Tricoat",
  );
});

test("every observed Order Guide vehicle ID resolves through explicit official endpoint templates", async () => {
  const audit = await json(
    "data/audits/current-model-order-guide-reconciliation.json",
  );
  const source = audit.sources.find(
    (entry) => entry.source_id === "gm-online-order-guide-us-current",
  );
  const ids = new Set();

  for (const record of audit.records) {
    for (const year of record.years) {
      for (const key of [
        "order_guide_vehicle_ids",
        "police_ssv_order_guide_vehicle_ids",
      ]) {
        for (const id of year[key] ?? []) ids.add(id);
      }
    }
  }

  assert.equal(ids.size, 50);
  for (const id of ids) {
    const indexed = audit.vehicle_source_index[String(id)];
    assert.ok(indexed, `missing exact source links for Order Guide ${id}`);
    const colorUrl = new URL(indexed.color_trim_url);
    const pdfUrl = new URL(indexed.generated_pdf_url);
    assert.equal(colorUrl.protocol, "https:");
    assert.equal(pdfUrl.protocol, "https:");
    assert.equal(colorUrl.hostname, "eog-api.musea2.azure.ext.gm.com");
    assert.equal(pdfUrl.hostname, "eog-api.musea2.azure.ext.gm.com");
    assert.equal(
      colorUrl.pathname,
      source.color_trim_endpoint_path_template.replace(
        "{vehicle_id}",
        String(id),
      ),
    );
    assert.equal(
      pdfUrl.pathname,
      source.generated_pdf_endpoint_path_template.replace(
        "{vehicle_id}",
        String(id),
      ),
    );
  }
  assert.equal(Object.keys(audit.vehicle_source_index).length, ids.size);
});

test("the retained specialty review subset points to the immutable source release", async () => {
  const [audit, manifest] = await Promise.all([
    json("data/audits/current-model-order-guide-reconciliation.json"),
    json("data/sources/current-order-guide-source-release-manifest.json"),
  ]);

  assert.equal(audit.retained_snapshot_release.entry_count, manifest.entry_count);
  assert.equal(
    audit.retained_snapshot_release.pdf_page_count,
    manifest.total_pdf_pages,
  );
  assert.equal(
    audit.retained_snapshot_release.total_pdf_bytes,
    manifest.total_pdf_bytes,
  );
  assert.equal(
    audit.retained_snapshot_release.release_url,
    manifest.release_url,
  );
  assert.match(
    audit.retained_snapshot_release.publication_limit,
    /do not by themselves establish/i,
  );
});

test("specialty programs and Forest Service Green stay scope-qualified", async () => {
  const audit = await json(
    "data/audits/current-model-order-guide-reconciliation.json",
  );
  const tahoe = audit.specialty_findings.find(
    (finding) => finding.model_id === "tahoe",
  );
  const silverado = audit.specialty_findings.find(
    (finding) => finding.model_id === "silverado",
  );

  assert.deepEqual(tahoe.vehicle_ids, [22974, 23213]);
  assert.equal(tahoe.generated_pdf_page, 29);
  assert.equal(tahoe.standard_color_count_per_year, 6);
  assert.equal(tahoe.seo_colors.length, 6);
  assert.deepEqual(
    tahoe.seo_colors.map((color) => color.paint_code),
    [
      "WA-9260",
      "WA-5665",
      "WA-9015",
      "WA-722J",
      "WA-253A",
      "WA-636R",
    ],
  );

  assert.equal(silverado.conflicts.length, 2);
  assert.match(audit.identity_guards.join("\n"), /Forest Service Green/);
  assert.match(audit.identity_guards.join("\n"), /must not be merged/i);
});
