import { useState } from "react";
import type { Agent } from "@casm/protocol";
import type { Rpc } from "./state";

export function ChatRename({ agent, rpc, host, online, saved, cancel, saving }: {
  agent: Agent; rpc: Rpc | null; host: string; online: boolean; saved: (agent: Agent) => void;
  cancel: () => void; saving: (busy: boolean) => void;
}) {
  const [name, setName] = useState(agent.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <form className="chat-rename" onSubmit={event => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!rpc || !online || busy || !trimmed || trimmed === agent.name) return;
    setBusy(true);
    saving(true);
    setError("");
    void rpc.call("agent.update", { id: agent.id, name: trimmed }, host).then(
      updated => saved(updated),
      (e: unknown) => setError(e instanceof Error ? e.message : String(e)),
    ).finally(() => { setBusy(false); saving(false); });
  }}>
    <label>Chat name <input type="text" name="chat-name" value={name} autoFocus
      onFocus={event => event.currentTarget.select()}
      onChange={event => setName(event.target.value)} disabled={busy} required /></label>
    {error && <p role="alert" className="error">{error}</p>}
    <div className="confirm-actions">
      <button type="button" disabled={busy} onClick={cancel}>Cancel</button>
      <button type="submit" className="primary" disabled={!rpc || !online || busy || !name.trim() || name.trim() === agent.name}>Save name</button>
    </div>
  </form>;
}
