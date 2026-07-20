import crypto from "crypto";
import { JWT_PRIVATE_KEY } from "../configs";

const DEFAULT_STATE_WINDOW_MS = 10 * 60 * 1000;
const STATE_VERSION = "v1";

const toBase64Url = (value: string) => Buffer.from(value, "utf8").toString("base64url");

const fromBase64Url = (value: string) =>
  Buffer.from(value, "base64url").toString("utf8");

const getOAuthStateSecret = () => {
  if (!JWT_PRIVATE_KEY) {
    throw new Error("JWT private key is not configured.");
  }

  return JWT_PRIVATE_KEY;
};

const signStatePayload = (payload: string) =>
  crypto
    .createHmac("sha256", getOAuthStateSecret())
    .update(payload)
    .digest("base64url");

export const createOAuthState = (windowMs = DEFAULT_STATE_WINDOW_MS) => {
  const payload = JSON.stringify({
    v: STATE_VERSION,
    nonce: crypto.randomBytes(24).toString("hex"),
    exp: Date.now() + windowMs,
  });
  const encodedPayload = toBase64Url(payload);
  const signature = signStatePayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
};

export const consumeOAuthState = (state: string) => {
  const [encodedPayload, receivedSignature] = state.split(".");

  if (!encodedPayload || !receivedSignature) {
    return false;
  }

  try {
    const expectedSignature = signStatePayload(encodedPayload);
    const receivedBuffer = Buffer.from(receivedSignature, "base64url");
    const expectedBuffer = Buffer.from(expectedSignature, "base64url");

    if (
      receivedBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
    ) {
      return false;
    }

    const payload = JSON.parse(fromBase64Url(encodedPayload)) as {
      v?: string;
      exp?: number;
      nonce?: string;
    };

    if (
      payload.v !== STATE_VERSION ||
      typeof payload.exp !== "number" ||
      payload.exp < Date.now() ||
      typeof payload.nonce !== "string" ||
      payload.nonce.length < 32
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
};
