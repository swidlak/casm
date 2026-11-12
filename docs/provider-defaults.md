# Host defaults for new agents

The optional `providerDefaults` object in `$CASM_HOME/config.json` sets the model
and reasoning effort for new agents on that host. All clients, including the PWA,
read the same defaults through `provider.catalog`.

```json
{
  "providerDefaults": {
    "claude": { "model": "claude-opus-5-5", "effort": "medium" },
    "codex": { "model": "gpt-6.1-sol", "effort": "high" }
  }
}
```

Existing agent configurations remain unchanged. Explicit creation settings take
precedence. Selecting a different model does not inherit the default model's
effort, because supported efforts can differ. Defaults cannot set permissions,
environment variables, MCP connections, or system prompts. The file is read on
each catalog request and agent creation; changing it does not require restarting
the server. A newly deployed version of the server does require a restart.

Version-pinned Claude model IDs resolve to the matching catalog alias for display
and supported effort controls, without changing the ID passed to Claude Code.
