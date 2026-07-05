export async function onRequestGet({ env, request }) {
  const group = request.headers.get("Authorization");
  if (group !== "jv26_admin") {
    return new Response("Unauthorized", { status: 401 });
  }

  const shifts = await env.DB.prepare(
    `SELECT id, start_at, end_at, needed, names_json, updated_at
     FROM jv_shifts
     ORDER BY start_at ASC, end_at ASC, id ASC`
  ).all();

  const signups = await env.DB.prepare(
    `SELECT
       s.id,
       s.shift_id,
       s.slot_index,
       s.full_name,
       s.email,
       s.phone,
       s.jv_card_number,
       s.home_unit,
       s.active,
       s.created_at,
       s.updated_at,
       j.start_at,
       j.end_at
     FROM jv_signups s
     LEFT JOIN jv_shifts j ON j.id = s.shift_id
     ORDER BY s.full_name ASC`
  ).all();

  const shiftRows = (shifts.results || []).map(r => ({
    ...r,
    names: safeParseJson(r.names_json, r.needed)
  }));

  return new Response(JSON.stringify({
    shifts: shiftRows,
    signups: signups.results || []
  }), {
    headers: { "Content-Type": "application/json" }
  });
}

export async function onRequestPost({ env, request }) {
  const group = request.headers.get("Authorization");
  if (group !== "jv26_admin") {
    return new Response("Unauthorized", { status: 401 });
  }

  const data = await request.json();

  if (data.action !== "delete_name") {
    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const shiftId = Number(data.shift_id);
  const slotIndex = Number(data.slot_index);

  const current = await env.DB.prepare(
    `SELECT id, needed, names_json
     FROM jv_shifts
     WHERE id = ?`
  ).bind(shiftId).all();

  if (!current.results || !current.results[0]) {
    return new Response(JSON.stringify({ error: "Vuoroa ei löytynyt" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }

  const row = current.results[0];
  const names = safeParseJson(row.names_json, row.needed);

  if (slotIndex < 0 || slotIndex >= names.length) {
    return new Response(JSON.stringify({ error: "Virheellinen paikka" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  names[slotIndex] = "";

  await env.DB.prepare(
    `UPDATE jv_shifts
     SET names_json = ?,
         updated_at = CAST(strftime('%s','now') AS INTEGER)
     WHERE id = ?`
  ).bind(JSON.stringify(names), shiftId).run();

  return new Response(JSON.stringify({ ok: true }), {
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

  return Array.from({ length: Number(needed || 0) }, () => "");
}
