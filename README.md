# E-commerce Website + Monitoring Stack

Docker Compose starter for the coursework: online shop, MySQL, phpMyAdmin, Nginx reverse proxy, Prometheus, Grafana, Loki, Promtail and exporters.

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
  Log labels depend on Docker Desktop log discovery; adjust selectors based on labels shown in Explore.

## Important security and coursework notes
- This is a local educational starter, not a production deployment.
- HTTPS uses a self-signed certificate generated during image build.
- Monitoring endpoints are not published to host ports.
- The `backend` network is internal; only services attached to it can reach database traffic.
- cAdvisor needs elevated host visibility for metrics; review its permissions during the hardening demonstration.
- Docker socket access by Promtail is powerful even when mounted read-only. Document this trade-off and restrict access to the host.
- For a fully hardened production system, use managed secrets, a trusted TLS certificate, authentication for admin tools, and stricter service-specific network policies.
- The initial app is only an infrastructure health-check starter. Implement product CRUD, cart, checkout, and order management as the next development phase.
