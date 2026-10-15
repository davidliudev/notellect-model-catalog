// Stamps the catalog version and writes the static site CI publishes:
//   v1/catalog.json  the catalog apps download
//   v1/schema.json   the schema it was checked against
// catalogVersion is the UTC publish time (yyyymmddHHMM), so newer is larger.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { checkCatalog } from "./check.mjs";

const [source = "catalog.json", output = "public"] = process.argv.slice(2);
const catalog = JSON.parse(readFileSync(source, "utf8"));
const schema = JSON.parse(readFileSync(new URL("../schema.json", import.meta.url), "utf8"));
const now = process.env.CATALOG_PUBLISHED_AT ? new Date(process.env.CATALOG_PUBLISHED_AT) : new Date();
const pad = (value) => String(value).padStart(2, "0");
catalog.catalogVersion = Number(
  `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}`,
);
catalog.updatedAt = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}`;
const { errors } = checkCatalog(catalog, schema);
if (errors.length > 0) {
  for (const error of errors) console.error(`error: ${error}`);
  process.exit(1);
}
mkdirSync(join(output, "v1"), { recursive: true });
writeFileSync(join(output, "v1", "catalog.json"), `${JSON.stringify(catalog, null, 2)}\n`);
writeFileSync(join(output, "v1", "schema.json"), `${JSON.stringify(schema, null, 2)}\n`);
writeFileSync(join(output, "index.html"), '<!doctype html><meta charset="utf-8"><title>Notellect model catalog</title><p><a href="v1/catalog.json">v1/catalog.json</a></p>\n');
console.log(`built catalog ${catalog.catalogVersion}`);
