export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  const group = url.searchParams.get("group");

  const body = await request.text();
  const key = "PASS_" + group;

  if (env[key] && body === env[key]) {
    return new Response(JSON.stringify({ token: group }));
  }

  return new Response(JSON.stringify({ error: "wrong" }));
}
