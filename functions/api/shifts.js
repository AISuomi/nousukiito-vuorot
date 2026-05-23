export async function onRequestGet({ env, request }) {
  const group = request.headers.get("Authorization");

  if (!group) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { results } = await env.DB.prepare(
    `SELECT *
     FROM shifts
     WHERE grp = ?
     ORDER BY sort_order ASC, id ASC`
  ).bind(group).all();

  return new Response(JSON.stringify(results || []), {
    headers: {
      "Content-Type": "application/json"
    }
  });
}

export async function onRequestPost({ env, request }) {
  const group = request.headers.get("Authorization");

  if (!group) {
    return new Response("Unauthorized", { status: 401 });
  }

  const data = await request.json();

  await env.DB.prepare(
    `UPDATE shifts
     SET slot1 = ?,
         slot2 = ?,
         slot1_phone = ?,
         slot1_home = ?,
         slot2_phone = ?,
         slot2_home = ?,
         updated_at = CAST(strftime('%s','now') AS INTEGER)
     WHERE id = ?
       AND grp = ?`
  ).bind(
    data.slot1 || "",
    data.slot2 || "",
    data.slot1_phone || "",
    data.slot1_home || "",
    data.slot2_phone || "",
    data.slot2_home || "",
    data.id,
    group
  ).run();

  const { results } = await env.DB.prepare(
    `SELECT *
     FROM shifts
     WHERE id = ?
       AND grp = ?`
  ).bind(data.id, group).all();

  return new Response(JSON.stringify({
    ok: true,
    row: results && results[0] ? results[0] : null
  }), {
    headers: {
      "Content-Type": "application/json"
    }
  });
}
