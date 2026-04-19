export async function onRequestGet({ env, request }) {
  const group = request.headers.get("Authorization");
  if (!group) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { results } = await env.DB.prepare(
    `SELECT id, grp, label, slot1, slot2, sort_order
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
  if (!group) {
    return new Response("Unauthorized", { status: 401 });
  }

  const data = await request.json();

  if (!data.id) {
    return new Response(JSON.stringify({ error: "Missing id" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  await env.DB.prepare(
    `UPDATE shifts
     SET slot1 = ?, slot2 = ?
     WHERE id = ? AND grp = ?`
  ).bind(
    (data.slot1 || "").trim(),
    (data.slot2 || "").trim(),
    data.id,
    group
  ).run();

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" }
  });
}
