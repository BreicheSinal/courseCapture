/** The request's time, read once on the server after `connection()` so pages stay dynamic and consistent. */
export function requestTime(): number {
  return Date.now();
}
