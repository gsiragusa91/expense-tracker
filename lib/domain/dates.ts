const MONTHS: Record<string, string> = {
  ene: "01",
  feb: "02",
  mar: "03",
  abr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  ago: "08",
  sep: "09",
  set: "09",
  oct: "10",
  nov: "11",
  dic: "12"
};

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function monthKey(date: string) {
  return date.slice(0, 7);
}

export function parseShortSpanishDate(value: string, statementYear: number) {
  const match = value.toLowerCase().match(/^(\d{1,2})\/([a-z]{3})$/);
  if (!match) return null;
  const [, day, monthName] = match;
  const month = MONTHS[monthName];
  if (!month) return null;
  return `${statementYear}-${month}-${day.padStart(2, "0")}`;
}

export function parseGaliciaDate(value: string) {
  const match = value.match(/^(\d{2})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  return `20${year}-${month}-${day}`;
}
