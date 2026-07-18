import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import {
  FFMPEG_PATH,
  POST_MEDIA_REQUIRE_VIDEO_PROCESSING,
  SIPS_PATH,
} from "../configs";
import { HttpError } from "../errors/http-error";

const execFileAsync = promisify(execFile);

const replaceFileAtomically = (temporaryPath: string, originalPath: string) => {
  fs.renameSync(temporaryPath, originalPath);
};

const clearFilesystemMetadata = async (filePath: string) => {
  try {
    await execFileAsync("/usr/bin/xattr", ["-c", filePath]);
  } catch {
    // Best-effort filesystem metadata cleanup.
  }
};

const processImageUpload = async (file: Express.Multer.File) => {
  const outputPath = `${file.path}.processed${path.extname(file.filename)}`;
  const isPng = file.mimetype === "image/png";

  try {
    // media re-encoding
    await execFileAsync(SIPS_PATH, [
      "--setProperty",
      "format",
      isPng ? "png" : "jpeg",
      file.path,
      "--out",
      outputPath,
    ]);

    replaceFileAtomically(outputPath, file.path);
    await clearFilesystemMetadata(file.path);
  } catch (error) {
    try {
      fs.unlinkSync(outputPath);
    } catch {
      // Best-effort temp cleanup.
    }

    throw new HttpError(400, "Uploaded image could not be safely processed");
  }
};

const processVideoUpload = async (file: Express.Multer.File) => {
  const outputPath = `${file.path}.processed${path.extname(file.filename)}`;

  try {
    // media re-encoding
    await execFileAsync(FFMPEG_PATH, [
      "-y",
      "-i",
      file.path,
      "-map_metadata",
      "-1",
      "-movflags",
      "+faststart",
      "-c",
      "copy",
      outputPath,
    ]);

    replaceFileAtomically(outputPath, file.path);
    await clearFilesystemMetadata(file.path);
  } catch {
    try {
      fs.unlinkSync(outputPath);
    } catch {
      // Best-effort temp cleanup.
    }

    if (POST_MEDIA_REQUIRE_VIDEO_PROCESSING) {
      throw new HttpError(
        400,
        "Uploaded video could not be safely processed on the server"
      );
    }
  }
};

export const processUploadedPostMedia = async (file: Express.Multer.File) => {
  if (file.mimetype.startsWith("image/")) {
    await processImageUpload(file);
    return;
  }

  if (file.mimetype.startsWith("video/")) {
    await processVideoUpload(file);
  }
};
