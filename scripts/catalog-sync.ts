import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd(), true);
const { localCatalog, saveCatalog, catalogConfigured } =
  await import("../src/server/catalog-store");
if (!catalogConfigured())
  throw new Error(
    "Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local first.",
  );
const records = await localCatalog();
for (let i = 0; i < records.length; i += 100)
  await saveCatalog(records.slice(i, i + 100));
console.log(JSON.stringify({ synced: records.length }));
