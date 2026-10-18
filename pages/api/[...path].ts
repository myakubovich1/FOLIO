import { hostedApi } from "../../server/serverless";

// Let the existing JSON and multipart middleware consume the original stream.
export const config = { api: { bodyParser: false, externalResolver: true } };
export default hostedApi;
