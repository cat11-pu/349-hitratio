// ratiorun.js：按处理预算处理并留账
import { bumpOf, reduceOf } from "./ratio.js";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function codesOf(spec) {
  const s = spec || {};
  return {
    badEvent: s.event_error_code || "E_BAD_EVENT",
    badName: s.bad_name_code || "E_BAD_NAME",
    noName: s.no_name_code || "E_NO_NAME"
  };
}

function validate(event, codes) {
  const kinds = { hit: true, miss: true, report: true };
  if (!event || typeof event !== "object" || !kinds[event.kind] || typeof event.name !== "string") {
    fail(codes.badEvent, "bad event");
  }
  if (event.name.length === 0) {
    fail(codes.badName, "empty name");
  }
}

function cloneState(state) {
  const s = state || {};
  return {
    counters: (s.counters || []).map(function (row) { return [row[0], row[1], row[2]]; }),
    ratios: (s.ratios || []).map(function (row) { return [row[0], row[1], row[2]]; }),
    ledger: (s.ledger || []).map(function (e) { return { id: e.id, kind: e.kind, name: e.name }; }),
    applied: (s.applied || []).slice()
  };
}

function applyEvent(state, event, codes) {
  if (event.kind === "report") {
    let row = null;
    for (const item of state.counters) {
      if (item[0] === event.name) { row = item; break; }
    }
    if (!row) { fail(codes.noName, "no such name: " + event.name); }
    const pair = reduceOf(row[1], row[2]);
    state.ratios.push([event.name, pair[0], pair[1]]);
  } else {
    bumpOf(state.counters, event.name, event.kind === "hit");
  }
}

function markApplied(state, event) {
  if (event.id !== undefined && state.applied.indexOf(event.id) === -1) {
    state.applied.push(event.id);
  }
}

export function step(spec) {
  const codes = codesOf(spec);
  const state = cloneState(spec.state);
  const events = spec.events || [];
  events.forEach(function (event) { validate(event, codes); });
  let budget = typeof spec.budget === "number" ? spec.budget : 0;
  const queue = state.ledger.slice();
  events.forEach(function (event) {
    if (event.id !== undefined && state.applied.indexOf(event.id) !== -1) { return; }
    queue.push(event);
  });
  const rest = [];
  let served = 0;
  for (const event of queue) {
    if (budget <= 0) { rest.push(event); continue; }
    budget -= 1;
    applyEvent(state, event, codes);
    markApplied(state, event);
    served += 1;
  }
  state.ledger = rest;
  const before = spec.state && spec.state.ledger ? spec.state.ledger.length : 0;
  return {
    state: state,
    served: served,
    ledger_before: rest.length,
    ledger: rest.map(function (event) { return [event.kind, event.name]; }),
    judged: served,
    judged_bound: events.length + before
  };
}

export function close(spec) {
  const codes = codesOf(spec);
  const state = cloneState(spec.state);
  let catchup = 0;
  for (const event of state.ledger) {
    applyEvent(state, event, codes);
    markApplied(state, event);
    catchup += 1;
  }
  state.ledger = [];
  return { state: state, catchup: catchup };
}
