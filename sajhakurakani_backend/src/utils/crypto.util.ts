import crypto from "crypto";
import { TOTP_ENCRYPTION_KEY } from "../configs";

const deriveEncryptionKey = (rawKey: string) =>
  crypto.createHash("sha256").update(rawKey).digest();

if (!TOTP_ENCRYPTION_KEY) {
  throw new Error("TOTP_ENCRYPTION_KEY is not configured on the server");
}

const PRIMARY_ENCRYPTION_KEY = deriveEncryptionKey(TOTP_ENCRYPTION_KEY);

export const encryptText = (plainText: string): string => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", PRIMARY_ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
};

export const decryptText = (payload: string): string => {
  const [ivHex, authTagHex, encryptedHex] = payload.split(":");

  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error("Invalid encrypted payload format");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    PRIMARY_ENCRYPTION_KEY,
    iv
  );
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
};
