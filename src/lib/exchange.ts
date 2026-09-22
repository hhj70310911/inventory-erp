export function getKrwTwdRate(): number {
  const raw = process.env.OLIVEYOUNG_KRW_TWD_RATE;
  const n = raw ? parseFloat(raw) : 45;
  return Number.isFinite(n) && n > 0 ? n : 45;
}

export function krwToTwd(krw: number, rate = getKrwTwdRate()): number {
  return Math.round(krw / rate);
}
