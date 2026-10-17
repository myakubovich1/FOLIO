import { Pool } from "pg";
import { readFileSync } from "node:fs";
import { checkServerIdentity, type PeerCertificate } from "node:tls";
export function verifyPinnedCertificate(
  host: string,
  cert: PeerCertificate,
  expected: string,
) {
  const identityError = checkServerIdentity(host, cert);
  if (identityError) return identityError;
  const normalize = (v: string) => v.replaceAll(":", "").toLowerCase();
  if (
    !cert.fingerprint256 ||
    normalize(cert.fingerprint256) !== normalize(expected)
  )
    return Error(
      "Database certificate pin changed; verify the service certificate before deliberately updating the local pin.",
    );
}
export function databasePool(connectionString: string, max = 5) {
  const url = new URL(connectionString);
  const pinHost = process.env.FOLIO_DATABASE_CERT_HOST;
  const pin = process.env.FOLIO_DATABASE_CERT_SHA256;
  if (pin && !pinHost)
    throw Error(
      "Database certificate pin requires its explicit service host and port.",
    );
  if (!pin || url.host !== pinHost)
    return new Pool({ connectionString, max, connectionTimeoutMillis: 10000 });
  const root = url.searchParams.get("sslrootcert");
  if (
    !root ||
    url.searchParams.get("sslmode") !== "verify-full" ||
    url.searchParams.has("sslcert") ||
    url.searchParams.has("sslkey")
  )
    throw Error(
      "Pinned database TLS requires verify-full, a local sslrootcert, and no client-certificate override.",
    );
  url.searchParams.delete("sslrootcert");
  url.searchParams.delete("sslmode");
  return new Pool({
    connectionString: url.toString(),
    max,
    connectionTimeoutMillis: 10000,
    ssl: {
      rejectUnauthorized: true,
      ca: readFileSync(root, "utf8"),
      checkServerIdentity: (host, cert) =>
        verifyPinnedCertificate(host, cert, pin),
    },
  });
}
