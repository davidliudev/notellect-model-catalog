# Notellect model catalog

The AI providers and models Notellect offers in first-run AI setup and in
Settings → Models. Apps download the published copy, keep the last valid
download, and fall back to the copy bundled at build time.

- `catalog.json` — the catalog. Edit this file.
- `schema.json` — the format apps accept (schema version 1). The app repo keeps
  an identical copy in `usecase/llm/catalog/schema.json`; change both together.
- `scripts/check.mjs` — schema and cross-reference checks (`npm run check`).
- `scripts/build.mjs` — stamps `catalogVersion` (UTC `yyyymmddHHMM`) and
  `updatedAt`, then writes `public/` (`npm run build`).

Pull requests run the checks. A merge to `main` publishes `public/` to GitHub
Pages; apps read `v1/catalog.json` from there.

## Rules apps enforce

- A catalog that fails the schema, lists a provider or model twice, recommends
  more than one model per provider, names an unknown replacement or features an
  unknown provider is rejected as a whole; apps keep the copy they have.
- A provider whose `adapter` or field `key` an app does not know is hidden by
  that app, so new adapters can be added before every app supports them.
- Thinking levels (`off`, `standard`, `deep`) may only set `thinking_enabled`,
  `thinking_strength` and `thinking_budget_tokens`. A strength of `auto` sends
  no reasoning setting, for providers without a reasoning control.
- A model the provider retires stays listed with `retired`, `replacement` and
  `hidden` so saved settings can move to the replacement.
