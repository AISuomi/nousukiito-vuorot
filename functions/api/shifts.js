export async function onRequestGet({ env, request }) {
  const group = request.headers.get("Authorization");
  if (!group) return new Response("Unauthorized", { status: 401 });

  const { results } = await env.DB.prepare(
    "SELECT * FROM shifts WHERE grp=?"
  ).bind(group).all();

  return new Response(JSON.stringify(results));
}

export async function onRequestPost({ env, request }) {
  const group = request.headers.get("Authorization");
  if (!group) return new Response("Unauthorized", { status: 401 });

  const data = await request.json();

  for (const shift of data.shifts) {
    const { results } = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM shifts WHERE shift=? AND grp=?"
    ).bind(shift, group).all();

    if (results[0].count >= 2) continue;

    await env.DB.prepare(
      "INSERT INTO shifts (name, shift, grp) VALUES (?, ?, ?)"
    ).bind(data.name, shift, group).run();
  }

  return new Response("ok");
}
