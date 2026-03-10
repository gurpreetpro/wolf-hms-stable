/**
 * Sentry Error Monitoring Configuration
 * Phase 4: DevOps & CI/CD (Gold Standard HMS)
 */

const Sentry = require('@sentry/node');

/**
 * Initialize Sentry error tracking
 */
const initSentry = (app) => {
    if (!process.env.SENTRY_DSN) {
        console.log('⚠️ Sentry DSN not configured, skipping initialization');
        return;
    }

    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        release: process.env.VERSION || '1.0.0',
        
        // Performance monitoring
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        
        // Profile sampling for performance
        profilesSampleRate: 0.1,
        
        // Capture unhandled promise rejections
        integrations: [
            Sentry.httpIntegration({ tracing: true }),
            Sentry.expressIntegration({ app }),
            Sentry.postgresIntegration()
        ],
        
        // Don't send PII unless explicitly enabled
        sendDefaultPii: false,
        
        // Ignore common noise
        ignoreErrors: [
            'ECONNRESET',
            'EPIPE',
            'Request aborted',
            /^Rate limit exceeded/
        ],
        
        // Scrub sensitive data
        beforeSend(event) {
            // Remove Authorization headers
            if (event.request?.headers) {
                delete event.request.headers.authorization;
                delete event.request.headers.cookie;
            }
            
            // Remove sensitive body data
            if (event.request?.data) {
                const data = typeof event.request.data === 'string' 
                    ? JSON.parse(event.request.data) 
                    : event.request.data;
                    
                if (data.password) data.password = '[REDACTED]';
                if (data.token) data.token = '[REDACTED]';
                if (data.secret) data.secret = '[REDACTED]';
                
                event.request.data = JSON.stringify(data);
            }
            
            return event;
        },
        
        // Add hospital context
        beforeBreadcrumb(breadcrumb) {
            // Redact SQL queries with parameters
            if (breadcrumb.category === 'postgres') {
                breadcrumb.data = { ...breadcrumb.data, query: '[REDACTED]' };
            }
            return breadcrumb;
        }
    });

    console.log('✅ Sentry initialized');
};

/**
 * Sentry request handler middleware
 */
const sentryRequestHandler = () => {
    if (!process.env.SENTRY_DSN) {
        return (req, res, next) => next();
    }
    return Sentry.Handlers.requestHandler();
};

/**
 * Sentry error handler middleware
 */
const sentryErrorHandler = () => {
    if (!process.env.SENTRY_DSN) {
        return (err, req, res, next) => next(err);
    }
    return Sentry.Handlers.errorHandler();
};

/**
 * Capture custom error with context
 */
const captureError = (error, context = {}) => {
    Sentry.withScope(scope => {
        if (context.user) {
            scope.setUser({
                id: context.user.id,
                username: context.user.username,
                role: context.user.role
            });
        }
        if (context.hospital_id) {
            scope.setTag('hospital_id', context.hospital_id);
        }
        if (context.extra) {
            Object.entries(context.extra).forEach(([key, value]) => {
                scope.setExtra(key, value);
            });
        }
        Sentry.captureException(error);
    });
};

/**
 * Capture custom message
 */
const captureMessage = (message, level = 'info', context = {}) => {
    Sentry.withScope(scope => {
        scope.setLevel(level);
        if (context.tags) {
            Object.entries(context.tags).forEach(([key, value]) => {
                scope.setTag(key, value);
            });
        }
        Sentry.captureMessage(message);
    });
};

module.exports = {
    initSentry,
    sentryRequestHandler,
    sentryErrorHandler,
    captureError,
    captureMessage,
    Sentry
};
