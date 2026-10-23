# Tech Viet - De 9: Website thuong mai dien tu

Do an trien khai website ban hang online theo **De 9** - Pham Thuy Dung
(**DTC245310061**). Toan bo he thong chay bang Docker Compose va gom:

- Website ban hang: san pham, tim kiem, gio hang, dat hang, tra cuu don hang.
- MySQL va phpMyAdmin de luu tru/quan tri du lieu.
- Nginx reverse proxy voi HTTPS tu ky va security headers.
- Prometheus, Grafana, cAdvisor, Nginx Exporter va MySQL Exporter.
- Loki va Promtail de tap trung log, truy van bang LogQL.

## 1. Yeu cau

- Docker Desktop dang chay voi Linux containers.
- Docker Compose v2 (lenh su dung la `docker compose`, khong phai `docker-compose`).
- Git.
- Mo PowerShell tai thu muc muon luu ma nguon.

## 2. Chay lan dau bang PowerShell

Tat ca lenh ben duoi deu nhap trong **PowerShell**:

```powershell
git clone https://github.com/dtc245310061-maker/ecommerce-monitoring.git
Set-Location .\ecommerce-monitoring
Copy-Item .env.example .env
notepad .env
```

Trong `.env`, thay tat ca gia tri `CHANGE_ME_*` bang mat khau manh, rieng biet.
Luu file sau khi sua, sau do kiem tra va khoi dong:

```powershell
docker compose config
docker compose up -d --build
docker compose ps
```

Neu muon xem log khi khoi dong:

```powershell
docker compose logs --tail=100 app nginx mysql
```

Lan chay sau chi can:

```powershell
Set-Location "C:\Users\admin\ecommerce-monitoring"
docker compose up -d
```

## 3. Dia chi demo

Chap nhan canh bao cua trinh duyet vi day la chung chi tu ky:

| Thanh phan | Dia chi |
|---|---|
| Website | <https://localhost> |
| phpMyAdmin | <https://localhost/phpmyadmin/> |
| Grafana | <https://localhost/grafana/> |
| Prometheus | <https://localhost/prometheus/> |
| Health check | <https://localhost/health> |
| API trang thai | <https://localhost/api/status> |

Dang nhap Grafana bang `GRAFANA_ADMIN_USER` va `GRAFANA_ADMIN_PASSWORD` trong
`.env`. phpMyAdmin su dung host `mysql`, user `ecommerce_app` va mat khau
`APP_DB_PASSWORD`; tai khoan root dung `MYSQL_ROOT_PASSWORD`.

## 4. Chuc nang website

1. Tai danh sach san pham tu MySQL va tim kiem theo ten/mo ta.
2. Them, tang/giam so luong, xoa san pham trong gio hang (luu bang
   `localStorage`).
3. Dat hang voi ho ten, email, so dien thoai `+84xxxxxxxxx` va dia chi.
4. Backend kiem tra du lieu, khoa ton kho bang transaction, tao `orders`,
   `order_items` va tru ton kho an toan.
5. Tra cuu trang thai bang ma don va so dien thoai da dung khi dat hang.

## 5. Kiem tra cac tieu chi ky thuat

### Nginx va security headers

```powershell
curl.exe -k -I https://localhost
curl.exe -k https://localhost/health
```

Nginx chuyen tiep request den app, phpMyAdmin, Grafana va Prometheus. Cac
header `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
`Permissions-Policy` duoc cau hinh trong `nginx\nginx.conf`.

### Prometheus va Grafana

Mo Grafana, vao dashboard **E-commerce Infrastructure Overview** va kiem tra
cac target `ecommerce-app`, `nginx-exporter`, `mysqld-exporter`, `cadvisor`
va `prometheus` deu o trang thai `UP`.

Lenh kiem tra nhanh trong PowerShell:

```powershell
docker compose ps
docker compose logs --tail=100 prometheus grafana
```

### Loki va LogQL

Trong Grafana > Explore, chon datasource Loki va thu cac truy van:

```logql
{service="app"}
{service="app"} |= "order_creation"
{service="nginx"} |~ "GET|POST"
```

Neu Docker Desktop dat label khac, xem danh sach label trong Explore va dieu
chinh selector. Tao mot don hang de phat sinh log `order_creation`.

### Hardening

- App chay bang user non-root `node`.
- App, MySQL va phpMyAdmin duoc tach khoi bang network `frontend`/`backend`;
  network `backend` la internal.
- Container duoc ap dung `no-new-privileges`, `cap_drop: ALL` o cac service
  phu hop va filesystem read-only cho app/Nginx.
- Database chi `expose` trong Docker network, khong mo truc tiep port ra host.
- Mat khau nam trong `.env` va `.env` khong duoc commit.
- Nginx bat HTTPS tu ky, tat `server_tokens` va them security headers.

`cAdvisor` va `Promtail` can mount mot so tai nguyen read-only cua Docker host
de thu thap metrics/log; day la trade-off can neu ro khi demo hardening.

## 6. Lenh quan tri PowerShell

```powershell
# Xem trang thai va log
docker compose ps
docker compose logs -f app

# Khoi dong lai mot service
docker compose restart app

# Dung he thong (giu lai volume du lieu)
docker compose down

# Xoa ca volume - CHI dung khi muon xoa du lieu demo
docker compose down -v
```

Khong commit `.env`, private key, certificate hoac thong tin dang nhap that.
Day la he thong hoc tap cuc bo, chua tich hop thanh toan va chua phu hop cho
du lieu production.

## 7. Moc commit de nop bai

1. **Commit 1 - Ha tang va website:** Docker Compose, MySQL/phpMyAdmin, Nginx
   HTTPS, security headers va luong mua hang.
2. **Commit 2 - Giam sat:** Prometheus, Grafana, exporters va dashboard.
3. **Commit 3 - Tap trung log:** Loki, Promtail va cac truy van LogQL.

Can duy tri commit message ro rang va bo sung anh minh hoa website, phpMyAdmin,
Grafana, LogQL va hardening vao bao cao toi thieu 10 trang.
