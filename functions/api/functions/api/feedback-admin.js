export async function onRequestGet({ env, request }) {
  if (!isAdmin(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { results } = await env.DB.prepare(
    `SELECT id, message, created_at
     FROM feedback
     ORDER BY created_at DESC, id DESC`
  ).all();

  return jsonResponse(results || []);
}

export async function onRequestPost({ env, request }) {
  if (!isAdmin(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  let data;

  try {
    data = await request.json();
  } catch {
    return jsonResponse(
      { error: "Virheellinen pyyntö." },
      400
    );
  }

  if (data.action === "delete_one") {
    const id = Number(data.id);

    if (!Number.isInteger(id) || id < 1) {
      return jsonResponse(
        { error: "Virheellinen tunniste." },
        400
      );
    }

    await env.DB.prepare(
      `DELETE FROM feedback WHERE id = ?`
    ).bind(id).run();

    return jsonResponse({ ok: true });
  }

  if (data.action === "delete_all") {
    await env.DB.prepare(
      `DELETE FROM feedback`
    ).run();

    return jsonResponse({ ok: true });
  }

  return jsonResponse(
    { error: "Tuntematon toiminto." },
    400
  );
}

function isAdmin(request) {
  return request.headers.get("Authorization") === "palaute26_admin";
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "Cache-Control": "no-store"
    }
  });
}
