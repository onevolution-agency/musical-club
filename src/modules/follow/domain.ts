const TEEN_MIN_YEARS = 13;
const TEEN_MAX_YEARS = 17;

function parseISODate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

function shiftYears(date: Date, years: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear() + years, date.getUTCMonth(), date.getUTCDate()));
}

/** Inclusive 13 to 17. The 18th birthday ends the follow. */
export function teenBirthOk(birth: string | null | undefined, today: string): boolean {
  if (!birth) return false;
  const born = parseISODate(birth);
  const now = parseISODate(today);
  if (!born || !now) return false;
  const turnedThirteen = shiftYears(born, TEEN_MIN_YEARS);
  const turnsEighteen = shiftYears(born, TEEN_MAX_YEARS + 1);
  return turnedThirteen.getTime() <= now.getTime() && now.getTime() < turnsEighteen.getTime();
}

export function turnedEighteen(birth: string | null | undefined, today: string): boolean {
  if (!birth) return false;
  const born = parseISODate(birth);
  const now = parseISODate(today);
  if (!born || !now) return false;
  return shiftYears(born, 18).getTime() <= now.getTime();
}

export function followLabel(name: string): string {
  return `${name} · Seguimiento`;
}
