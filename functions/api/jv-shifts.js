export async function onRequestGet({ env, request }) {
  const group = request.headers.get("Authorization");
  if (group !== "jv26") {
    return new Response("Unauthorized", { status: 401 });
  }

  const { results } = await env.DB.prepare(
    `SELECT id, start_at, end_at, needed, names_json, updated_at
     FROM jv_shifts
     ORDER BY start_at ASC, end_at ASC, id ASC`
  ).all();

  const rows = (results || []).map(r => ({
    ...r,
    names: safeParseJson(r.names_json, r.needed)
  }));

  return new Response(JSON.stringify(rows), {
    headers: { "Content-Type": "application/json" }
  });
}
export async function onRequestGet({ env, request }) {
  const group = request.headers.get("Authorization");
  if (group !== "jv26") {
    return new Response("Unauthorized", { status: 401 });
  }

  const { results } = await env.DB.prepare(
    `SELECT id, start_at, end_at, needed, names_json, updated_at
     FROM jv_shifts
     ORDER BY start_at ASC, end_at ASC, id ASC`
  ).all();

  const rows = (results || []).map(r => ({
    ...r,
    names: safeParseJson(r.names_json, r.needed)
  }));

  return new Response(JSON.stringify(rows), {
    headers: { "Content-Type": "application/json" }
  });
}

export async function onRequestPost({ env, request }) {
  const group = request.headers.get("Authorization");
  if (group !== "jv26") {
    return new Response("Unauthorized", { status: 401 });
  }

  const data = await request.json();

  if (!data.id || !Array.isArray(data.names)) {
    return new Response(JSON.stringify({ error: "Bad request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const current = await env.DB.prepare(
    `SELECT id, needed, names_json, updated_at
     FROM jv_shifts
     WHERE id = ?`
  ).bind(data.id).all();

  if (!current.results || !current.results[0]) {
    return new Response(JSON.stringify({ error: "Row not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }

  const row = current.results[0];
  const needed = Number(row.needed || 0);
  const oldNames = safeParseJson(row.names_json, needed);

  const cleaned = data.names
    .slice(0, needed)
    .map(x => (x || "").trim());

  while (cleaned.length < needed) {
    cleaned.push("");
  }

  await env.DB.prepare(
    `UPDATE jv_shifts
     SET names_json = ?, updated_at = CAST(strftime('%s','now') AS INTEGER)
     WHERE id = ?`
  ).bind(JSON.stringify(cleaned), data.id).run();

  for (let i = 0; i < needed; i++) {
    const oldValue = (oldNames[i] || "").trim();
    const newValue = (cleaned[i] || "").trim();

    if (oldValue !== "" && oldValue !== newValue) {
      const allShifts = await env.DB.prepare(
        `SELECT names_json FROM jv_shifts`
      ).all();

      let foundElsewhere = false;

      for (const s of allShifts.results || []) {
        const names = safeParseJson(s.names_json, 50);
        if (names.includes(oldValue)) {
          foundElsewhere = true;
          break;
        }
      }

      if (!foundElsewhere) {
        await env.DB.prepare(
          `UPDATE jv_signups
           SET active = 0,
               updated_at = CAST(strftime('%s','now') AS INTEGER)
           WHERE shift_id = ?
             AND slot_index = ?
             AND full_name = ?
             AND active = 1`
        ).bind(data.id, i, oldValue).run();
      }
    }
  }

  const updated = await env.DB.prepare(
    `SELECT id, start_at, end_at, needed, names_json, updated_at
     FROM jv_shifts
     WHERE id = ?`
  ).bind(data.id).all();

  const out = updated.results[0];

  return new Response(JSON.stringify({
    ok: true,
    row: {
      ...out,
      names: safeParseJson(out.names_json, out.needed)
    }
  }), {
    headers: { "Content-Type": "application/json" }
  });
}

function safeParseJson(value, needed) {
  try {
    const arr = JSON.parse(value || "[]");
    if (Array.isArray(arr)) {
      const out = arr.slice(0, needed).map(x => String(x || ""));
      while (out.length < needed) out.push("");
      return out;
    }
  } catch (e) {}
  return Array.from({ length: needed }, () => "");
}
export async function onRequestPost({ env, request }) {
  const group = request.headers.get("Authorization");
  if (group !== "jv26") {
    return new Response("Unauthorized", { status: 401 });
  }

  const data = await request.json();

  if (!data.id || !Array.isArray(data.names)) {
    return new Response(JSON.stringify({ error: "Bad request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const current = await env.DB.prepare(
    `SELECT id, needed, names_json, updated_at
     FROM jv_shifts
     WHERE id = ?`
  ).bind(data.id).all();

  if (!current.results || !current.results[0]) {
    return new Response(JSON.stringify({ error: "Row not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }

  const row = current.results[0];
  const needed = Number(row.needed || 0);
  const oldNames = safeParseJson(row.names_json, needed);

  const cleaned = data.names
    .slice(0, needed)
    .map(x => (x || "").trim());

  while (cleaned.length < needed) {
    cleaned.push("");
  }

  await env.DB.prepare(
    `UPDATE jv_shifts
     SET names_json = ?, updated_at = CAST(strftime('%s','now') AS INTEGER)
     WHERE id = ?`
  ).bind(JSON.stringify(cleaned), data.id).run();

  for (let i = 0; i < needed; i++) {
    const oldValue = (oldNames[i] || "").trim();
    const newValue = (cleaned[i] || "").trim();

    if (oldValue !== "" && oldValue !== newValue) {
// tarkista löytyykö nimi jostain toisesta vuorosta vielä
const stillExists = await env.DB.prepare(
  `SELECT COUNT(*) as count
   FROM jv_shifts`
).all();

const allShifts = await env.DB.prepare(
  `SELECT names_json FROM jv_shifts`
).all();

let foundElsewhere = false;

for (const s of allShifts.results || []) {
  const names = safeParseJson(s.names_json, 50);
  if (names.includes(oldValue)) {
    foundElsewhere = true;
    break;
  }
}

if (!foundElsewhere) {
  await env.DB.prepare(
    `UPDATE jv_signups
     SET active = 0,
         updated_at = CAST(strftime('%s','now') AS INTEGER)
     WHERE shift_id = ?
       AND slot_index = ?
       AND full_name = ?
       AND active = 1`
  ).bind(data.id, i, oldValue).run();
}
             updated_at = CAST(strftime('%s','now') AS INTEGER)
         WHERE shift_id = ?
           AND slot_index = ?
           AND active = 1
           AND full_name = ?`
      ).bind(data.id, i, oldValue).run();
    }
  }

  const updated = await env.DB.prepare(
    `SELECT id, start_at, end_at, needed, names_json, updated_at
     FROM jv_shifts
     WHERE id = ?`
  ).bind(data.id).all();

  const out = updated.results[0];

  return new Response(JSON.stringify({
    ok: true,
    row: {
      ...out,
      names: safeParseJson(out.names_json, out.needed)
    }
  }), {
    headers: { "Content-Type": "application/json" }
  });
}

function safeParseJson(value, needed) {
  try {
    const arr = JSON.parse(value || "[]");
    if (Array.isArray(arr)) {
      const out = arr.slice(0, needed).map(x => String(x || ""));
      while (out.length < needed) out.push("");
      return out;
    }
  } catch (e) {}
  return Array.from({ length: needed }, () => "");
}
