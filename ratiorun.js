// ratiorun.js：按共用处理预算逐条处理事件，用尽则连着载压账，收尾不限预算
import { bumpOf, reduceOf } from "./ratio.js";

const KINDS = ["hit", "miss", "report"];

function fail(code, fallback) {
  const finalCode = code || fallback;
  const error = new Error(finalCode);
  error.code = finalCode;
  throw error;
}

function cloneState(source) {
  const state = source || {};
  return {
    counters: (state.counters || []).map((row) => [row[0], row[1], row[2]]),
    ratios: (state.ratios || []).map((row) => [row[0], row[1], row[2]]),
    // 第三列是内部用的原事件 id，对外呈现只取前两列 [kind, name]
    ledger: (state.ledger || []).map((row) => [row[0], row[1], row[2]]),
    applied: (state.applied || []).slice()
  };
}

function signature(kind, name) {
  return kind + "\u0000" + name;
}

function eventKey(event) {
  return event.id !== undefined && event.id !== null
    ? "id:" + event.id : signature(event.kind, event.name);
}

// unlimited 为真时收尾：不管预算，把账上事件全部处理完
function run(spec, unlimited) {
  const state = cloneState(spec.state);
  const events = spec.events || [];

  // 先做与预算无关的结构校验：事件不合法 E_BAD_EVENT，名字为空 E_BAD_NAME
  for (const event of events) {
    if (!event || typeof event !== "object" || KINDS.indexOf(event.kind) < 0) {
      fail(spec.event_error_code, "E_BAD_EVENT");
    }
    if (typeof event.name !== "string" || event.name.length === 0) {
      fail(spec.bad_name_code, "E_BAD_NAME");
    }
  }

  // 本轮还没处理过的事件池；账上挂账先入队，有 id 按 id 精确找回原事件
  const pool = [];
  for (const event of events) {
    if (state.applied.indexOf(eventKey(event)) < 0) pool.push(event);
  }
  const queued = [];
  for (const pair of state.ledger) {
    let found = -1;
    if (pair[2] !== undefined && pair[2] !== null) {
      for (let i = 0; i < pool.length; i += 1) {
        if (pool[i].kind === pair[0] && pool[i].name === pair[1]
            && pool[i].id === pair[2]) { found = i; break; }
      }
    } else {
      for (let i = 0; i < pool.length; i += 1) {
        if (pool[i].kind === pair[0] && pool[i].name === pair[1]) { found = i; break; }
      }
    }
    if (found >= 0) {
      queued.push(pool[found]);
      pool.splice(found, 1);
    } else {
      const orphan = { kind: pair[0], name: pair[1] };
      if (pair[2] !== undefined && pair[2] !== null) orphan.id = pair[2];
      queued.push(orphan);
    }
  }
  for (const event of pool) queued.push(event);

  let budget = unlimited ? queued.length : Math.max(0, Math.floor(Number(spec.budget) || 0));
  let served = 0;
  while (queued.length > 0 && served < budget) {
    const event = queued.shift();
    if (event.kind === "report") {
      let row = null;
      for (const item of state.counters) {
        if (item[0] === event.name) { row = item; break; }
      }
      if (!row) fail(spec.no_name_code, "E_NO_NAME");
      const reduced = reduceOf(row[1], row[2]);
      state.ratios.push([event.name, reduced[0], reduced[1]]);
    } else {
      bumpOf(state.counters, event.name, event.kind === "hit");
    }
    const mark = event.id !== undefined && event.id !== null
      ? eventKey(event) : signature(event.kind, event.name);
    if (state.applied.indexOf(mark) < 0) state.applied.push(mark);
    served += 1;
  }

  state.ledger = queued.map((event) => {
    const row = [event.kind, event.name];
    if (event.id !== undefined && event.id !== null) row.push(event.id);
    return row;
  });
  const publicLedger = state.ledger.map((row) => [row[0], row[1]]);
  const ledgerInLength = (spec.state && spec.state.ledger ? spec.state.ledger.length : 0);
  return {
    state,
    served,
    ledger_before: publicLedger.length,
    ledger: publicLedger,
    judged: served + publicLedger.length,
    judged_bound: events.length + ledgerInLength
  };
}

export function step(spec) {
  return run(spec, false);
}

export function close(spec) {
  // 不限预算：挂账先处理（按 id 对上原事件），再处理剩余事件
  const result = run(spec, true);
  return { state: result.state, catchup: result.served };
}
