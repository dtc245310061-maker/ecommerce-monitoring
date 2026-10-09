# E-commerce Website + Monitoring Stack

Đồ án Đề 9 - Website thương mại điện tử của sinh viên **Phạm Thùy Dung (DTC245310061)**.
Hệ thống gồm website bán hàng, MySQL, phpMyAdmin, Nginx reverse proxy, Prometheus,
Grafana, Loki, Promtail và các exporter.

## Requirements
- Docker Desktop running with Linux containers
- Docker Compose v2+
- Git

## First-time setup (PowerShell)
1. Copy `.env.example` to `.env`.
2. Edit `.env` and replace every `CHANGE_ME_*` value with strong unique passwords.
3. Run `docker compose config` to validate the Compose file.
4. Run `docker compose up -d --build`.
5. Check `docker compose ps` and `docker compose logs --tail=100`.

## Local URLs
- Website: https://localhost (self-signed certificate; browser warning is expected)
- phpMyAdmin: https://localhost/phpmyadmin/
- Grafana: https://localhost/grafana/
- Prometheus: internal-only, reachable from Grafana/network or with a temporary local port-forward for troubleshooting
- Loki: internal-only

Grafana login uses `GRAFANA_ADMIN_USER` and `GRAFANA_ADMIN_PASSWORD` in `.env`. MySQL root and app credentials are in `.env`. Do not commit `.env`, private keys, or production secrets.

## Chức năng website

- `GET /api/products`: đọc danh sách sản phẩm từ MySQL.
- Khi ứng dụng khởi động, ba sản phẩm mẫu chỉ được thêm nếu chưa tồn tại; dữ liệu
  sản phẩm hiện có không bị ghi đè.
- `POST /api/orders`: kiểm tra dữ liệu, khóa tồn kho bằng transaction, tạo `orders`
  và `order_items`, sau đó trừ tồn kho.
- Trang chủ hỗ trợ thêm, sửa, xóa giỏ hàng bằng `localStorage`.
- Form đặt hàng cơ bản yêu cầu họ tên, email, số điện thoại định dạng `+84` với
  đúng 9 chữ số phía sau và địa chỉ; đơn ở trạng thái `pending`, chưa tích hợp
  thanh toán.

Ví dụ tạo đơn hàng:

```powershell
$body = '{"customerName":"Pham Thuy Dung","customerEmail":"dung@example.com","customerPhone":"+84912345678","shippingAddress":"Ha Noi, Viet Nam","items":[{"productId":1,"quantity":1}]}'
curl.exe -k -X POST https://localhost/api/orders -H "Content-Type: application/json" -d $body
```

## Initial validation
- `docker compose ps`
- `docker compose logs --tail=100 mysql app nginx prometheus grafana loki promtail`
- Open `https://localhost/health`
- Open `https://localhost/api/status`
- In Prometheus, confirm scrape targets become `UP`.
- In Grafana, confirm Prometheus and Loki datasources.
- In Grafana Explore, select Loki and try:
  - `{service="app"}`
  - `{service="nginx"}`
  - `{service="mysql"}`
- Additional LogQL queries for the demonstration:
  - `{service="app"} |= "order_creation"`
  - `{service="app"} | json | status="200"`
  - `{service="nginx"} |~ "GET|POST"`
  Log labels depend on Docker Desktop log discovery; adjust selectors based on labels shown in Explore.

Prometheus targets cần ở trạng thái `UP`:

- `ecommerce-app`
- `nginx-exporter`
- `mysqld-exporter`
- `cadvisor`
- `prometheus`

Dashboard Grafana `E-commerce Infrastructure Overview` hiển thị CPU, memory container,
request HTTP, kết nối Nginx và trạng thái MySQL/số connection database.

## Lịch sử commit đề xuất cho báo cáo

Lịch sử Git hiện có các commit chức năng. Khi nộp bài, có thể trình bày theo 3 mốc:

1. **Commit 1 - Infrastructure foundation**: Docker Compose, MySQL/phpMyAdmin,
   Nginx HTTPS và security headers.
2. **Commit 2 - Prometheus and Grafana monitoring**: app metrics, Nginx exporter,
   MySQL exporter, cAdvisor và dashboard.
3. **Commit 3 - Loki centralized logging**: Loki, Promtail và các truy vấn LogQL.

Các commit chức năng bổ sung gồm API sản phẩm, giỏ hàng và đặt hàng.

## Important security and coursework notes
- This is a local educational starter, not a production deployment.
- HTTPS uses a self-signed certificate generated during image build.
- Monitoring endpoints are not published to host ports.
- The `backend` network is internal; only services attached to it can reach database traffic.
- cAdvisor needs elevated host visibility for metrics; review its permissions during the hardening demonstration.
- Docker socket access by Promtail is powerful even when mounted read-only. Document this trade-off and restrict access to the host.
- For a fully hardened production system, use managed secrets, a trusted TLS certificate, authentication for admin tools, and stricter service-specific network policies.
- The project is a local educational deployment, not a production payment system.
- See `REPORT.md` for the coursework report draft and demonstration checklist.
