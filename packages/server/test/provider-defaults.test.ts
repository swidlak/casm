import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyProviderDefaults, providerDefaults } from "../src/provider-defaults.ts";

test("provider defaults are scoped to host and provider and cannot inject permissions or environment", () => {
  const home = mkdtempSync(join(tmpdir(), "casm-defaults-"));
  try {
    writeFileSync(join(home, "config.json"), JSON.stringify({ providerDefaults: {
      claude: { model: "claude-opus-5-5", effort: "medium", mode: "bypassPermissions", env: { SECRET: "no" } },
      codex: { model: "gpt-6.1-sol", effort: "high" },
    } }));
    assert.deepEqual(providerDefaults(home, "claude"), { model: "claude-opus-5-5", effort: "medium" });
    assert.deepEqual(providerDefaults(home, "codex"), { model: "gpt-6.1-sol", effort: "high" });
    assert.deepEqual(providerDefaults(home, "pi"), {});
    assert.deepEqual(providerDefaults(null, "claude"), {});
  } finally { rmSync(home, { recursive: true, force: true }); }
});

test("new agents inherit defaults while explicit selections win and other models do not inherit effort", () => {
  const defaults = { model: "gpt-6.1-sol", effort: "high" };
  assert.deepEqual(applyProviderDefaults(defaults), defaults);
  assert.deepEqual(applyProviderDefaults(defaults, { model: "", effort: "" }), defaults);
  assert.deepEqual(applyProviderDefaults(defaults, { effort: "low" }), { model: "gpt-6.1-sol", effort: "low" });
  assert.deepEqual(applyProviderDefaults(defaults, { model: "other" }), { model: "other" });
  assert.deepEqual(applyProviderDefaults(defaults, { model: "other", effort: "medium" }), { model: "other", effort: "medium" });
});
