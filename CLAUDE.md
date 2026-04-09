# CLAUDE.md — Instructions for Claude Code

## What this is
A NYC apartment tracking web app deployed as a single Cloudflare Worker.
The Worker serves the HTML app at `/` and handles address lookups at `/search`.

## Your job
Deploy this project end-to-end. The human will provide credentials when asked.
Work through each phase in order. Don't skip steps.

---

## Phase 1 — Prerequisites check

Run these and confirm each is available:
```bash
node --version        # needs 18+
npm --version
git --version
```

If wrangler is not installed:
```bash
npm install -g wrangler
```

---

## Phase 2 — Cloudflare login

```bash
wrangler login
```

This opens a browser. Tell the human: **"Please log in or create a free Cloudflare account in the browser window, then come back."**
Wait for confirmation before continuing.

---

## Phase 3 — Deploy the Worker

```bash
wrangler deploy
```

Expected output includes a line like:
```
https://apt-tracker.SOMETHING.workers.dev
```

Capture that URL — it's the live app URL. Tell the human what it is.

---

## Phase 4 — Add the Anthropic API key

```bash
wrangler secret put ANTHROPIC_API_KEY
```

Tell the human: **"Please paste your Anthropic API key (starts with sk-ant-) and press Enter."**
Wait for confirmation.

Verify the secret was set:
```bash
wrangler secret list
```

You should see `ANTHROPIC_API_KEY` in the output.

---

## Phase 5 — Test the deployment

Test that the app loads:
```bash
curl -s -o /dev/null -w "%{http_code}" https://apt-tracker.$(wrangler whoami 2>/dev/null | grep -o '[a-z0-9-]*\.workers\.dev' | head -1 || echo "YOUR_SUBDOMAIN.workers.dev")
```

Or just tell the human to open the Worker URL in their browser and confirm they see the app.

Test the search endpoint:
```bash
curl -X POST https://YOUR_WORKER_URL/search \
  -H "Content-Type: application/json" \
  -d '{"address": "55 East 65th Street 4C New York NY"}' \
  | head -c 500
```

Replace YOUR_WORKER_URL with the actual URL from Phase 3.
Expected: JSON response with `"ok": true` and apartment data.

---

## Phase 6 — GitHub setup

Ask the human: **"What is your GitHub username?"**

```bash
git init
git add .
git commit -m "initial deploy: apt tracker"
git branch -M main
git remote add origin https://github.com/THEIR_USERNAME/apt-tracker.git
git push -u origin main
```

Note: The human needs to create the repo on github.com first (just the repo, no files).
Tell them: **"Please create a new empty repo called 'apt-tracker' on github.com (no README, no .gitignore), then come back."**

---

## Phase 7 — GitHub Actions auto-deploy

The human needs two secrets added to their GitHub repo for auto-deploy on push.

Tell them to go to:
`https://github.com/THEIR_USERNAME/apt-tracker/settings/secrets/actions`

And add these two secrets:

**Secret 1: CLOUDFLARE_API_TOKEN**
- Go to: https://dash.cloudflare.com/profile/api-tokens
- Click "Create Token"
- Use template: "Edit Cloudflare Workers"
- Click "Use template" → "Create Token"
- Copy the token value

**Secret 2: CLOUDFLARE_ACCOUNT_ID**
Run this to find it:
```bash
wrangler whoami
```
The Account ID is shown in the output.

Once both secrets are added, test auto-deploy:
```bash
# Make a trivial change and push
echo "# deployed $(date)" >> README.md
git add . && git commit -m "test auto-deploy" && git push
```

Go to `https://github.com/THEIR_USERNAME/apt-tracker/actions` and confirm the deploy workflow runs green.

---

## Phase 8 — Add to iPhone home screen

Tell the human:
1. Open Safari on iPhone
2. Go to: **[THE WORKER URL]**
3. Tap the Share button (box with arrow)
4. Scroll down and tap **"Add to Home Screen"**
5. Tap **"Add"**

The app is now installed on their phone like a native app.

---

## Done — summary

Tell the human:
- ✅ App URL: https://apt-tracker.YOUR_SUBDOMAIN.workers.dev
- ✅ Auto-deploys on every push to main
- ✅ Anthropic API key set as secret
- ✅ All apartment data stored in browser localStorage (private, on-device)

**How to update the app going forward:**
When we update the code with Claude in claude.ai, just replace `src/index.js` with the new version and run:
```bash
git add . && git commit -m "update" && git push
```
Auto-deploys in ~30 seconds.
