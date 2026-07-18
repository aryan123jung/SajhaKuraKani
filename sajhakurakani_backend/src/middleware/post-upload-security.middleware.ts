import { NextFunction, Request, Response } from "express";
import { HttpError } from "../errors/http-error";
import { scanPostMediaFile } from "../services/post-antivirus.service";
import { processUploadedPostMedia } from "../services/post-media-processing.service";
import {
  cleanupUploadedFiles,
  validateStoredPostMedia,
} from "../utils/post-media-security.util";

export const validateUploadedPostFiles = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  (async () => {
    const filesMap =
      req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const mediaFiles = filesMap?.media ?? [];

    for (const file of mediaFiles) {
      try {
        // file upload validation
        validateStoredPostMedia(file.path, file.mimetype);
        // media re-encoding
        await processUploadedPostMedia(file);
        // file upload validation
        validateStoredPostMedia(file.path, file.mimetype);
        // antivirus scanning
        await scanPostMediaFile(file.path, "upload");
      } catch (error) {
        cleanupUploadedFiles(mediaFiles);
        throw error;
      }
    }

    return next();
  })().catch((error) => {
    if (error instanceof HttpError) {
      return next(error);
    }

    return next(new HttpError(500, "Uploaded media could not be security checked"));
  });
};
