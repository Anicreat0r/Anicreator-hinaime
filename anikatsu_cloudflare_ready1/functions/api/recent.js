const UPSTREAM = "https://anikotoapi.site";

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const page = url.searchParams.get("page") || "1";
  const per = url.searchParams.get("per_page") || "50";
  const up = await fetch(`${UPSTREAM}/recent-anime?page=${encodeURIComponent(page)}&per_page=${encodeURIComponent(per)}`);
  if (!up.ok) return new Response("Upstream error", { status: up.status });
  const json = await up.json();
  return Response.json(json);
}