export async function onRequestGet({ env, request }) {
  const group = request.headers.get("Authorization");
  if (!group) return new Response("Unauthorized", { status: 401 });

  const { results } = await env.DB.prepare(
    `SELECT id, grp, label, slot1, slot2,
            slot1_phone, slot1_home, slot2_phone, slot2_home,
            sort_order, updated_at
     FROM shifts
     WHERE grp = ?
     ORDER BY sort_order ASC, id ASC`
  ).bind(group).all();

  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json" }
  });
}

export async function onRequestPost({ env, request }) {
  const group = request.headers.get("Authorization");
  if (!group) return new Response("Unauthorized", { status: 401 });

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
     WHERE id = ? AND grp = ?`
  ).bind(
    (data.slot1 || "").trim(),
    (data.slot2 || "").trim(),
    (data.slot1_phone || "").trim(),
    (data.slot1_home || "").trim(),
    (data.slot2_phone || "").trim(),
    (data.slot2_home || "").trim(),
    data.id,
    group
  ).run();

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" }
  });
}
