# Deploying DRINQ to GoDaddy

DRINQ is on **GoDaddy Web Hosting Deluxe**. It includes **GoDaddy Node.js Hosting** ("Deploy your Node.js app"),
which is the way we deploy. (The cPanel route further down is a fallback only.)

**Staging** = `staging.drinq.sg`: password-protected, red "TEST SITE" bar, hidden from Google, no PayNow QR.
**Live** = `drinq.sg`, later: same app steps with different settings.

---

# A. GoDaddy Node.js Hosting (use this)

GoDaddy installs, builds and starts the site itself from the source code:
`npm install` → `npm run build` → `npm start` (it supplies `PORT`). Apps run on Node.js 22.
Files on this platform may not survive a redeploy, so **orders are kept in GoDaddy's MySQL database**:
the build detects it and the order tables are created automatically on first start.

## 1. Make the zip (Mac)

```bash
cd ~/drinq-website
npm run package:nodejs
```

Makes `deploy/drinq-source.zip` (~200 KB, source code only — never `.env`, databases or `node_modules`).

## 2. First deploy

1. GoDaddy → **Deploy your Node.js app** → **Upload a zip** → choose `deploy/drinq-source.zip` → captcha → **Deploy**.
   The first build takes a few minutes.
2. In the app's dashboard, open **Database** and create / turn on the app database (MySQL).
   GoDaddy then gives the app `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` by itself.
3. In the app's **environment variables / secrets**, add:

| Name | Value |
|---|---|
| `SITE_URL` | `https://staging.drinq.sg` |
| `STAGING_PASSWORD` | a password for testers (user name `drinq`) |
| `ADMIN_PASSWORD` | a different, strong password for `/admin` (user name `admin`) |
| `PAYNOW_UEN` | `202016031N` |
| `PAYNOW_NAME` | `DRINQSG PTE LTD` |
| `NEXT_PUBLIC_TELEGRAM_URL` | DRINQ's Telegram link |

   Secrets are set separately for **preview** and **production** — add them to both.
4. **Restart** the app (and redeploy once if the Telegram link was added after the first build).
5. Open the **preview** link (only you, signed in to GoDaddy, can see it). The browser asks for the tester password.
   If checkout shows an error, the database isn't connected yet — check step 2 and send the app log to Claude.

## 3. Staging address for testers

1. **Publish** the app (uses 1 of the Deluxe plan's 10 app slots).
2. Attach the domain **`staging.drinq.sg`**. Because drinq.sg is at GoDaddy, the DNS record and SSL certificate are set up automatically.
3. Keep `STAGING_PASSWORD` set on production so only testers get in.

## 4. Updates

1. Mac: `npm run package:nodejs`
2. GoDaddy: upload the new zip to the **same app**, check the preview, then **Publish**.
   Orders stay in the database.

## 5. Going live on drinq.sg (later)

Attach `drinq.sg` (and `www.drinq.sg`) to the app, set `SITE_URL=https://drinq.sg`, **remove `STAGING_PASSWORD`**, restart.
GoDaddy points the domain away from its parking page when the domain is attached.

---

# B. Fallback: cPanel "Setup Node.js App"

Only if Node.js Hosting can't be used. Here the site is built on the Mac and uploaded ready to run,
and orders are kept in a SQLite file in your home folder.

## 1. Make the package (Mac)

```bash
cd ~/drinq-website
npm run package:godaddy
```

This makes `deploy/drinq-site.zip` (about 30 MB). It never contains `.env` or any database.

## 2. One-time setup in cPanel

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

## 3. Updating (cPanel)

1. Mac: `npm run package:godaddy`
2. File Manager → `drinq-staging` → select everything → **Delete** → Upload the new zip → Extract → delete the zip.
   (The database is in `drinq-data`, so orders are kept.)
3. Setup Node.js App → **Restart**.

## 4. Going live (cPanel)

Same as above with a second app (`drinq-live` folder, URL `drinq.sg`), its own database file, `SITE_URL=https://drinq.sg`,
and **no** `STAGING_PASSWORD`. Then point drinq.sg's DNS **A** record (`@`) from GoDaddy's parking address to the hosting IP,
and `www` to `drinq.sg`. Run AutoSSL for both.

## If something goes wrong

- **"Sign in required" loop** — check `STAGING_PASSWORD`; user name is `drinq`.
- **Error page / 503** — Setup Node.js App → the app → open the log file shown there (`stderr.log` in the app folder), and send it to Claude.
- **Database error** — the `drinq-data` folder must exist and `DATABASE_URL` must use the full path with your cPanel user name.
