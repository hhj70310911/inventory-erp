export function validTimeZone(value: string): boolean {
  try { new Intl.DateTimeFormat('zh-TW', {timeZone: value}).format(); return !!value; } catch { return false; }
}
export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}
export function formatInstant(value: string, timeZone: string): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('zh-TW', {timeZone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23', timeZoneName:'shortOffset'}).format(new Date(value));
}
export function dateInZone(value: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone, year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(value);
  const get = (type: string) => parts.find(p => p.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
