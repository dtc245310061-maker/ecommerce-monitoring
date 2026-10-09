const express = require("express");
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

app.get("/", (req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>E-commerce infrastructure demo</title>
<style>body{font-family:Arial,sans-serif;max-width:850px;margin:50px auto;padding:0 20px;color:#222}h1{color:blue}section{padding:18px;border:1px solid #ddd;border-radius:8px;margin:16px 0}a{color:blue}</style>
</head><body><h1>Website thương mại điện tử</h1>
<p>Trang khởi tạo để kiểm tra hạ tầng Docker. Chức năng bán hàng sẽ được phát triển tiếp.</p>
<section><h2>Trạng thái hệ thống</h2><p>Ứng dụng Node.js đã chạy qua Nginx.</p><p><a href="/health">Kiểm tra sức khỏe</a> · <a href="/api/status">Kiểm tra kết nối MySQL</a></p></section>
<section><h2>Các trang quản trị</h2><p><a href="/phpmyadmin/">phpMyAdmin</a></p><p><a href="/grafana/">Grafana</a></p><p>Prometheus và Loki không được công khai trực tiếp qua cổng máy chủ.</p></section>
</body></html>`);
});

app.listen(port, "0.0.0.0", () => console.log(JSON.stringify({ level: "info", message: "app_started", port })));
