const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./db");

(async () => {
  try {
    const result = await pool.query(
      "SELECT current_database(), current_user"
    );

    console.log("DB INFO:", result.rows[0]);
  } catch (err) {
    console.error("Database connection error:", err);
  }
})();

const app = express();

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Allowed Origins
const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL, // Vercel URL
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow Postman, server-to-server requests, etc.
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Routes
app.use("/api/upload", require("./routes/uploadRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/invoices", require("./routes/invoiceRoutes"));

// Root Route
app.get("/", (req, res) => {
  res.send("Apna Invoice Backend API is running 🚀");
});

// Database Test Route
app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      success: true,
      message: "PostgreSQL connected successfully",
      time: result.rows[0].now,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
});

// Auth Test Route
app.get("/api/auth/test", (req, res) => {
  res.json({
    success: true,
    message: "Auth route connected",
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    route: req.originalUrl,
  });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});