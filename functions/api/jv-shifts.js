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

  const { results } = await env.DB.prepare(
    `SELECT needed
     FROM jv_shifts
     WHERE id = ?`
  ).bind(data.id).all();

  if (!results || !results[0]) {
    return new Response(JSON.stringify({ error: "Row not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }

  const needed = Number(results[0].needed || 0);
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

  const updated = await env.DB.prepare(
    `SELECT id, start_at, end_at, needed, names_json, updated_at
     FROM jv_shifts
     WHERE id = ?`
  ).bind(data.id).all();

  const row = updated.results[0];

  return new Response(JSON.stringify({
    ok: true,
    row: {
      ...row,
      names: safeParseJson(row.names_json, row.needed)
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
