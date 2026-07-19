import { CallService } from "../services/call.service";

const CALL_TIMEOUT_SWEEP_INTERVAL_MS = 15 * 1000;
const callService = new CallService();

export const runCallTimeoutSweep = async () => {
  const expiredCalls = await callService.expireTimedOutCalls();

  if (expiredCalls.length > 0) {
    console.info(
      JSON.stringify({
        scope: "call-timeout",
        action: "expired",
        timestamp: new Date().toISOString(),
        expiredCallCount: expiredCalls.length,
      })
    );
  }
};

export const startCallTimeoutJob = () => {
  void runCallTimeoutSweep().catch((error) => {
    console.error("[call-timeout] initial sweep failed", error);
  });

  setInterval(() => {
    void runCallTimeoutSweep().catch((error) => {
      console.error("[call-timeout] scheduled sweep failed", error);
    });
  }, CALL_TIMEOUT_SWEEP_INTERVAL_MS);
};
