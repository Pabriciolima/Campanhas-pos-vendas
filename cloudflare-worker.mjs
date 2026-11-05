// Cloudflare Workers: mantém o frontend estático e executa as APIs protegidas do Hub.
import { criarHandlerGarantia } from "./api/garantia.mjs";
import { criarHandlerCompras } from "./api/compras.mjs";

const MAX_BODY_BYTES = 3_000_000;

async function executarHandler(request, env, handler) {
  const url = new URL(request.url);
  if (request.method === "POST") {
    const anunciado = Number(request.headers.get("content-length") || 0);
    if (anunciado > MAX_BODY_BYTES) {
      return Response.json({ error: "Solicitação grande demais." }, { status: 413 });
    }
  }
  const payload = request.method === "POST" ? await request.text() : undefined;
  if (payload && new TextEncoder().encode(payload).byteLength > MAX_BODY_BYTES) {
    return Response.json({ error: "Solicitação grande demais." }, { status: 413 });
  }

  const headers = Object.fromEntries(request.headers);
  headers.host = url.host;
  const req = {
    method: request.method,
    headers,
    query: Object.fromEntries(url.searchParams),
    body: payload,
  };
  let status = 200;
  const responseHeaders = new Headers({
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  });
  const res = {
    setHeader(name, value) { responseHeaders.set(name, String(value)); return this; },
    status(value) { status = value; return this; },
    json(value) {
      return new Response(JSON.stringify(value), { status, headers: responseHeaders });
    },
  };
  return handler(req, res);
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    try {
      if (path === "/api/garantia") {
        return await executarHandler(request, env, criarHandlerGarantia(env));
      }
      if (path === "/api/compras") {
        return await executarHandler(request, env, criarHandlerCompras({ env }));
      }
      return env.ASSETS.fetch(request);
    } catch (err) {
      console.error("[HUB CLOUDFLARE]", err?.message || "erro interno");
      return Response.json(
        { error: "Não foi possível concluir a operação. Os dados existentes foram preservados." },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }
  },
};
