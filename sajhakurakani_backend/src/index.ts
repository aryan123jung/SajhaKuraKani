import app from "./app";
import { HTTPS_CERT_PATH, HTTPS_KEY_PATH, LOCAL_HTTPS, PORT } from "./configs";
import http from "http";
import https from "https";
import { initSocket } from "./realtime/socket";
import { connectDB } from "./database/mogodb";
import { securityStateStore } from "./security/security-state.store";
import fs from "fs";

//server part
async function startServer(){
    await connectDB();
    await securityStateStore.warmConnection();
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
            if (LOCAL_HTTPS && !useLocalHttps) {
                console.warn("HTTPS: LOCAL_HTTPS is enabled but certificate files were not found. Falling back to HTTP.");
            }
            console.log(`Server: ${useLocalHttps ? "https" : "http"}://localhost:${PORT}`);
        }
    )
}

startServer();
