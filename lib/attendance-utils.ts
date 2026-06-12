export function getLastWednesdayDate(): string {
  const now = new Date();
  const day = now.getDay();
  const daysSinceWednesday = (day - 3 + 7) % 7;
  const lastWed = new Date(now);
  lastWed.setDate(now.getDate() - daysSinceWednesday);
  const y = lastWed.getFullYear();
  const m = String(lastWed.getMonth() + 1).padStart(2, "0");
  const d = String(lastWed.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isTodayWednesday(): boolean {
  return new Date().getDay() === 3;
}

export function getAllWednesdaysInRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const current = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");

  while (current <= end) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, "0");
    const d = String(current.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 7);
  }

  return dates;
}

export function countWednesdaysInRange(from: string, to: string): number {
  return getAllWednesdaysInRange(from, to).length;
}

export function getTotalWednesdaysSince(dateStr: string): number {
  const start = new Date(dateStr);
  const now = new Date();
  if (start > now) return 1;
  const msPerDay = 86400000;
  const daysSince = Math.floor((now.getTime() - start.getTime()) / msPerDay);
  const fullWeeks = Math.floor(daysSince / 7);
  const startDay = start.getDay();
  const daysUntilNextWed = (3 - startDay + 7) % 7;
  const extra = daysSince >= daysUntilNextWed ? 1 : 0;
  return Math.max(1, fullWeeks + extra);
}
