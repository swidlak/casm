import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { AgentConfig, ProviderId } from "@casm/protocol";

export function providerDefaults(home: string | null, provider: ProviderId): AgentConfig {
  if (!home) return {};
  try {
    const value = JSON.parse(readFileSync(join(home, "config.json"), "utf8"))?.providerDefaults?.[provider];
    return Object.fromEntries(["model", "effort"].flatMap(key =>
      typeof value?.[key] === "string" && value[key].trim() ? [[key, value[key].trim()]] : []));
  } catch { return {}; }
}

export function applyProviderDefaults(defaults: AgentConfig, selected: AgentConfig = {}): AgentConfig {
  const explicit = Object.fromEntries(Object.entries(selected).filter(([, value]) => value !== "" && value !== undefined));
  // A different model can support different efforts. Do not carry the default effort across it.
  const inherited = explicit.model && explicit.model !== defaults.model ? {} : defaults;
  return { ...inherited, ...explicit };
}
