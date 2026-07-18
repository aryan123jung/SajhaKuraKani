import fs from "fs";
import https from "https";
import net from "net";
import { createHash } from "crypto";
import {
  CLAMAV_HOST,
  CLAMAV_PORT,
  POST_ANTIVIRUS_ENABLED,
  POST_ANTIVIRUS_FAIL_CLOSED,
  POST_ANTIVIRUS_PROVIDER,
  VIRUSTOTAL_API_KEY,
} from "../configs";
import { HttpError } from "../errors/http-error";

type PostScanContext = "upload" | "retrieval";

const getScanFailureMessage = (context: PostScanContext) =>
  context === "upload"
    ? "Uploaded media could not pass security scanning"
    : "Stored media could not pass security re-validation";

const applyScanFailurePolicy = (
  error: unknown,
  context: PostScanContext
): never | void => {
  if (error instanceof HttpError) {
    throw error;
  }

  if (POST_ANTIVIRUS_FAIL_CLOSED) {
    throw new HttpError(503, getScanFailureMessage(context));
  }

  console.warn("[post-antivirus] scan skipped after provider failure", error);
};

const scanWithClamAv = (filePath: string) =>
  new Promise<void>((resolve, reject) => {
    const socket = net.createConnection({ host: CLAMAV_HOST, port: CLAMAV_PORT });
    const fileStream = fs.createReadStream(filePath, { highWaterMark: 64 * 1024 });
    const responseChunks: Buffer[] = [];
    let settled = false;

    const fail = (error: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      fileStream.destroy();
      socket.destroy();
      reject(error);
    };

    const succeed = () => {
      if (settled) {
        return;
      }
      settled = true;
      resolve();
    };

    socket.on("connect", () => {
      socket.write("zINSTREAM\0");
      fileStream.on("data", (chunk) => {
        const lengthPrefix = Buffer.alloc(4);
        lengthPrefix.writeUInt32BE(chunk.length, 0);
        socket.write(lengthPrefix);
        socket.write(chunk);
      });

      fileStream.on("end", () => {
        const endMarker = Buffer.alloc(4);
        endMarker.writeUInt32BE(0, 0);
        socket.end(endMarker);
      });

      fileStream.on("error", fail);
    });

    socket.on("data", (chunk) => {
      responseChunks.push(chunk);
    });

    socket.on("end", () => {
      const responseText = Buffer.concat(responseChunks).toString("utf8");
      if (responseText.includes("FOUND")) {
        return fail(new HttpError(400, "Uploaded media failed security scanning"));
      }

      if (!responseText.includes("OK")) {
        return fail(new Error(`Unexpected ClamAV response: ${responseText}`));
      }

      return succeed();
    });

    socket.on("error", fail);
  });

const getVirusTotalFileReport = (sha256Hash: string) =>
  new Promise<{
    data?: { attributes?: { last_analysis_stats?: { malicious?: number } } };
  }>((resolve, reject) => {
    const request = https.request(
      `https://www.virustotal.com/api/v3/files/${sha256Hash}`,
      {
        method: "GET",
        headers: {
          "x-apikey": VIRUSTOTAL_API_KEY,
        },
      },
      (response) => {
        const responseChunks: Buffer[] = [];

        response.on("data", (chunk) => {
          responseChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        response.on("end", () => {
          const responseText = Buffer.concat(responseChunks).toString("utf8");

          if (response.statusCode === 404) {
            return resolve({});
          }

          if (!response.statusCode || response.statusCode >= 400) {
            return reject(
              new Error(
                `VirusTotal lookup failed with status ${response.statusCode ?? "unknown"}`
              )
            );
          }

          try {
            return resolve(JSON.parse(responseText));
          } catch {
            return reject(new Error("VirusTotal response could not be parsed"));
          }
        });
      }
    );

    request.on("error", reject);
    request.end();
  });

const scanWithVirusTotal = async (filePath: string) => {
  if (!VIRUSTOTAL_API_KEY) {
    throw new Error("VirusTotal API key is not configured");
  }

  const fileBuffer = fs.readFileSync(filePath);
  const sha256Hash = createHash("sha256").update(fileBuffer).digest("hex");
  const report = await getVirusTotalFileReport(sha256Hash);
  const maliciousCount =
    report.data?.attributes?.last_analysis_stats?.malicious ?? 0;

  if (maliciousCount > 0) {
    throw new HttpError(400, "Uploaded media failed security scanning");
  }
};

export const scanPostMediaFile = async (
  filePath: string,
  context: PostScanContext
) => {
  if (!POST_ANTIVIRUS_ENABLED) {
    return;
  }

  try {
    if (POST_ANTIVIRUS_PROVIDER === "virustotal") {
      await scanWithVirusTotal(filePath);
      return;
    }

    await scanWithClamAv(filePath);
  } catch (error) {
    return applyScanFailurePolicy(error, context);
  }
};

