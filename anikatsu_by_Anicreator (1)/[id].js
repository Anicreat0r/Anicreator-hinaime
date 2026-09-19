const UPSTREAM = "https://anikotoapi.site";

export async function onRequestGet(context) {
  const { id } = context.params;
  const up = await fetch(`${UPSTREAM}/series/${encodeURIComponent(id)}`);
  if (!up.ok) return new Response("Upstream error", { status: up.status });
  const json = await up.json();
  return Response.json(json);
}