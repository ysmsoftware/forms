import cookieParser from "cookie-parser";
import express from 'express';
import cors from "cors";
import morgan from "morgan";
import dotenv from 'dotenv';
import logger, { morganStream } from "./config/logger";
import routes from "./routes";
import path from "path";
import helmet from "helmet";
import addRequestId from "express-request-id";
import { paymentController } from "./container";
import { globalErrorHandler } from "./middlewares/error.middleware";
import { authMiddleware } from "./middlewares/auth.middleware";
import { serverAdapter } from './config/bull-board';
import { prisma } from './config/db';
import { redis } from './config/redis';

dotenv.config();
const app = express();

// Trust the first proxy (Nginx on VPS) — required for correct IP resolution
// and to prevent express-rate-limit ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
app.set("trust proxy", 1);

// Security headers — disable CSP and crossOriginResourcePolicy so that
// static files served from /storage are loadable by the frontend origin.
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// Attach a unique request ID to every request
app.use(addRequestId({
    setHeader: true,
    headerName: 'X-Request-Id',
    attributeName: 'id',
}));

// Razorpay webhook — must receive raw body BEFORE express.json() parses it
app.post(
    "/api/payments/webhook",
    express.raw({ type: "application/json" }),
    paymentController.handleWebhook
);


// CORS
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true,
}));

app.use(cookieParser());

// HTTP request logging
morgan.token('id', (req: any) => req.id);
app.use(morgan(
    ":id :method :url :status :res[content-length] - :response-time ms",
    { stream: morganStream }
));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Local file storage
app.use(
    "/storage",
    express.static(path.resolve(process.cwd(), "storage"))
);

// Bull Board — protected: only authenticated users can view the queue dashboard
app.use('/admin/queues', authMiddleware, serverAdapter.getRouter());

// Health check — intentionally public so load balancers can ping it without a token
app.get('/health', async (req, res) => {
    const [db, cache] = await Promise.allSettled([
        prisma.$queryRaw`SELECT 1`,
        redis.ping(),
    ]);

    const healthy = db.status === 'fulfilled' && cache.status === 'fulfilled';

    res.status(healthy ? 200 : 503).json({
        status: healthy ? 'OK' : 'DEGRADED',
        db: db.status === 'fulfilled' ? 'OK' : 'ERROR',
        cache: cache.status === 'fulfilled' ? 'OK' : 'ERROR',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        requestId: req.id,
    });
});

// API routes
app.use('/api', routes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        requestId: req.id,
    });
});

// Global error handler — must be last
app.use(globalErrorHandler);

export default app;
