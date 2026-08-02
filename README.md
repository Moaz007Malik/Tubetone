# TubeTone — YouTube → MP3

Standalone Windows app (recommended) or optional Chrome extension.

Uses [yt-dlp](https://github.com/yt-dlp/yt-dlp) + **ffmpeg** on your PC.

## Share with a friend (Windows .exe) — recommended

Paste YouTube links and download MP3s. **No Chrome extension.**

```bat
cd launcher
build.bat
```

Creates `release/TubeTone/`:

- `TubeTone.exe` — paste links, pick bitrate/folder, download  
- `README.txt` — short instructions  

Zip that folder and send it. First run may download ffmpeg once.

---

## Optional: Chrome extension + local server

1. Install **ffmpeg** and keep it on PATH (or at `C:\ffmpeg\bin`)
2. Double-click `start-server.bat` (or `python server/server.py`)
3. Chrome → `chrome://extensions` → Developer mode → **Load unpacked** → `extension/`
4. Use on any YouTube video

---

## Option B — Deploy on Render (free) for friends

### 1. Push this project to GitHub

Create a repo and upload the `youtube-mp3-downloader` folder contents (including `Dockerfile` and `render.yaml`).

### 2. Create the service on Render

1. Go to [https://dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**  
   *(or New → Web Service and point at the repo, runtime **Docker**)*
2. Connect your GitHub repo
3. Render reads `render.yaml` and creates service **tubetone**
4. After deploy, open the service → **Environment**
5. Copy the generated **`API_KEY`** value
6. Copy your public URL, e.g. `https://tubetone-xxxx.onrender.com`

### 3. Point the extension at Render

1. Load the `extension` folder in Chrome (Load unpacked)
2. Open the extension popup → **Server settings**
3. Set:
   - **Server URL** → your `https://….onrender.com` URL  
   - **API key** → the `API_KEY` from Render
4. Click **Save** — status should show **Online**
5. Share the same extension folder + API key + URL with your friend

### Free-tier caveats

| Issue | What happens |
| --- | --- |
| Cold start | First request after idle (~15 min) can take 30–60s |
| Timeouts | Long songs / slow conversion may fail on free plan |
| YouTube bot check | Datacenter IPs get blocked — fix with cookies (below) |
| Sleep | Free web services spin down when idle |

If Render fails often, local mode (Option A) is more reliable.

### Fix “Sign in to confirm you’re not a bot”

YouTube blocks Render’s IP unless yt-dlp sends **your** logged-in cookies.

1. On your PC, install a cookies export extension, e.g.  
   [Get cookies.txt LOCALLY](https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc)
2. Open [youtube.com](https://www.youtube.com) while **logged in**
3. Export cookies → save as `cookies.txt` (Netscape format)
4. On Render → your service → **Environment** → Add:
   - **Key:** `YTDLP_COOKIES`
   - **Value:** paste the **entire** contents of `cookies.txt`
5. Save (redeploy). Logs should show `cookies: /tmp/tubetone/cookies.txt`

**Never commit `cookies.txt` to GitHub** — it can take over your Google account.

**Local alternative (no file):** set env `COOKIES_FROM_BROWSER=chrome` before starting the server.

---

## Manual Render setup (without Blueprint)

- **Runtime:** Docker  
- **Dockerfile path:** `./Dockerfile`  
- **Health check path:** `/health`  
- **Env vars:**
  - `API_KEY` = a long random secret (share only with friends)
  - `DOWNLOAD_DIR` = `/tmp/tubetone`
  - `YTDLP_COOKIES` = full Netscape cookies.txt (fixes bot check)

---

## API (for debugging)

```bash
# Health (no key)
curl https://YOUR.onrender.com/health

# Info
curl -H "X-API-Key: YOUR_KEY" \
  "https://YOUR.onrender.com/info?url=https://www.youtube.com/watch?v=VIDEO_ID"

# Download MP3 file
curl -H "X-API-Key: YOUR_KEY" -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=VIDEO_ID","bitrate":128}' \
  -o song.mp3 \
  https://YOUR.onrender.com/download
```

---

## Notes

- Chrome Web Store does **not** allow YouTube downloaders — sideload only.
- Only download content you have the right to use.
- Keep `API_KEY` private so strangers don't burn your Render bandwidth.
