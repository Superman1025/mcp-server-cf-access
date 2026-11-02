import { env } from "cloudflare:workers";
import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { handleAccessRequest } from "./access-handler";

// /mcp -> mcp-proxy on the PC, only via private VPC service ABLETON_MCP
const UP = "http://127.0.0.1:8096/mcp/";
const FWD = ["accept", "content-type", "mcp-session-id", "mcp-protocol-version", "last-event-id"];

const apiHandler = {
	async fetch(req: Request, e: any) {
		const h = new Headers();
		for (const n of FWD) {
			const v = req.headers.get(n);
			if (v) h.set(n, v);
		}
		const m = req.method;
		const body = m == "GET" || m == "HEAD" ? undefined : await req.arrayBuffer();
		try {
			const r = await e.ABLETON_MCP.fetch(UP + new URL(req.url).search, { method: m, headers: h, body, redirect: "manual" });
			console.log("up " + m + " " + r.status + " " + r.headers.get("content-type")); return new Response(r.body, r);
		} catch (err) {
			console.error("bridge " + m + " " + String(err));
			return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32000, message: "Ableton bridge unreachable" } }, { status: 502 });
		}
	},
};

export default new OAuthProvider<Env>({
	apiHandler,
	apiRoute: "/mcp",
	authorizeEndpoint: "/authorize",
	clientRegistrationEndpoint: "/register",
	defaultHandler: { fetch: handleAccessRequest as any },
	tokenEndpoint: "/token",
	resourceMetadata: { resource: env.MCP_RESOURCE },
});
