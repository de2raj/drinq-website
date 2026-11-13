# Deploying DRINQ to GoDaddy (Web Hosting Deluxe, cPanel)

The site is built on the Mac and uploaded as one zip. GoDaddy runs it with cPanel's **Setup Node.js App**.
Nothing is built on GoDaddy, so the shared plan's memory limits don't matter.

**Staging** = `staging.drinq.sg`, password-protected, red "TEST SITE" bar, hidden from Google, no PayNow QR.
**Live** = `drinq.sg`, later, with the same steps and different settings (see the end).

---

## 1. Make the package (Mac)

```bash
cd ~/drinq-website
npm run package:godaddy
```

This makes `deploy/drinq-site.zip` (about 30 MB). It never contains `.env` or any database.

## 2. One-time setup in GoDaddy

### a) Check Node.js is available
cPanel → search **"Node.js"** → **Setup Node.js App** should open. Note the newest Node.js version it offers (we need **20 or higher**, ideally 24).

### b) Add the staging address
cPanel → **Domains** → **Create A New Domain**
- Domain: `staging.drinq.sg`
- Untick "Share document root"; document root: `staging.drinq.sg` (default is fine)

If drinq.sg's DNS isn't managed by this hosting (it's on GoDaddy DNS, so it usually is not):
GoDaddy → My Products → drinq.sg → **DNS** → **Add New Record**
- Type **A**, Name **staging**, Value = the hosting's **Shared IP Address** (cPanel right-hand column), TTL default.

### c) HTTPS
cPanel → **SSL/TLS Status** → tick `staging.drinq.sg` → **Run AutoSSL** (once the DNS record works, usually within the hour).

### d) Folders
cPanel → **File Manager**, in your home folder create:
- `drinq-staging` — the app (replaced on each update)
- `drinq-data` — the orders database (kept between updates; never delete)

### e) Upload
File Manager → open `drinq-staging` → **Upload** `drinq-site.zip` → right-click it → **Extract** → then delete the zip.
You should see `server.js`, `.next`, `node_modules`, `public`, `package.json` (turn on *Settings → Show Hidden Files* to see `.next`).

### f) Create the Node.js app
cPanel → **Setup Node.js App** → **Create Application**
| Field | Value |
|---|---|
| Node.js version | newest offered (24 if available) |
| Application mode | Production |
| Application root | `drinq-staging` |
| Application URL | `staging.drinq.sg` |
| Application startup file | `server.js` |

**Environment variables** (Add Variable for each):
| Name | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `file:/home/YOUR-CPANEL-USERNAME/drinq-data/drinq.db` |
| `SITE_URL` | `https://staging.drinq.sg` |
| `STAGING_PASSWORD` | a password for testers (user name `drinq`) |
| `ADMIN_PASSWORD` | a different, strong password for `/admin` (user name `admin`) |
| `PAYNOW_UEN` | `202016031N` |
| `PAYNOW_NAME` | `DRINQSG PTE LTD` |
| `NEXT_PUBLIC_TELEGRAM_URL` | DRINQ's Telegram link |

Your cPanel user name is shown in cPanel's right-hand column ("Current User").
**Do not** click "Run NPM Install": everything the site needs is already in the zip.

Click **Create**, then **Restart**. Open https://staging.drinq.sg: the browser asks for the test password.
The order tables are created automatically the first time the app starts.

## 3. Updating staging

1. Mac: `npm run package:godaddy`
2. File Manager → `drinq-staging` → select everything → **Delete** → Upload the new zip → Extract → delete the zip.
   (The database is in `drinq-data`, so orders are kept.)
3. Setup Node.js App → **Restart**.

## 4. Going live on drinq.sg (later)

Same as above with a second app (`drinq-live` folder, URL `drinq.sg`), its own database file, `SITE_URL=https://drinq.sg`,
and **no** `STAGING_PASSWORD`. Then point drinq.sg's DNS **A** record (`@`) from GoDaddy's parking address to the hosting IP,
and `www` to `drinq.sg`. Run AutoSSL for both.

## If something goes wrong

- **"Sign in required" loop** — check `STAGING_PASSWORD`; user name is `drinq`.
- **Error page / 503** — Setup Node.js App → the app → open the log file shown there (`stderr.log` in the app folder), and send it to Claude.
- **Database error** — the `drinq-data` folder must exist and `DATABASE_URL` must use the full path with your cPanel user name.
