import type { Item } from "@casm/protocol";

export type WorkView = "compact" | "detailed";
const storageKey = "casm.work-view";
export function readWorkView(storage: Pick<Storage, "getItem">): WorkView {
  try { return storage.getItem(storageKey) === "detailed" ? "detailed" : "compact"; }
  catch { return "compact"; }
}
export function writeWorkView(storage: Pick<Storage, "setItem">, value: WorkView) {
  try { storage.setItem(storageKey, value); } catch { /* Optional device preference. */ }
}
export type TranscriptRow = { id: string; start: number; items: Item[]; work: boolean };
// Messages, plans and notices always remain in their original order and visible.
export function transcriptRows(items: Item[], view: WorkView): TranscriptRow[] {
  const rows: TranscriptRow[] = [];
  for (const [start, item] of items.entries()) {
    const work = view === "compact" && ["tool", "reasoning", "subagent"].includes(item.kind);
    const previous = rows.at(-1);
    if (work && previous?.work) previous.items.push(item);
    else rows.push({ id: work ? `work:${item.id}` : item.id, start, items: [item], work });
  }
  return rows;
}
// Source offsets remain the persisted scroll position and the server's find
// coordinates, even when several source items share one visible row.
export function rowAt(rows: TranscriptRow[], source: number) {
  return Math.max(0, rows.findLastIndex((row) => row.start <= source));
}
export type RowAnchor = { first: number; rows: TranscriptRow[] };
export function anchorRows(rows: TranscriptRow[], start: number, previous?: RowAnchor): RowAnchor {
  if (previous) {
    const offsets = new Map(previous.rows.map((row, index) => [row.id, index]));
    for (const [index, row] of rows.entries()) {
      const before = offsets.get(row.id);
      if (before !== undefined) return { first: previous.first + before - index, rows };
    }
  }
  return { first: 100000 + start, rows };
}
