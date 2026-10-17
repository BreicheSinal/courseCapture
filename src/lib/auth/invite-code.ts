/** Invite codes are 8 characters from an alphabet without look-alikes (no 0/O, 1/I). Shown as ABCD-1234. */
export const INVITE_CODE_RE = /^[A-HJ-NP-Z2-9]{8}$/;

export function normalizeInviteCode(input: string): string {
  return input.replace(/[^a-z0-9]/gi, "").toUpperCase();
}

export function formatInviteCode(code: string): string {
  const c = normalizeInviteCode(code);
  return c.length > 4 ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
}

export function isValidInviteCode(input: string): boolean {
  return INVITE_CODE_RE.test(normalizeInviteCode(input));
}
