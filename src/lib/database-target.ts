// Endpoint pinning is a configuration guard, not a substitute for DB permissions.
export function assertDatabaseTarget() {
  let url: URL;
  try { url = new URL(process.env.DATABASE_URL ?? ''); }
  catch { throw new Error('Invalid ERP DATABASE_URL.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.username || !url.password || url.pathname.length < 2 || url.host + url.pathname !== process.env.ERP_DATABASE_TARGET) {
    throw new Error('ERP_DATABASE_TARGET must match the database host, port and path.');
  }
}
