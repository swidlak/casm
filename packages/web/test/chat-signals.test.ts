import { test } from "node:test";
import assert from "node:assert/strict";
import { observeSignal, liveSignal, sampleSignal, tailSignature, readSignals, saveSignals } from "../src/chat-signals.ts";
const agent = { status: "idle" as const, updatedAt: "2026-11-01T00:00:00Z" };
const reply = (id: string, text = "Done") => ({ kind: "assistant" as const, id, text, at: "2026-11-02T00:00:00Z" });
test("first snapshots and history establish a baseline without labelling old conversations unread", () => {
  const initial = observeSignal(undefined, agent, false, 1000);
  assert.equal(initial.unread, false);
  const sampled = sampleSignal(initial, agent, reply("a"), false);
  assert.equal(sampled.unread, false);
  assert.equal(sampled.activity, Date.parse("2026-11-02T00:00:00Z"));
  assert.equal(observeSignal(sampled, agent, false), sampled);
});
test("background status changes remain unread until viewed, including after reload", () => {
  let state = observeSignal(undefined, agent, false);
  state = observeSignal(state, { ...agent, status: "running" }, false, Date.parse("2026-11-03"));
  assert.equal(state.unread, true);
  state = observeSignal(state, agent, false, Date.parse("2026-11-04"));
  let serialized = "";
  saveSignals({ setItem: (_, value) => { serialized = value; } }, { '["host","a"]': state });
  const restored = readSignals({ getItem: () => serialized })['["host","a"]'];
  assert.equal(restored.unread, true);
  assert.equal(observeSignal(restored, agent, true).unread, false);
});
test("latest-item checks catch a response received while the PWA was closed and the status remained idle", () => {
  const before = sampleSignal(undefined, agent, reply("a"), true);
  const after = sampleSignal(before, agent, reply("b"), false, Date.parse("2026-11-04"));
  assert.equal(after.unread, true);
  assert.equal(after.activity, Date.parse("2026-11-04"));
  assert.equal(sampleSignal(after, agent, reply("b"), true).unread, false);
  assert.equal(liveSignal(after, agent, false).tail, after.tail);
  assert.equal(observeSignal(after, { ...agent, status: "running" }, false).tail, after.tail);
});
test("fingerprints detect updated text without persisting its content and corrupt or blocked storage is harmless", () => {
  assert.notEqual(tailSignature(reply("a", "one")), tailSignature(reply("a", "two")));
  assert.ok(!tailSignature(reply("a", "private content")).includes("private content"));
  assert.deepEqual(readSignals({ getItem: () => '{"bad":true}' }), {});
  assert.deepEqual(readSignals({ getItem: () => 'invalid' }), {});
  assert.deepEqual(readSignals({ getItem() { throw Error(); } }), {});
  assert.doesNotThrow(() => saveSignals({ setItem() { throw Error(); } }, {}));
});
