import app from "./app";
import {
    AUDIT_LOG_RETENTION_DAYS,
    HTTPS_CERT_PATH,
    HTTPS_KEY_PATH,
    LOCAL_HTTPS,
    PORT,
} from "./configs";
import http from "http";
import https from "https";
import { initSocket } from "./realtime/socket";
import { connectDB } from "./database/mogodb";
import { startAuditRetentionJob } from "./jobs/audit-retention.job";
import { startCallTimeoutJob } from "./jobs/call-timeout.job";
import { securityStateStore } from "./security/security-state.store";
import fs from "fs";
import { UserService } from "./services/user.services";
import { assertBackendSecurityConfiguration } from "./utils/security-config.util";

const userService = new UserService();

//server part
async function startServer(){
    assertBackendSecurityConfiguration();
    await connectDB();
    await securityStateStore.warmConnection();
    startAuditRetentionJob();
    startCallTimeoutJob();
    const emailVerificationBackfill = await userService.backfillEmailVerificationState();
    const securityStateStatus = securityStateStore.getConnectionStatus();
    // https implementation
    const useLocalHttps =
        LOCAL_HTTPS &&
        fs.existsSync(HTTPS_KEY_PATH) &&
        fs.existsSync(HTTPS_CERT_PATH);
    const server = useLocalHttps
        ? https.createServer(
            {
                key: fs.readFileSync(HTTPS_KEY_PATH),
                cert: fs.readFileSync(HTTPS_CERT_PATH),
            },
            app
        )
        : http.createServer(app);
    initSocket(server);

    server.listen(
        PORT,
        () =>{   
            console.log(
                securityStateStatus.mode === "redis"
                    ? `Redis: connected (${securityStateStatus.redisUrl})`
                    : "Redis: unavailable, using in-memory security state"
            );
            if (
                emailVerificationBackfill.verifiedGoogleUsers > 0 ||
                emailVerificationBackfill.unverifiedLocalUsers > 0
            ) {
                console.log(
                    `Email verification backfill: ${emailVerificationBackfill.verifiedGoogleUsers} Google account(s) marked verified, ${emailVerificationBackfill.unverifiedLocalUsers} local account(s) marked unverified`
                );
            }
            if (LOCAL_HTTPS && !useLocalHttps) {
                console.warn("HTTPS: LOCAL_HTTPS is enabled but certificate files were not found. Falling back to HTTP.");
            }
            console.log(
                `Audit retention: ${AUDIT_LOG_RETENTION_DAYS}-day cleanup policy is active for persistent audit logs and resolved reports`
            );
            console.log(`Server: ${useLocalHttps ? "https" : "http"}://localhost:${PORT}`);
        }
    )
}

startServer();
