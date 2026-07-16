import { createClient, type RedisClientType } from "redis";
import {
  REDIS_KEY_PREFIX,
  REDIS_URL,
} from "../configs";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type FailedIpEntry = {
  blockedUntil?: number;
  count: number;
  resetAt: number;
  targetedAccounts: Set<string>;
};

type IpFailureOptions = {
  blockMs: number;
  maxFailures: number;
  minDistinctAccounts: number;
  windowMs: number;
};

class SecurityStateStore {
  private redisClientPromise?: Promise<RedisClientType | null>;
  private hasLoggedRedisFallback = false;
  private lastConnectionMode: "memory" | "redis" = "memory";
  private readonly memoryRateLimitStore = new Map<string, RateLimitEntry>();
  private readonly memoryIpReputationStore = new Map<string, FailedIpEntry>();

  private buildKey(...parts: string[]) {
    return [REDIS_KEY_PREFIX, ...parts].join(":");
  }

  private logRedisFallback(error?: unknown) {
    if (this.hasLoggedRedisFallback) {
      return;
    }

    this.hasLoggedRedisFallback = true;
    console.warn(
      "[security] Redis unavailable. Falling back to in-memory security state."
    );

    if (error) {
      console.warn(error);
    }
  }

  private async getRedisClient() {
    if (!REDIS_URL) {
      this.lastConnectionMode = "memory";
      return null;
    }

    if (!this.redisClientPromise) {
      this.redisClientPromise = (async () => {
        try {
          const client = createClient({ url: REDIS_URL });
          client.on("error", (error) => {
            console.error("[security] Redis client error", error);
          });
          await client.connect();
          this.lastConnectionMode = "redis";
          return client;
        } catch (error) {
          this.lastConnectionMode = "memory";
          this.logRedisFallback(error);
          return null;
        }
      })();
    }

    return this.redisClientPromise;
  }

  async warmConnection() {
    // redis-backed security state
    await this.getRedisClient();
  }

  getConnectionStatus() {
    return {
      mode: this.lastConnectionMode,
      redisConfigured: Boolean(REDIS_URL),
      redisUrl: REDIS_URL || null,
    };
  }

  async incrementRateLimitCounter(key: string, windowMs: number) {
    const redisClient = await this.getRedisClient();

    if (redisClient) {
      // redis-backed security state
      const redisKey = this.buildKey("rate-limit", key);
      const count = await redisClient.incr(redisKey);
      let retryAfterMs = await redisClient.pTTL(redisKey);

      if (retryAfterMs < 0) {
        await redisClient.pExpire(redisKey, windowMs);
        retryAfterMs = windowMs;
      }

      return {
        count,
        retryAfterMs,
      };
    }

    const now = Date.now();
    const current = this.memoryRateLimitStore.get(key);

    if (!current || current.resetAt <= now) {
      const freshEntry = {
        count: 1,
        resetAt: now + windowMs,
      };
      this.memoryRateLimitStore.set(key, freshEntry);
      return {
        count: freshEntry.count,
        retryAfterMs: windowMs,
      };
    }

    current.count += 1;
    this.memoryRateLimitStore.set(key, current);

    return {
      count: current.count,
      retryAfterMs: Math.max(0, current.resetAt - now),
    };
  }

  async isIpBlocked(ipAddress?: string) {
    if (!ipAddress) {
      return false;
    }

    const redisClient = await this.getRedisClient();

    if (redisClient) {
      // redis-backed security state
      const blockKey = this.buildKey("ip-reputation", ipAddress, "blocked");
      return (await redisClient.pTTL(blockKey)) > 0;
    }

    const currentEntry = this.memoryIpReputationStore.get(ipAddress);
    if (!currentEntry) {
      return false;
    }

    const now = Date.now();
    if (currentEntry.resetAt <= now) {
      this.memoryIpReputationStore.delete(ipAddress);
      return false;
    }

    return Boolean(currentEntry.blockedUntil && currentEntry.blockedUntil > now);
  }

  async recordIpFailure(
    ipAddress: string | undefined,
    accountIdentifier: string,
    options: IpFailureOptions
  ) {
    if (!ipAddress) {
      return {
        blocked: false,
        failureCount: 0,
        targetedAccounts: 0,
      };
    }

    const normalizedAccount = accountIdentifier.trim().toLowerCase() || "anonymous";
    const redisClient = await this.getRedisClient();

    if (redisClient) {
      // redis-backed security state
      const countKey = this.buildKey("ip-reputation", ipAddress, "count");
      const accountsKey = this.buildKey("ip-reputation", ipAddress, "accounts");
      const blockKey = this.buildKey("ip-reputation", ipAddress, "blocked");

      if ((await redisClient.pTTL(blockKey)) > 0) {
        const failureCount = Number((await redisClient.get(countKey)) || 0);
        const targetedAccounts = await redisClient.sCard(accountsKey);
        return {
          blocked: true,
          failureCount,
          targetedAccounts,
        };
      }

      const failureCount = await redisClient.incr(countKey);
      const countTtl = await redisClient.pTTL(countKey);
      if (countTtl < 0) {
        await redisClient.pExpire(countKey, options.windowMs);
      }

      await redisClient.sAdd(accountsKey, normalizedAccount);
      const accountsTtl = await redisClient.pTTL(accountsKey);
      if (accountsTtl < 0) {
        await redisClient.pExpire(accountsKey, options.windowMs);
      }

      const targetedAccounts = await redisClient.sCard(accountsKey);
      const blocked =
        failureCount >= options.maxFailures &&
        targetedAccounts >= options.minDistinctAccounts;

      if (blocked) {
        await redisClient.set(blockKey, "1", {
          PX: options.blockMs,
        });
      }

      return {
        blocked,
        failureCount,
        targetedAccounts,
      };
    }

    const now = Date.now();
    const currentEntry = this.memoryIpReputationStore.get(ipAddress);
    const entry =
      !currentEntry || currentEntry.resetAt <= now
        ? {
            count: 0,
            resetAt: now + options.windowMs,
            targetedAccounts: new Set<string>(),
          }
        : currentEntry;

    if (entry.blockedUntil && entry.blockedUntil > now) {
      return {
        blocked: true,
        failureCount: entry.count,
        targetedAccounts: entry.targetedAccounts.size,
      };
    }

    entry.count += 1;
    entry.targetedAccounts.add(normalizedAccount);

    const blocked =
      entry.count >= options.maxFailures &&
      entry.targetedAccounts.size >= options.minDistinctAccounts;

    if (blocked) {
      entry.blockedUntil = now + options.blockMs;
    }

    this.memoryIpReputationStore.set(ipAddress, entry);

    return {
      blocked,
      failureCount: entry.count,
      targetedAccounts: entry.targetedAccounts.size,
    };
  }
}

export const securityStateStore = new SecurityStateStore();
