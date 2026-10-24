export const CHILD_COOKIE = "mc_hijo";
export const KID_MIN_YEARS = 6;
export const KID_MAX_YEARS = 12;

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

/** Inclusive 6 to 12 on the given calendar day. A 13th birthday is already too old. */
export function kidBirthOk(birth: string, today: string): boolean {
  const born = parseISODate(birth);
  const now = parseISODate(today);
  if (!born || !now) return false;
  const turnedSix = shiftYears(born, KID_MIN_YEARS);
  const turnsThirteen = shiftYears(born, KID_MAX_YEARS + 1);
  return turnedSix.getTime() <= now.getTime() && now.getTime() < turnsThirteen.getTime();
}

export function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return { firstName: parts[0] ?? "", lastName: "" };
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

/** Missing cookie prefers the first linked child. "yo" is the adult's own profile. */
export function resolveActiveStudent(cookie: string | null | undefined, selfId: string, childIds: string[]): { id: string; self: boolean } {
  if (cookie === "yo" || childIds.length === 0) return { id: selfId, self: true };
  if (cookie && childIds.includes(cookie)) return { id: cookie, self: false };
  return { id: childIds[0] ?? selfId, self: false };
}

/** Liberar conserva el id del perfil. El alta de Auth usa ese mismo id. */
export function releasedProfileId(childId: string): string {
  return childId;
}
