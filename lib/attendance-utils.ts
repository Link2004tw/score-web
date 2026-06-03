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
