/* KULAY: JEEPNEY STORIES — single-page app. Accounts live in Supabase; posts/comments/likes/follows are still local until phases 2–3 of the backend work. */
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- palette & procedural pixel art ---------- */
const PAL = ['#000000','#1d2b53','#7e2553','#008751','#ab5236','#5f574f','#c2c3c7','#fff1e8','#ff004d','#ffa300','#ffec27','#00e436','#29adff','#83769c','#ff77a8','#ffccaa'];
const BRIGHT = PAL.slice(8);
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hashStr = s => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const cache = {};
function mk(w, h, draw, key) {
  if (cache[key]) return cache[key];
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); draw(x, w, h);
  return cache[key] = c.toDataURL();
}
const px = (x, c, a, b, w = 1, h = 1) => { x.fillStyle = c; x.fillRect(a, b, w, h); };

function sprite(seed) { // symmetric little critter
  return mk(16, 16, (x) => {
    const r = rng(seed), body = BRIGHT[Math.floor(r() * BRIGHT.length)], acc = BRIGHT[Math.floor(r() * BRIGHT.length)];
    px(x, PAL[1 + Math.floor(r() * 2)], 0, 0, 16, 16);
    const g = Array.from({ length: 16 }, () => Array(16).fill(0));
    for (let y = 3; y < 14; y++) for (let i = 4; i < 8; i++) if (r() > .38) g[y][i] = g[y][15 - i] = r() > .75 ? 2 : 1;
    for (let y = 3; y < 14; y++) g[y][7] = g[y][8] = g[y][7] || (r() > .3 ? 1 : 0);
    for (let y = 0; y < 16; y++) for (let i = 0; i < 16; i++) if (!g[y][i]) { // outline
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy]?.[i + dx])) px(x, '#000', i, y);
    }
    for (let y = 0; y < 16; y++) for (let i = 0; i < 16; i++) if (g[y][i]) px(x, g[y][i] === 2 ? acc : body, i, y);
    px(x, '#fff1e8', 5, 6, 2, 2); px(x, '#fff1e8', 9, 6, 2, 2); px(x, '#000', 6, 7); px(x, '#000', 10, 7); // eyes
  }, 'sp' + seed);
}
function scene(seed) { // pixel landscape
  return mk(64, 40, (x, w, h) => {
    const r = rng(seed), skies = [['#1d2b53', '#7e2553', '#ff004d', '#ffa300', '#ffec27'], ['#000', '#1d2b53', '#29adff', '#83769c', '#ff77a8'], ['#1d2b53', '#29adff', '#c2c3c7', '#fff1e8', '#ffccaa']];
    const sk = skies[Math.floor(r() * skies.length)];
    for (let i = 0; i < 5; i++) px(x, sk[i], 0, i * 6, w, 7);
    for (let i = 0; i < 18; i++) px(x, '#fff1e8', Math.floor(r() * w), Math.floor(r() * 12));
    const cx = 10 + r() * 44, cy = 12 + r() * 8, R = 6 + r() * 3; // sun/moon
    for (let y = -R; y <= R; y++) for (let i = -R; i <= R; i++) if (i * i + y * y <= R * R) px(x, '#ffec27', Math.round(cx + i), Math.round(cy + y));
    const cols = [['#7e2553'], ['#1d2b53'], ['#008751'], ['#000']];
    cols.forEach((c, l) => { const base = 22 + l * 5, a1 = .15 + r() * .2, p1 = r() * 6, a2 = .5 + r();
      for (let i = 0; i < w; i++) { const t = base - Math.round(Math.sin(i * a1 + p1) * 4 * a2 + Math.sin(i * .5 + l) * 2); px(x, c[0], i, t, 1, h - t); } });
    for (let i = 0; i < 6; i++) { const tx = Math.floor(r() * w), ty = 30 + Math.floor(r() * 6); px(x, '#00e436', tx, ty, 1, 1); px(x, '#00e436', tx - 1, ty + 1, 3, 1); px(x, '#ab5236', tx, ty + 2, 1, 2); }
  }, 'sc' + seed);
}
function kaleido(seed) { // 4-fold symmetric tile
  return mk(32, 32, (x) => {
    const r = rng(seed), n = 3 + Math.floor(r() * 3), cs = Array.from({ length: n }, () => PAL[1 + Math.floor(r() * 15)]);
    for (let y = 0; y < 16; y++) for (let i = 0; i < 16; i++) {
      const v = Math.floor(((Math.sin(i * .6 + seed) + Math.cos(y * .5) + r()) / 3 + 1) * n) % n, c = cs[v];
      px(x, c, i, y); px(x, c, 31 - i, y); px(x, c, i, 31 - y); px(x, c, 31 - i, 31 - y);
    }
  }, 'ka' + seed);
}
const artOf = (kind, seed) => kind === 'scene' ? scene(seed) : kind === 'kaleido' ? kaleido(seed) : sprite(seed);

/* ---------- categories. All content (accounts, stories, artworks) comes from Supabase; nothing is pre-filled. ---------- */
const STORY_CATS = ['Commuter', 'Driver', 'Passerby'];
const CATS = ['Pixel jeepney', 'Digital painting', 'Sketch', 'Field-trip photo', 'Other'];
const SOCIAL = { instagram: ['IG', '#ff77a8', 'https://instagram.com/'], x: ['X', '#c2c3c7', 'https://x.com/'], facebook: ['FB', '#29adff', 'https://facebook.com/'], tiktok: ['TT', '#00e436', 'https://tiktok.com/@'], youtube: ['YT', '#ff004d', 'https://youtube.com/@'], behance: ['BE', '#29adff', 'https://behance.net/'], artstation: ['AS', '#ffa300', 'https://artstation.com/'], website: ['WEB', '#ffec27', ''] };
function linkURL(k, v) {
  v = (v || '').trim(); if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  if (k === 'website') return 'https://' + v;
  return SOCIAL[k][2] + encodeURIComponent(v.replace(/^@/, ''));
}

/* ---------- storage ---------- */
let DB = { users: {}, posts: [], likes: {}, follows: {}, comments: {}, reports: [], msgs: [], session: null }; // everything here is loaded from Supabase by initBackend()
try { localStorage.removeItem('kulay8'); } catch { } // clear data saved by the old browser-only demo

/* ---------- Supabase backend ----------
   The key below is the PUBLIC publishable key (safe in the repo): row-level security in supabase.sql protects the data.
   Never put the secret / service_role key here. Usernames map to a fake email, so no real emails are collected and none are sent. */
const SB_URL = 'https://uaknooiqnhtsxgsejtyc.supabase.co', SB_KEY = 'sb_publishable_mg0Dkc12aiuogkoKvDxPMg_rf94Av0y', MAIL = '@kulay-jeepney.com';
let sb = null; try { sb = window.supabase.createClient(SB_URL, SB_KEY); } catch { }
const toUser = r => ({ id: r.id, name: r.name, bio: r.bio, links: r.links || {}, av: r.av, bn: r.bn, mod: r.is_mod, owner: !!r.is_owner, avatar: r.avatar_url || '' });
async function loadUsers() { const { data, error } = await sb.from('profiles').select('*'); if (error) throw error; DB.users = {}; data.forEach(r => DB.users[r.username] = toUser(r)); }
async function loadSession() { const { data } = await sb.auth.getSession(), id = data.session?.user.id; DB.session = null; for (const [k, v] of Object.entries(DB.users)) if (id && v.id === id) DB.session = k; }
const pubURL = path => sb.storage.from('posts').getPublicUrl(path).data.publicUrl;
async function loadPosts() { // database rows -> the same post shape the views already use
  const { data, error } = await sb.from('posts').select('*').order('created_at', { ascending: false }); if (error) throw error;
  const un = {}; for (const [k, v] of Object.entries(DB.users)) un[v.id] = k;
  DB.posts = data.filter(r => un[r.user_id]).map(r => ({ id: r.id, user: un[r.user_id], type: r.type, title: r.title, cat: r.cat, caption: r.caption, route: r.route, when: r.when, story: r.story, img: r.img_url, by: r.by, nameMode: r.name_mode, license: r.license, source: r.source, ts: Date.parse(r.created_at), base: 0 }));
}
async function loadSocial() { // likes, follows, comments -> same shapes the views already use, keyed by username
  const un = {}; for (const [k, v] of Object.entries(DB.users)) un[v.id] = k;
  const [l, f, c] = await Promise.all([sb.from('likes').select('*'), sb.from('follows').select('*'), sb.from('comments').select('*').order('created_at')]);
  if (l.error || f.error || c.error) throw l.error || f.error || c.error;
  DB.likes = {}; l.data.forEach(r => { const u = un[r.user_id]; if (u) (DB.likes[u] ||= []).push(r.post_id); });
  DB.follows = {}; f.data.forEach(r => { const a = un[r.follower], b = un[r.followed]; if (a && b) (DB.follows[a] ||= []).push(b); });
  DB.comments = {}; c.data.forEach(r => { const u = un[r.user_id]; if (u) (DB.comments[r.post_id] ||= []).push({ id: r.id, u, t: r.text }); });
}
async function loadReports() { // only the 5 moderators can read reports (row-level security); everyone else just gets an empty list
  DB.reports = []; if (!me()?.mod) return;
  const { data, error } = await sb.from('reports').select('*').order('created_at'); if (error) throw error;
  const un = {}; for (const [k, v] of Object.entries(DB.users)) un[v.id] = k;
  DB.reports = data.map(r => ({ id: r.id, post: r.post_id, u: un[r.user_id] || '?', why: r.reason, ts: Date.parse(r.created_at) }));
}
async function loadMessages() { // messages sent to me (row-level security: only the recipient can read them)
  DB.msgs = []; if (!me()?.mod) return;
  const { data, error } = await sb.from('messages').select('*').order('created_at', { ascending: false }); if (error) throw error;
  const un = {}; for (const [k, v] of Object.entries(DB.users)) un[v.id] = k;
  DB.msgs = data.map(r => ({ id: r.id, from: un[r.from_user] || '', body: r.body, read: r.is_read, ts: Date.parse(r.created_at) }));
}
const refresh = async () => { await loadUsers(); await loadSession(); await loadPosts(); await loadSocial(); await loadReports(); await loadMessages(); };
async function initBackend() { if (!sb) return toast('COULD NOT REACH THE SERVER'); try { await refresh(); } catch { toast('COULD NOT REACH THE SERVER'); } render(); }

/* seed team entries keep their role/team flag; a real profile with the same username fills in the rest */
const users = () => Object.fromEntries(Object.entries(DB.users).map(([k, v]) => [k, { ...v, username: k }]));
const getUser = u => users()[u];
const posts = () => DB.posts;
const isStory = p => p.type === 'story';
/* credit: who made it, shown per the contributor's choice (full name / first name only / anonymous) */
const creditName = p => { const n = p.by || getUser(p.user)?.name || p.user; return p.nameMode === 'anon' ? 'Anonymous' : p.nameMode === 'first' ? (n.split(/\s+/)[0] || n) : n; };
const safeURL = u => /^https?:\/\//i.test(u || '') ? u : '';
const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
const me = () => DB.session ? getUser(DB.session) : null;
const likeCount = p => Object.values(DB.likes).filter(l => l.includes(p.id)).length;
const iLiked = p => !!DB.session && (DB.likes[DB.session] || []).includes(p.id);
const followers = u => Object.values(DB.follows).filter(f => f.includes(u)).length;
const imgOf = p => p.img || artOf(p.kind, p.seed);
const avOf = u => u.avatar || sprite(u.av ?? hashStr(u.username)); // uploaded photo if there is one, else the pixel avatar
const bnOf = u => scene(u.bn ?? hashStr(u.username) + 1);
function stats(u) {
  const ps = posts().filter(p => p.user === u.username), likes = ps.reduce((a, p) => a + likeCount(p), 0), fl = followers(u.username);
  const xp = ps.length * 50 + likes * 2 + fl * 10, lvl = Math.floor(Math.sqrt(xp / 20)) + 1, cur = (lvl - 1) ** 2 * 20, nxt = lvl ** 2 * 20;
  return { ps, likes, fl, xp, lvl, pct: Math.min(100, Math.round((xp - cur) / (nxt - cur) * 100)), nxt };
}

/* ---------- ui helpers ---------- */
let toastT; function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }
const go = h => { location.hash = h; };
function card(p) {
  const anon = p.nameMode === 'anon', u = getUser(p.user) || { username: p.user, name: p.user }, cn = creditName(p);
  return `<article class="card" tabindex="0" data-act="open" data-id="${esc(p.id)}"><div class="im"><img src="${imgOf(p)}" alt="${esc(p.title)} by ${esc(cn)}" loading="lazy"></div>
  <div class="meta"><h3>${esc(p.title)}</h3>${isStory(p) ? `<div class="rt">▶ ${esc(p.route || '')}</div>` : ''}<div class="row"><div class="by"><img src="${anon ? sprite(0) : avOf(u)}" alt=""><span><b class="cn">${esc(cn)}</b><small class="cr">${esc(p.license || '')}</small></span></div>
  <button class="heart ${iLiked(p) ? 'on' : ''}" data-act="like" data-id="${esc(p.id)}" aria-label="Like">♥ <span>${likeCount(p)}</span></button></div></div></article>`;
}

const strip = (l, msg) => l.length ? `<div class="grid">${l.map(card).join('')}</div>` : `<p class="empty px">${msg}</p>`; // a row of cards, or a friendly empty message

/* ---------- header ---------- */
function hud(route) {
  const u = me(), L = (h, t, k) => `<a class="nl ${route === k ? 'on' : ''}" href="#${h}"${route === k ? ' aria-current="page"' : ''}><small>RUTA</small>${t}</a>`; // route signboard
  $('#hud').innerHTML = `<nav><a class="logo" href="#/" aria-label="Kulay: Jeepney Stories, home"><i></i><b>KULAY<small>JEEPNEY STORIES</small></b></a><button class="btn sm ghost burger" data-act="menu" aria-label="Menu" aria-expanded="false">MENU</button>
  <div class="menu" id="menu"><div class="routes">${L('/', 'HOME', 'home')}${L('/stories', 'STORIES', 'stories')}${L('/gallery', 'GALLERY', 'gallery')}${L('/people', 'PEOPLE', 'people')}${L('/play', 'PLAY', 'play')}${L('/about', 'ABOUT', 'about')}${L('/contact', 'CONTACT', 'contact')}</div><div class="acct">
  ${u ? `<a class="btn sm pink" href="#/new/story">+ SHARE A STORY</a>${u.owner ? '<a class="btn sm ghost" href="#/mods">MODS</a>' : ''}${u.mod ? `<a class="btn sm blue" href="#/reports">REPORTS${new Set(DB.reports.map(r => r.post)).size ? ' (' + new Set(DB.reports.map(r => r.post)).size + ')' : ''}</a>` : ''}${u.mod ? `<a class="btn sm blue" href="#/inbox">INBOX${DB.msgs.filter(m => !m.read).length ? ' (' + DB.msgs.filter(m => !m.read).length + ')' : ''}</a>` : ''}<a class="me" href="#/u/${esc(u.username)}"><img src="${avOf(u)}" alt=""><div>${esc(u.username)}<small>LV ${stats(u).lvl}</small></div></a><button class="btn sm ghost" data-act="logout">LOGOUT</button>`
      : `<a class="btn sm ghost" href="#/login">LOGIN</a><a class="btn sm" href="#/signup">SIGN UP</a>`}</div></div></nav>`;
}

/* ---------- views ---------- */
function vHome() {
  const top = posts().filter(p => !isStory(p)).sort((a, b) => likeCount(b) - likeCount(a)).slice(0, 6), latest = posts().filter(isStory).sort((a, b) => b.ts - a.ts).slice(0, 4);
  const total = posts().filter(p => !isStory(p)).length, ns = posts().filter(isStory).length, uc = Object.keys(users()).length;
  return `<section class="hero wrap"><p class="px dim" style="font-size:.6rem">★ A PIXEL ART PROJECT ABOUT THE JEEPNEY ★</p>
  <h1>KU<em>LAY</em><span class="sub">JEEPNEY STORIES</span></h1><p class="lead">Jeepney stories and pixel art: folk art on the road, kept in memory.</p>
  <div class="sprites">${[11, 23, 37, 49, 61, 73].map(s => `<img src="${sprite(s)}" alt="">`).join('')}</div>
  <p class="press blink">▶ PRESS START ◀</p>
  <div class="btns"><a class="btn" href="#/stories">READ THE STORIES</a><a class="btn blue" href="#/gallery">SEE THE GALLERY</a></div>
  <div class="stats"><div class="stat"><b>${ns}</b>STORIES</div><div class="stat"><b>${total}</b>ARTWORKS</div><div class="stat"><b>${uc}</b>CONTRIBUTORS</div></div></section>
  <section class="wrap"><div class="title"><h2>STORIES FROM THE ROUTE</h2><a class="btn sm" href="#/stories">ALL STORIES</a></div>${strip(latest, 'NO STORIES YET. BE THE FIRST TO SHARE ONE!')}</section>
  <section class="wrap"><div class="title"><h2>FROM THE GALLERY</h2><a class="btn sm" href="#/gallery">SEE GALLERY</a></div>${strip(top, 'NO ARTWORK YET. BE THE FIRST TO ADD ONE!')}</section>
  <section class="wrap"><div class="title"><h2>WHAT THIS IS ABOUT</h2></div><div class="three">
  <div class="panel feat"><div class="ic">🎨</div><h3>FOLK ART</h3><p>Painted lettering, chrome trim and route signs make a jeepney a moving artwork.</p></div>
  <div class="panel feat"><div class="ic">📖</div><h3>SHARED MEMORY</h3><p>Commuters, drivers and families tell the stories of the routes they know.</p></div>
  <div class="panel feat"><div class="ic">🧭</div><h3>WHAT IS CHANGING</h3><p>Jeepneys are being phased out under the PUV modernization program. What do we want to keep?</p></div></div></section>
  <section class="wrap"><div class="cta"><h2>GOT A JEEPNEY STORY?</h2><p style="margin-bottom:20px">Share a story, a commute or an artwork. You choose how your name appears: full name, first name only, or anonymous.</p><a class="btn" href="#${me() ? '/new/story' : '/signup'}">${me() ? 'SHARE A STORY' : 'CREATE ACCOUNT'}</a></div></section>`;
}

/* Gallery and Stories share one list view; G.kind is 'gallery' or 'stories' */
let G = { kind: 'gallery', cat: 'All', q: '', sort: 'top' };
function vList(kind) {
  const st = kind === 'stories';
  return `<section class="wrap"><div class="title"><h2>${st ? 'STORIES' : 'GALLERY'}</h2>${me() ? `<a class="btn sm pink" href="#/new/${st ? 'story' : 'art'}">${st ? '+ SHARE A STORY' : '+ ADD ARTWORK'}</a>` : ''}</div>
  <p class="intro">${st ? 'Stories from the route: commuters, drivers, and our own commutes and families.' : 'Pixel and digital jeepney artwork made by our group. Every piece is credited to its maker.'}</p>
  <div class="tools" id="chips">${['All', ...(st ? STORY_CATS : CATS)].map(c => `<button class="chip ${G.cat === c ? 'on' : ''}" data-act="cat" data-c="${c}">${c.toUpperCase()}</button>`).join('')}
  <button class="chip ${G.sort === 'top' ? 'on' : ''}" data-act="sort" data-s="top">♥ TOP</button><button class="chip ${G.sort === 'new' ? 'on' : ''}" data-act="sort" data-s="new">★ NEW</button></div>
  <div class="fld"><input id="q" type="search" placeholder="${st ? 'SEARCH STORIES OR ROUTES...' : 'SEARCH ART OR CONTRIBUTOR...'}" value="${esc(G.q)}" aria-label="Search"></div><div id="gl"></div></section>`;
}
function drawList() {
  let l = posts().filter(p => isStory(p) === (G.kind === 'stories') && (G.cat === 'All' || p.cat === G.cat) && (p.title + creditName(p) + (p.route || '')).toLowerCase().includes(G.q.toLowerCase()));
  l.sort((a, b) => G.sort === 'top' ? likeCount(b) - likeCount(a) : b.ts - a.ts);
  const st = G.kind === 'stories'; $('#gl').innerHTML = strip(l, posts().some(p => isStory(p) === st) ? 'NOTHING FOUND' : st ? 'NO STORIES YET. BE THE FIRST TO SHARE ONE!' : 'NO ARTWORK YET. BE THE FIRST TO ADD ONE!');
}

/* People: search accounts by name or username, then open a profile to see what they shared */
let PQ = '';
function vPeople() {
  return `<section class="wrap"><div class="title"><h2>PEOPLE</h2></div><p class="intro">Find a contributor by name or username and see what they have shared.</p>
  <div class="fld"><input id="pq" type="search" placeholder="SEARCH BY NAME OR USERNAME..." value="${esc(PQ)}" aria-label="Search people" autocomplete="off"></div><div id="pl"></div></section>`;
}
function drawPeople() {
  const q = PQ.toLowerCase().trim(), n = u => posts().filter(p => p.user === u && p.nameMode !== 'anon').length; // anonymous posts are not counted publicly
  const l = Object.values(users()).filter(u => !q || u.username.includes(q) || (u.name || '').toLowerCase().includes(q)).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  $('#pl').innerHTML = l.length ? `<div class="board">${l.map(u => `<div class="rank" tabindex="0" data-act="profile" data-u="${esc(u.username)}"><img src="${avOf(u)}" alt=""><div class="nm"><b>${esc(u.name)}</b><span class="dim">@${esc(u.username)} · ${n(u.username)} POST${n(u.username) === 1 ? '' : 'S'}${u.owner ? ' · OWNER' : u.mod ? ' · MODERATOR' : ''}</span></div></div>`).join('')}</div>` : `<p class="empty px">${Object.keys(DB.users).length ? 'NO ONE FOUND' : 'NO ACCOUNTS YET'}</p>`;
}

function vAbout() {
  /* TODO: verify: no facts about the PUV modernization program are stated here on purpose. Add verified facts + sources once researched. */
  const team = Object.values(users()).filter(u => u.owner || u.mod).sort((a, b) => (b.owner - a.owner) || a.name.localeCompare(b.name)); // owner first, then moderators
  return `<section class="wrap"><div class="title"><h2>ABOUT</h2></div>
  <p class="intro">Kulay: Jeepney Stories is a class project for our RVA (art appreciation) course, made as a Digital Interface Design Project by 4th year BSCS students of TUP Manila. It is not a real company or service.</p>
  <div class="panel" style="margin-bottom:28px"><h3 class="y" style="margin-bottom:14px">THE JEEPNEY AS FOLK ART</h3><p>A jeepney is a vehicle, but it is also a canvas. Its painted body, bold lettering, chrome trim and route signboard are folk art that moves through public life, with a different story on every route.</p><p>It is also a shared space: strangers ride side by side in the same small room, and the trip belongs to everyone on board.</p></div>
  <div class="panel" style="margin-bottom:28px"><h3 class="p" style="margin-bottom:14px">WHAT IS CHANGING</h3><p>Jeepneys are being phased out under the PUV modernization program. For many people that raises a real question: what happens to the folk art, the routes and the shared memories that come with them? Modernization and preservation pull in different directions, and this project sits in that tension.</p></div>
  <div class="panel" style="margin-bottom:28px"><h3 class="b" style="margin-bottom:14px">FOLK ART MEETS DIGITAL ART</h3><p>We redraw the jeepney as pixel art. Pixels are small repeated blocks, much like the repeated stripes, panels and lettering on a painted jeepney, so the digital medium echoes the folk one.</p><p>The question we explore is whether a digital folk art can help keep a fading public symbol in memory, and what is lost or gained when it moves from the street to the screen.</p><p>The site borrows jeepney details too: painted-sign lettering, route-signboard navigation, chrome trim and a red, yellow and blue stripe band.</p></div>
  <div class="title" style="margin-top:40px"><h2>TWO WAYS TO TELL IT</h2></div>
  <div class="two"><div class="panel feat"><h3>STORIES</h3><p>Real jeepney stories from commuters, drivers, and our own families and commutes. Anyone can contribute, not only artists.</p><div class="btns"><a class="btn sm" href="#/stories">READ STORIES</a></div></div>
  <div class="panel feat"><h3>GALLERY</h3><p>Pixel and digital jeepney artwork made by our group.</p><div class="btns"><a class="btn sm" href="#/gallery">SEE ARTWORK</a></div></div></div>
  <div class="title" style="margin-top:40px"><h2>OUR RULES</h2></div>
  <div class="panel"><ul class="rules"><li>Everything is credited: every post shows who made it.</li><li>We post only what we made or have permission to post.</li><li>Please do not post identifiable faces or license plates without permission.</li><li>This is a class project: accounts and posts are stored online and posts are public. Do not share anything private.</li><li>What we store: your username, display name and anything you add to your profile or posts. We never ask for a real email address.</li></ul></div>
  <div class="title" style="margin-top:40px"><h2>THE TEAM</h2></div>
  <p class="intro">The owner and moderators look after this site. They can remove posts that break the rules above.</p>
  <div class="board">${team.map(u => `<div class="rank" tabindex="0" data-act="profile" data-u="${esc(u.username)}"><img src="${avOf(u)}" alt=""><div class="nm"><b>${esc(u.name)}</b><span class="dim">@${esc(u.username)} · ${u.owner ? 'OWNER' : 'MODERATOR'}</span></div></div>`).join('') || '<p class="empty px">LOADING...</p>'}</div></section>`;
}

function vContact() {
  if (!me()) return needLogin();
  const to = Object.entries(DB.users).filter(([k, v]) => (v.mod || v.owner) && k !== DB.session).sort(([, x], [, y]) => (y.owner - x.owner) || x.name.localeCompare(y.name));
  return `<section class="wrap"><div class="title"><h2>CONTACT</h2></div><p class="intro">Choose who you want to write to. Only that person can read your message, and they will see your username.</p><div class="form panel"><form id="cf" novalidate>
  <div class="fld"><label for="cto">SEND TO</label><select id="cto">${to.map(([k, v]) => `<option value="${esc(k)}">${esc(v.name)} (@${esc(k)}) · ${v.owner ? 'OWNER' : 'MODERATOR'}</option>`).join('') || '<option value="">No one is available yet</option>'}</select></div>
  <div class="fld"><label for="cm">MESSAGE</label><textarea id="cm" rows="6" maxlength="1000"></textarea><div class="help">10 to 1000 characters.</div><div class="err" id="e3" role="alert"></div></div><button class="btn" type="submit">SEND MESSAGE</button></form>
  <div id="cok" style="display:none"><p class="g">✔ MESSAGE SENT! Salamat!</p><div class="btns"><button class="btn sm ghost" data-act="again">WRITE ANOTHER</button></div></div></div></section>`;
}
/* inbox: messages sent to the owner or a moderator from the Contact page */
function vInbox() {
  if (!me()?.mod) return `<section class="wrap"><p class="empty px">MODERATORS ONLY</p></section>`;
  const rows = DB.msgs.map(m => `<div class="panel msg ${m.read ? '' : 'new'}"><div style="flex:1;min-width:0"><p class="y">${m.from ? `<a href="#/u/${esc(m.from)}">@${esc(m.from)}</a>` : 'Deleted account'}${m.read ? '' : ' · NEW'}</p><span class="dim">${esc(new Date(m.ts).toLocaleString())}</span><p>${esc(m.body)}</p></div>
    <div class="rk">${m.read ? '' : `<button class="btn sm" data-act="mread" data-id="${esc(m.id)}">MARK READ</button>`}<button class="btn sm red" data-act="mdel" data-id="${esc(m.id)}">DELETE</button></div></div>`).join('');
  return `<section class="wrap"><div class="title"><h2>INBOX</h2></div><p class="intro">Messages sent to you from the Contact page. Only you can see them.</p>${rows || '<p class="empty px">NO MESSAGES</p>'}</section>`;
}

/* PLAY page: jeepney match-up (memory game). Eight 8x8 pixel icons drawn from the jeepney, two of each. Best score is kept only in this browser. */
const ICONS = [['SIGNBOARD', ['kkkkkkkk', 'kyyyyyyk', 'kykyykyk', 'kyyyyyyk', 'kkkkkkkk', '...gg...', '...gg...', '..gggg..']],
  ['WHEEL', ['..kkkk..', '.kggggk.', 'kggkkggk', 'kgkwwkgk', 'kgkwwkgk', 'kggkkggk', '.kggggk.', '..kkkk..']],
  ['HEADLIGHT', ['........', '..kkkk..', '.kyyyyk.', 'kywwwwyk', 'kywwwwyk', '.kyyyyk.', '..kkkk..', '........']],
  ['CHROME STAR', ['...yy...', '...yy...', 'yyyyyyyy', '.yyyyyy.', '..yyyy..', '.yyyyyy.', '.yy..yy.', 'yy....yy']],
  ['STRIPES', ['rrrrrrrr', 'rrrrrrrr', 'yyyyyyyy', 'yyyyyyyy', 'bbbbbbbb', 'bbbbbbbb', 'rrrrrrrr', 'rrrrrrrr']],
  ['WINDOW', ['kkkkkkkk', 'kbbbbwbk', 'kbbbwbbk', 'kbbwbbbk', 'kbbbbbbk', 'kbbbbbbk', 'kkkkkkkk', '........']],
  ['COIN', ['..kkkk..', '.kyyyyk.', 'kyyooyyk', 'kyoyyyyk', 'kyoyyyyk', 'kyyooyyk', '.kyyyyk.', '..kkkk..']],
  ['JEEPNEY', ['........', '.kkkkkk.', 'kyyyyyyk', 'kybyybyk', 'kyyyyyyk', 'krrrrrrk', '.kwkkwk.', '..k..k..']]];
const ICOLOR = { k: '#000', r: '#ff004d', y: '#ffec27', b: '#29adff', w: '#fff1e8', g: '#83769c', o: '#ffa300' };
const iconURL = rows => { const c = document.createElement('canvas'); c.width = c.height = 8; const x = c.getContext('2d'); rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ICOLOR[ch]) { x.fillStyle = ICOLOR[ch]; x.fillRect(i, j, 1, 1); } })); return c.toDataURL('image/png'); };
let ICONURLS = null, GM = null;
const bestMoves = () => { try { return +localStorage.getItem('kulay-best') || 0; } catch { return 0; } };
function newGame() { const d = [...ICONS.keys(), ...ICONS.keys()]; for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; } GM = { deck: d, up: [], done: new Set(), moves: 0, lock: false, msg: 'FIND THE PAIRS' }; }
function gameBoard() {
  ICONURLS ||= ICONS.map(i => iconURL(i[1]));
  return GM.deck.map((k, i) => { const open = GM.up.includes(i) || GM.done.has(i);
    return `<button class="mc ${GM.done.has(i) ? 'done' : GM.up.includes(i) ? 'up' : ''}" data-act="flip" data-i="${i}" ${open ? 'disabled' : ''} aria-label="${open ? ICONS[k][0] : 'Card ' + (i + 1) + ', face down'}">${open ? `<img src="${ICONURLS[k]}" alt="">` : ''}</button>`; }).join('');
}
function gameStat() { const b = bestMoves(); return GM.done.size === 16 ? `<p class="g px">★ YOU MATCHED THEM ALL IN ${GM.moves} MOVES ★</p><div class="btns" style="justify-content:center"><button class="btn" data-act="newgame">PLAY AGAIN</button></div>` : `<p class="y px">${esc(GM.msg)}</p><p class="dim">MOVES: ${GM.moves}${b ? ' · BEST: ' + b : ''}</p>`; }
function paintGame() { if ($('#gboard')) { $('#gboard').innerHTML = gameBoard(); $('#gstat').innerHTML = gameStat(); } }
function flipCard(i) {
  const g = GM; if (!g || g.lock || g.up.includes(i) || g.done.has(i)) return; g.up.push(i);
  if (g.up.length === 2) { g.moves++; const [a, b] = g.up;
    if (g.deck[a] === g.deck[b]) { g.msg = 'MATCH: ' + ICONS[g.deck[a]][0]; g.done.add(a); g.done.add(b); g.up = [];
      if (g.done.size === 16) { const best = bestMoves(); if (!best || g.moves < best) try { localStorage.setItem('kulay-best', g.moves); } catch { } } }
    else { g.msg = 'NOT A MATCH'; g.lock = true; setTimeout(() => { g.up = []; g.lock = false; paintGame(); }, 900); } }
  paintGame();
}
function vPlay() {
  newGame();
  return `<section class="wrap"><div class="title"><h2>PLAY</h2></div><p class="intro">JEEPNEY MATCH-UP: flip two cards at a time and find the matching pairs. Every icon is a part of the jeepney's look.</p>
  <div class="gstat" id="gstat">${gameStat()}</div><div class="mg" id="gboard">${gameBoard()}</div></section>`;
}

function vAuth(mode) {
  const s = mode === 'signup';
  return `<section class="wrap"><div class="title"><h2>${s ? 'CREATE ACCOUNT' : 'LOGIN'}</h2></div><div class="form panel"><form id="af" novalidate>
  ${s ? '<div class="fld"><label for="an">DISPLAY NAME</label><input id="an" maxlength="30" autocomplete="name"></div>' : ''}
  <div class="fld"><label for="au">USERNAME</label><input id="au" maxlength="16" autocomplete="username" autocapitalize="none">${s ? '<div class="help">3–16 letters, numbers or _</div>' : ''}</div>
  <div class="fld"><label for="ap">PASSWORD</label><input id="ap" type="password" autocomplete="${s ? 'new-password' : 'current-password'}">${s ? '<div class="help">At least 6 characters. Please do not reuse a password from another site.</div>' : ''}</div>
  <div class="err" id="ae" role="alert"></div>${s ? '<p class="help" style="margin-bottom:16px">Profiles and posts are public. We store your username, display name and anything you add to your profile or posts. Please do not share private information.</p>' : ''}<button class="btn" type="submit">${s ? 'CREATE ACCOUNT' : 'LOGIN'}</button></form>
  <p style="margin-top:22px" class="dim">${s ? 'Already have an account?' : 'New here?'} <a class="y" href="#/${s ? 'login' : 'signup'}">${s ? 'Login' : 'Create an account'}</a></p></div></section>`;
}

function vProfile(name) {
  const u = getUser(name);
  if (!u) return `<section class="wrap"><p class="empty px">PROFILE NOT FOUND</p></section>`;
  const s = stats(u), mine = DB.session === u.username, f = !!DB.session && (DB.follows[DB.session] || []).includes(u.username);
  const vis = s.ps.filter(p => p.nameMode !== 'anon' || mine); // anonymous posts stay off public profiles
  const ln = Object.entries(u.links || {}).map(([k, v]) => [k, linkURL(k, v)]).filter(([, v]) => v);
  const badges = [['FIRST POST', s.ps.length >= 1], ['3 POSTS', s.ps.length >= 3], ['10 HEARTS', s.likes >= 10], ['100 HEARTS', s.likes >= 100], ['LINKED UP', ln.length >= 2], ['LV 3', s.lvl >= 3]];
  return `<section class="wrap"><div class="banner"><img src="${bnOf(u)}" alt=""></div>
  <div class="phead"><img class="av" src="${avOf(u)}" alt="${esc(u.name)} avatar"><div class="info"><h1>${esc(u.name)}</h1><span class="dim">@${esc(u.username)}</span> <span class="lv">LV ${s.lvl}</span>
  <div class="xp" title="XP"><i style="width:${s.pct}%"></i></div><div class="xpl">${s.xp} / ${s.nxt} XP</div></div>
  <div>${mine ? '<a class="btn sm" href="#/edit">EDIT PROFILE</a>' : `<button class="btn sm ${f ? 'ghost' : 'pink'}" data-act="follow" data-u="${esc(u.username)}">${f ? '✔ FOLLOWING' : '+ FOLLOW'}</button>`}</div></div>
  <div class="pgrid"><aside class="panel"><p class="bio">${esc(u.bio) || '<span class="dim">No bio yet.</span>'}</p>
  <div class="pst"><div><b>${vis.length}</b><span>POSTS</span></div><div><b>${s.likes}</b><span>HEARTS</span></div><div><b>${s.fl}</b><span>FOLLOWERS</span></div></div>
  <h4 class="y" style="margin-bottom:12px">FIND ME ON</h4><div class="links">${ln.length ? ln.map(([k, v]) => `<a class="link" href="${esc(v)}" target="_blank" rel="noopener noreferrer"><i style="background:${SOCIAL[k][1]}">${SOCIAL[k][0]}</i>${esc(k === 'website' ? v.replace(/^https?:\/\//, '') : (u.links[k] || '').replace(/^https?:\/\/[^/]+\/@?/, '@').replace(/^@@/, '@'))}</a>`).join('') : `<span class="dim">${mine ? 'Add links in Edit Profile!' : 'No links yet.'}</span>`}</div>
  <h4 class="y" style="margin-bottom:12px">BADGES</h4><div class="badges">${badges.map(([n, on]) => `<span class="badge ${on ? '' : 'off'}">${n}</span>`).join('')}</div></aside>
  <div><div class="title"><h2>POSTS</h2>${mine ? '<a class="btn sm pink" href="#/new/story">+ SHARE</a>' : ''}</div>
  ${vis.length ? `<div class="grid">${vis.sort((a, b) => b.ts - a.ts).map(card).join('')}</div>` : `<p class="empty px">NO POSTS YET${mine ? '<br><br><a class="btn" href="#/new/story">SHARE YOUR FIRST POST</a>' : ''}</p>`}</div></div></section>`;
}

let EP = null; // edit-profile draft
function vEdit() {
  const u = me(); if (!u) return needLogin();
  EP = EP || { av: u.av ?? hashStr(u.username), bn: u.bn ?? hashStr(u.username) + 1, url: u.avatar || '', photo: null, useSprite: false }; // photo = new upload (data URL), useSprite = drop the photo
  return `<section class="wrap"><div class="title"><h2>EDIT PROFILE</h2></div><div class="form panel"><form id="pf" novalidate>
  <div class="fld"><label>AVATAR &amp; BANNER</label><div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><img id="pa" src="${EP.photo || (!EP.useSprite && EP.url) || sprite(EP.av)}" style="width:96px;height:96px;border:4px solid #000" alt="Your current avatar">
  <img id="pb" src="${scene(EP.bn)}" style="width:192px;height:120px;border:4px solid #000;object-fit:cover" alt=""></div>
  <div class="btns" style="margin:16px 0 0"><button type="button" class="btn sm blue" data-act="rav">🎲 PIXEL AVATAR</button><button type="button" class="btn sm blue" data-act="rbn">🎲 NEW BANNER</button></div></div>
  <div class="fld"><label for="pphoto">OR UPLOAD YOUR OWN PICTURE</label><input id="pphoto" type="file" accept="image/*"><div class="help">Optional. It is cropped to a square. Do not use a picture of someone else without permission. "Pixel avatar" switches back to a pixel picture.</div></div>
  <div class="fld"><label for="pn">DISPLAY NAME</label><input id="pn" maxlength="30" value="${esc(u.name)}"></div>
  <div class="fld"><label for="pbio">BIO</label><textarea id="pbio" rows="3" maxlength="160">${esc(u.bio || '')}</textarea><div class="help">Max 160 characters</div></div>
  <h4 class="y" style="margin:24px 0 8px">SOCIAL LINKS</h4><p class="help" style="margin-bottom:14px">Type your username or paste the full link. Leave blank to hide.</p>
  <div class="socials">${Object.keys(SOCIAL).map(k => `<div class="fld"><label for="s-${k}">${k.toUpperCase()}</label><input id="s-${k}" value="${esc((u.links || {})[k] || '')}" placeholder="${k === 'website' ? 'yoursite.com' : '@username'}"></div>`).join('')}</div>
  <div class="btns"><button class="btn" type="submit">SAVE</button><a class="btn ghost" href="#/u/${esc(u.username)}">CANCEL</a></div></form></div></section>`;
}
/* moderator page: reported posts, most-reported first. Moderators see the poster's real username even for anonymous posts. */
function vReports() {
  if (!me()?.mod) return `<section class="wrap"><p class="empty px">MODERATORS ONLY</p></section>`;
  const by = {}; DB.reports.forEach(r => (by[r.post] ||= []).push(r));
  const rows = Object.keys(by).sort((a, b) => by[b].length - by[a].length).map(id => {
    const p = DB.posts.find(x => x.id === id); if (!p) return '';
    return `<div class="panel rep"><img class="rth" src="${imgOf(p)}" alt="${esc(p.title)}"><div><h3>${esc(p.title)}</h3><p class="dim">Posted by @${esc(p.user)} · ${isStory(p) ? 'Story' : 'Artwork'}</p>
    <p class="y">${by[id].length} REPORT${by[id].length > 1 ? 'S' : ''}</p><ul class="rules">${by[id].map(r => `<li><b>@${esc(r.u)}</b>: ${esc(r.why)}</li>`).join('')}</ul>
    <div class="btns"><button class="btn sm" data-act="open" data-id="${esc(id)}">OPEN POST</button><button class="btn sm red" data-act="del" data-id="${esc(id)}">REMOVE POST</button><button class="btn sm ghost" data-act="dismiss" data-id="${esc(id)}">DISMISS REPORTS</button></div></div></div>`;
  }).join('');
  return `<section class="wrap"><div class="title"><h2>REPORTS</h2></div><p class="intro">Posts reported by visitors. Open a post to review it, then remove it or dismiss the reports.</p>${rows || '<p class="empty px">NO REPORTS</p>'}</section>`;
}
/* owner-only page: add or remove moderators. The database enforces this too (set_mod checks is_owner). */
function vMods() {
  if (!me()?.owner) return `<section class="wrap"><p class="empty px">OWNER ONLY</p></section>`;
  const rows = Object.entries(DB.users).filter(([, v]) => !v.owner).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `<div class="rank"><img src="${avOf({ ...v, username: k })}" alt=""><div class="nm"><b>${esc(v.name)}</b><span class="dim">@${esc(k)}${v.mod ? ' · MODERATOR' : ''}</span></div><div class="rk"><button class="btn sm ${v.mod ? 'red' : ''}" data-act="setmod" data-u="${esc(k)}" data-v="${v.mod ? '0' : '1'}">${v.mod ? 'REMOVE MOD' : 'MAKE MOD'}</button><button class="btn sm red" data-act="delacct" data-u="${esc(k)}">DELETE ACCOUNT</button></div></div>`).join('');
  return `<section class="wrap"><div class="title"><h2>MODERATORS</h2></div><p class="intro">Only you, the owner, can add or remove moderators and delete accounts. Deleting an account permanently removes everything that person posted.</p><div class="board">${rows || '<p class="empty px">NO OTHER ACCOUNTS YET</p>'}</div></section>`;
}
const needLogin = () => `<section class="wrap"><div class="panel" style="text-align:center"><h2 style="margin-bottom:20px">LOGIN REQUIRED</h2><p>Please log in to continue.</p><div class="btns" style="justify-content:center"><a class="btn" href="#/login">LOGIN</a><a class="btn pink" href="#/signup">SIGN UP</a></div></div></section>`;

/* new post: one form for stories and artworks. Same pipeline, extra fields for stories, credit + consent for both. */
let NP = { mode: 'draw', n: 32, img: null, type: 'story', f: {} }; // f = saved form values so switching tabs keeps typing
let ED = null;
const LICENSES = ['Original work', 'Shared with permission', 'CC0', 'CC BY'];
function vNew(t) {
  if (!me()) return needLogin();
  if (t === 'art' || t === 'story') NP.type = t;
  const st = NP.type === 'story', f = NP.f, v = (k, d = '') => esc(f[k] ?? d), opt = (k, list, d) => list.map(o => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}"${(f[k] ?? d) === val ? ' selected' : ''}>${esc(lab)}</option>`; }).join('');
  return `<section class="wrap"><div class="title"><h2>${st ? 'SHARE A STORY' : 'ADD ARTWORK'}</h2></div>
  <div class="tabs"><a class="chip ${st ? 'on' : ''}" href="#/new/story">📖 STORY</a><a class="chip ${st ? '' : 'on'}" href="#/new/art">🎨 ARTWORK</a></div>
  <p class="intro">${st ? 'Tell a jeepney story from a commute, a driver, or your family. Add a photo or drawing to go with it.' : 'Add a pixel or digital jeepney artwork that you made.'}</p>
  <h3 class="y" style="margin-bottom:12px">1. PICTURE</h3>
  <div class="tabs"><button class="chip ${NP.mode === 'draw' ? 'on' : ''}" data-act="mode" data-m="draw">🎨 DRAW PIXEL ART</button><button class="chip ${NP.mode === 'up' ? 'on' : ''}" data-act="mode" data-m="up">📁 UPLOAD ${st ? 'PHOTO / DRAWING' : 'IMAGE'}</button></div>
  <div class="panel">${NP.mode === 'draw' ? `<div class="edit"><div><canvas id="cv" aria-label="Pixel drawing canvas"></canvas></div><div>
   <div class="tool"><button class="btn sm" data-act="tool" data-t="pen" id="t-pen">✏ PEN</button><button class="btn sm ghost" data-act="tool" data-t="erase" id="t-erase">⌫ ERASE</button><button class="btn sm ghost" data-act="tool" data-t="fill" id="t-fill">🪣 FILL</button></div>
   <div class="pal" id="pal">${PAL.map((c, i) => `<button style="background:${c}" data-act="color" data-c="${c}" aria-label="Color ${c}" class="${i === 8 ? 'on' : ''}"></button>`).join('')}</div>
   <div class="hexrow"><input type="color" id="cp" value="#ff004d" aria-label="Pick any colour"><input type="text" id="hx" value="#ff004d" maxlength="7" spellcheck="false" aria-label="Hex colour code, for example #ff8800"><span class="help">ANY COLOUR</span></div>
   <div class="tool"><button class="btn sm ghost" data-act="undo">↶ UNDO</button><button class="btn sm red" data-act="clear">CLEAR</button>
   <select id="gs" aria-label="Grid size" style="width:auto;font-size:1.2rem;padding:8px"><option value="16">16×16</option><option value="32" selected>32×32</option><option value="48">48×48</option><option value="64">64×64</option></select></div>
   <p class="help">Tip: use FILL to change the background colour.</p></div></div>`
      : `<div class="fld"><label for="fi">CHOOSE AN IMAGE</label><input id="fi" type="file" accept="image/*"><div class="help">PNG, JPG or GIF. Large images are shrunk to fit.</div>${NP.img ? `<img class="pv" src="${NP.img}" alt="Preview of your upload">` : ''}</div>`}
  <div class="notice">⚠ Please do not post identifiable faces or license plates without permission. Crop or blur them first.</div></div>
  <div class="panel" style="margin-top:28px"><form id="npf" novalidate><h3 class="y" style="margin-bottom:16px">2. DETAILS</h3>
  <div class="two"><div class="fld"><label for="nt">TITLE *</label><input id="nt" maxlength="60" value="${v('nt')}"></div>
  <div class="fld"><label for="nc">${st ? 'WHO IS TELLING IT' : 'CATEGORY'}</label><select id="nc">${opt('nc', st ? STORY_CATS : CATS, st ? STORY_CATS[0] : CATS[0])}</select></div></div>
  ${st ? `<div class="two"><div class="fld"><label for="nr">ROUTE *</label><input id="nr" maxlength="60" placeholder="e.g. Quiapo to Cubao" value="${v('nr')}"><div class="help">Where did the jeepney go?</div></div>
  <div class="fld"><label for="nw">WHEN (OPTIONAL)</label><input id="nw" maxlength="40" placeholder="e.g. every morning, last year" value="${v('nw')}"></div></div>
  <div class="fld"><label for="ns">YOUR STORY *</label><textarea id="ns" rows="7" maxlength="2000">${v('ns')}</textarea><div class="help">In your own words. Up to 2000 characters.</div></div>`
      : `<div class="fld"><label for="nd">CAPTION (OPTIONAL)</label><textarea id="nd" rows="2" maxlength="200">${v('nd')}</textarea></div>`}
  <h3 class="y" style="margin:24px 0 16px">3. CREDIT &amp; CONSENT</h3>
  <div class="two"><div class="fld"><label for="nb">CONTRIBUTOR NAME *</label><input id="nb" maxlength="60" value="${v('nb', me().name)}"><div class="help">Who made this${st ? ' or told this story' : ''}?</div></div>
  <div class="fld"><label for="nm">SHOW MY NAME AS</label><select id="nm">${opt('nm', [['full', 'Full name'], ['first', 'First name only'], ['anon', 'Anonymous']], 'full')}</select><div class="help">Anonymous posts show no name or profile link on the site.</div></div></div>
  <div class="two"><div class="fld"><label for="nl">LICENSE *</label><select id="nl">${opt('nl', LICENSES, 'Original work')}</select></div>
  <div class="fld"><label for="nk">LINK TO ORIGINAL</label><input id="nk" placeholder="https://..." value="${v('nk')}"><div class="help">Required unless the license is "Original work".</div></div></div>
  <div class="chk"><input type="checkbox" id="nok"${f.nok ? ' checked' : ''}><label for="nok">I made this or have permission to post it${st ? ', including the story text' : ''}.</label></div>
  <div class="err" id="ne" role="alert"></div><button class="btn pink" type="submit">${st ? 'SHARE STORY ▶' : 'ADD ARTWORK ▶'}</button></form></div></section>`;
}
function initEditor() {
  const cv = $('#cv'); if (!cv) return;
  const N = NP.n; ED = ED && ED.n === N ? ED : { n: N, g: Array.from({ length: N * N }, () => '#fff1e8'), color: '#ff004d', tool: 'pen', hist: [] };
  const cell = Math.floor(512 / N); cv.width = cv.height = N * cell; const x = cv.getContext('2d');
  const draw = () => { ED.g.forEach((c, i) => { x.fillStyle = c; x.fillRect((i % N) * cell, Math.floor(i / N) * cell, cell, cell); }); };
  draw(); setTool(ED.tool); $('#gs').value = N;
  const pos = e => { const r = cv.getBoundingClientRect(); return [Math.min(N - 1, Math.max(0, Math.floor((e.clientX - r.left) / r.width * N))), Math.min(N - 1, Math.max(0, Math.floor((e.clientY - r.top) / r.height * N)))]; };
  const put = (a, b) => { const c = ED.tool === 'erase' ? '#fff1e8' : ED.color, i = b * N + a; if (ED.g[i] !== c) { ED.g[i] = c; x.fillStyle = c; x.fillRect(a * cell, b * cell, cell, cell); } };
  const flood = (a, b) => { const t = ED.g[b * N + a], c = ED.color; if (t === c) return; const st = [[a, b]]; while (st.length) { const [i, j] = st.pop(); if (i < 0 || j < 0 || i >= N || j >= N || ED.g[j * N + i] !== t) continue; ED.g[j * N + i] = c; st.push([i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]); } draw(); };
  let down = false;
  cv.onpointerdown = e => { e.preventDefault(); cv.setPointerCapture(e.pointerId); ED.hist.push(ED.g.slice()); if (ED.hist.length > 40) ED.hist.shift(); const [a, b] = pos(e); if (ED.tool === 'fill') flood(a, b); else { down = true; put(a, b); } };
  cv.onpointermove = e => { if (down) { const [a, b] = pos(e); put(a, b); } };
  cv.onpointerup = cv.onpointercancel = () => { down = false; };
  ED.redraw = draw;
  const cp = $('#cp'), hx = $('#hx'); cp.value = ED.color; hx.value = ED.color;
  const own = c => { ED.color = c; if (ED.tool === 'erase') setTool('pen'); document.querySelectorAll('#pal button').forEach(b => b.classList.toggle('on', b.dataset.c === c)); };
  cp.oninput = () => { hx.value = cp.value; own(cp.value); };
  hx.oninput = () => { let s = hx.value.trim().replace(/^#?/, '#'); if (/^#[0-9a-f]{3}$/i.test(s)) s = '#' + [...s.slice(1)].map(ch => ch + ch).join(''); hx.classList.toggle('bad', !/^#[0-9a-f]{6}$/i.test(s)); if (/^#[0-9a-f]{6}$/i.test(s)) { s = s.toLowerCase(); cp.value = s; own(s); } };
}
function setTool(t) { if (!ED) return; ED.tool = t; ['pen', 'erase', 'fill'].forEach(k => { const b = $('#t-' + k); if (b) b.className = 'btn sm ' + (k === t ? '' : 'ghost'); }); }
function editorPNG() {
  const N = ED.n, s = Math.max(1, Math.floor(512 / N)), c = document.createElement('canvas'); c.width = c.height = N * s; const x = c.getContext('2d');
  ED.g.forEach((col, i) => { x.fillStyle = col; x.fillRect((i % N) * s, Math.floor(i / N) * s, s, s); }); return c.toDataURL('image/png');
}
function squarePhoto(file, N = 192) { // profile picture: centre-crop to a square, N x N
  return new Promise((res, rej) => { const fr = new FileReader(); fr.onerror = rej; fr.onload = () => { const im = new Image(); im.onerror = rej; im.onload = () => {
    const s = Math.min(im.width, im.height), c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
    x.drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, N, N); res(c.toDataURL('image/jpeg', .85)); }; im.src = fr.result; }; fr.readAsDataURL(file); });
}
function shrink(file) {
  return new Promise((res, rej) => { const fr = new FileReader(); fr.onerror = rej; fr.onload = () => { const im = new Image(); im.onerror = rej; im.onload = () => {
    const m = 720, k = Math.min(1, m / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
    const x = c.getContext('2d'); x.imageSmoothingEnabled = k >= 1 ? false : true; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', .82)); }; im.src = fr.result; }; fr.readAsDataURL(file); });
}

/* post modal */
function openPost(id) {
  const p = posts().find(x => x.id === id); if (!p) return; const u = getUser(p.user) || { username: p.user, name: p.user }, cm = DB.comments[id] || [], mine = DB.session === p.user || !!me()?.mod, anon = p.nameMode === 'anon', cn = creditName(p), src = safeURL(p.source);
  $('#modal').innerHTML = `<div class="mbox"><div class="big"><img src="${imgOf(p)}" alt="${esc(p.title)}"></div><div class="side"><button class="btn sm ghost x" data-act="close">✕ CLOSE</button>
  <span class="tag">${esc(p.cat)}</span><h2>${esc(p.title)}</h2>${isStory(p) ? `<div class="rt">▶ ${esc(p.route || '')}${p.when ? ' · ' + esc(p.when) : ''}</div>` : ''}
  ${anon ? `<div class="by"><img src="${sprite(0)}" alt=""><span>${esc(cn)}</span></div>` : `<div class="by" style="cursor:pointer" data-act="profile" data-u="${esc(u.username)}"><img src="${avOf(u)}" alt=""><span>${esc(cn)} <span class="dim">@${esc(u.username)}</span></span></div>`}
  <p class="storytxt">${esc(p.story || p.caption)}</p>
  <div class="credit"><h4>CREDIT</h4><p>${isStory(p) ? 'Story' : 'Artwork'} by <b>${esc(cn)}</b></p>${p.license ? `<p>License: ${esc(p.license)}</p>` : ''}${src ? `<p>Original: <a href="${esc(src)}" target="_blank" rel="noopener noreferrer">${esc(host(src))}</a></p>` : ''}</div><div><button class="btn sm ${iLiked(p) ? 'red' : 'ghost'}" data-act="like" data-id="${esc(p.id)}">♥ <span>${likeCount(p)}</span></button> ${mine ? `<button class="btn sm red" data-act="del" data-id="${esc(p.id)}">${DB.session === p.user ? 'DELETE' : 'REMOVE (MOD)'}</button>` : ''}${DB.session !== p.user ? `<button class="btn sm ghost" data-act="rep" data-id="${esc(id)}">⚑ REPORT</button>` : ''}</div><div id="repbox"></div>
  <h4 class="y">COMMENTS (${cm.length})</h4><div class="cmts" id="cmts">${cm.length ? cm.map(c => `<div><b data-act="profile" data-u="${esc(c.u)}">@${esc(c.u)}</b> ${esc(c.t)}${c.id && (c.u === DB.session || me()?.mod) ? ` <button class="cx" data-act="delc" data-id="${esc(id)}" data-c="${esc(c.id)}" aria-label="Delete comment">✕</button>` : ''}</div>`).join('') : '<span class="dim">Be the first to comment!</span>'}</div>
  ${DB.session ? `<form class="cf" id="cmf" data-id="${esc(id)}"><input maxlength="120" placeholder="Say something nice..." aria-label="Comment"><button class="btn sm">SEND</button></form>` : '<p class="dim"><a class="y" href="#/login">Login</a> to like and comment.</p>'}</div></div>`;
  $('#modal').classList.add('open');
}
const closeModal = () => $('#modal').classList.remove('open');
function paintLike(id) { // refresh every heart for this post (cards, modal, header level) without re-rendering the page
  const p = posts().find(x => x.id === id); if (!p) return;
  document.querySelectorAll(`[data-act=like][data-id="${CSS.escape(id)}"]`).forEach(b => { b.classList.toggle('on', iLiked(p)); b.querySelector('span').textContent = likeCount(p); if (b.closest('.side')) b.className = 'btn sm ' + (iLiked(p) ? 'red' : 'ghost'); }); hud(location.hash.split('/')[1] || 'home');
}

/* ---------- router ---------- */
function render() {
  closeModal(); const h = location.hash.slice(1) || '/', [, r, a] = h.split('/'); let route = r || 'home', html;
  if ((route === 'gallery' || route === 'stories') && G.kind !== route) G = { kind: route, cat: 'All', q: '', sort: 'top' }; // reset filters when switching tabs
  if (r === 'u') { route = 'u'; html = vProfile(decodeURIComponent(a || '')); }
  else html = ({ home: vHome, gallery: () => vList('gallery'), stories: () => vList('stories'), about: vAbout, contact: vContact, login: () => vAuth('login'), signup: () => vAuth('signup'), edit: vEdit, people: vPeople, reports: vReports, mods: vMods, inbox: vInbox, play: vPlay, new: () => vNew(a) })[route]?.() ?? vHome();
  if (route !== 'edit') EP = null;
  hud(route); $('#app').innerHTML = html; window.scrollTo(0, 0);
  if (route === 'gallery' || route === 'stories') drawList(); if (route === 'people') drawPeople(); if (route === 'new') initEditor();
  if (route === 'inbox' && me()?.mod) loadMessages().then(() => { if (location.hash === '#/inbox') { $('#app').innerHTML = vInbox(); hud('inbox'); } }).catch(() => { }); // pick up new messages when the page opens
  if (route === 'reports' && me()?.mod && !render.busy) { render.busy = true; loadReports().then(() => { if (location.hash === '#/reports') { $('#app').innerHTML = vReports(); hud('reports'); } }).catch(() => { }).finally(() => { render.busy = false; }); } // pick up new reports when the page opens
}
window.addEventListener('hashchange', render);

/* ---------- events ---------- */
document.addEventListener('click', async e => {
  const t = e.target.closest('[data-act]'); if (e.target.id === 'modal') return closeModal(); if (!t) return;
  const a = t.dataset.act, d = t.dataset;
  if (a === 'menu') t.setAttribute('aria-expanded', $('#menu').classList.toggle('open'));
  else if (a === 'logout') { try { await sb?.auth.signOut(); } catch { } DB.session = null; toast('LOGGED OUT'); go('/'); render(); }
  else if (a === 'like') { e.stopPropagation(); if (!DB.session) { toast('LOGIN TO LIKE'); return; }
    const l = DB.likes[DB.session] ||= [], on = !l.includes(d.id), toggle = () => { const i = l.indexOf(d.id); i >= 0 ? l.splice(i, 1) : l.push(d.id); paintLike(d.id); }, row = { post_id: d.id, user_id: DB.users[DB.session].id };
    toggle(); const { error } = on ? await sb.from('likes').insert(row) : await sb.from('likes').delete().match(row); if (error) { toggle(); toast('COULD NOT SAVE. TRY AGAIN'); } }
  else if (a === 'flip') flipCard(+d.i);
  else if (a === 'newgame') { newGame(); paintGame(); }
  else if (a === 'again') render();
  else if (a === 'mread') { const { error } = await sb.from('messages').update({ is_read: true }).eq('id', d.id); if (error) return toast('COULD NOT SAVE'); DB.msgs.find(m => m.id === d.id).read = true; $('#app').innerHTML = vInbox(); hud('inbox'); }
  else if (a === 'mdel') { if (!confirm('Delete this message?')) return; const { error } = await sb.from('messages').delete().eq('id', d.id); if (error) return toast('COULD NOT DELETE'); DB.msgs = DB.msgs.filter(m => m.id !== d.id); $('#app').innerHTML = vInbox(); hud('inbox'); }
  else if (a === 'open') openPost(d.id);
  else if (a === 'close') closeModal();
  else if (a === 'profile') { go('/u/' + d.u); closeModal(); }
  else if (a === 'follow') { if (!DB.session) return toast('LOGIN TO FOLLOW'); const tg = DB.users[d.u]; if (!tg) return toast('ACCOUNT NOT FOUND');
    const f = DB.follows[DB.session] ||= [], on = !f.includes(d.u), toggle = () => { const i = f.indexOf(d.u); i >= 0 ? f.splice(i, 1) : f.push(d.u); render(); }, row = { follower: DB.users[DB.session].id, followed: tg.id };
    toggle(); const { error } = on ? await sb.from('follows').insert(row) : await sb.from('follows').delete().match(row); if (error) { toggle(); toast('COULD NOT SAVE. TRY AGAIN'); } }
  else if (a === 'delc') { const { error } = await sb.from('comments').delete().eq('id', d.c); if (error) return toast('COULD NOT DELETE'); DB.comments[d.id] = (DB.comments[d.id] || []).filter(c => c.id !== d.c); openPost(d.id); }
  else if (a === 'cat') { G.cat = d.c; render(); } else if (a === 'sort') { G.sort = d.s; render(); }
  else if (a === 'del') { const p = DB.posts.find(x => x.id === d.id); if (p && confirm('Delete this post?')) {
    const { error } = await sb.from('posts').delete().eq('id', d.id); if (error) return toast('COULD NOT DELETE');
    const f = (p.img || '').split('/object/public/posts/')[1]; if (f) sb.storage.from('posts').remove([decodeURIComponent(f)]);
    DB.posts = DB.posts.filter(x => x.id !== d.id); DB.reports = DB.reports.filter(r => r.post !== d.id); closeModal(); render(); toast('POST DELETED'); } }
  else if (a === 'setmod') { const on = d.v === '1', { error } = await sb.rpc('set_mod', { target: d.u, make: on }); if (error) return toast('COULD NOT CHANGE'); DB.users[d.u].mod = on; $('#app').innerHTML = vMods(); toast(on ? 'MODERATOR ADDED' : 'MODERATOR REMOVED'); }
  else if (a === 'delacct') { const tg = DB.users[d.u]; if (!tg || !confirm(`Permanently delete @${d.u} and everything they posted (stories, artwork, comments)? This cannot be undone.`)) return;
    try {
      const { data: files } = await sb.storage.from('posts').list(tg.id, { limit: 1000 }); if (files?.length) await sb.storage.from('posts').remove(files.map(f => tg.id + '/' + f.name)); // their uploaded images
      const { error } = await sb.rpc('delete_account', { target: d.u }); if (error) throw error;
      await refresh(); $('#app').innerHTML = vMods(); hud('mods'); toast('ACCOUNT DELETED');
    } catch { toast('COULD NOT DELETE ACCOUNT'); } }
  else if (a === 'dismiss') { const { error } = await sb.from('reports').delete().eq('post_id', d.id); if (error) return toast('COULD NOT DISMISS'); DB.reports = DB.reports.filter(r => r.post !== d.id); render(); toast('REPORTS DISMISSED'); }
  else if (a === 'rep') { if (!DB.session) return toast('LOGIN TO REPORT');
    $('#repbox').innerHTML = `<form id="rpf" class="rpf" data-id="${esc(d.id)}"><label for="rr">WHY ARE YOU REPORTING THIS?</label><select id="rr"><option>Posted without permission</option><option>Shows an identifiable face or license plate</option><option>Inappropriate or offensive</option><option>Other</option></select><input id="rn" maxlength="150" placeholder="Optional note" aria-label="Optional note"><div class="btns"><button class="btn sm red" type="submit">SEND REPORT</button></div></form>`; $('#rr').focus(); }
  else if (a === 'rav') { EP.av = Math.floor(Math.random() * 1e6); EP.photo = null; EP.useSprite = true; $('#pa').src = sprite(EP.av); }
  else if (a === 'rbn') { EP.bn = Math.floor(Math.random() * 1e6); $('#pb').src = scene(EP.bn); }
  else if (a === 'mode') { NP.mode = d.m; ED = ED; render(); }
  else if (a === 'tool') setTool(d.t);
  else if (a === 'color') { ED.color = d.c; $('#cp').value = d.c; $('#hx').value = d.c; if (ED.tool === 'erase') setTool('pen'); document.querySelectorAll('#pal button').forEach(b => b.classList.toggle('on', b === t)); }
  else if (a === 'undo') { if (ED.hist.length) { ED.g = ED.hist.pop(); ED.redraw(); } }
  else if (a === 'clear') { if (confirm('Clear the canvas?')) { ED.hist.push(ED.g.slice()); ED.g = ED.g.map(() => '#fff1e8'); ED.redraw(); } }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.card,.rank')) { e.preventDefault(); e.target.click(); } // keyboard access for cards
});
document.addEventListener('input', e => {
  if (e.target.id === 'q') { G.q = e.target.value; drawList(); }
  if (e.target.id === 'pq') { PQ = e.target.value; drawPeople(); }
  if (e.target.closest('#npf')) NP.f[e.target.id] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; // keep the form when switching picture tabs
});
document.addEventListener('change', async e => {
  if (e.target.id === 'gs') { NP.n = +e.target.value; ED = null; initEditor(); }
  if (e.target.id === 'pphoto' && e.target.files[0] && EP) { try { EP.photo = await squarePhoto(e.target.files[0]); EP.useSprite = false; $('#pa').src = EP.photo; } catch { toast('COULD NOT READ IMAGE'); } }
  if (e.target.id === 'fi' && e.target.files[0]) { try { NP.img = await shrink(e.target.files[0]); render(); } catch { toast('COULD NOT READ IMAGE'); } }
});
document.addEventListener('submit', async e => {
  e.preventDefault(); const id = e.target.id;
  if (id === 'af') {
    const signup = location.hash.includes('signup'), un = $('#au').value.trim().toLowerCase(), pw = $('#ap').value, er = $('#ae'), btn = e.target.querySelector('button'); er.textContent = '';
    if (!sb) return er.textContent = 'Cannot reach the server. Check your connection and refresh the page.';
    if (!/^[a-z0-9_]{3,16}$/.test(un)) return er.textContent = 'Username must be 3–16 letters, numbers or _';
    if (signup && pw.length < 6) return er.textContent = 'Password needs at least 6 characters.';
    btn.disabled = true;
    try {
      if (signup) {
        const nm = $('#an').value.trim(), ex = await sb.from('profiles').select('id').eq('username', un).maybeSingle();
        if (ex.error) throw ex.error; if (ex.data) return er.textContent = 'That username is taken.';
        let r = await sb.auth.signUp({ email: un + MAIL, password: pw });
        if (r.error && /registered/i.test(r.error.message)) r = await sb.auth.signInWithPassword({ email: un + MAIL, password: pw }); // leftover from an interrupted signup
        if (r.error) return er.textContent = /invalid login/i.test(r.error.message) ? 'That username is taken.' : r.error.message;
        if (!r.data.session) return er.textContent = 'Email confirmation is still ON in Supabase. Turn it off (Authentication > Sign In / Providers > Email).';
        const pr = await sb.from('profiles').insert({ id: r.data.user.id, username: un, name: nm || un, av: hashStr(un) % 1e6, bn: (hashStr(un) + 1) % 1e6 });
        if (pr.error) { await sb.auth.signOut(); return er.textContent = /duplicate|unique/i.test(pr.error.message) ? 'That username is taken.' : pr.error.message; }
        await refresh(); toast('WELCOME!'); go('/edit');
      } else {
        const r = await sb.auth.signInWithPassword({ email: un + MAIL, password: pw });
        if (r.error) return er.textContent = /invalid login/i.test(r.error.message) ? 'Wrong username or password.' : r.error.message;
        await refresh(); toast('WELCOME BACK!'); go('/u/' + un);
      }
    } catch { er.textContent = 'Something went wrong. Check your connection and try again.'; }
    finally { btn.disabled = false; }
  } else if (id === 'cf') {
    const er = $('#e3'), to = DB.users[$('#cto').value], body = $('#cm').value.trim(), btn = e.target.querySelector('button[type=submit]'); er.textContent = '';
    if (!DB.session) return er.textContent = 'Please log in first.';
    if (!to) return er.textContent = 'Choose who to write to.';
    if (body.length < 10) return er.textContent = 'At least 10 characters.';
    btn.disabled = true; const { error } = await sb.from('messages').insert({ from_user: DB.users[DB.session].id, to_user: to.id, body }); btn.disabled = false;
    if (error) return er.textContent = 'Could not send. Check your connection and try again.';
    e.target.style.display = 'none'; $('#cok').style.display = 'block';
  } else if (id === 'pf') {
    const u = DB.users[DB.session], row = { name: $('#pn').value.trim() || u.name, bio: $('#pbio').value.trim(), av: EP.av, bn: EP.bn, links: {} };
    Object.keys(SOCIAL).forEach(k => { const v = $('#s-' + k).value.trim(); if (v) row.links[k] = v; });
    const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true;
    const old = u.avatar || ''; let path;
    try {
      if (EP.photo) { const blob = await (await fetch(EP.photo)).blob(); path = u.id + '/avatar-' + Date.now() + '.jpg'; const up = await sb.storage.from('posts').upload(path, blob, { contentType: 'image/jpeg' }); if (up.error) throw up.error; row.avatar_url = pubURL(path); }
      else if (EP.useSprite && old) row.avatar_url = null;
      const { error } = await sb.from('profiles').update(row).eq('id', u.id); if (error) throw error;
    } catch { if (path) sb.storage.from('posts').remove([path]); btn.disabled = false; return toast('COULD NOT SAVE. TRY AGAIN'); }
    if ('avatar_url' in row && old) { const f = old.split('/object/public/posts/')[1]; if (f) sb.storage.from('posts').remove([decodeURIComponent(f)]); } // delete the replaced picture
    const { avatar_url, ...rest } = row; Object.assign(u, rest); if ('avatar_url' in row) u.avatar = avatar_url || ''; EP = null; toast('PROFILE SAVED!'); go('/u/' + DB.session);
  } else if (id === 'npf') {
    const v = k => (document.getElementById(k)?.value || '').trim(), st = NP.type === 'story', er = $('#ne');
    const fail = m => { er.textContent = m; er.scrollIntoView({ block: 'center' }); };
    if (!v('nt')) return fail('Give it a title.');
    if (st) { if (!v('nr')) return fail('Add the route (for example: Quiapo to Cubao).'); if (v('ns').length < 20) return fail('Write your story (at least 20 characters).'); }
    let img; if (NP.mode === 'draw') { if (!ED || new Set(ED.g).size < 2) return fail('Draw something first, or switch to UPLOAD.'); img = editorPNG(); } else { img = NP.img; if (!img) return fail('Choose a photo or drawing to upload.'); }
    if (!v('nb')) return fail('Enter the name of the person who made this or told this story.');
    const lic = v('nl'); let src = v('nk'); if (src && !/^https?:\/\//i.test(src)) src = 'https://' + src;
    if (src && !/^https?:\/\/[^\s.\/]+\.[^\s]+$/i.test(src)) return fail('The link to the original does not look like a web address.');
    if (lic !== 'Original work' && !src) return fail('Add a link to the original, or choose "Original work" if you made it.');
    if (!$('#nok').checked) return fail('Please tick the box to confirm you made this or have permission to post it.');
    const btn = e.target.querySelector('button[type=submit]'), u = DB.users[DB.session]; let path; btn.disabled = true; er.textContent = 'Uploading...';
    try {
      const blob = await (await fetch(img)).blob(); path = u.id + '/' + Date.now() + (blob.type === 'image/png' ? '.png' : '.jpg');
      const up = await sb.storage.from('posts').upload(path, blob, { contentType: blob.type }); if (up.error) throw up.error;
      const ins = await sb.from('posts').insert({ user_id: u.id, type: NP.type, title: v('nt'), cat: v('nc'), route: st ? v('nr') : '', when: st ? v('nw') : '', story: st ? v('ns') : '', caption: st ? '' : v('nd'), img_url: pubURL(path), by: v('nb'), name_mode: v('nm'), license: lic, source: src }); if (ins.error) throw ins.error;
    } catch { if (path) sb.storage.from('posts').remove([path]); btn.disabled = false; return fail('Could not upload. Check your connection and try again. Images must be under 2 MB.'); }
    try { await loadPosts(); } catch { }
    NP.img = null; NP.f = {}; ED = null; toast(st ? 'STORY SHARED!' : 'ARTWORK ADDED!'); go('/u/' + DB.session);
  } else if (id === 'rpf') {
    const note = $('#rn').value.trim(), box = $('#repbox'), { error } = await sb.from('reports').insert({ post_id: e.target.dataset.id, user_id: DB.users[DB.session].id, reason: ($('#rr').value + (note ? ': ' + note : '')).slice(0, 300) });
    box.innerHTML = error ? `<p class="dim">${/duplicate|unique/i.test(error.message) ? 'You already reported this post.' : 'Could not send the report. Try again.'}</p>` : '<p class="g">✔ REPORT SENT. A group member will review it.</p>';
  } else if (id === 'cmf') {
    const i = e.target.querySelector('input'), t = i.value.trim(), pid = e.target.dataset.id; if (!t) return;
    const { data, error } = await sb.from('comments').insert({ post_id: pid, user_id: DB.users[DB.session].id, text: t }).select().single(); if (error) return toast('COULD NOT POST COMMENT');
    (DB.comments[pid] ||= []).push({ id: data.id, u: DB.session, t: data.text }); openPost(pid);
  }
});
/* ---------- background: an original pixel-art street scene (warm dusk, shopfronts, power lines, a jeepney), drawn in code at 192x108 and scaled up.
   It is inspired by a colour reference from the group, not copied from it. A dark veil keeps the text readable. ---------- */
function drawCity() {
  const W = 192, H = 108, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const R = (col, X, Y, w, h) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };
  ['#ffccaa', '#ffb98f', '#ffa670', '#ff9262', '#ee7c5c', '#cf6560', '#a8506a'].forEach((col, i) => R(col, 0, i * 8, W, 8)); // sky bands
  const far = [[0, 30, 26, '#2f5f66'], [26, 22, 30, '#3b7a78'], [56, 34, 22, '#2f5f66'], [78, 26, 34, '#3b7a78'], [112, 36, 24, '#2f5f66'], [136, 24, 32, '#3b7a78'], [168, 32, 24, '#2f5f66']]; // far buildings: x, height, width, colour
  far.forEach(([bx, h, w, col]) => { const top = 78 - h; R('#ab5236', bx - 1, top - 4, w + 2, 4); R('#7e2553', bx - 1, top - 1, w + 2, 1); R(col, bx, top, w, h);
    for (let wy = top + 4; wy < 72; wy += 8) for (let wx = bx + 3; wx < bx + w - 4; wx += 7) R((wx * 7 + wy * 3) % 5 === 0 ? '#ffec27' : '#1d2b53', wx, wy, 3, 4); });
  R('#2f7d6f', 0, 44, 62, 36); R('#1d2b53', 0, 44, 62, 2); // near shop, left
  ['#ff004d', '#ffec27', '#29adff'].forEach((col, i) => { for (let k = 0; k < 62; k += 6) R(k % 12 === 0 ? col : '#fff1e8', k, 52 + i * 3, 6, 3); }); // striped awning (the trim colours)
  R('#1d2b53', 6, 64, 20, 16); R('#ffec27', 8, 66, 16, 12); R('#1d2b53', 36, 62, 18, 18); R('#29adff', 38, 64, 14, 10);
  R('#c2c3c7', 0, 80, W, 4); R('#83769c', 0, 84, W, 1); R('#5f574f', 0, 85, W, 23); // pavement and road
  for (let k = 4; k < W; k += 24) R('#c2c3c7', k, 98, 12, 1); // lane dashes
  R('#008751', 104, 52, 3, 28); R('#fff1e8', 102, 46, 7, 6); R('#c2c3c7', 102, 52, 7, 1); R('#ff004d', 109, 56, 5, 3); // lamp post, globe, small red sign
  x.fillStyle = '#000'; [[0, 14, 70, 20], [70, 20, 192, 12], [0, 24, 96, 30], [96, 30, 192, 20]].forEach(([x0, y0, x1, y1]) => { for (let k = x0; k < x1; k++) x.fillRect(k, Math.round(y0 + (y1 - y0) * (k - x0) / (x1 - x0) + Math.sin((k - x0) / (x1 - x0) * Math.PI) * 4), 1, 1); }); // power lines
  R('#000', 86, 8, 2, 72); R('#000', 80, 12, 14, 1); R('#000', 80, 18, 14, 1); // pole
  const J = 118, T = 62; // jeepney, front facing left
  R('#000', J - 1, T + 4, 56, 21); R('#fff1e8', J, T + 5, 54, 14); R('#ff004d', J + 6, T, 14, 3); R('#ffec27', J + 20, T, 14, 3); R('#29adff', J + 34, T, 14, 3); R('#fff1e8', J + 4, T + 3, 48, 3); // body and striped roof
  R('#29adff', J + 4, T + 7, 8, 6); for (let k = 0; k < 4; k++) R('#29adff', J + 16 + k * 9, T + 7, 7, 6); R('#ffa300', J + 2, T + 15, 52, 3); R('#c2c3c7', J, T + 12, 3, 6); R('#ffec27', J, T + 10, 2, 2); // windows, orange stripe, grille, headlight
  [J + 8, J + 40].forEach(wx => { R('#000', wx, T + 17, 11, 11); R('#5f574f', wx + 3, T + 20, 5, 5); R('#c2c3c7', wx + 4, T + 21, 3, 3); }); // wheels
  return c.toDataURL('image/png');
}
try { const bg = $('.stars'); bg.classList.add('city'); bg.style.backgroundImage = 'linear-gradient(rgba(13,15,36,.7),rgba(13,15,36,.7)),url(' + drawCity() + ')'; } catch { } // if this fails the old starry background stays

render(); initBackend();
