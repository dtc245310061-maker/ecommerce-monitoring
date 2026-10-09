const express = require("express");
const path = require("path");
const mysql = require("mysql2/promise");
const promClient = require("prom-client");

const app = express();
const port = Number(process.env.PORT || 3000);
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

const httpRequests = new promClient.Counter({
  name: "ecommerce_http_requests_total",
  help: "Total HTTP requests handled by the ecommerce starter app",
  labelNames: ["method", "route", "status"],
  registers: [register]
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    httpRequests.inc({
      method: req.method,
      route: req.route?.path || req.path,
      status: String(res.statusCode)
    });
    console.log(JSON.stringify({
      level: "info",
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms: Date.now() - start
    }));
  });
  next();
});

const pool = mysql.createPool({
  host: process.env.DB_HOST || "mysql",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "ecommerce_app",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "ecommerce",
  waitForConnections: true,
  connectionLimit: 5
});

app.get("/api/products", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, description, price, stock FROM products ORDER BY id"
    );

    res.json({ products: rows });
  } catch (err) {
    console.error(JSON.stringify({
      level: "error",
      message: "products_fetch_failed",
      error: err.message
    }));
    res.status(500).json({ error: "Không thể tải danh sách sản phẩm" });
  }
});

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (err) {
    res.status(503).json({ status: "error", database: "disconnected" });
  }
});

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

app.get("/api/status", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT DATABASE() AS database_name, NOW() AS server_time");
    res.json({ status: "ok", database: rows[0].database_name, serverTime: rows[0].server_time });
  } catch (err) {
    res.status(503).json({ status: "error", message: "Database is unavailable" });
  }
});

app.listen(port, "0.0.0.0", () => console.log(JSON.stringify({ level: "info", message: "app_started", port })));
