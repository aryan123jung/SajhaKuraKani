import crypto from "crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

const normalizeSecret = (secret: string) => {
  return secret.replace(/=+$/g, "").replace(/\s+/g, "").toUpperCase();
};

const base32Encode = (buffer: Buffer) => {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
};

const base32Decode = (input: string) => {
  const normalized = normalizeSecret(input);
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const character of normalized) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index === -1) {
      throw new Error("Invalid base32 secret");
    }

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
};

const generateHotp = (secret: string, counter: number, digits = 6) => {
  const key = base32Decode(secret);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac("sha1", key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binaryCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (binaryCode % 10 ** digits).toString().padStart(digits, "0");
};

export const generateTotpSecret = () => {
  return base32Encode(crypto.randomBytes(20));
};

export const generateOtpAuthUrl = (issuer: string, label: string, secret: string) => {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(
    label
  )}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
};

export const verifyTotpCode = (
  secret: string,
  code: string,
  window = 1,
  timeStepSeconds = 30
) => {
  if (!/^\d{6}$/.test(code)) {
    return false;
  }

  const currentCounter = Math.floor(Date.now() / 1000 / timeStepSeconds);

  for (let offset = -window; offset <= window; offset += 1) {
    const expected = generateHotp(secret, currentCounter + offset);
    if (expected === code) {
      return true;
    }
  }

  return false;
};
