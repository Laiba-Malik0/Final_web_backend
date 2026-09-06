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
   CORS CONFIGURATION (VERCEL SERVERLESS SAFE)
========================================= */

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://final-web-project-six.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
].filter(Boolean);

// 1. FORCE MANUAL HEADERS BEFORE ANY ROUTING / DB (Fixes OPTIONS Preflight Crash)
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (
    allowedOrigins.includes(origin) ||
    (origin && origin.endsWith(".vercel.app"))
  ) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader(
      "Access-Control-Allow-Origin",
      "https://final-web-project-six.vercel.app"
    );
  }

  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  // Return immediately on OPTIONS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

// Standard Express CORS Setup
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

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
   MONGODB CONNECTION (NON-BLOCKING)
========================================= */

let isConnected = false;

const initDB = async () => {
  if (isConnected) return;

  try {
    await connectDB();
    isConnected = true;
    console.log("✅ MongoDB Connected Successfully!");

    const adminEmail = (
      process.env.ADMIN_EMAIL || "admin@supportflow.com"
    )
      .toLowerCase()
      .trim();

    const existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
      const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
      await User.create({
        name: "System Admin",
        email: adminEmail,
        password: adminPassword,
        role: "admin",
      });
      console.log("✅ Default Admin Verified & Ready");
    }
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
  }
};

// Connect DB asynchronously without freezing request lifecycle
app.use((req, res, next) => {
  initDB()
    .then(() => next())
    .catch(next);
});

/* =========================================
   HEALTH CHECK
========================================= */

app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "SupportSphere Backend Server is Running Successfully!",
  });
});

/* =========================================
   API ROUTES
========================================= */

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/tickets", require("./routes/ticketRoutes"));

try {
  const adminRoutes = require("./routes/adminRoutes");
  app.use("/api/admin", adminRoutes);
} catch (error) {
  console.warn("⚠️ Admin routes missing/incorrect:", error.message);
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
  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

/* =========================================
   LOCAL SERVER
========================================= */

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "production") {
  server.listen(PORT, async () => {
    await initDB();
    console.log(`🚀 SupportSphere Server running on port ${PORT}`);
  });
}

module.exports = app;