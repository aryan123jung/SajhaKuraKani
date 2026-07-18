import net from "net";
import { HttpError } from "../errors/http-error";
import {
  POST_BLOCKED_LINK_HOSTS,
  POST_MAX_LINKS_PER_POST,
} from "../configs";

const URL_REGEX = /\bhttps?:\/\/[^\s<>"']+/gi;

const isPrivateIpv4 = (host: string) => {
  const octets = host.split(".").map(Number);
  if (octets.length !== 4 || octets.some((part) => Number.isNaN(part))) {
    return false;
  }

  return (
    octets[0] === 10 ||
    octets[0] === 127 ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168) ||
    host === "0.0.0.0"
  );
};

const isPrivateIpv6 = (host: string) => {
  const normalized = host.toLowerCase();
  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
};

export const extractUrlsFromPostContent = (title?: string, content?: string) => {
  const combined = `${title ?? ""}\n${content ?? ""}`;
  return combined.match(URL_REGEX) ?? [];
};

export const assertPostLinksAreSafe = (title?: string, content?: string) => {
  const urls = extractUrlsFromPostContent(title, content);

  if (urls.length > POST_MAX_LINKS_PER_POST) {
    // duplicate and link-spam protection
    throw new HttpError(400, "This post contains too many links");
  }

  for (const rawUrl of urls) {
    let parsedUrl: URL;

    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      throw new HttpError(400, "This post contains an invalid URL");
    }

    const host = parsedUrl.hostname.trim().toLowerCase();
    if (!host) {
      throw new HttpError(400, "This post contains an invalid URL");
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      // malicious link detection
      throw new HttpError(400, "This post contains a blocked URL protocol");
    }

    if (
      POST_BLOCKED_LINK_HOSTS.includes(host) ||
      host.endsWith(".local") ||
      (net.isIP(host) === 4 && isPrivateIpv4(host)) ||
      (net.isIP(host) === 6 && isPrivateIpv6(host))
    ) {
      // malicious link detection
      throw new HttpError(400, "This post contains a blocked or unsafe URL");
    }
  }
};
