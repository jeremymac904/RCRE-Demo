/**
 * One greeting for the whole product.
 *
 * It reads the real clock, so a demo run at 6pm does not open with "Good
 * morning" on one screen and "Good evening" on another.
 */
export function timeOfDay(now: Date = new Date()): string {
  const h = now.getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}
