# Website thương mại điện tử và hệ thống giám sát

Đồ án Đề 9 - Website thương mại điện tử của sinh viên **Phạm Thùy Dung (DTC245310061)**.
Hệ thống gồm website bán hàng, MySQL, phpMyAdmin, Nginx reverse proxy, Prometheus,
Grafana, Loki, Promtail và các exporter.

## Yêu cầu cài đặt
- Docker Desktop đang chạy với Linux containers
- Docker Compose phiên bản 2 trở lên
- Git

## Cài đặt lần đầu (PowerShell)
1. Sao chép `.env.example` thành `.env`.
2. Mở `.env` và thay mọi giá trị `CHANGE_ME_*` bằng mật khẩu mạnh, riêng biệt.
3. Chạy `docker compose config` để kiểm tra file Compose.
4. Chạy `docker compose up -d --build`.
5. Kiểm tra bằng `docker compose ps` và `docker compose logs --tail=100`.

## Địa chỉ truy cập cục bộ
- Website: https://localhost (chứng chỉ tự ký; trình duyệt có thể hiển thị cảnh báo)
- phpMyAdmin: https://localhost/phpmyadmin/
- Grafana: https://localhost/grafana/
- Prometheus: https://localhost/prometheus/ (qua Nginx reverse proxy; port 9090
  không mở trực tiếp ra máy host)
- Loki: chỉ truy cập trong mạng Docker, truy vấn qua Grafana

Đăng nhập Grafana sử dụng `GRAFANA_ADMIN_USER` và `GRAFANA_ADMIN_PASSWORD` trong
`.env`. Thông tin đăng nhập MySQL root và ứng dụng cũng nằm trong `.env`. Không
được commit `.env`, khóa riêng tư hoặc thông tin bí mật dùng cho môi trường thật.

## Chức năng website

- `GET /api/products`: đọc danh sách sản phẩm từ MySQL.
- Khi ứng dụng khởi động, các sản phẩm mẫu chỉ được thêm nếu chưa tồn tại; dữ liệu
  sản phẩm hiện có không bị ghi đè.
- `POST /api/orders`: kiểm tra dữ liệu, khóa tồn kho bằng transaction, tạo `orders`
  và `order_items`, sau đó trừ tồn kho.
- Trang chủ hỗ trợ thêm, sửa, xóa giỏ hàng bằng `localStorage`.
- Có thanh tìm kiếm sản phẩm theo tên hoặc mô tả.
- Form đặt hàng cơ bản yêu cầu họ tên, email, số điện thoại định dạng `+84` với
  đúng 9 chữ số phía sau và địa chỉ; đơn ở trạng thái `pending`, chưa tích hợp
  thanh toán.

Ví dụ tạo đơn hàng:

```powershell
$body = '{"customerName":"Pham Thuy Dung","customerEmail":"dung@example.com","customerPhone":"+84912345678","shippingAddress":"Ha Noi, Viet Nam","items":[{"productId":1,"quantity":1}]}'
curl.exe -k -X POST https://localhost/api/orders -H "Content-Type: application/json" -d $body
```

## Kiểm tra ban đầu
- `docker compose ps`
- `docker compose logs --tail=100 mysql app nginx prometheus grafana loki promtail`
- Mở `https://localhost/health`
- Mở `https://localhost/api/status`
- Mở `https://localhost/prometheus/` và kiểm tra trang Prometheus.
- Trong Prometheus, xác nhận các target thu thập metrics có trạng thái `UP`.
- Trong Grafana, xác nhận nguồn dữ liệu Prometheus và Loki.
- Trong Grafana Explore, chọn Loki và thử:
  - `{service="app"}`
  - `{service="nginx"}`
  - `{service="mysql"}`
- Các truy vấn LogQL bổ sung để trình diễn:
  - `{service="app"} |= "order_creation"`
  - `{service="app"} | json | status="200"`
  - `{service="nginx"} |~ "GET|POST"`
  Nhãn log phụ thuộc vào cơ chế phát hiện log của Docker Desktop; điều chỉnh bộ
  lọc theo các nhãn hiển thị trong Explore.

Prometheus targets cần ở trạng thái `UP`:

- `ecommerce-app`
- `nginx-exporter`
- `mysqld-exporter`
- `cadvisor`
- `prometheus`

Dashboard Grafana `E-commerce Infrastructure Overview` hiển thị CPU, bộ nhớ
container, request HTTP, kết nối Nginx và trạng thái MySQL/số kết nối database.

## Lịch sử commit đề xuất cho báo cáo

Lịch sử Git hiện có các commit chức năng. Khi nộp bài, có thể trình bày theo 3 mốc:

1. **Commit 1 - Hạ tầng nền tảng**: Docker Compose, MySQL/phpMyAdmin,
   Nginx HTTPS và các header bảo mật.
2. **Commit 2 - Giám sát bằng Prometheus và Grafana**: metrics ứng dụng, Nginx
   exporter, MySQL exporter, cAdvisor và dashboard.
3. **Commit 3 - Tập trung log bằng Loki**: Loki, Promtail và các truy vấn LogQL.

Các commit chức năng bổ sung gồm API sản phẩm, giỏ hàng và đặt hàng.

## Lưu ý về bảo mật và đồ án
- Đây là hệ thống học tập chạy cục bộ, chưa phải hệ thống triển khai thực tế.
- HTTPS sử dụng chứng chỉ tự ký được tạo trong quá trình build image.
- Các endpoint giám sát không mở trực tiếp ra các port của máy host.
- Network `backend` là network nội bộ; chỉ các service tham gia network này mới
  truy cập được luồng dữ liệu database.
- cAdvisor cần quyền quan sát cao hơn trên host để thu thập metrics; cần trình bày
  rõ quyền này khi demo hardening.
- Promtail sử dụng Docker socket dù mount ở chế độ chỉ đọc, đây vẫn là quyền nhạy
  cảm. Cần trình bày trade-off này và giới hạn quyền truy cập host.
- Khi triển khai thực tế cần dùng secret manager, chứng chỉ TLS tin cậy, xác thực
  cho công cụ quản trị và network policy chặt chẽ hơn.
- Dự án là hệ thống học tập cục bộ, chưa phải hệ thống thanh toán thực tế.
- Xem `REPORT.md` để đọc bản dự thảo báo cáo và checklist trình diễn.
