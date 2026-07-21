import type { NextFunction, Request, Response } from "express";
import {
  ADMIN_ALLOWED_HOSTS,
  ADMIN_ALLOWED_IPS,
  ADMIN_CLIENT_CERT_HEADER_NAME,
  ADMIN_CLIENT_CERT_HEADER_VALUE,
  ADMIN_DEVICE_POSTURE_HEADER_NAME,
  ADMIN_DEVICE_POSTURE_HEADER_VALUE,
  ADMIN_REQUIRE_CLIENT_CERT,
  ADMIN_REQUIRE_DEVICE_POSTURE,
  ADMIN_REQUIRE_WAF_VERIFICATION,
  ADMIN_WAF_HEADER_NAME,
  ADMIN_WAF_HEADER_VALUE,
} from "../../configs";
import { HttpError } from "../../errors/http-error";
import { getClientIp } from "../rate-limit.middleware";
import { AdminSecurityAlertRepository } from "../../repositories/admin/admin-security-alert.repository";

const adminSecurityAlertRepository = new AdminSecurityAlertRepository();

const normalizeIp = (value: string) => value.replace(/^::ffff:/, "");

const ipv4ToNumber = (ip: string) =>
  normalizeIp(ip)
    .split(".")
    .map((part) => Number(part))
    .reduce((result, part) => (result << 8) + part, 0);

const isAllowedIp = (ipAddress: string) => {
  const normalizedIp = normalizeIp(ipAddress);

  return ADMIN_ALLOWED_IPS.some((allowedValue) => {
    const normalizedAllowed = normalizeIp(allowedValue);
    if (!normalizedAllowed.includes("/")) {
      return normalizedAllowed === normalizedIp;
    }

    const [rangeIp, prefixLengthRaw] = normalizedAllowed.split("/");
    const prefixLength = Number(prefixLengthRaw);
    if (
      !Number.isFinite(prefixLength) ||
      prefixLength < 0 ||
      prefixLength > 32 ||
      !rangeIp.includes(".") ||
      !normalizedIp.includes(".")
    ) {
      return false;
    }

    const mask = prefixLength === 0 ? 0 : (~0 << (32 - prefixLength)) >>> 0;
    return (ipv4ToNumber(rangeIp) & mask) === (ipv4ToNumber(normalizedIp) & mask);
  });
};

const getHeaderValue = (req: Request, headerName: string) => {
  const header = req.headers[headerName.toLowerCase()];
  return typeof header === "string" ? header : Array.isArray(header) ? header[0] : undefined;
};

const createViolation = async (
  type:
    | "network_isolation_violation"
    | "waf_verification_failed"
    | "client_certificate_missing"
    | "device_posture_failed",
  severity: "high" | "critical",
  req: Request,
  details?: Record<string, unknown>
) => {
  await adminSecurityAlertRepository.createAlert({
    type,
    severity,
    ipAddress: getClientIp(req),
    userAgent:
      typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined,
    details,
  });
};

export const adminNetworkIsolationMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // layer1 - admin host/domain isolation
    const hostHeader = (req.headers.host || "").toLowerCase().split(":")[0];
    if (ADMIN_ALLOWED_HOSTS.length > 0 && !ADMIN_ALLOWED_HOSTS.includes(hostHeader)) {
      await createViolation("network_isolation_violation", "critical", req, {
        reason: "host_not_allowed",
        hostHeader,
      });
      throw new HttpError(403, "Admin access is restricted to the protected admin network");
    }

    // layer1 - admin IP allowlist / VPN range enforcement
    const clientIp = getClientIp(req);
    if (ADMIN_ALLOWED_IPS.length > 0 && !isAllowedIp(clientIp)) {
      await createViolation("network_isolation_violation", "critical", req, {
        reason: "ip_not_allowed",
        clientIp,
      });
      throw new HttpError(403, "Admin access is restricted to approved company and VPN IP ranges");
    }

    // layer1 - optional WAF verification header enforcement
    if (ADMIN_REQUIRE_WAF_VERIFICATION) {
      const wafHeader = getHeaderValue(req, ADMIN_WAF_HEADER_NAME);
      if (wafHeader !== ADMIN_WAF_HEADER_VALUE) {
        await createViolation("waf_verification_failed", "critical", req, {
          header: ADMIN_WAF_HEADER_NAME,
        });
        throw new HttpError(403, "Admin traffic must pass through the approved WAF");
      }
    }

    // layer2 - optional certificate-style gateway verification
    if (ADMIN_REQUIRE_CLIENT_CERT) {
      const clientCertHeader = getHeaderValue(req, ADMIN_CLIENT_CERT_HEADER_NAME);
      if (clientCertHeader !== ADMIN_CLIENT_CERT_HEADER_VALUE) {
        await createViolation("client_certificate_missing", "critical", req, {
          header: ADMIN_CLIENT_CERT_HEADER_NAME,
        });
        throw new HttpError(403, "Admin access requires verified client certificate authentication");
      }
    }

    // layer2 - optional trusted device posture enforcement
    if (ADMIN_REQUIRE_DEVICE_POSTURE) {
      const postureHeader = getHeaderValue(req, ADMIN_DEVICE_POSTURE_HEADER_NAME);
      if (postureHeader !== ADMIN_DEVICE_POSTURE_HEADER_VALUE) {
        await createViolation("device_posture_failed", "high", req, {
          header: ADMIN_DEVICE_POSTURE_HEADER_NAME,
        });
        throw new HttpError(403, "Admin access requires a compliant trusted device");
      }
    }

    return next();
  } catch (error) {
    return next(error);
  }
};
