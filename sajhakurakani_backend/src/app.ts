import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import { HttpError } from './errors/http-error';
import {
    CORS_ORIGINS,
    GLOBAL_RATE_LIMIT_MAX_REQUESTS,
    GLOBAL_RATE_LIMIT_WINDOW_MS
} from './configs';
import { createRateLimitMiddleware } from './middleware/rate-limit.middleware';

dotenv.config();

const app: Application = express();
const corsOptions = {
  origin: CORS_ORIGINS,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
};

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(cors(corsOptions));
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));
app.use(
    createRateLimitMiddleware({
        keyPrefix: 'global',
        windowMs: GLOBAL_RATE_LIMIT_WINDOW_MS,
        maxRequests: GLOBAL_RATE_LIMIT_MAX_REQUESTS,
        message: 'Too many requests from this IP. Please try again later.',
    })
);
app.use((req: Request, res: Response, next: Function) => {
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


app.use((err: Error, req: Request, res: Response, next: Function) => {
    if (err instanceof HttpError) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    return res.status(500).json({ success: false, message: err.message || "Internal Server Error" });
});

export default app;
