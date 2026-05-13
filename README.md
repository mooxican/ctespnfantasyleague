# #CTESPN Fantasy League Site

Pulls live data from your Sleeper fantasy league and displays it in an editorial sports-site layout.

**League ID:** `1312004917103185920` (hard-coded in `src/App.jsx`, line 4)

## Deploy to Vercel (recommended)

1. **Install dependencies and test it works locally first:**
   ```bash
   npm install
   npm run dev
   ```
   Open http://localhost:5173 — you should see your league data.

2. **Push to GitHub:**
   - Create a new repo on github.com (e.g., `gridiron`)
   - In your terminal in this folder:
     ```bash
     git init
     git add .
     git commit -m "Initial commit"
     git branch -M main
     git remote add origin https://github.com/YOUR_USERNAME/gridiron.git
     git push -u origin main
     ```

3. **Deploy on Vercel:**
   - Go to vercel.com → "Add New Project"
   - Import the `gridiron` repo from GitHub
   - Leave all settings at defaults (Vercel auto-detects Vite)
   - Click **Deploy**
   - In ~60 seconds you'll get a URL like `gridiron-yourname.vercel.app`

That's it. Every future `git push` auto-redeploys.

## Changing the league

Edit `src/App.jsx` line 4 — replace `LEAGUE_ID` with your Sleeper league ID, push, done.
