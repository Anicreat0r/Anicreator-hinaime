const UPSTREAM = "https://anikotoapi.site";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/api/recent") {
      const page = url.searchParams.get("page") || "1";
      const per = url.searchParams.get("per_page") || "50";
      const up = await fetch(`${UPSTREAM}/recent-anime?page=${encodeURIComponent(page)}&per_page=${encodeURIComponent(per)}`);
      const json = await up.json();
      return Response.json(json);
    }

    const seriesMatch = url.pathname.match(/^\/api\/series\/(\d+)$/);
    if (request.method === "GET" && seriesMatch) {
      const up = await fetch(`${UPSTREAM}/series/${encodeURIComponent(seriesMatch[1])}`);
      const json = await up.json();
      return Response.json(json);
    }

    return new Response("Not found", { status: 404 });
  },
};