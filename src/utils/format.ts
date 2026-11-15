const faFormatter = new Intl.NumberFormat('fa-IR');

/** عدد را با ارقام فارسی برمی‌گرداند (۱۲۳) */
export function toFa(value: number | string): string {
  const num = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(num)) return String(value);
  return faFormatter.format(num);
}

/** زمان را به قالب «م:ث» فارسی برمی‌گرداند */
export function toFaClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${toFa(minutes)}:${String(seconds).padStart(2, '0').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])}`;
}
