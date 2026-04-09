# Apt. Tracker

NYC apartment hunting tracker with live listing lookup, photo annotation, and comparison tools.

## How it works

One Cloudflare Worker serves both the app and the search API. Type any address → it searches live listings → fills everything in automatically.

---

## Setup (15 minutes)

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/apt-tracker.git
cd apt-tracker
npm install -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```
This opens a browser window. Log in or create a free account at cloudflare.com.

### 3. Deploy the Worker

```bash
wrangler deploy
```

You'll see output like:
```
Published apt-tracker (1.23 sec)
https://apt-tracker.YOUR_SUBDOMAIN.workers.dev
```

Copy that URL — that's your app.

### 4. Add your Anthropic API key

```bash
wrangler secret put ANTHROPIC_API_KEY
```
Paste your `sk-ant-...` key when prompted. Press Enter.

### 5. Done

Visit your Worker URL in Safari on iPhone → Share → Add to Home Screen.

---

## Auto-deploy from GitHub

Every time you push to `main`, GitHub Actions deploys automatically.

You need to add two secrets in your GitHub repo:
**Settings → Secrets and variables → Actions → New repository secret**

| Secret | Where to find it |
|---|---|
| `CLOUDFLARE_API_TOKEN` | cloudflare.com → My Profile → API Tokens → Create Token → "Edit Cloudflare Workers" template |
| `CLOUDFLARE_ACCOUNT_ID` | cloudflare.com → Right sidebar on Workers dashboard |

After adding both secrets, every `git push` auto-deploys in ~30 seconds.

---

## Making changes

When we update the app in Claude:
1. Copy the new `src/index.js`
2. `git add . && git commit -m "update" && git push`
3. Auto-deploys in 30 seconds

---

## Data storage

All apartment data is stored in your browser's `localStorage` — nothing goes to any server. Only the address lookup calls the Worker (which calls Anthropic).
