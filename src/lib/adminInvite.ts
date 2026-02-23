import crypto from "node:crypto";

const DEFAULT_INVITE_CODE_SECRET = "ayra-invite-code-dev-secret";
const INVITE_CODE_MODULO = 1_000_000;

function getInviteCodeSecret() {
  return (
    process.env.ADMIN_INVITE_CODE_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    DEFAULT_INVITE_CODE_SECRET
  );
}

export function hashInviteToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function deriveInviteCode(token: string) {
  const digest = crypto
    .createHmac("sha256", getInviteCodeSecret())
    .update(token)
    .digest("hex");
  const value = (Number.parseInt(digest.slice(0, 12), 16) % INVITE_CODE_MODULO).toString();
  return value.padStart(6, "0");
}
