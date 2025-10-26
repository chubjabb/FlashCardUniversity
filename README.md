```markdown
# FlashCardUniversity — simple site for sharing Anki decks

This repository contains a simple static site you can host on GitHub Pages or Netlify to let visitors download pre-made Anki (.apkg) decks.

New: in-site uploads (Firebase)
- This version adds an optional in-site uploader so authenticated users can upload decks directly from the website.
- The uploader uses Firebase Authentication (Google sign-in), Firebase Storage (files) and Firestore (metadata manifest).
- If Firebase is not configured, the site will fall back to the static `decks.json` manifest.

Quick setup (Firebase uploader)
1. Create a Firebase project at https://console.firebase.google.com/.
2. Add a Web App in the Firebase console and copy the config object.
3. Enable Authentication → Sign-in method → Google.
4. Enable Firestore (start in production mode) and enable Firebase Storage.
5. Add the firebase config to `js/firebase-config.js` (see `js/firebase-config.example.js`).
6. Update the Firestore and Storage rules to match the examples in `firebase/firestore.rules` and `firebase/storage.rules`.
7. Deploy the static site (Netlify or GitHub Pages). Visitors can then sign-in and upload decks.

Notes & tips
- Storage rules below allow authenticated users to write files to `decks/` and public read for downloads. Adjust rules for your trust model.
- To limit file sizes, enforce a max in the frontend and in your storage rules.
- Consider adding an approval/moderation step (recommended) to avoid abuse or copyrighted uploads.

Netlify (recommended hosting)
- Since you have a Netlify account, connect it to the repo after you push.
- In Netlify: "New site from Git" → connect GitHub → select this repo → branch `main`.
- Build command: (leave empty). Publish directory: `/` (root).
- Deploys auto-update whenever you push to the repo.

If you'd like, I can:
- Walk you through creating the Firebase project and pasting the config into js/firebase-config.js.
- Add a minimal Netlify Function (server-side) that approves/moves uploads or pushes approved decks back into the repo (requires a GitHub token).
```
