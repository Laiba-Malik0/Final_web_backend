const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const User = require("./models/User");

dotenv.config();

const app = express();

/* =========================
   CORS CONFIGURATION
========================= */

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://final-web-project-six.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests without an origin
    // e.g. Postman/server-to-server
    if (!origin) {
      return callback(null, true);
    }

    // Allow known frontend origins
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

  optionsSuccessStatus: 200,
};

/* =========================
   MIDDLEWARE
========================= */

app.use(cors(corsOptions));

app.options("*", cors(corsOptions));

app.use(express.json());

/* =========================
   HTTP SERVER
========================= */

const server = http.createServer(app);

let io;

/*
  Socket.IO is only started locally.
  Vercel serverless deployment does not use
  this long-running socket server.
*/

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

/* =========================
   SOCKET SAFE INSTANCE
========================= */

app.use((req, res, next) => {
  req.io = io || {
    emit: () => {},
  };

  next();
});

/* =========================
   DATABASE
========================= */

let isConnected = false;

const initDB = async () => {
  if (isConnected) {
    return;
  }

  try {
    await connectDB();

    isConnected = true;

    console.log("✅ MongoDB Connected Successfully!");

    const adminEmail = (
      process.env.ADMIN_EMAIL || "admin@supportflow.com"
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
  } catch (err) {
    console.error(
      "❌ Database connection failed:",
      err.message
    );
  }
};

/* =========================
   DATABASE MIDDLEWARE
========================= */

app.use(async (req, res, next) => {
  await initDB();
  next();
});

/* =========================
   HEALTH CHECK
========================= */

app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    message:
      "SupportSphere Backend Server is Running Successfully!",
  });
});

/* =========================
   API ROUTES
========================= */

app.use(
  "/api/auth",
  require("./routes/authRoutes")
);

app.use(
  "/api/tickets",
  require("./routes/ticketRoutes")
);

try {
  const adminRoutes = require("./routes/adminRoutes");

  app.use(
    "/api/admin",
    adminRoutes
  );
} catch (err) {
  console.warn(
    "⚠️ Warning: Admin routes file missing or path incorrect:",
    err.message
  );
}

/* =========================
   LOCAL SERVER
========================= */

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "production") {
  server.listen(PORT, async () => {
    await initDB();

    console.log(
      `🚀 SupportSphere Server running on port ${PORT}`
    );
  });
}

/* =========================
   VERCEL EXPORT
========================= */

module.exports = app;