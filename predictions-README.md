# ⚽ The Prediction League

A single-file web app (`predictions.html`) for running a Premier League score-prediction
league with your mates. No app to install — it runs in the browser from GitHub Pages.

## What it does

- **Weekly predictions** — every player predicts the score of each Premier League fixture
  in the gameweek. Picks lock automatically at each match's kickoff, and other people's
  picks stay hidden until then.
- **Scoring** — correct result = **6 pts**, exact scoreline = **10 pts** (both configurable
  in the Admin tab; changes never affect weeks already finalised).
- **Automatic fixtures & results** — a GitHub Action pulls fixtures and full-time scores
  from the free Fantasy Premier League API four times a day. No API key needed. Admins can
  also enter/override any result by hand.
- **Winner & runner-up each week** — the admin hits "Finalise" after the weekend and the
  week's winner and runner-up are declared (ties handled: tied players share the win).
- **History** — season and per-month leaderboards ranked by weekly wins, then total points,
  plus exact scores and correct results; and a week-by-week roll of honour.
- **Monthly in/out** — players pay monthly (you collect the money yourself); toggle anyone
  **Out** for any gameweek they haven't paid for and they're excluded from that week.
- **Login codes, no passwords** — you create each player in the Admin tab; the system
  generates a unique login code (like `KX7M-29QF`). Send it to them on WhatsApp (there's a
  copy-ready invite button). They log in by picking their name and typing the code. Lost
  code? Reset it in one click.
- **Admins** — you're the admin; you can nominate (and demote) other admins any time.

Everything is free: GitHub Pages hosting, GitHub Actions, the FPL API, and Firebase's
free tier (which for ~15 players you won't get anywhere near the limits of).

---

## Setup (one-off, ~15 minutes)

### 1. Create the Firebase project (the database)

1. Go to <https://console.firebase.google.com> → **Add project** (any name, e.g.
   `prediction-league`). You can switch off Google Analytics.
2. In the project: **Build → Authentication → Get started → Email/Password → Enable → Save.**
   (The app uses hidden accounts behind the login codes — nobody ever types an email.)
3. **Build → Firestore Database → Create database → Start in test mode** (pick a European
   region, e.g. `europe-west2`). Test mode is temporary — step 4 below locks it down.
4. **Project settings (⚙) → General → Your apps → Web (</>)** → register an app (no
   hosting needed) and copy the `firebaseConfig` object it shows you.
5. Open `predictions.html`, find `FIREBASE_CONFIG` near the top of the `<script>`, and
   paste your config over the placeholder. Commit/push.

### 2. First run — found the league

1. Open the site: `https://<your-github-user>.github.io/<repo>/predictions.html`
2. Because no players exist yet, you'll see **"Found the league"**. Enter your name — the
   app creates your admin account and shows **your login code. Save it.**
3. Now lock the database down: Firebase Console → **Firestore → Rules**, replace the test
   rules with the rules below, and **Publish**. (Do this straight away — test mode leaves
   the database open, and it expires after 30 days anyway.)

<details>
<summary><b>Firestore security rules (copy–paste)</b></summary>

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() { return request.auth != null; }
    function myPid() {
      return get(/databases/$(database)/documents/uids/$(request.auth.uid)).data.pid;
    }
    function isAdmin() {
      return signedIn()
        && exists(/databases/$(database)/documents/uids/$(request.auth.uid))
        && get(/databases/$(database)/documents/players/$(myPid())).data.admin == true;
    }

    // Player roster — names are readable pre-login so the sign-in list works.
    match /players/{pid} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Maps hidden auth accounts to players.
    match /uids/{uid} {
      allow read: if signedIn();
      allow write: if isAdmin();
    }

    // Login codes — admins only.
    match /codes/{pid} {
      allow read, write: if isAdmin();
    }

    // League settings (points values).
    match /config/{doc} {
      allow read: if signedIn();
      allow write: if isAdmin();
    }

    // Weekly in/out lists, manual results, finalised tables.
    match /gameweeks/{gw} {
      allow read: if signedIn();
      allow write: if isAdmin();
    }

    // Predictions — anyone logged in can read; you can only write your own.
    match /predictions/{docId} {
      allow read: if signedIn();
      allow create, update: if isAdmin() || (
        signedIn()
        && request.resource.data.pid is string
        && docId == ('gw' + string(request.resource.data.gw) + '_' + request.resource.data.pid)
        && get(/databases/$(database)/documents/players/$(request.resource.data.pid)).data.uid == request.auth.uid
      );
      allow delete: if isAdmin();
    }
  }
}
```
</details>

### 3. Fixtures feed

The workflow `.github/workflows/update-fixtures.yml` fetches Premier League fixtures and
results and commits them to `data/fixtures.json` on the `gh-pages` branch.

- It runs on a schedule (4× daily) **once the workflow file is on the default branch**
  (`gh-pages`), and you can run it any time from the repo's **Actions tab → Update
  fixtures → Run workflow**. Run it once now to replace the bundled sample data.
- If Actions are disabled for the repo, enable them under **Settings → Actions**.

### 4. Add your players

Admin tab → **Add a player** → enter their name → the app generates their login code.
Hit **📋 Copy** next to a player for a ready-made WhatsApp invite (link + code). Done.

---

## Running the league (your weekly routine)

1. **Before the weekend** — check everyone who's paid is **In** for the gameweek (Admin →
   Players). Toggle anyone unpaid to **Out**. Everyone defaults to In each week.
2. **Players predict** — any time up to each match's kickoff.
3. **After the weekend** — results arrive automatically from the feed (within a few hours
   of full time). Check the table in **This Week**, then Admin → **Finalise GW** to declare
   the winner & runner-up. Only finalised weeks count in the Leaderboard.
4. Sort the money out over WhatsApp as usual — the app deliberately doesn't touch money.

**Postponed match or feed hiccup?** Admin → Results manual entry — a hand-entered score
always beats the feed, and you can finalise a week even with a game outstanding (or wait).
**Got something wrong?** Un-finalise the week, fix it, finalise again.

## Notes & honest limitations

- Player **names** are visible to anyone who has the page URL (they're needed for the
  login list). Predictions, tables and codes need a valid login. Don't post the URL
  publicly and it's a non-issue for a friends league.
- Kickoff lock is enforced in the app (the page disables and ignores late edits). A
  determined cheat with dev-tools knowledge could try a late write; the winner's picks are
  visible to everyone after kickoff, so late changes are easy to spot. For a mates'
  league this is plenty; true server-side lock enforcement would need a paid backend.
- The FPL feed marks scores final within a couple of hours of the final whistle. The
  "sample fixtures" banner disappears once the workflow has run for real.
- Firebase free tier limits (50k reads/20k writes a day) are far beyond what 15 players
  can generate.
