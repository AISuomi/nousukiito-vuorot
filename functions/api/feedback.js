export async function onRequestPost({ env, request }) {
  let data;

  try {
    data = await request.json();
  } catch {
    return jsonResponse(
      { error: "Virheellinen lähetys." },
      400
    );
  }

  const message = String(data.message || "").trim();
  const website = String(data.website || "").trim();

  // Piilotettu roskapostikenttä.
  // Tavallinen käyttäjä ei täytä tätä.
  if (website !== "") {
    return jsonResponse({ ok: true });
  }

  if (message.length === 0) {
    return jsonResponse(
      { error: "Kirjoita palaute." },
      400
    );
  }

  if (message.length > 5000) {
    return jsonResponse(
      { error: "Palaute saa olla enintään 5000 merkkiä." },
      400
    );
  }

  await env.DB.prepare(
    `INSERT INTO feedback (message, created_at)
     VALUES (?, CAST(strftime('%s','now') AS INTEGER))`
  ).bind(message).run();

  return jsonResponse({ ok: true });
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
