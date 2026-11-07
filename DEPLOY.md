# Deploying Kulay: Jeepney Stories (GitHub Pages)

The site is static files at the repo root: `index.html`, `style.css`, `app.js`, plus `assets/` if you add real images. Supabase (already set up) is the backend.

## 1. Put the files on GitHub
1. Sign in at github.com and click **New repository**. Name it e.g. `kulay-jeepney-stories`. Set it **Public**. Do not add a README.
2. On the empty repo page click **uploading an existing file**.
3. Open the project folder, press `Ctrl+A` to select everything **inside** it, and drag it all in. Upload the contents, **not** the folder itself: `index.html` must end up at the top level of the repo, or Pages shows a 404. Everything in the folder is safe to upload (it contains only the public Supabase key). `CLAUDE.md`, `DEPLOY.md` and `supabase.sql` are optional. Never upload any Supabase `secret` or `service_role` key, or your database password.
4. Click **Commit changes**.

## 2. Turn on Pages
1. Repo **Settings → Pages**.
2. Source: **Deploy from a branch**. Branch: **main**, folder: **/ (root)**. Click **Save**.
3. Wait 1–2 minutes. The link appears at the top: `https://<your-username>.github.io/<repo-name>/`.

## 3. Tell Supabase about the new address
Supabase → **Authentication → URL Configuration**. Set **Site URL** to your GitHub Pages link and save.

## 4. Before sharing the link
- Each of the 5 members signs up with: `aira_admin`, `michael_admin`, `nico_admin`, `aaron_admin`, `ryan_admin`. Do this first so strangers cannot take those names. Only `ryan_admin` (the owner) can make the others moderators, from the **MODS** page.
- Delete test accounts: Supabase → Authentication → Users (`zz_test_claude`, `zz_test_two`, any `test_*`).
- Log in on the live link, share one story and one artwork, then check them from a private window.

## 5. Updating the site later
Edit the file locally, then on GitHub open the file, click the pencil icon (or Add file → Upload files to replace it), and commit. Pages updates in about a minute. Press Ctrl+F5 to bypass the cached copy.

## Screenshot checklist (for the PDF)
Take them on the live link, desktop width, logged in. Add a caption saying which design choice each shows.
1. Home
2. Stories
3. Gallery
4. A story pop-up (shows the credit box)
5. An artwork pop-up
6. About
7. Contact
8. A profile page
9. The upload form (Share a story)
10. Reports page (moderator view), optional
11. One phone-width screenshot of Home (press F12, then the device icon)

## Known limits (be honest about these in the write-up)
- Anonymous posts hide the name and profile link on the site, but the account id is still in the database.
- No password recovery: usernames map to a fake email.
- Sample posts marked TODO are placeholders; likes and comments are off on them.

## Optional: link preview image (after you know your final URL)
`assets/preview.png` is ready. Link previews (Messenger, Facebook) need the full web address, so once Pages is live add these two lines inside `<head>` in `index.html`, using your real link:
```html
<meta property="og:image" content="https://<your-username>.github.io/<repo-name>/assets/preview.png">
<meta name="twitter:card" content="summary_large_image">
```
(Replace the existing `twitter:card` line.) Upload `assets/preview.png` to the repo too. After changing it, Facebook may cache the old preview; the Sharing Debugger tool refreshes it.

## Supabase free plan: pausing
A free project that gets no activity for about a week is paused. The site then shows no accounts or posts until you open the Supabase dashboard and click **Restore project** (takes a few minutes; your data is kept). Open the live site and post something every few days before Nov 18, and check it the day before the panel.
