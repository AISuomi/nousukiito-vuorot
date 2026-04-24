export async function onRequestGet({ env, request }) {
  const group = request.headers.get("Authorization");
  if (group !== "jv26_admin") {
    return new Response("Unauthorized", { status: 401 });
  }

  const { results } = await env.DB.prepare(
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
     ORDER BY s.active DESC, j.start_at ASC, j.end_at ASC, s.full_name ASC`
  ).all();

  return new Response(JSON.stringify(results || []), {
    headers: { "Content-Type": "application/json" }
  });
}
