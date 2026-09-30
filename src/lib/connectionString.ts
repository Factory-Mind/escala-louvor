export function withVerifyFull(connectionString: string): string {
  const url = new URL(connectionString);
  const mode = url.searchParams.get("sslmode");
  if (mode === "prefer" || mode === "require" || mode === "verify-ca") {
    url.searchParams.set("sslmode", "verify-full");
  }
  return url.toString();
}
