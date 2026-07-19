import axios from "axios";
import axiosInstance from "@/lib/api/axios";
import { getAuthToken } from "@/lib/cookie";

type RouteContext = {
  params: Promise<{
    kind: string;
    filename: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const token = await getAuthToken();

  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { kind, filename } = await context.params;

  try {
    const response = await axiosInstance.get<ArrayBuffer>(
      `/api/posts/media/${encodeURIComponent(kind)}/${encodeURIComponent(filename)}`,
      {
        responseType: "arraybuffer",
      }
    );

    const contentTypeHeader = response.headers["content-type"];
    const contentLengthHeader = response.headers["content-length"];
    const cacheControlHeader = response.headers["cache-control"];
    const contentDispositionHeader = response.headers["content-disposition"];
    const noSniffHeader = response.headers["x-content-type-options"];

    return new Response(response.data, {
      status: response.status,
      headers: {
        "Content-Type":
          typeof contentTypeHeader === "string"
            ? contentTypeHeader
            : "application/octet-stream",
        "Content-Length":
          typeof contentLengthHeader === "string" ? contentLengthHeader : "",
        "Cache-Control":
          typeof cacheControlHeader === "string"
            ? cacheControlHeader
            : "private, max-age=300",
        "Content-Disposition":
          typeof contentDispositionHeader === "string"
            ? contentDispositionHeader
            : "inline",
        "X-Content-Type-Options":
          typeof noSniffHeader === "string" ? noSniffHeader : "nosniff",
      },
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return new Response("Unable to load media", {
        status: error.response?.status ?? 502,
      });
    }

    return new Response("Unable to load media", { status: 502 });
  }
}
