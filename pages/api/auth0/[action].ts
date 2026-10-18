import type { NextApiRequest, NextApiResponse } from "next";
import { hostedApi } from "../../../server/serverless";

export const config = { api: { bodyParser: false, externalResolver: true } };
export default async function authentication(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  const action = request.query.action;
  if (
    typeof action !== "string" ||
    !["login", "callback", "logout"].includes(action)
  ) {
    response.status(404).end();
    return;
  }
  const query = new URL(request.url || "/", "http://internal.invalid").search;
  request.url = `/${action}${query}`;
  await hostedApi(request, response);
}
