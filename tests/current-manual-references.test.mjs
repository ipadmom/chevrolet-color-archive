import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function json(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

test("official 2026 manual references cover every current Chevrolet model", async () => {
  const [manuals, catalog, profiles] = await Promise.all([
    json("data/catalog/chevrolet-current-manual-references.json"),
    json("data/catalog/chevrolet-us-nameplates.json"),
    json("data/catalog/chevrolet-current-profile-references.json"),
  ]);
  const current = catalog.models
    .filter((model) => model.current)
    .map((model) => model.id)
    .sort();

  assert.equal(manuals.record_count, 18);
  assert.equal(manuals.official_manual_portal.returned_model_count, 18);
  assert.equal(
    manuals.official_manual_portal.canonical_landing_url,
    "https://experience.gm.com/support/vehicle/manuals-guides",
  );
  assert.equal(
    manuals.official_manual_portal.chevrolet_brand_entry_url,
    "https://www.chevrolet.com/support/vehicle/manuals-guides",
  );
  assert.deepEqual(
    manuals.records.map((record) => record.model_id).sort(),
    current,
  );
  assert.equal(
    profiles.manual_reference_map,
    "chevrolet-current-manual-references.json",
  );
  assert.equal(
    new Set(manuals.records.map((record) => record.portal_record_id)).size,
    18,
  );
  assert.ok(
    manuals.records.every((record) =>
      /^US\d{5}$/.test(record.portal_record_id),
    ),
  );
});

test("the GM Electronic Order Guide is explicitly mapped as the current color authority", async () => {
  const manuals = await json(
    "data/catalog/chevrolet-current-manual-references.json",
  );
  const authority = manuals.current_color_authority;

  assert.equal(authority.landing_url, "https://www.gmfleetorderguide.com/");
  assert.equal(authority.active_2026_chevrolet_guide_count, 26);
  assert.equal(authority.current_profile_guide_id_count, 17);
  assert.equal(
    authority.profile_reconciliation_path,
    "../audits/current-model-order-guide-reconciliation.json",
  );
  assert.equal(
    authority.generated_pdf_endpoint_template,
    "https://eog-api.musea2.azure.ext.gm.com/api/Pdf/GeneratePdf/{vehicle_id}/all/en-us",
  );
  assert.equal(
    authority.color_trim_endpoint_template,
    "https://eog-api.musea2.azure.ext.gm.com/api/PullDown/GetColorAndTrim/{vehicle_id}/en-us",
  );
  assert.equal(
    authority.vehicle_metadata_endpoint_template,
    "https://eog-api.musea2.azure.ext.gm.com/api/Vehicles/{vehicle_id}/en-us",
  );
  assert.match(authority.authority_note, /stronger current exterior-color source/i);

  const reconciliationUrl = new URL(
    authority.profile_reconciliation_path,
    new URL("data/catalog/chevrolet-current-manual-references.json", root),
  );
  const reconciliation = JSON.parse(await readFile(reconciliationUrl, "utf8"));
  assert.equal(reconciliation.catalog_year_ceiling, 2026);
  assert.equal(reconciliation.retained_snapshot_release.entry_count, 31);
});

test("manual documents are exact official PDF references with verified live metadata", async () => {
  const manuals = await json(
    "data/catalog/chevrolet-current-manual-references.json",
  );
  const ownerUrls = new Set();
  const vriUrls = new Set();

  for (const record of manuals.records) {
    for (const [role, document] of [
      ["owner manual", record.owner_manual],
      [
        "vehicle reference information",
        record.vehicle_reference_information,
      ],
    ]) {
      if (!document) continue;
      const url = new URL(document.url);
      assert.equal(url.protocol, "https:");
      assert.equal(url.hostname, "contentdelivery.ext.gm.com");
      assert.match(url.pathname, /\/pdf_assets\/active\//);
      assert.equal(document.live_http_status, 200, `${record.model_id} ${role}`);
      assert.equal(document.live_content_type, "application/pdf");
      assert.ok(document.live_content_length_bytes > 0);
      (role === "owner manual" ? ownerUrls : vriUrls).add(document.url);
    }
  }

  assert.equal(manuals.owner_manual_reference_count, 18);
  assert.equal(ownerUrls.size, manuals.unique_owner_manual_count);
  assert.equal(
    manuals.records.filter((record) => record.vehicle_reference_information)
      .length,
    manuals.vehicle_reference_information_model_count,
  );
  assert.equal(
    vriUrls.size,
    manuals.unique_vehicle_reference_information_count,
  );
  assert.equal(ownerUrls.size, 16);
  assert.equal(vriUrls.size, 10);
});

test("shared manuals and the Low Cab Forward configuration remain explicit", async () => {
  const manuals = await json(
    "data/catalog/chevrolet-current-manual-references.json",
  );
  const byModel = new Map(
    manuals.records.map((record) => [record.model_id, record]),
  );

  assert.equal(
    byModel.get("brightdrop-400").owner_manual.url,
    byModel.get("brightdrop-600").owner_manual.url,
  );
  assert.equal(
    byModel.get("tahoe").owner_manual.url,
    byModel.get("suburban").owner_manual.url,
  );
  assert.match(
    byModel.get("low-cab-forward").owner_manual.title,
    /6500XD\/7500XD/,
  );
  assert.match(
    byModel.get("low-cab-forward").selection_note,
    /configuration-matched/,
  );
  assert.match(manuals.source_role, /do not establish/i);
});
