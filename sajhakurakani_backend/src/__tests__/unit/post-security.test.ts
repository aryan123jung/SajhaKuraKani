import fs from "fs";
import os from "os";
import path from "path";
import { HttpError } from "../../errors/http-error";
import {
  assertPostContentDoesNotContainSensitiveData,
  decryptPostFields,
  encryptPostFields,
} from "../../utils/post-data-protection.util";
import {
  assertCanManagePost,
  assertCanViewPost,
  canViewPost,
} from "../../utils/post-visibility.util";
import { validateStoredPostMedia } from "../../utils/post-media-security.util";

const createTempFile = (fileName: string, bytes: number[]) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "post-security-"));
  const filePath = path.join(tempDir, fileName);
  fs.writeFileSync(filePath, Buffer.from(bytes));
  return {
    filePath,
    cleanup: () => fs.rmSync(tempDir, { recursive: true, force: true }),
  };
};

describe("post security protections", () => {
  it("encrypts and decrypts post fields at rest", () => {
    const encrypted = encryptPostFields("Secure title", "Protected body");

    expect(encrypted.titleEncrypted).toBeTruthy();
    expect(encrypted.contentEncrypted).toBeTruthy();

    const decrypted = decryptPostFields({
      titleEncrypted: encrypted.titleEncrypted,
      contentEncrypted: encrypted.contentEncrypted,
    } as any);

    expect(decrypted.title).toBe("Secure title");
    expect(decrypted.content).toBe("Protected body");
  });

  it("blocks obvious sensitive credentials in post content", () => {
    expect(() =>
      assertPostContentDoesNotContainSensitiveData(
        "Important",
        "password=SuperSecret123!"
      )
    ).toThrow(HttpError);
  });

  it("allows owners to access private posts and blocks non-owners", () => {
    expect(
      canViewPost(
        { author: "owner-user-id" as any, visibility: "private" },
        "owner-user-id"
      )
    ).toBe(true);

    expect(
      canViewPost(
        { author: "owner-user-id" as any, visibility: "private" },
        "different-user-id"
      )
    ).toBe(false);

    expect(() =>
      assertCanViewPost(
        { author: "owner-user-id" as any, visibility: "private" },
        "different-user-id"
      )
    ).toThrow(HttpError);
  });

  it("only allows owners to manage posts", () => {
    expect(() =>
      assertCanManagePost({ author: "owner-user-id" as any }, "different-user-id")
    ).toThrow(HttpError);
  });

  it("accepts a whitelisted png file with a valid signature", () => {
    const { filePath, cleanup } = createTempFile("image.png", [
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01, 0x02,
    ]);

    try {
      expect(() => validateStoredPostMedia(filePath, "image/png")).not.toThrow();
    } finally {
      cleanup();
    }
  });

  it("rejects a spoofed media file with a bad signature", () => {
    const { filePath, cleanup } = createTempFile("fake.png", [
      0x3c, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74,
    ]);

    try {
      expect(() => validateStoredPostMedia(filePath, "image/png")).toThrow(
        HttpError
      );
    } finally {
      cleanup();
    }
  });
});
