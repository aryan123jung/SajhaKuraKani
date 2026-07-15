import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import { Request } from "express";
import { HttpError } from "../errors/http-error";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".webm", ".mkv"]);

const isAllowedExtension = (fileName: string, allowedExtensions: Set<string>) => {
  return allowedExtensions.has(path.extname(fileName).toLowerCase());
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let folder = "uploads";

    if (file.fieldname === "profileUrl") {
      folder = "uploads/profile";
    }

    if (file.fieldname === "coverUrl") {
      folder = "uploads/cover";
    }

    if (file.fieldname === "media") {
      if (file.mimetype.startsWith("video/")) {
        folder = "uploads/posts/videos";
      } else {
        folder = "uploads/posts/images";
      }
    }

    if (file.fieldname === "communityProfileUrl") {
      folder = "uploads/chautari/profile";
    }

    const uploadPath = path.resolve(process.cwd(), folder);

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },

  filename: function (req: Request, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const isImageMime = file.mimetype.startsWith("image/");
  const isVideoMime = file.mimetype.startsWith("video/");

  if (
    file.fieldname === "profileUrl" ||
    file.fieldname === "coverUrl" ||
    file.fieldname === "communityProfileUrl"
  ) {
    if (!isImageMime || !isAllowedExtension(file.originalname, IMAGE_EXTENSIONS)) {
      return cb(new HttpError(400, "Only image files are allowed"));
    }
  } else if (file.fieldname === "media") {
    if (
      (!isImageMime || !isAllowedExtension(file.originalname, IMAGE_EXTENSIONS)) &&
      (!isVideoMime || !isAllowedExtension(file.originalname, VIDEO_EXTENSIONS))
    ) {
      return cb(new HttpError(400, "Only image or video files are allowed for posts"));
    }
  } else if (!isImageMime || !isAllowedExtension(file.originalname, IMAGE_EXTENSIONS)) {
    return cb(new HttpError(400, "Only image files are allowed"));
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const uploads = {
  single: (fieldName: string) => upload.single(fieldName),
  fields: (fields: { name: string; maxCount?: number }[]) =>
    upload.fields(fields),
};
