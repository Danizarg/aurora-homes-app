import { test } from "node:test";
import assert from "node:assert/strict";
import { createLinkQueue } from "./linkQueue.ts";

test("initial_url_taken_once", () => {
  const q = createLinkQueue(() => "zouza:///auth/callback#a");
  assert.deepEqual(q.take(), ["zouza:///auth/callback#a"]);
  assert.deepEqual(q.take(), []);
});

test("null_initial_ignored", () => assert.deepEqual(createLinkQueue(() => null).take(), []));

test("pushed_urls_taken_in_order_then_cleared", () => {
  const q = createLinkQueue(() => "cold");
  q.push("one");
  q.push("one");
  assert.deepEqual(q.take(), ["cold", "one", "one"]);
  assert.deepEqual(q.take(), []);
});

test("subscribers_notified_on_push", () => {
  const q = createLinkQueue(() => null);
  let n = 0;
  const off = q.subscribe(() => n++);
  q.push("x");
  off();
  q.push("y");
  assert.equal(n, 1);
});
