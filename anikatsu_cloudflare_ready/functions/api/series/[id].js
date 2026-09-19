const UPSTREAM = "https://anikotoapi.site";

export async function onRequestGet(context) {
  const id = context.params.id;

  if (!/^\d+$/.test(String(id))) {
    return Response.json({ ok: false, error: "Invalid series id" }, { status: 400 });
  }

  try {
    const upstream = await fetch(
      `${UPSTREAM}/series/${encodeURIComponent(id)}`,
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
