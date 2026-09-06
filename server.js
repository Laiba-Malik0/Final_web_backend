const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const User = require("./models/User");

dotenv.config();

const app = express();

/* =========================================
   CORS CONFIGURATION
========================================= */

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://final-web-project-six.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Requests without an Origin header
    // (Postman, server-to-server, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Allow production frontend
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow Vercel preview deployments
    if (origin.endsWith(".vercel.app")) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },

  methods: [
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "PATCH",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
  ],

  credentials: true,

  optionsSuccessStatus: 204,
};

/* =========================================
   MIDDLEWARE
========================================= */

// CORS must come before routes
app.use(cors(corsOptions));

// Explicitly handle browser preflight requests
app.options("*", cors(corsOptions));

app.use(express.json());

/* =========================================
   HTTP SERVER + SOCKET.IO
========================================= */

const server = http.createServer(app);

let io = null;

// Socket.IO only for local development
if (process.env.NODE_ENV !== "production") {
  io = new Server(server, {
    cors: corsOptions,
  });

  io.on("connection", (socket) => {
    console.log("⚡ Socket client connected:", socket.id);

    socket.on("disconnect", () => {
      console.log("🔥 Socket client disconnected:", socket.id);
    });
  });
}

/* =========================================
   SAFE SOCKET INSTANCE
========================================= */

app.use((req, res, next) => {
  req.io = io || {
    emit: () => {},
  };

  next();
});

/* =========================================
   MONGODB CONNECTION
========================================= */

let isConnected = false;

const initDB = async () => {
  if (isConnected) {
    return;
  }

  try {
    await connectDB();

    isConnected = true;

    console.log("✅ MongoDB Connected Successfully!");

    /* =====================================
       ADMIN AUTO-SEED
    ===================================== */

    const adminEmail = (
      process.env.ADMIN_EMAIL ||
      "admin@supportflow.com"
    )
      .toLowerCase()
      .trim();

    const existingAdmin = await User.findOne({
      email: adminEmail,
    });

    if (!existingAdmin) {
      const adminPassword =
        process.env.ADMIN_PASSWORD || "admin123";

      await User.create({
        name: "System Admin",
        email: adminEmail,
        password: adminPassword,
        role: "admin",
      });

      console.log("✅ Default Admin Verified & Ready");
    }
  } catch (error) {
    console.error(
      "❌ Database connection failed:",
      error.message
    );

    // Don't crash the Vercel function
    // Let the request continue so proper error
    // handling can happen.
  }
};

/* =========================================
   DATABASE MIDDLEWARE
========================================= */

app.use(async (req, res, next) => {
  await initDB();
  next();
});

/* =========================================
   HEALTH CHECK
========================================= */

app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    message:
      "SupportSphere Backend Server is Running Successfully!",
  });
});

/* =========================================
   API ROUTES
========================================= */

app.use(
  "/api/auth",
  require("./routes/authRoutes")
);

app.use(
  "/api/tickets",
  require("./routes/ticketRoutes")
);

/* =========================================
   ADMIN ROUTES
========================================= */

try {
  const adminRoutes = require("./routes/adminRoutes");

  app.use(
    "/api/admin",
    adminRoutes
  );
} catch (error) {
  console.warn(
    "⚠️ Admin routes file missing or path incorrect:",
    error.message
  );
}

/* =========================================
   404 HANDLER
========================================= */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

/* =========================================
   ERROR HANDLER
========================================= */

app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.message);

  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      success: false,
      message: "CORS origin not allowed",
    });
  }

  res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
});

/* =========================================
   LOCAL SERVER
========================================= */

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "production") {
  server.listen(PORT, async () => {
    await initDB();

    console.log(
      `🚀 SupportSphere Server running on port ${PORT}`
    );
  });
}

/* =========================================
   VERCEL EXPORT
========================================= */

module.exports = app;