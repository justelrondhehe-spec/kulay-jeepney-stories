# CLAUDE.md — Kulay: Jeepney Stories

## Project context

This is a group final requirement for an RVA (art/visual appreciation) class: a **Digital Interface Design Project**. The deliverables are:

1. A public link to a working web interface (GitHub Pages).
2. A PDF with a 1–2 page write-up and captioned screenshots.
3. A 10–15 minute group presentation on **November 18, 2026**.

The grading rubric (25% each):

- **Design & Creativity:** layout, color, typography, navigation. Clear use of the **elements of art** (line, color, texture, space, form/shape, perspective) and **principles of design** (balance, rhythm, emphasis, harmony, proportion).
- **Narrative & Analysis:** the interface must narrate identity or collective stories, connected to course topics (public narratives, symbolism, criticism).
- **Photo Documentation:** clear screenshots with captions explaining design choices.
- **Presentation & Collaboration.**

Required sections: Homepage, Gallery/Works, About, Contact. We add one more of our own: **Stories** (see below). It sits alongside the Gallery and does not replace it.

## What exists now

The site is "Kulay: Jeepney Stories", an 8-bit pixel-art platform (phases (a), (b), (d) and (e) are done; (c) is partly done: credit lines are built, real artwork/story files are still pending. The five group members are real: Aira Camille Banusing, Michael Adrian Dañez, Jhon Nicholson Manalang, Aaron James Jared Papa, Ryan Kristoffer Suganob, 4th year BSCS, TUP Manila. Their roles, bios and the group name are still TODO). It is a **vanilla single-page app with no build step and no dependencies**:

- `index.html` — shell with `#hud` (nav), `#app` (views), footer, modal, toast
- `style.css` — PICO-8 16-colour palette, Press Start 2P + VT323 fonts, 4px black outlines, hard drop shadows, CRT scanline overlay. The top comment block maps design choices to the elements and principles of art (keep it updated, it feeds the write-up).
- **Backend status:** Supabase phases 1–4 are built (accounts, posts + image storage, likes/comments/follows, report button + moderator Reports page at `#/reports`). `app.js` no longer uses localStorage for data. Team usernames: `aira_admin`, `michael_admin`, `nico_admin`, `aaron_admin`, `ryan_admin` (`ryan_admin` is the owner and is the only one who can add/remove moderators, via the MODS page and the `set_mod` function in `supabase.sql`). Phase (f) polish done (desktop MENU-button bug fixed, phone layout checked); deploy steps + screenshot checklist are in `DEPLOY.md`.
- **Update (Nov 2026):** all placeholder/TODO sample posts, seed users and the visible TODO notes were removed at the user's request; Stories and Gallery now show only real posts from Supabase, with friendly empty states. The About page's "The Team" is built from the live owner + moderator accounts (no roles). A **People** page (`#/people`) searches accounts by name/username. Because content is no longer seeded, put real posts in before the panel session.
- `app.js` — hash router (`#/gallery`, `#/about`, `#/u/<name>`, etc.), views (`vHome`, `vGallery`, `vAbout`, `vContact`, `vAuth`, `vProfile`, `vEdit`, `vNew`), procedural pixel art (`sprite`, `scene`, `kaleido`), `SEED_USERS` / `SEED_POSTS`, and persistence via Supabase (see Backend status).

All starter contributors and art are fictional placeholders and procedurally generated. Nothing real is posted yet.

## The new direction: "Jeepney Stories"

Retheme Kulay into **Kulay: Jeepney Stories**, a pixel-art gallery that reimagines the Philippine jeepney in digital form.

**Narrative:** a new generation of artists reimagines the jeepney as digital folk art while real jeepneys are being phased out under the PUV modernization program. The tension to express is folk art vs. digital art, preservation vs. modernization, and identity.

**Content source:** only original work by the five group members (pixel jeepney artworks and our own field-trip photos) for the Gallery, and real stories with the teller's consent for Stories. No outside art unless the creator has given permission or the work is openly licensed (CC0 / CC BY).

### The Stories tab

- **Nav order:** Home, Stories, Gallery, People, About, Contact.
- **Gallery** = our group's own pixel and digital jeepney artwork.
- **Stories** = real jeepney stories (commuters, drivers, our own commutes and families). Each story is a post with a photo or drawing, a title, a longer story text, a **route** field (e.g. "Quiapo to Cubao") and an optional **when**.
- **Reuse the existing post, comment and upload pipeline.** Add the new fields (`type: 'story'`, `route`, `when`, `story`); do not rewrite the system.
- **Contributors can be anyone, not only artists.** Use "contributor" instead of "artist" in the UI, and "SHARE A STORY" (or similar) instead of "POST ART".
- **Consent and credit:** the upload form needs the required checkbox "I made this or have permission to post it" (covering the story text too), a name choice (full name, first name only, or anonymous), and a short note asking people not to post identifiable faces or license plates without permission.
- **Panel view:** uploads only live in each visitor's own `localStorage`, so the Stories tab shown to the panel must be preloaded from seed data. Until real stories are supplied, use clearly labelled placeholder stories marked `TODO` (never invented testimonies).

**Visual language to add (keep the 8-bit base):**

- Hand-painted-style title lettering
- Nav links styled as jeepney route signboards (e.g. "RUTA: GALLERY")
- Chrome-style trim on panels and a slogan strip like those on real jeepneys
- Saturated, layered ornament with repeated patterns for rhythm

## Directive for Claude

### Working rules

1. **Read `app.js`, `style.css`, and `index.html` fully before changing anything.** Summarize the structure briefly, then propose a short plan and wait for my go-ahead before large changes.
2. **Work in small phases** and stop after each one so I can review: (a) theme and typography (done), (b) nav as route signboards, the Stories tab and route, and layout changes, (c) real content support for both tabs, with credits shown on every post, (d) About page, hero tagline and other copy, (e) upload form changes (story fields, credit, consent), (f) polish and deploy notes.
3. **No frameworks, no build tools.** It must stay a static site hosted on GitHub Pages. **Backend (approved by the user, Nov 2026): Supabase** (Auth, Postgres, Storage) called straight from `app.js` via the `supabase-js` CDN script. External resources are limited to Google Fonts and the pinned supabase-js CDN script. All content now comes from Supabase (no seed data); the site must still render (with empty states) if Supabase is unreachable. Schema + security rules live in `supabase.sql`. The Supabase anon key is public by design (row-level security protects data); never put the service_role key in the repo.
   - **Posting is open** (no approval queue). Every post has a **Report** button; reports go to a `reports` table and the 5 group members (`profiles.is_mod = true`, set manually in SQL) can see reports and remove any post.
   - Login keeps the username + password UX: usernames map to a fake email `<username>@kulay.local` (email confirmation disabled), so no real emails are collected. No password recovery.
4. **Make targeted edits.** Do not rewrite whole files to change a few things. Keep the existing code style (compact, single-file `app.js`).
5. **Keep the design comment block at the top of `style.css` accurate.** When a design choice changes, update how it maps to line, color, texture, shape/form, space, perspective, balance, rhythm, emphasis, harmony, and proportion. I will use this for the write-up.
6. **Accessibility basics:** keep contrast readable, keep `alt` text, keyboard focus states, and a responsive layout down to phone width.
7. If something is ambiguous, ask me one short question instead of guessing.

### Specific tasks

- **Real content support:** `SEED_POSTS` currently uses procedural art. Add support for seed posts (art and stories) that point to image files in `/assets/` (e.g. `{ img: 'assets/jeepney-01.png' }`) while keeping `image-rendering: pixelated` for pixel art. Because uploads only live in each visitor's own `localStorage`, **the Gallery and Stories tabs shown to the panel must come from seed data and files in the repo**, not from uploads.
- **Credits are mandatory:** every post (art or story) must display the contributor's name and a credit line, plus an optional `source` / `license` field. Update the post modal and cards to show them.
- **Upload form credit step:** add required fields (contributor name, link to original, license or "original work"), a name-visibility choice (full name / first name only / anonymous), the story fields (route, optional when, story text) for stories, a short "no identifiable faces or license plates without permission" note, and a required checkbox: "I made this or have permission to post it." (it covers the story text too). Block submission without it.
- **Replace the fictional starter artists** with placeholders for our five group members (name, short bio, role). I will supply real names, art and stories; use clearly marked `TODO` placeholders until then.
- **Rewrite About** to tell the jeepney / PUV modernization story and explain the pixel-vs-folk-art idea. Add a short, factual note that the site is a class project.
- **Update the title, meta description, footer, and logo** to Jeepney Stories. Keep the footer note that accounts and posts are saved only in the browser.
- Keep the Contact form working as a front-end demo.

### Do not

- Do not invent facts about PUV modernization, real jeepney builders, or real people. Leave a `TODO: verify` comment where a fact is needed and I will research it.
- Do not invent testimonies or stories. Placeholder stories must be clearly marked `TODO` and say they are not real.
- Do not add images or text copied from the web. Use only files I put in `/assets/` or procedural placeholders.
- Do not remove the elements/principles design comments.

## Deploy

Target is GitHub Pages from the repo root (`index.html` at the top level). Provide the exact steps when we reach the polish phase, plus a checklist of the pages I need to screenshot (Home, Stories, Gallery, a story modal, an artwork modal, About, Contact, a profile page, the upload form).
