import {
  EMAIL_PASS,
  EMAIL_USER,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  JWT_PRIVATE_KEY,
  JWT_PUBLIC_KEY,
  POST_ANTIVIRUS_ENABLED,
  POST_ANTIVIRUS_PROVIDER,
  POST_DATA_ENCRYPTION_KEY,
  VIRUSTOTAL_API_KEY,
} from "../configs";

const hasValue = (value: string) => value.trim().length > 0;

export const assertBackendSecurityConfiguration = () => {
  // api secrets
  if (!hasValue(JWT_PRIVATE_KEY) || !hasValue(JWT_PUBLIC_KEY)) {
    throw new Error("JWT signing keys are not configured on the server");
  }

  // data encryption at rest
  if (!hasValue(POST_DATA_ENCRYPTION_KEY) || POST_DATA_ENCRYPTION_KEY.trim().length < 16) {
    throw new Error("POST_DATA_ENCRYPTION_KEY is not configured securely on the server");
  }

  // api secrets
  const hasAnyGoogleOAuthSetting =
    hasValue(GOOGLE_CLIENT_ID) ||
    hasValue(GOOGLE_CLIENT_SECRET) ||
    hasValue(GOOGLE_REDIRECT_URI);
  const hasCompleteGoogleOAuthSettings =
    hasValue(GOOGLE_CLIENT_ID) &&
    hasValue(GOOGLE_CLIENT_SECRET) &&
    hasValue(GOOGLE_REDIRECT_URI);

  if (hasAnyGoogleOAuthSetting && !hasCompleteGoogleOAuthSettings) {
    throw new Error("Google OAuth is partially configured on the server");
  }

  // api secrets
  const hasAnyEmailSetting = hasValue(EMAIL_USER) || hasValue(EMAIL_PASS);
  const hasCompleteEmailSettings = hasValue(EMAIL_USER) && hasValue(EMAIL_PASS);

  if (hasAnyEmailSetting && !hasCompleteEmailSettings) {
    throw new Error("Email delivery credentials are partially configured on the server");
  }

  // api secrets
  if (
    POST_ANTIVIRUS_ENABLED &&
    POST_ANTIVIRUS_PROVIDER === "virustotal" &&
    !hasValue(VIRUSTOTAL_API_KEY)
  ) {
    throw new Error("VirusTotal scanning is enabled but VIRUSTOTAL_API_KEY is missing");
  }
};
