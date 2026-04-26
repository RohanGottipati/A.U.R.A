# Deploying FloorPlan AI to Vultr

This folder contains everything needed to deploy the app to a Vultr Cloud Compute VPS running Ubuntu 24.04 with Node 20 + PM2 + Nginx, reusing the existing Vultr Managed Postgres and Vultr Object Storage.

```
deploy/
  README.md                       <- you are here
  .env.production.example         <- template for the server's .env.local
  nginx/
    aura.conf                     <- Nginx reverse proxy site config
  scripts/
    bootstrap-server.sh           <- run once as root on the fresh VPS
    upload-code.sh                <- run from your laptop (rsync to VPS)
    deploy-app.sh                 <- run on the VPS (migrations + build + PM2)
    install-nginx.sh              <- run on the VPS (install + reload nginx)
    redeploy.sh                   <- run on the VPS for future updates
```

## End-to-end deploy (first time)

### 1. Provision the VPS (Vultr dashboard, manual)

- Cloud Compute, Ubuntu 24.04 LTS, region `EWR`. The **1 GB plan works** as long as you let `bootstrap-server.sh` add swap (it creates a 2 GB swapfile by default and `deploy-app.sh` caps the build heap). 2 GB is more comfortable but not required.
- Upload your SSH public key, disable password auth.
- Note the public IPv4. Set it in your shell:

  ```bash
  export VPS_IP=203.0.113.10
  ```

### 2. Allowlist the VPS in Vultr Managed Postgres

In the Postgres cluster's "Trusted Sources" / Firewall settings, add `${VPS_IP}/32`. Without this the app's connection will time out.

### 3. Bootstrap the server (once, as root)

```bash
scp deploy/scripts/bootstrap-server.sh root@${VPS_IP}:/root/
ssh root@${VPS_IP} 'bash /root/bootstrap-server.sh'
```

This installs Node 20, Nginx, PM2, git, postgresql-client-16, creates the `deploy` user, and locks down UFW to SSH + 80.

### 4. Upload the code (from your laptop)

```bash
./deploy/scripts/upload-code.sh
```

### 5. Create the production env file (on the server)

```bash
scp deploy/.env.production.example deploy@${VPS_IP}:/home/deploy/aura/.env.local
ssh deploy@${VPS_IP}
# on the server:
nano /home/deploy/aura/.env.local
# fill in the same values as your local .env.local, but set:
#   APP_BASE_URL=http://${VPS_IP}
```

### 6 + 7. Run migrations, build, and start under PM2

```bash
ssh deploy@${VPS_IP} 'cd /home/deploy/aura && bash deploy/scripts/deploy-app.sh'
```

When that finishes it prints a `sudo env PATH=... pm2 startup systemd ...` command. **Run that printed command once as root** so PM2 resurrects the app on reboot, then run `pm2 save` again on the deploy user.

### 8. Install Nginx reverse proxy

```bash
ssh deploy@${VPS_IP} 'cd /home/deploy/aura && bash deploy/scripts/install-nginx.sh'
```

### 9. Smoke test (from your laptop)

```bash
curl -i http://${VPS_IP}/api/health     # expect HTTP 200, body "OK"
open http://${VPS_IP}                   # landing page
```

Then run an end-to-end upload through the UI to confirm Postgres + Object Storage + Gemini + Backboard are all reachable.

## Future updates (Step 10)

```bash
# from your laptop
./deploy/scripts/upload-code.sh
ssh deploy@${VPS_IP} 'cd /home/deploy/aura && bash deploy/scripts/redeploy.sh'
```

Or, if you've added a git remote and cloned on the server instead of using `upload-code.sh`:

```bash
ssh deploy@${VPS_IP} 'cd /home/deploy/aura && git pull && bash deploy/scripts/redeploy.sh'
```

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `pm2 status` shows app errored, logs mention `ECONNREFUSED` to `vultrdb.com` | Step 2 skipped - VPS IP not in Postgres trusted sources |
| Upload returns `413 Request Entity Too Large` | `client_max_body_size` not applied; rerun `install-nginx.sh` |
| Build killed by OOM on 1 GB VPS | Confirm `swapon --show` reports the swapfile and that you're invoking `deploy-app.sh` (not bare `npm run build` without `NODE_OPTIONS`). If it still OOMs, bump `SWAP_SIZE_MB=4096` and rerun bootstrap. |
| Share links point to `http://localhost:3000` | `APP_BASE_URL` in server's `.env.local` not updated to the VPS IP; edit and `pm2 reload aura --update-env` |
| App can't reach `ewr1.vultrobjects.com` | Object Storage access keys wrong, or bucket region differs |

## Adding HTTPS later

Once you point a domain at the VPS:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your.domain
# Then update APP_BASE_URL in /home/deploy/aura/.env.local to https://your.domain
# and pm2 reload aura --update-env
```
