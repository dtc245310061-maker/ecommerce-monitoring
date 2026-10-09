# BÁO CÁO ĐỒ ÁN

## Đề 9: Website thương mại điện tử (E-commerce)

**Sinh viên:** Phạm Thùy Dung  
**Mã số sinh viên:** DTC245310061  
**Tên tài khoản/GitHub:** dtc245310061-maker  
**Công nghệ:** Node.js, Express, MySQL, phpMyAdmin, Nginx, Prometheus, Grafana, Loki, Promtail, Docker Compose  
**Thời gian:** 2026

\newpage

# 1. Giới thiệu đề tài

Đề tài xây dựng một website bán hàng trực tuyến quy mô nhỏ, có khả năng hiển thị
sản phẩm, quản lý giỏ hàng và tạo đơn hàng cơ bản. Ngoài phần nghiệp vụ thương mại
điện tử, hệ thống còn được triển khai cùng các thành phần vận hành thực tế gồm
reverse proxy HTTPS, cơ sở dữ liệu, công cụ quản lý cơ sở dữ liệu, giám sát số liệu
và thu thập log tập trung.

Mục tiêu của đồ án là minh họa cách các container phối hợp trong một hệ thống web:
Nginx nhận kết nối HTTPS, chuyển tiếp request đến ứng dụng Node.js, ứng dụng đọc và
ghi MySQL, còn Prometheus/Grafana và Loki/Promtail theo dõi tình trạng hệ thống.

Các kết quả chính:

- Website hiển thị sản phẩm từ MySQL.
- Giỏ hàng hoạt động ở trình duyệt bằng `localStorage`.
- API đặt hàng tạo `orders` và `order_items` bằng transaction.
- phpMyAdmin hỗ trợ xem dữ liệu MySQL.
- Nginx cung cấp HTTPS tự ký và security headers.
- Prometheus thu thập metrics ứng dụng, Nginx, MySQL và container.
- Grafana hiển thị dashboard.
- Loki và Promtail tập trung log Docker để truy vấn bằng LogQL.

\newpage

# 2. Yêu cầu và phạm vi

## 2.1. Yêu cầu chức năng

Website cần có danh sách sản phẩm, giá, mô tả và tồn kho. Người dùng có thể thêm
sản phẩm vào giỏ hàng, thay đổi số lượng, xóa sản phẩm và xem tổng tiền. Form đặt
hàng nhận họ tên, email, số điện thoại định dạng `+84` với đúng 9 chữ số phía sau
và địa chỉ giao hàng. Sau khi gửi, hệ thống kiểm tra tồn
kho và tạo đơn hàng ở trạng thái `pending`.

Phần thanh toán trực tuyến, tài khoản người dùng và quản trị đơn hàng nâng cao
không thuộc phạm vi bản demo.

## 2.2. Yêu cầu hạ tầng

- Toàn bộ source code và file cấu hình được quản lý bằng GitHub.
- MySQL là database chính; phpMyAdmin là công cụ quản lý.
- Nginx làm reverse proxy.
- HTTPS tự ký và security headers cơ bản.
- Prometheus và Grafana giám sát web server, ứng dụng, database và container.
- Loki và Promtail thu thập log tập trung.
- Container chạy với quyền tối thiểu, network được tách biệt và mật khẩu nằm trong
  `.env` không commit.

## 2.3. Phạm vi loại trừ

Đây là hệ thống học tập chạy local. Chứng chỉ TLS tự ký, chưa có payment gateway,
chưa có email xác nhận đơn hàng và chưa triển khai lên cloud production.

\newpage

# 3. Kiến trúc hệ thống

## 3.1. Sơ đồ logic

```text
Browser
   |
   | HTTPS :443
   v
Nginx reverse proxy
   |---------------------> phpMyAdmin
   |---------------------> Grafana
   v
Node.js/Express app
   |
   v
MySQL

Prometheus <----- app / nginx-exporter / mysqld-exporter / cAdvisor
Grafana    <----- Prometheus và Loki
Promtail   -----> Loki <----- Docker container logs
```

## 3.2. Các network

`frontend` kết nối Nginx với ứng dụng. `backend` được đánh dấu `internal`, chỉ
cho ứng dụng, MySQL và exporter truy cập luồng database. `monitoring` chứa
Prometheus, Grafana, Loki, Promtail và các exporter. MySQL không publish port ra
host.

## 3.3. Luồng request

Request HTTP port 80 được chuyển hướng sang HTTPS. Request HTTPS đi vào Nginx,
sau đó Nginx chuyển đến `app:3000`. Static HTML được Express phục vụ từ thư mục
`app/public`. Request `/api/products` đọc MySQL; request `/api/orders` thực hiện
transaction tạo đơn hàng.

**Hình minh họa cần chụp:** Docker Desktop hiển thị danh sách container đang chạy
và sơ đồ network trong phần Docker Inspect.

\newpage

# 4. Cấu trúc mã nguồn

Các thư mục chính:

```text
app/
  Dockerfile
  package.json
  server.js
  public/index.html
database/init.sql
nginx/nginx.conf
prometheus/prometheus.yml
grafana/dashboards/ecommerce-overview.json
loki/config.yml
promtail/config.yml
docker-compose.yml
README.md
REPORT.md
```

`server.js` tạo Express server, connection pool MySQL, health check, metrics,
API sản phẩm và API đặt hàng. `index.html` chứa giao diện, CSS responsive và
JavaScript frontend.

Các endpoint:

| Endpoint | Mục đích |
|---|---|
| `GET /health` | kiểm tra ứng dụng và MySQL |
| `GET /api/status` | kiểm tra database name và server time |
| `GET /api/products` | lấy sản phẩm |
| `POST /api/orders` | tạo đơn hàng |
| `GET /metrics` | metrics cho Prometheus |

**Hình minh họa cần chụp:** cây thư mục dự án trong VS Code.

\newpage

# 5. Database và nghiệp vụ đặt hàng

Database `ecommerce` có ba bảng chính:

- `products`: sản phẩm, giá và tồn kho.
- `orders`: thông tin khách hàng, trạng thái và tổng tiền.
- `order_items`: các sản phẩm thuộc một đơn hàng.

Khi tạo đơn, backend kiểm tra kiểu dữ liệu, email, địa chỉ và danh sách item.
Các sản phẩm được truy vấn bằng placeholder và khóa với `SELECT ... FOR UPDATE`.
Điều này ngăn hai request đồng thời cùng bán vượt tồn kho.

Transaction thực hiện các bước:

1. `BEGIN`.
2. Khóa và đọc sản phẩm.
3. Kiểm tra tồn kho.
4. Tính tổng tiền từ giá trong database.
5. Insert vào `orders`.
6. Insert vào `order_items`.
7. Trừ stock trong `products`.
8. `COMMIT`.

Nếu có lỗi, transaction được `ROLLBACK`. API trả lỗi rõ ràng và log lỗi ở dạng
JSON để Promtail thu thập.

phpMyAdmin được truy cập qua `https://localhost/phpmyadmin/`, không expose trực
tiếp port database ra máy host.

**Hình minh họa cần chụp:** phpMyAdmin hiển thị `products`, `orders`,
`order_items` và một đơn hàng mẫu.

\newpage

# 6. Nginx và HTTPS

Nginx lắng nghe port 80 và chuyển hướng toàn bộ request sang HTTPS port 443.
Certificate tự ký được tạo trong image build cho hostname `localhost`.

Các security headers đang bật:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` tắt camera, microphone và geolocation
- `server_tokens off`

Nginx proxy các đường dẫn:

- `/` đến ứng dụng Node.js.
- `/phpmyadmin/` đến phpMyAdmin.
- `/grafana/` đến Grafana.
- `/prometheus/` đến Prometheus.

Để kiểm tra:

```powershell
curl.exe -k -I https://localhost
curl.exe -k https://localhost/health
```

Trình duyệt có thể cảnh báo chứng chỉ vì certificate không do CA công cộng cấp.
Đây là hành vi dự kiến của môi trường học tập.

**Hình minh họa cần chụp:** trình duyệt hiển thị website HTTPS và phần response
headers trong Developer Tools.

\newpage

# 7. Prometheus và Grafana

Prometheus scrape các target:

- `prometheus:9090`
- `app:3000/metrics`
- `nginx-exporter:9113`
- `mysqld-exporter:9104`
- `cadvisor:8080`

Ứng dụng dùng `prom-client` để xuất số request HTTP theo method, route và status.
Nginx exporter lấy số liệu từ `stub_status`. MySQL exporter đọc metrics database.
cAdvisor cung cấp CPU và memory của container.

Grafana được provision tự động với hai datasource:

- Prometheus: `http://prometheus:9090`
- Loki: `http://loki:3100`

Dashboard có các panel CPU container, memory container, request HTTP theo status
và kết nối Nginx.

Prometheus được truy cập qua Nginx tại:

```text
https://localhost/prometheus/
```

Port 9090 không publish trực tiếp ra host; đường dẫn HTTPS này vừa đáp ứng nhu
cầu demo, vừa giữ Prometheus trong mạng Docker.

Kiểm tra target bằng Prometheus API:

```powershell
docker compose exec -T prometheus wget -qO- http://localhost:9090/api/v1/targets
```

Tất cả target quan trọng cần có `"health":"up"`.

**Hình minh họa cần chụp:** trang Grafana dashboard và trang Prometheus Targets.

\newpage

# 8. Loki, Promtail và LogQL

Promtail đọc Docker container logs thông qua Docker socket ở chế độ read-only,
gắn nhãn `container`, `service` và `stream`, sau đó gửi log đến Loki.

Các truy vấn LogQL dùng trong phần demo:

```logql
{service="app"}
```

Truy vấn thứ hai lọc sự kiện tạo đơn:

```logql
{service="app"} |= "order_creation"
```

Truy vấn thứ ba đọc JSON log theo status:

```logql
{service="app"} | json | status="200"
```

Có thể truy vấn log Nginx:

```logql
{service="nginx"} |~ "GET|POST"
```

Các truy vấn cho thấy log ứng dụng, Nginx và các container được tập trung tại một
nơi, giúp tìm lỗi mà không phải xem từng container riêng lẻ.

**Hình minh họa cần chụp:** Grafana Explore chọn datasource Loki và kết quả của
ít nhất ba truy vấn LogQL.

\newpage

# 9. Hardening và an toàn hệ thống

Các biện pháp đã áp dụng:

- App chạy user `node`, không chạy root.
- App và Nginx dùng `no-new-privileges`.
- App và Nginx drop toàn bộ Linux capabilities không cần thiết.
- Filesystem app/Nginx read-only, dùng `tmpfs` cho thư mục tạm.
- Database không publish port ra host.
- Network backend được đánh dấu `internal`.
- `.env` và certificate riêng không được commit.
- Mật khẩu được lấy từ biến môi trường.
- Nginx tắt server tokens và thêm security headers.
- Monitoring endpoints không publish trực tiếp ra host.
- Promtail mount Docker socket ở chế độ read-only.

Trade-off cần trình bày: Promtail cần Docker socket để discovery nên vẫn là quyền
nhạy cảm. Trong production nên dùng secrets manager, certificate tin cậy, network
policy chi tiết và logging agent có quyền tối thiểu hơn.

Không dùng `--remove-orphans` trong lúc demo nếu chưa xác định container cũ có
cần thiết hay không. Container cAdvisor hiện đã được khai báo chính thức trong
Compose; các container orphan khác cần được rà soát riêng.

\newpage

# 10. Kiểm thử và kết quả

Các lệnh kiểm thử:

```powershell
docker compose config --quiet
node --check app/server.js
docker compose up -d --build
docker compose ps
curl.exe -k https://localhost/health
curl.exe -k https://localhost/api/products
curl.exe -k https://localhost/metrics
```

Kiểm thử đặt hàng:

```powershell
$body = '{"customerName":"Pham Thuy Dung","customerEmail":"dung@example.com","shippingAddress":"Ha Noi, Viet Nam","items":[{"productId":1,"quantity":1}]}'
curl.exe -k -X POST https://localhost/api/orders `
  -H "Content-Type: application/json" -d $body
```

Kết quả mong đợi là HTTP 201, có `orderId`, `totalAmount` và `status=pending`.
Request dữ liệu không hợp lệ phải trả HTTP 400. Request vượt tồn kho phải trả HTTP
409. Sau khi tạo đơn, stock trong MySQL giảm đúng số lượng.

Checklist giao diện:

- Thấy danh sách sản phẩm.
- Thêm sản phẩm vào giỏ.
- Tăng, giảm, xóa sản phẩm.
- Tải lại trang không mất giỏ hàng.
- Điền form đặt hàng.
- Nhận mã đơn hàng thành công.

\newpage

# 11. Quản lý GitHub và các mốc commit

Repository được quản lý tại:

```text
https://github.com/dtc245310061-maker/ecommerce-monitoring
```

Tên repository và tài khoản sử dụng mã số sinh viên. `.env` không được đưa lên
GitHub; chỉ `.env.example` được theo dõi để mô tả biến môi trường cần thiết.

Các mốc commit nên được giữ rõ ràng:

1. Hạ tầng nền tảng: Compose, MySQL, phpMyAdmin, Nginx và HTTPS.
2. Monitoring: Prometheus, Grafana, exporter và cAdvisor.
3. Logging: Loki, Promtail và tài liệu LogQL.
4. Nghiệp vụ: sản phẩm, giỏ hàng và đặt hàng.

Trước khi push:

```powershell
git status
git diff --check
git add .
git commit -m "Complete ecommerce coursework stack"
git push origin main
```

Không commit password, private key, certificate production hoặc file dữ liệu
database cục bộ.

\newpage

# 12. Kết luận

Đồ án đã đáp ứng kiến trúc chính của Đề 9: website thương mại điện tử chạy bằng
Node.js/Express, MySQL và phpMyAdmin; Nginx reverse proxy có HTTPS tự ký và
security headers; Prometheus/Grafana giám sát ứng dụng, web server, database và
container; Loki/Promtail tập trung log và hỗ trợ LogQL; Docker Compose giúp khởi
động toàn bộ stack bằng một lệnh.

Phần nghiệp vụ đã có sản phẩm, giỏ hàng và đơn hàng cơ bản. API đặt hàng dùng
transaction để giữ nhất quán tồn kho. Các giới hạn còn lại là đặc trưng của demo
học tập: chưa có thanh toán thật, authentication, gửi email, backup tự động và
certificate công cộng.

Khi hoàn thiện bản nộp, sinh viên cần bổ sung ảnh chụp vào các vị trí được đánh
dấu trong báo cáo, ghi lại thời gian kiểm thử và đính kèm link GitHub. Báo cáo
này được chia thành nhiều trang bằng các mốc `\newpage`; khi xuất PDF cần dùng
Word/Pandoc/Markdown editor và kiểm tra đủ tối thiểu 10 trang.
