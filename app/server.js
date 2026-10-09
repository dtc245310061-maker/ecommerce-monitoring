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

const defaultProducts = [
  {
    name: "Tai nghe Bluetooth",
    description: "Tai nghe không dây cho nhu cầu hằng ngày",
    price: 450000,
    stock: 25
  },
  {
    name: "Bàn phím cơ",
    description: "Bàn phím cơ dành cho học tập và làm việc",
    price: 790000,
    stock: 15
  },
  {
    name: "Chuột không dây",
    description: "Chuột không dây gọn nhẹ",
    price: 250000,
    stock: 40
  }
];

async function ensureDefaultProducts() {
  for (const product of defaultProducts) {
    await pool.execute(
      `INSERT INTO products (name, description, price, stock)
       SELECT ?, ?, ?, ?
       WHERE NOT EXISTS (
         SELECT 1 FROM products WHERE name = ?
       )`,
      [
        product.name,
        product.description,
        product.price,
        product.stock,
        product.name
      ]
    );
  }
}

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

app.post("/api/orders", async (req, res) => {
  const { customerName, customerEmail, shippingAddress, items } = req.body;

  if (
    typeof customerName !== "string" ||
    customerName.trim().length < 2 ||
    customerName.trim().length > 150 ||
    typeof customerEmail !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim()) ||
    customerEmail.trim().length > 254 ||
    typeof shippingAddress !== "string" ||
    shippingAddress.trim().length < 5 ||
    shippingAddress.trim().length > 500 ||
    !Array.isArray(items) ||
    items.length === 0 ||
    items.length > 50
  ) {
    return res.status(400).json({ error: "Thông tin đặt hàng không hợp lệ" });
  }

  const normalizedItems = items.map((item) => ({
    productId: Number(item && item.productId),
    quantity: Number(item && item.quantity)
  }));

  if (
    normalizedItems.some(
      (item) =>
        !Number.isSafeInteger(item.productId) ||
        item.productId <= 0 ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity <= 0 ||
        item.quantity > 100
    )
  ) {
    return res.status(400).json({ error: "Số lượng sản phẩm không hợp lệ" });
  }

  const itemByProduct = new Map();
  for (const item of normalizedItems) {
    itemByProduct.set(
      item.productId,
      (itemByProduct.get(item.productId) || 0) + item.quantity
    );
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const productIds = [...itemByProduct.keys()];
    const placeholders = productIds.map(() => "?").join(",");
    const [products] = await connection.query(
      `SELECT id, price, stock FROM products WHERE id IN (${placeholders}) FOR UPDATE`,
      productIds
    );

    if (products.length !== productIds.length) {
      await connection.rollback();
      return res.status(400).json({ error: "Một hoặc nhiều sản phẩm không tồn tại" });
    }

    const productById = new Map(products.map((product) => [Number(product.id), product]));
    let totalAmount = 0;
    for (const [productId, quantity] of itemByProduct) {
      const product = productById.get(productId);
      if (quantity > Number(product.stock)) {
        await connection.rollback();
        return res.status(409).json({
          error: `Sản phẩm ${productId} không đủ tồn kho`
        });
      }
      totalAmount += Number(product.price) * quantity;
    }

    const [orderResult] = await connection.execute(
      `INSERT INTO orders
        (customer_name, customer_email, shipping_address, total_amount)
       VALUES (?, ?, ?, ?)`,
      [
        customerName.trim(),
        customerEmail.trim(),
        shippingAddress.trim(),
        totalAmount.toFixed(2)
      ]
    );

    for (const [productId, quantity] of itemByProduct) {
      const product = productById.get(productId);
      await connection.execute(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
         VALUES (?, ?, ?, ?)`,
        [orderResult.insertId, productId, quantity, product.price]
      );
      await connection.execute(
        "UPDATE products SET stock = stock - ? WHERE id = ?",
        [quantity, productId]
      );
    }

    await connection.commit();
    return res.status(201).json({
      orderId: orderResult.insertId,
      totalAmount: Number(totalAmount.toFixed(2)),
      status: "pending"
    });
  } catch (err) {
    if (connection) {
      await connection.rollback();
    }
    console.error(JSON.stringify({
      level: "error",
      message: "order_creation_failed",
      error: err.message
    }));
    return res.status(500).json({ error: "Không thể tạo đơn hàng" });
  } finally {
    if (connection) {
      connection.release();
    }
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

ensureDefaultProducts()
  .then(() => {
    app.listen(port, "0.0.0.0", () => console.log(JSON.stringify({
      level: "info",
      message: "app_started",
      port
    })));
  })
  .catch((err) => {
    console.error(JSON.stringify({
      level: "error",
      message: "default_products_initialization_failed",
      error: err.message
    }));
    process.exitCode = 1;
  });
