export const pad = (n: number) => String(n).padStart(2, "0");

// Hoy en formato YYYY-MM-DD (hora local)
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const firstDayOfMonthISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
};

// '2026-07-08' o '2026-07-08 14:30:00' -> '2026-07-08'
export const dateOnly = (value: string) => String(value ?? "").slice(0, 10);

// -> '08/07/2026'
export const formatDate = (value: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ""));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(value ?? "");
};

// '2026-07-08 14:30:00' -> '08/07/2026 14:30'
export const formatDateTime = (value: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(String(value ?? ""));
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : formatDate(value);
};
