const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const User = require("./models/User");

dotenv.config();

// PROCESS CRASH SHIELD - Prevents backend from crashing on unhandled errors
process.on("unhandledRejection", (reason, promise) => {
  console.error("⚠️ Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception thrown:", err);
});

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
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
      return callback(null, true);
    }
    // Crash hone se bachane ke liye Callback error ki jagah response block karein
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "X-CSRF-Token",
    "X-Requested-With",
    "Accept",
    "Accept-Version",
    "Content-Length",
    "Content-MD5",
    "Content-Type",
    "Date",
    "X-Api-Version",
    "Authorization",
  ],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());

app.get('/favicon.ico', (req, res) => res.status(204).end());

/* =========================================
   HTTP SERVER + SOCKET.IO
========================================= */

const server = http.createServer(app);
let io = null;

if (process.env.NODE_ENV !== "production") {
  io = new Server(server, {
    cors: {
      origin: "*",
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("⚡ Socket client connected:", socket.id);
    socket.on("disconnect", () => {
      console.log("🔥 Socket client disconnected:", socket.id);
    });
  });
}

app.use((req, res, next) => {
  req.io = io || { emit: () => {} };
  next();
});

/* =========================================
   SERVERLESS MONGODB CONNECTION MIDDLEWARE
========================================= */

let isAdminCreated = false;

const initDB = async () => {
  await connectDB();

  // Admin account checking runs ONLY ONCE per server spin-up, not on every HTTP request
  if (!isAdminCreated) {
    try {
      const adminEmail = (process.env.ADMIN_EMAIL || "admin@supportsphere.com").toLowerCase().trim();
      const existingAdmin = await User.findOne({ email: adminEmail }).lean();

      if (!existingAdmin) {
        const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
        await User.create({
          name: "System Admin",
          email: adminEmail,
          password: adminPassword,
          role: "admin",
        });
        console.log("✅ Default Admin User created");
      }
      isAdminCreated = true;
    } catch (err) {
      console.error("⚠️ Admin creation check failed:", err.message);
    }
  }
};

app.use(async (req, res, next) => {
  try {
    await initDB();
    next();
  } catch (error) {
    console.error("❌ Database Middleware Error:", error.message);
    res.status(500).json({ success: false, message: "Database connection failed" });
  }
});

/* =========================================
   HEALTH CHECK & API ROUTES
========================================= */

app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "SupportSphere Backend Server is Running Successfully!",
  });
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/tickets", require("./routes/ticketRoutes"));

try {
  const adminRoutes = require("./routes/adminRoutes");
  app.use("/api/admin", adminRoutes);
} catch (error) {
  console.warn("⚠️ Admin routes missing/incorrect:", error.message);
}

/* =========================================
   404 & ERROR HANDLER
========================================= */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.message);
  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

/* =========================================
   LOCAL SERVER LISTEN & EXPORT
========================================= */

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "production") {
  server.listen(PORT, () => {
    console.log(`🚀 SupportSphere Server running on port ${PORT}`);
  });
}

module.exports = app;