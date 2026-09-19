const UPSTREAM = "https://anikotoapi.site";

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const page = url.searchParams.get("page") || "1";
  const per = url.searchParams.get("per_page") || "50";

  try {
    const upstream = await fetch(
      `${UPSTREAM}/recent-anime?page=${encodeURIComponent(page)}&per_page=${encodeURIComponent(per)}`,
      { headers: { "Accept": "application/json" } }
    );

    if (!upstream.ok) {
      return Response.json(
        { ok: false, error: `Upstream API returned ${upstream.status}` },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      );
    }

    const json = await upstream.json();
    return Response.json(json, {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300"
      }
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: "Could not reach catalog API" },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}
