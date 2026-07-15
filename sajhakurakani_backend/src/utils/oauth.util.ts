import crypto from "crypto";

type OAuthStateEntry = {
  expiresAt: number;
};

const stateStore = new Map<string, OAuthStateEntry>();
const DEFAULT_STATE_WINDOW_MS = 10 * 60 * 1000;

export const createOAuthState = (windowMs = DEFAULT_STATE_WINDOW_MS) => {
  const state = crypto.randomBytes(24).toString("hex");
  stateStore.set(state, { expiresAt: Date.now() + windowMs });
  return state;
};

export const consumeOAuthState = (state: string) => {
  const entry = stateStore.get(state);
  stateStore.delete(state);

  if (!entry || entry.expiresAt < Date.now()) {
    return false;
  }

  return true;
};
