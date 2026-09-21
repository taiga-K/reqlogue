import { getRequirements } from "@/_app/api-routes";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/sessions/[sessionId]/requirements">,
) {
  const { sessionId } = await context.params;
  return getRequirements(sessionId);
}
