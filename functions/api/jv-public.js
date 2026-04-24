export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT id, start_at, end_at, needed, names_json
     FROM jv_shifts
     ORDER BY start_at ASC, end_at ASC, id ASC`
  ).all();

  const rows = (results || []).map(r => {
    const names = safeParseJson(r.names_json, r.needed);
    const used = names.filter(x => (x || "").trim() !== "").length;
    return {
      id: r.id,
      start_at: r.start_at,
      end_at: r.end_at,
      needed: r.needed,
      free: Math.max(0, Number(r.needed) - used)
    };
  });

  return new Response(JSON.stringify(rows), {
    headers: { "Content-Type": "application/json" }
  });
}

export async function onRequestPost({ env, request }) {
  const data = await request.json();

  const shiftId = Number(data.shift_id);
  const firstName = (data.first_name || "").trim();
  const lastName = (data.last_name || "").trim();
  const email = (data.email || "").trim();
  const phone = (data.phone || "").trim();
  const jvCard = (data.jv_card_number || "").trim();
  const homeUnit = (data.home_unit || "").trim();

  if (!shiftId || !firstName || !lastName || !email || !phone || !jvCard || !homeUnit) {
    return new Response(JSON.stringify({ error: "Täytä kaikki kentät" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const fullName = `${firstName} ${lastName}`.trim();

  for (let attempt = 0; attempt < 4; attempt++) {
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
    const needed = Number(row.needed || 0);
    const oldNames = safeParseJson(row.names_json, needed);
    const slotIndex = oldNames.findIndex(x => (x || "").trim() === "");

    if (slotIndex === -1) {
      return new Response(JSON.stringify({ error: "Paikka ehti mennä. Päivitä lista." }), {
        status: 409,
        headers: { "Content-Type": "application/json" }
      });
    }

    const newNames = [...oldNames];
    newNames[slotIndex] = fullName;

    const update = await env.DB.prepare(
      `UPDATE jv_shifts
       SET names_json = ?, updated_at = CAST(strftime('%s','now') AS INTEGER)
       WHERE id = ? AND names_json = ?`
    ).bind(
      JSON.stringify(newNames),
      shiftId,
      row.names_json
    ).run();

    if (update.meta && update.meta.changes === 1) {
// tarkista löytyykö sama henkilö jo aiemmin
const existing = await env.DB.prepare(
  `SELECT id
   FROM jv_signups
   WHERE full_name = ?
   ORDER BY id DESC
   LIMIT 1`
).bind(fullName).all();

if (existing.results && existing.results[0]) {
  // päivitä olemassa oleva
  await env.DB.prepare(
    `UPDATE jv_signups
     SET shift_id = ?,
         slot_index = ?,
         email = ?,
         phone = ?,
         jv_card_number = ?,
         home_unit = ?,
         active = 1,
         updated_at = CAST(strftime('%s','now') AS INTEGER)
     WHERE id = ?`
  ).bind(
    shiftId,
    slotIndex,
    email,
    phone,
    jvCard,
    homeUnit,
    existing.results[0].id
  ).run();

} else {
  // uusi ilmoittautuminen
  await env.DB.prepare(
    `INSERT INTO jv_signups
     (shift_id, slot_index, full_name, email, phone, jv_card_number, home_unit, source, active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'public', 1, CAST(strftime('%s','now') AS INTEGER), CAST(strftime('%s','now') AS INTEGER))`
  ).bind(
    shiftId,
    slotIndex,
    fullName,
    email,
    phone,
    jvCard,
    homeUnit
  ).run();
}
         (shift_id, slot_index, full_name, email, phone, jv_card_number, home_unit, source, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'public', 1, CAST(strftime('%s','now') AS INTEGER), CAST(strftime('%s','now') AS INTEGER))`
      ).bind(
        shiftId,
        slotIndex,
        fullName,
        email,
        phone,
        jvCard,
        homeUnit
      ).run();

      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  return new Response(JSON.stringify({ error: "Paikka ehti mennä. Päivitä lista ja yritä uudelleen." }), {
    status: 409,
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
