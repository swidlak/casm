# Host settings

The ⋯ button on a host row (Host options) opens the host modal: Usage,
Resources, AGENTS.md, System Prompt and Notifications. The ⋯ on a project
row (Project options) opens the project modal: Files, AGENTS.md, Memories and
Schedules (see [web client: schedules](web-client.md#schedules)), with
the project's path (Copy), host and group under its title and **New agent** in
its header. They share one layout (a tab rail on wide
screens, scrolling tabs and a full-screen sheet on phones) and ask before
closing with unsaved edits. The + on a host row adds a project; the two mini bars
beside the host's chevron (CPU, RAM) open its Resources tab. Every RPC
carries its host ID, so peer settings are read and saved on the selected peer.

## Global instructions

`host.agentsMd` returns effective global instruction files, resolved to their
real paths and grouped by the providers using them. Missing files have null
content and SHA. `host.setAgentsMd` accepts only a currently discovered path and
requires `expectedSha256` (null when creating). Saves use the same serialized,
atomic sibling-file replacement as project instructions, preserve permissions
and symlinks, and reject stale hashes. The editor keeps conflicting drafts and
lets users review the current version before retrying.

Discovery follows these provider conventions:

- Claude: `CLAUDE_CONFIG_DIR/CLAUDE.md`, default `~/.claude/CLAUDE.md`.
  [Claude memory documentation](https://code.claude.com/docs/en/memory).
- Codex: first nonempty `AGENTS.override.md`, then `AGENTS.md` in `CODEX_HOME`
  (default `~/.codex`).
  [Codex instructions documentation](https://developers.openai.com/codex/guides/agents-md).
- OpenCode: `$XDG_CONFIG_HOME/opencode/AGENTS.md`, default
  `~/.config/opencode/AGENTS.md`; otherwise `~/.claude/CLAUDE.md` unless
  `OPENCODE_DISABLE_CLAUDE_CODE` or `OPENCODE_DISABLE_CLAUDE_CODE_PROMPT` is enabled.
  [OpenCode rules documentation](https://opencode.ai/docs/rules/).
- pi: first existing `AGENTS.override.md`, `AGENTS.md`, `AGENTS.MD`, `CLAUDE.md`,
  or `CLAUDE.MD` under `PI_CODING_AGENT_DIR` (default `~/.pi/agent`). Verified
  against the installed pi coding agent's `core/resource-loader.js` and `config.js`.

This view covers global instruction files, not project or custom extra rules.
Environment overrides are those inherited by the casm server.

Only installed providers are shown when provider discovery is available. A
Claude global file containing exactly one `@path` import is resolved to that
file for editing. If Codex uses the same target, both providers share one editor
and saves preserve Claude's import wrapper. Files mixing imports with other
instructions remain separate. Start a new agent session after changing global
instructions so that the provider loads the updated rules.

## Project locations and files

The optional `CASM_PROJECT_ROOTS` environment variable is a nonempty JSON array
of absolute directories, for example `["C:/Projects/Work","C:/Projects/Personal"]`.
It populates the new-project area selector and restricts project creation,
agent creation and file RPCs to those roots. Existing ancestors are resolved
before creating folders to reject junction or symlink escapes. Unset it to keep
the default unrestricted project-location behavior. This is an application
boundary, not an operating-system sandbox for provider shell commands.

The project's Files tab lists one directory at a time with folders first and
up to 1,000 entries. Filtering applies to that directory; hidden and generated
files are hidden by default and can be shown. Files open in the existing
preview with download support. HTML is rendered in a sandboxed iframe; use
self-contained HTML because neighboring local assets are not automatically
served. Full Windows paths, including paths with spaces in inline code or
Markdown links, also open the file preview when they belong to a project root.

## System Prompt and project memories

The System Prompt tab holds casm's agent prompt (`casm agent-prompt` on the CLI). It uses `server.agentPrompt` and `server.setAgentPrompt` for
an example-agent preview, editing, enabling/disabling, and resetting to default.
The reset action asks for confirmation inside the dialog.

The project modal's Memories tab lists `project.memories` for that project only,
grouped by provider store. Entries and descriptions are read-only; Claude
frontmatter descriptions and Codex handbook scope descriptions are subtitles.
