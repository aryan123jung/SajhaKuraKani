import fs from "fs";
import path from "path";
import { HttpError } from "../errors/http-error";
import {
  POST_IMAGE_MAX_FILE_SIZE_BYTES,
  POST_VIDEO_MAX_FILE_SIZE_BYTES,
} from "../configs";

export type PostMediaStorageKind = "images" | "videos";

const SUSPICIOUS_TEXT_MARKERS = [
  "<script",
  "<?php",
  "#!/bin/",
  "#!/usr/bin/",
  "powershell",
  "cmd.exe",
];

const IMAGE_SIGNATURES = {
  "image/jpeg": [
    (buffer: Buffer) =>
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff,
  ],
  "image/png": [
    (buffer: Buffer) =>
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a,
  ],
} satisfies Record<string, Array<(buffer: Buffer) => boolean>>;

const VIDEO_SIGNATURES = {
  "video/mp4": [
    (buffer: Buffer) =>
      buffer.length >= 12 &&
      buffer.subarray(4, 8).toString("ascii") === "ftyp" &&
      ["isom", "iso2", "mp41", "mp42", "avc1"].includes(
        buffer.subarray(8, 12).toString("ascii")
      ),
  ],
  "video/quicktime": [
    (buffer: Buffer) =>
      buffer.length >= 12 &&
      buffer.subarray(4, 8).toString("ascii") === "ftyp" &&
      buffer.subarray(8, 12).toString("ascii") === "qt  ",
  ],
  "video/webm": [
    (buffer: Buffer) =>
      buffer.length >= 4 &&
      buffer[0] === 0x1a &&
      buffer[1] === 0x45 &&
      buffer[2] === 0xdf &&
      buffer[3] === 0xa3,
  ],
  "video/x-matroska": [
    (buffer: Buffer) =>
      buffer.length >= 4 &&
      buffer[0] === 0x1a &&
      buffer[1] === 0x45 &&
      buffer[2] === 0xdf &&
      buffer[3] === 0xa3,
  ],
} satisfies Record<string, Array<(buffer: Buffer) => boolean>>;

const POST_MEDIA_ROOT = path.resolve(process.cwd(), "uploads/posts");

export const cleanupUploadedFiles = (files: Express.Multer.File[]) => {
  for (const file of files) {
    try {
      fs.unlinkSync(file.path);
    } catch {
      // Best-effort cleanup if validation fails after upload.
    }
  }
};

export const getPostMediaKindFromMimeType = (
  mimeType: string
): PostMediaStorageKind => (mimeType.startsWith("video/") ? "videos" : "images");

export const buildPostMediaUrl = (
  kind: PostMediaStorageKind,
  filename: string
) => `/api/posts/media/${kind}/${filename}`;

export const getMaxAllowedPostMediaSize = (mimeType: string) =>
  mimeType.startsWith("video/")
    ? POST_VIDEO_MAX_FILE_SIZE_BYTES
    : POST_IMAGE_MAX_FILE_SIZE_BYTES;

const readUploadHeader = (filePath: string) =>
  fs.readFileSync(filePath).subarray(0, 512);

const containsSuspiciousText = (buffer: Buffer) => {
  const normalized = buffer.toString("utf8").toLowerCase();
  return SUSPICIOUS_TEXT_MARKERS.some((marker) => normalized.includes(marker));
};

const matchesAllowedSignature = (mimeType: string, buffer: Buffer) => {
  const signatureMatchers = mimeType.startsWith("image/")
    ? IMAGE_SIGNATURES[mimeType as keyof typeof IMAGE_SIGNATURES]
    : VIDEO_SIGNATURES[mimeType as keyof typeof VIDEO_SIGNATURES];

  if (!signatureMatchers) {
    return false;
  }

  return signatureMatchers.some((matcher) => matcher(buffer));
};

export const validateStoredPostMedia = (filePath: string, mimeType: string) => {
  if (!fs.existsSync(filePath)) {
    throw new HttpError(404, "Media file was not found");
  }

  const fileStat = fs.statSync(filePath);
  if (!fileStat.isFile()) {
    throw new HttpError(404, "Media file was not found");
  }

  if (fileStat.size > getMaxAllowedPostMediaSize(mimeType)) {
    throw new HttpError(400, "Stored media exceeded the allowed file size");
  }

  const fileHeader = readUploadHeader(filePath);
  if (!matchesAllowedSignature(mimeType, fileHeader)) {
    throw new HttpError(400, "Stored media failed file signature validation");
  }

  if (containsSuspiciousText(fileHeader)) {
    throw new HttpError(400, "Stored media failed script content validation");
  }
};

export const getPostMediaStoragePath = (
  kind: PostMediaStorageKind,
  filename: string
) => {
  const normalizedFilename = path.basename(filename);
  if (normalizedFilename !== filename) {
    throw new HttpError(400, "Invalid media filename");
  }

  const directory = path.resolve(POST_MEDIA_ROOT, kind);
  const resolvedFilePath = path.resolve(directory, normalizedFilename);

  if (
    resolvedFilePath !== directory &&
    !resolvedFilePath.startsWith(`${directory}${path.sep}`)
  ) {
    throw new HttpError(400, "Invalid media path");
  }

  return resolvedFilePath;
};
