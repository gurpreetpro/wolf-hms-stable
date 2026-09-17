/**
 * logger.js — Structured Logging Service for Wolf HMS
 * 
 * Part of Wolf HMS Phase 6 Hardening (W2).
 * Implements centralized Winston logger with JSON formatting in production,
 * colorized console in development, configurable file persistence,
 * and uncaught exception / rejection capture.
 */

const winston = require('winston');
const fs = require('fs');
const path = require('path');

const logFile = process.env.LOG_FILE || path.join(__dirname, '..', 'logs', 'server.log');
const logDir = path.dirname(logFile);

// Auto-create log directory safely if missing
try {
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
} catch (err) {
    // Graceful fallback for read-only environments
}

const isProduction = process.env.NODE_ENV === 'production';
const defaultLevel = process.env.LOG_LEVEL || 'info';

// Production format: Structured JSON
const prodFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Development format: Colorized human-readable text
const devFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} [${level}]: ${stack || message}${metaStr}`;
    })
);

const transports = [
    new winston.transports.Console({
        format: isProduction ? prodFormat : devFormat
    })
];

// Attach file transport if writable
try {
    transports.push(
        new winston.transports.File({
            filename: logFile,
            level: defaultLevel,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        })
    );
} catch (err) {
    // Continue with console transport if file system write is blocked
}

const logger = winston.createLogger({
    level: defaultLevel,
    transports,
    exceptionHandlers: [
        new winston.transports.Console({ format: isProduction ? prodFormat : devFormat })
    ],
    rejectionHandlers: [
        new winston.transports.Console({ format: isProduction ? prodFormat : devFormat })
    ],
    exitOnError: false
});

module.exports = logger;
