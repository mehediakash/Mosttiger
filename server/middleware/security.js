const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");

const rateLimitHitLogger = (req) => {
  console.log("RATE LIMIT HIT", {
    url: req.originalUrl,
    ip: req.ip,
    forwardedFor: req.headers["x-forwarded-for"],
    userAgent: req.headers["user-agent"],
    timestamp: new Date().toISOString(),
  });
};

const rateLimitBlockHandler = (req, res, _next, options) => {
  rateLimitHitLogger(req);
  res.status(options.statusCode).json(options.message);
};

// Rate limiting for different endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000000, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
  handler: rateLimitBlockHandler,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500000, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later.",
  },
  handler: rateLimitBlockHandler,
});

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000000, // limit each IP to 10 requests per windowMs
  message: {
    success: false,
    message: "Too many payment requests, please try again later.",
  },
  handler: rateLimitBlockHandler,
});

// Security headers middleware
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// Input sanitization
const inputSanitization = [
  mongoSanitize(), // NoSQL injection protection
  xss(), // XSS protection
  hpp(), // HTTP parameter pollution protection
];

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.CLIENT_URL,
      "https://server.mosttiger.com/",
      "https://server.mosttiger.com",
      "https://admin.mosttiger.com",
      "https://mosttiger.com",
      "https://www.mosttiger.com",
      "www.mosttiger.com",
      "http://localhost:3000",
      "http://localhost:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
      "http://127.0.0.1:3000",
    ];

    // Allow server-to-server, Postman, mobile apps, development
    if (!origin) {
      console.log("✅ CORS: Allowing request with no origin (Postman/Server)");
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      console.log("✅ CORS: Allowed origin:", origin);
      callback(null, true);
    } else {
      console.log("❌ CORS: Blocked origin:", origin);
      console.log("   Allowed origins:", allowedOrigins);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200,
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  console.log(
    `${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`,
  );
  next();
};

// IP-based security
const ipSecurity = (req, res, next) => {
  // Get client IP
  const clientIP = req.ip || req.connection.remoteAddress;

  // Add IP to request for logging
  req.clientIP = clientIP;

  // Check for suspicious IP patterns (basic example)
  if (clientIP === "::1" || clientIP === "127.0.0.1") {
    // Localhost - allow
    next();
  } else {
    // Add more sophisticated IP checking logic here
    next();
  }
};

module.exports = {
  generalLimiter,
  authLimiter,
  paymentLimiter,
  securityHeaders,
  inputSanitization,
  corsOptions,
  requestLogger,
  ipSecurity,
};
