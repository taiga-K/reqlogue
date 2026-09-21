import "server-only";

import { getApiHealth } from "@/entities/session/index.server";

export async function getHealth() {
  try {
    const api = await getApiHealth();
    return Response.json({
      status: api.status === "ok" ? "ok" : "degraded",
      service: "web",
      api,
    });
  } catch {
    return Response.json(
      {
        status: "degraded",
        service: "web",
        api: { status: "degraded", service: "api" },
      },
      { status: 200 },
    );
  }
}
