import assert from "node:assert";
import { bumpOf, reduceOf } from "../ratio.js";
import { step, close } from "../ratiorun.js";
import { render } from "../app.js";

const base = {
  budget: 1,
  state: { counters: [], ratios: [], ledger: [], applied: [] },
  events: [{ id: 1, kind: "hit", name: "a" }],
  bad_name_code: "E_BAD_NAME", no_name_code: "E_NO_NAME",
  event_error_code: "E_BAD_EVENT"
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("bumpOf returns a list", () => {
  assert.ok(Array.isArray(bumpOf([["a", 1, 0]], "a", false)));
});

check("reduceOf returns two numbers", () => {
  const got = reduceOf(2, 1);
  assert.strictEqual(got.length, 2);
});

check("step returns a state", () => {
  assert.strictEqual(typeof step(base).state, "object");
});

check("close returns a state", () => {
  assert.strictEqual(typeof close(base).state, "object");
});

check("render counts events", () => {
  assert.strictEqual(typeof render(base).count_events, "number");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
