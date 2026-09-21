import { http, HttpResponse } from "msw";
import {
  createPlaceholderRequirementsMarkdown,
  createPlaceholderWorkspace,
} from "@/entities/session";

const apiOrigin = process.env["API_BASE_URL"] ?? "http://127.0.0.1:8000";

export const handlers = [
  http.get(`${apiOrigin}/health`, () =>
    HttpResponse.json({ status: "ok", service: "api" }),
  ),
  http.get(`${apiOrigin}/v1/sessions/:sessionId`, ({ params }) => {
    const sessionId = String(params["sessionId"]);
    return HttpResponse.json(createPlaceholderWorkspace(sessionId));
  }),
  http.get(`${apiOrigin}/v1/sessions/:sessionId/requirements.md`, ({ params }) => {
    const sessionId = String(params["sessionId"]);
    return new HttpResponse(createPlaceholderRequirementsMarkdown(sessionId), {
      headers: { "content-type": "text/markdown; charset=utf-8" },
    });
  }),
  http.get("/api/health", () =>
    HttpResponse.json({
      status: "ok",
      service: "web",
      api: { status: "ok", service: "api" },
    }),
  ),
  http.get("/api/sessions/:sessionId/requirements", ({ params }) => {
    const sessionId = String(params["sessionId"]);
    return new HttpResponse(createPlaceholderRequirementsMarkdown(sessionId), {
      headers: { "content-type": "text/markdown; charset=utf-8" },
    });
  }),
];
