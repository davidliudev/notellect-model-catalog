// Validates the catalog against schema.json and the cross-reference rules the
// app also enforces. The app rejects a catalog that fails either.
import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";

const SUPPORTED_ADAPTERS = new Set([
  "anthropic", "openai_responses", "openai_chat", "openai_compatible",
  "ollama", "openai_codex", "claude_cli",
]);
const FIELD_KEYS = new Set(["api_key", "base_url", "api_host", "api_port"]);
const THINKING_KEYS = new Set(["thinking_enabled", "thinking_strength", "thinking_budget_tokens"]);

export function checkCatalog(catalog, schema) {
  const errors = [];
  const warnings = [];
  const validate = new Ajv2020({ allErrors: true, strict: false }).compile(schema);
  if (!validate(catalog)) {
    for (const error of validate.errors) errors.push(`${error.instancePath || "/"} ${error.message}`);
    return { errors, warnings };
  }
  const providerIds = new Set();
  for (const provider of catalog.providers) {
    if (providerIds.has(provider.id)) errors.push(`provider ${provider.id} is listed twice`);
    providerIds.add(provider.id);
    if (!SUPPORTED_ADAPTERS.has(provider.adapter)) {
      warnings.push(`provider ${provider.id} uses adapter ${provider.adapter}; current apps hide it`);
    }
    for (const field of provider.fields) {
      if (!FIELD_KEYS.has(field.key)) warnings.push(`provider ${provider.id} field ${field.key} is unknown to current apps; they hide the provider`);
      if (field.kind === "choice" && !field.options) errors.push(`provider ${provider.id} choice field ${field.key} has no options`);
    }
    if (provider.auth === "api_key" && !provider.keyHelp) errors.push(`provider ${provider.id} needs keyHelp`);
    if (provider.models.length === 0 && !provider.allowCustomModel) errors.push(`provider ${provider.id} has no models and no custom model ID`);
    const modelIds = new Set();
    let recommended = 0;
    for (const model of provider.models) {
      if (modelIds.has(model.id)) errors.push(`provider ${provider.id} lists model ${model.id} twice`);
      modelIds.add(model.id);
      if (model.recommended) recommended++;
      if (model.recommended && (model.retired || model.hidden)) errors.push(`model ${provider.id}/${model.id} is recommended but retired or hidden`);
      for (const level of Object.values(model.thinking || {})) {
        for (const key of Object.keys(level)) {
          if (!THINKING_KEYS.has(key)) errors.push(`model ${provider.id}/${model.id} thinking sets ${key}`);
        }
      }
    }
    if (recommended > 1) errors.push(`provider ${provider.id} recommends more than one model`);
    if (provider.models.length > 0 && recommended === 0) warnings.push(`provider ${provider.id} recommends no model`);
    for (const model of provider.models) {
      if (model.replacement && !modelIds.has(model.replacement)) errors.push(`model ${provider.id}/${model.id} names unknown replacement ${model.replacement}`);
      if (model.retired && !model.replacement) warnings.push(`retired model ${provider.id}/${model.id} has no replacement`);
    }
  }
  for (const id of catalog.featured) {
    if (!providerIds.has(id)) errors.push(`featured provider ${id} does not exist`);
  }
  return { errors, warnings };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const catalog = JSON.parse(readFileSync(process.argv[2] || "catalog.json", "utf8"));
  const schema = JSON.parse(readFileSync(new URL("../schema.json", import.meta.url), "utf8"));
  const { errors, warnings } = checkCatalog(catalog, schema);
  for (const warning of warnings) console.warn(`warning: ${warning}`);
  for (const error of errors) console.error(`error: ${error}`);
  if (errors.length > 0) process.exit(1);
  console.log(`catalog ok: ${catalog.providers.length} providers`);
}
