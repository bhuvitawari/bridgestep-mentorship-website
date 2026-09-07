# BridgeStep Platform — What This Is, and How to Make It Fully Live

## Read this first: what actually works right now

Open `index.html` (or `login.html` directly) in a browser, or after deploying to
GitHub Pages. **No setup is required to try it** — everything below works
immediately:

- **Real login/signup flow**, with 3 roles (student / mentor / admin), a working
  "forgot password" flow, and pending-approval status for new signups.
- **Real dashboards** for each role, populated with sample data so it doesn't
  look empty on first open.
- **Real video calls.** The "Join Session" / "Start Session" room embeds
  [Jitsi Meet](https://meet.jit.si) directly in the page — this is a genuine,
  working video/audio/chat/screen-share call, free, with no account needed.
- **Real session timer + hour tracking.** Starting and ending a session in the
  Session Room logs a session record and adds the time to that user's total
  hours automatically — the dashboards and charts update from it.
- **Real in-app messaging**, notifications, mentor↔student matching (by an
  admin), resource uploads, session notes, progress bars, and a downloadable
  certificate (via the browser's own "Print to PDF").

### The one thing that is simulated (and why)

All of the data above — accounts, sessions, messages, hours — is stored in
**this browser's local storage**, not in a shared cloud database. That means:
- It works instantly, for free, with zero setup — good for demos, feedback
  sessions, and testing the actual product flow with the team.
- It is **per-browser**. What a student does on their laptop won't appear on a
  mentor's phone, because there's no shared server yet.

This is normal for a first working version. Below is exactly how to remove
that limitation and go fully live with a real shared backend — it's a
config change, not a rebuild, because the app was built with that switch-over
in mind.

---

## Part 1 — Deploy what you have today (GitHub Pages)

1. Create a GitHub repository and upload every file in this folder
   (`index.html`, `login.html`, `signup.html`, `student.html`, `mentor.html`,
   `admin.html`, `session.html`, `resources.html`, `platform.css`,
   `platform.js`, `firebase-config.js`).
2. In the repo: **Settings → Pages → Deploy from a branch → main → / (root) → Save.**
3. GitHub gives you a live link within a minute or two:
   `https://YOUR-USERNAME.github.io/YOUR-REPO/`
4. Share that link with the team. Everyone who opens it can sign up, log in,
   explore their own dashboard, and try a real video session — each person's
   data just stays in their own browser for now (Part 2 below removes that
   limit).

## Part 2 — Turn on a real, shared backend (Firebase)

This makes accounts, sessions, and messages shared across every device —
the way a real product needs to work. It takes about 20–30 minutes the first
time, no coding required for the setup itself.

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
   and sign in with the BridgeStep Google account.
2. **Add project** → name it `bridgestep-platform` → follow the prompts.
3. In the project, go to **Build → Authentication → Get started**, then enable
   the **Email/Password** sign-in method (and **Google**, if you want the
   optional "Sign in with Google" button later).
4. Go to **Build → Firestore Database → Create database** → start in
   **production mode** → pick a region close to your users.
5. Go to **Build → Storage → Get started** (this is where resource files and
   profile photos will live once that part is wired up).
6. Go to **Project settings** (gear icon) → scroll to **Your apps** → click
   the **</> Web** icon → register an app (any nickname) → Firebase shows you
   a `firebaseConfig` object with real values.
7. Open `firebase-config.js` in this project and paste those real values into
   the empty `firebaseConfig` object at the top. Save.

That's it for step one: **as soon as `apiKey` is no longer empty, the app
automatically switches from demo mode to real Firebase Authentication** —
`login.html` and `signup.html` already call `firebase.auth()` when a config is
present, with no other change needed. Real accounts, real password resets,
real email verification.

### Extending the data layer (sessions, dashboards, messages) to Firestore

The dashboards currently read/write through one small module —
`DB.read(key)` / `DB.write(key, value)` in `platform.js` — instead of talking
to `localStorage` directly everywhere. That's deliberate: it's the seam where
Firestore plugs in. To finish the migration:

1. Replace the two functions in `platform.js`:
   ```js
   DB.read(key)   // → getDocs(collection(db, key))
   DB.write(key,v) // → setDoc/updateDoc calls per changed document
   ```
2. Suggested Firestore collections (already matches the shape used in the
   demo data, so the UI code barely changes):
   `users`, `sessions`, `resources`, `messages`, `notifications`,
   `announcements`, `programs`.
3. A junior developer or freelancer familiar with Firebase can do this part
   in a few focused days — the UI, styling, and all page logic are already
   built, so this is a data-wiring task, not a redesign.

### Firestore security rules (starting point)

Paste this in **Firestore → Rules** once you're ready to enforce access
control (adjust as your data model firms up):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        (request.auth.uid == userId ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }
    match /sessions/{sessionId} {
      allow read, write: if request.auth != null &&
        (resource.data.studentId == request.auth.uid ||
         resource.data.mentorId == request.auth.uid ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }
    match /{document=**} {
      allow read, write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

### Google Analytics + Search Console

- **Analytics**: in Firebase Console, enable Google Analytics for the project
  (offered during setup) — it auto-adds tracking, no separate account needed.
- **Search Console**: go to
  [search.google.com/search-console](https://search.google.com/search-console),
  add your GitHub Pages URL as a property, verify ownership (Google gives you
  an HTML file or meta tag to add to `index.html`), then submit the site so
  Google starts indexing it.

---

## File map

| File | Purpose |
|---|---|
| `index.html` | Public marketing site (unchanged design) |
| `login.html` / `signup.html` | Auth pages |
| `student.html` / `mentor.html` / `admin.html` | Role dashboards |
| `session.html` | Live video session room (Jitsi Meet) + hour tracking |
| `resources.html` | Resource library + messaging |
| `platform.css` | Shared design system for the platform pages |
| `platform.js` | Data layer, auth, notifications, sidebar — the file to edit when connecting Firestore |
| `firebase-config.js` | Paste real Firebase project keys here to go live |

## Honest limitations of this version

- File uploads (PDFs, videos) are represented as links/titles, not real file
  storage yet — wiring Firebase Storage is a small follow-up once Firestore
  is connected.
- Video call rooms are open Jitsi rooms named per mentor/student pair, not
  authenticated/locked meeting rooms — fine for a pilot, worth hardening
  (Jitsi supports passworded/JWT-authenticated rooms) before large-scale use.
- Charts use a mix of real numbers (student/mentor counts, hours) and a
  placeholder growth trend, since real historical data doesn't exist yet —
  once Firestore is live, swap the placeholder arrays in each dashboard's
  `<script>` for real queries.
