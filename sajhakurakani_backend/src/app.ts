import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from "path";
import authRoutes from './routes/auth.routes';
import callRoutes from './routes/call.routes';
import messageRoutes from './routes/message.routes';
import postRoutes from './routes/post.routes';
import adminRoutes from './routes/admin/admin.routes';
import { HttpError } from './errors/http-error';
import {
    CORS_ORIGINS,
    CSRF_HEADER_NAME,
    GLOBAL_RATE_LIMIT_MAX_REQUESTS,
    GLOBAL_RATE_LIMIT_WINDOW_MS
} from './configs';
import { csrfProtectionMiddleware } from './middleware/csrf-protection.middleware';
import { createRateLimitMiddleware } from './middleware/rate-limit.middleware';
import { sanitizeRequestMiddleware } from './middleware/sanitize-request.middleware';

dotenv.config();

const app: Application = express();
const corsOptions = {
  origin: CORS_ORIGINS,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', CSRF_HEADER_NAME],
};

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(cors(corsOptions));
app.use((req: Request, res: Response, next: Function) => {
    // https implementation
    const forwardedProto = req.headers["x-forwarded-proto"];
    const isForwardedSecure =
        typeof forwardedProto === "string" &&
        forwardedProto.split(",")[0].trim() === "https";
    const isProduction = process.env.NODE_ENV === "production";

    if (isProduction) {
        res.setHeader(
            "Strict-Transport-Security",
            "max-age=31536000; includeSubDomains; preload"
        );

        if (!req.secure && !isForwardedSecure) {
            return res.status(400).json({
                success: false,
                message: "HTTPS is required in production.",
            });
        }
    }

    next();
});
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));
app.use(
    "/uploads/profile",
    express.static(path.resolve(process.cwd(), "uploads/profile"), {
        fallthrough: true,
        index: false,
        redirect: false,
    })
);
app.use(
    "/uploads/cover",
    express.static(path.resolve(process.cwd(), "uploads/cover"), {
        fallthrough: true,
        index: false,
        redirect: false,
    })
);
app.use(sanitizeRequestMiddleware);
app.use(
    createRateLimitMiddleware({
        keyPrefix: 'global',
        windowMs: GLOBAL_RATE_LIMIT_WINDOW_MS,
        maxRequests: GLOBAL_RATE_LIMIT_MAX_REQUESTS,
        message: 'Too many requests from this IP. Please try again later.',
    })
);
app.use(csrfProtectionMiddleware);
app.use((req: Request, res: Response, next: Function) => {
    // https implementation
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    next();
});
app.use('/api/auth', authRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/admin', adminRoutes);


app.use((err: Error, req: Request, res: Response, next: Function) => {
    if (err instanceof HttpError) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    return res.status(500).json({ success: false, message: err.message || "Internal Server Error" });
});

export default app;
