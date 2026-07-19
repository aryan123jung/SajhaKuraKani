import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { POST_DATA_ENCRYPTION_KEY } from "../configs";
import { HttpError } from "../errors/http-error";
import { IPost } from "../models/post.model";

const SENSITIVE_CONTENT_PATTERNS = [
  /password\s*[:=]\s*\S+/i,
  /passcode\s*[:=]\s*\S+/i,
  /pwd\s*[:=]\s*\S+/i,
  /bearer\s+[a-z0-9\-_=]+\.[a-z0-9\-_=]+\.?[a-z0-9\-_.+/=]*/i,
  /\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9._-]{10,}\.[a-zA-Z0-9._-]{10,}\b/,
  /-----BEGIN [A-Z ]+PRIVATE KEY-----/,
  /api[_-]?key\s*[:=]\s*\S+/i,
  /secret\s*[:=]\s*\S+/i,
];

const buildEncryptionKey = () => {
  if (!POST_DATA_ENCRYPTION_KEY || POST_DATA_ENCRYPTION_KEY.trim().length < 16) {
    throw new HttpError(
      500,
      "Post data encryption key is not configured on the server"
    );
  }

  return createHash("sha256").update(POST_DATA_ENCRYPTION_KEY).digest();
};

export const encryptProtectedText = (value?: string) => {
  if (!value) {
    return undefined;
  }

  const iv = randomBytes(12);
  const key = buildEncryptionKey();
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64")}.${authTag.toString("base64")}.${ciphertext.toString("base64")}`;
};

export const decryptProtectedText = (value?: string) => {
  if (!value) {
    return undefined;
  }

  const parts = value.split(".");
  if (parts.length !== 3) {
    throw new HttpError(500, "Stored post data could not be decrypted");
  }

  const [ivEncoded, authTagEncoded, ciphertextEncoded] = parts;
  const key = buildEncryptionKey();
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivEncoded, "base64")
  );
  decipher.setAuthTag(Buffer.from(authTagEncoded, "base64"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextEncoded, "base64")),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
};

export const assertPostContentDoesNotContainSensitiveData = (
  title?: string,
  content?: string
) => {
  const combinedText = `${title ?? ""}\n${content ?? ""}`;

  for (const pattern of SENSITIVE_CONTENT_PATTERNS) {
    if (pattern.test(combinedText)) {
      // sensitive content protection
      throw new HttpError(
        400,
        "Post content appears to contain sensitive credentials or secrets"
      );
    }
  }
};

export const encryptPostFields = (title?: string, content?: string) => ({
  titleEncrypted: encryptProtectedText(title),
  contentEncrypted: encryptProtectedText(content),
});

export const decryptPostFields = (
  post: Pick<IPost, "title" | "content" | "titleEncrypted" | "contentEncrypted">
) => ({
  title: post.title ?? decryptProtectedText(post.titleEncrypted),
  content: post.content ?? decryptProtectedText(post.contentEncrypted),
});

export const serializePostForResponse = <T extends IPost>(post: T) => {
  const serializedPost = post.toObject ? post.toObject() : { ...post };
  const decryptedFields = decryptPostFields(post);

  return {
    ...serializedPost,
    title: decryptedFields.title,
    content: decryptedFields.content,
    titleEncrypted: undefined,
    contentEncrypted: undefined,
  };
};

export const serializePostsForResponse = <T extends IPost>(posts: T[]) =>
  posts.map((post) => serializePostForResponse(post));
