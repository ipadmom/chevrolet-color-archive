import { models } from "../app/archive-data";

// This intentionally emits only the resolved archive model graph. The Parquet
// builder joins it to the catalog, source, platform, and photo manifests.
process.stdout.write(
  JSON.stringify({
    schema_version: 1,
    models,
  }),
);
