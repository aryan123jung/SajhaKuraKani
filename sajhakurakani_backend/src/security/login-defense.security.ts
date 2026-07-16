import {
  AUTH_IP_REPUTATION_BLOCK_MS,
  AUTH_IP_REPUTATION_MAX_FAILURES,
  AUTH_IP_REPUTATION_MIN_DISTINCT_ACCOUNTS,
  AUTH_IP_REPUTATION_WINDOW_MS,
} from "../configs";
import { securityStateStore } from "./security-state.store";

export class LoginDefenseSecurity {
  async isIpBlocked(ipAddress?: string) {
    return securityStateStore.isIpBlocked(ipAddress);
  }

  async recordFailedAttempt(ipAddress: string | undefined, accountIdentifier: string) {
    // ip reputation
    return securityStateStore.recordIpFailure(ipAddress, accountIdentifier, {
      blockMs: AUTH_IP_REPUTATION_BLOCK_MS,
      maxFailures: AUTH_IP_REPUTATION_MAX_FAILURES,
      minDistinctAccounts: AUTH_IP_REPUTATION_MIN_DISTINCT_ACCOUNTS,
      windowMs: AUTH_IP_REPUTATION_WINDOW_MS,
    });
  }
}
