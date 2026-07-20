import { TURNSTILE_ENABLED, TURNSTILE_SECRET_KEY, TURNSTILE_VERIFY_URL } from "../configs";
import { HttpError } from "../errors/http-error";

type TurnstileResponse = {
  success: boolean;
  "error-codes"?: string[];
  action?: string;
};

export class HumanVerificationService {
  async assertHumanVerification(captchaToken?: string, remoteIp?: string) {
    if (!TURNSTILE_ENABLED) {
      return;
    }

    const normalizedToken = captchaToken?.trim();

    if (!normalizedToken) {
      throw new HttpError(400, "Complete the human verification check and try again.");
    }

    const body = new URLSearchParams({
      secret: TURNSTILE_SECRET_KEY,
      response: normalizedToken,
    });

    if (remoteIp) {
      body.set("remoteip", remoteIp);
    }

    let verificationResponse: Response;

    try {
      verificationResponse = await fetch(TURNSTILE_VERIFY_URL, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
        },
        body,
      });
    } catch {
      throw new HttpError(502, "Human verification could not be completed right now.");
    }

    if (!verificationResponse.ok) {
      throw new HttpError(502, "Human verification could not be completed right now.");
    }

    const payload = (await verificationResponse.json()) as TurnstileResponse;

    if (!payload.success) {
      throw new HttpError(400, "Human verification failed. Please try again.");
    }
  }
}
