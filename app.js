import { config } from './config.js';
import * as L from './logic.js';
import { ico, QUEST_ICONS, ITEMS, ITEMBY, PRICE, RARITY_NAME, SLOT_NAME, SKIN, HAIRC, TOPC, HAIRS, PRESETS, avatarSvg } from './avatar.js';

const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const S = { joining: false, view: 'loading', user: null, profile: null, data: null, tab: '', cat: 'today', authMode: 'in', startMode: 'choose', err: '', form: null, ov: null, sheet: false, confirm: null, dirty: false, prevSeen: 0, busy: false, newCodes: null };
let store, unsub = null;

const NPC = ['Oppvaskmaskinen har ikke tømt seg selv. Fortsatt.', 'Gratis XP ligger her. Bare sånn at du vet det.', 'Én quest til, så holder streaken.', 'Alt kan gjøres på under 10 minutter. Sjekket.', 'Det er stille hjemme. Mistenkelig stille.', 'Mamma og pappa ser at du åpner appen. Bare så du vet det.'];
const OK = ['Ferdig. De ble overrasket.', 'Det der var ryddig.', 'Sånn, ja.', 'Streaken lever.', 'Ikke dårlig.', 'Det går unna.'];
const BACK = ['Nesten. Sjekk en gang til.', 'Mangler litt. Prøv igjen.'];
const DAYS = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];

/* ---------- små hjelpere ---------- */
const isAdult = () => S.profile && S.profile.role === 'adult';
const fam = () => S.data.family;
const kids = () => Object.values(S.data.children).sort((a, b) => a.name.localeCompare(b.name, 'nb'));
const myChild = () => S.data.children[S.profile.childId];
const curHome = () => L.homeFor(fam(), L.today());
const homeName = h => (fam().homeNames && fam().homeNames[h]) || (h === 'a' ? 'Hjem 1' : 'Hjem 2');
const splitOn = () => !!(fam().split && fam().split.on);
const myName = () => (S.profile && S.profile.name) || '';
const homeVisible = q => !splitOn() || !q.home || q.home === 'both' || q.home === curHome();
const fmt = at => new Date(at).toLocaleString('nb-NO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const fmtDay = at => new Date(at).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const put = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ignorer */ } };

let AC = null;
function beep(f, d, t) { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); const o = AC.createOscillator(), g = AC.createGain(); o.type = t || 'sine'; o.frequency.value = f; g.gain.value = .06; o.connect(g); g.connect(AC.destination); o.start(); g.gain.exponentialRampToValueAtTime(.001, AC.currentTime + d); o.stop(AC.currentTime + d); } catch (e) { /* lyd er valgfritt */ } }
const jingle = a => a.forEach((f, i) => setTimeout(() => beep(f, .22, 'triangle'), i * 110));
const vib = n => { try { navigator.vibrate && navigator.vibrate(n); } catch (e) { /* valgfritt */ } };
function toast(m) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; ($('#app') || document.body).appendChild(t); setTimeout(() => t.remove(), 2600); }
function friendly(e) {
  const c = (e && (e.code || e.message)) || '';
  const m = { 'auth/invalid-credential': 'Feil e-post/kode eller passord.', 'auth/wrong-password': 'Feil e-post eller passord.', 'auth/user-not-found': 'Feil e-post eller passord.', 'auth/email-already-in-use': 'Den er allerede i bruk. Logg inn i stedet.', 'auth/weak-password': 'Passordet må ha minst 6 tegn.', 'auth/invalid-email': 'E-postadressen ser ikke riktig ut.', 'auth/network-request-failed': 'Ingen nett akkurat nå.', 'auth/unauthorized-domain': 'Dette nettstedet er ikke godkjent i Firebase (README, steg 4).', 'auth/operation-not-allowed': 'Innlogging med e-post er ikke slått på i Firebase (README, steg 2).', 'auth/too-many-requests': 'For mange forsøk. Vent litt og prøv igjen.', 'permission-denied': 'Ikke tilgang. Sjekk at reglene er publisert (README, steg 3).', 'code-not-found': 'Fant ikke den koden.', 'not-waiting': 'Den quest-en er allerede behandlet.' };
  for (const k in m) if (c.indexOf(k) >= 0) return m[k];
  return 'Noe gikk galt: ' + (e && e.message ? e.message : c);
}
async function run(fn, okMsg) { if (S.busy) return; S.busy = true; try { await fn(); if (okMsg) toast(okMsg); } catch (e) { console.error(e); toast(friendly(e)); } finally { S.busy = false; } }

/* ---------- oppstart ---------- */
async function boot() {
  const real = config && config.apiKey && config.apiKey.indexOf('DIN-') !== 0;
  try {
    store = real ? (await import('./store-firebase.js')).createFirebaseStore(config) : (await import('./store-local.js')).createLocalStore();
  } catch (e) { console.error(e); $('#app').innerHTML = '<div class="center">Kunne ikke laste appen. Sjekk nettet og last siden på nytt.<br><small>' + esc(e.message) + '</small></div>'; return; }
  store.onAuth(async u => {
    S.user = u;
    if (S.joining) return;
    if (unsub) { unsub(); unsub = null; }
    if (!u) { S.profile = null; S.data = null; S.view = 'auth'; render(); return; }
    try { S.profile = await store.getProfile(u.uid); } catch (e) { console.error(e); S.err = friendly(e); S.profile = null; }
    if (!S.profile) { S.view = 'start'; render(); return; }
    startFamily();
  });
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) navigator.serviceWorker.register('sw.js').catch(() => {});
}
function startFamily() {
  S.view = 'loading'; render();
  S.prevSeen = S.profile.seenAt || 0;
  unsub = store.subscribeFamily(S.profile.familyId, S.profile.role, d => {
    const first = !S.data;
    S.data = d;
    if (!isAdult() && !store.demo && d.children[S.profile.childId] && !d.children[S.profile.childId].joined && !S.joinSent) { S.joinSent = true; store.saveChild(S.profile.familyId, S.profile.childId, { joined: true }).catch(() => {}); }
    if (first || !S.tab) S.tab = isAdult() ? 'a-home' : 'home';
    S.view = 'app';
    softRender();
    checkCelebrate();
  }, e => { console.error(e); S.err = friendly(e); toast(S.err); });
}

/* ---------- visning ---------- */
function softRender() { const a = document.activeElement; if (a && a.matches && a.matches('input,select,textarea') && $('#app').contains(a)) { S.dirty = true; return; } render(); }
function render() {
  S.dirty = false;
  const root = $('#app'), old = $('#main'), top = old ? old.scrollTop : 0;
  if (S.view === 'loading') { root.innerHTML = '<div class="center">Laster…</div>'; return; }
  if (S.view === 'auth') { root.innerHTML = authView(); return; }
  if (S.view === 'start') { root.innerHTML = startView(); return; }
  root.innerHTML = shell();
  const m = $('#main'); if (m) m.scrollTop = top;
  const n = unread();
  document.title = (n ? '(' + n + ') ' : '') + 'HusHelt';
  try { if (navigator.setAppBadge) (n ? navigator.setAppBadge(n) : navigator.clearAppBadge()); } catch (e) { /* valgfritt */ }
  if (S.ov) startConfetti();
}
function unread() { const seen = S.profile.seenAt || 0; return myNotifs().filter(n => n.at > seen).length; }
function myNotifs() { const key = isAdult() ? 'adults' : S.profile.childId; return S.data.notifs.filter(n => n.to === key); }

function authView() {
  const m = S.authMode;
  if (m === 'kid-up' || m === 'kid-in') {
    const up = m === 'kid-up';
    return '<div class="authbox"><h1>Hus<span style="color:var(--xp)">Helt</span></h1><div class="st" style="margin-bottom:22px">' + (up ? 'Første gang? Skriv inn koden du har fått av mamma eller pappa, og velg et passord.' : 'Logg inn med koden din og passordet ditt.') + '</div>' +
      '<form id="kidform"><label class="field"><span>Koden din (for eksempel K7M2-9XQA)</span><input id="k-code" required maxlength="9" autocapitalize="characters" autocomplete="off"></label>' +
      '<label class="field"><span>Passord' + (up ? ' (minst 6 tegn)' : '') + '</span><input id="k-pw" type="password" autocomplete="' + (up ? 'new-password' : 'current-password') + '" required minlength="6"></label>' +
      (up ? '<div class="st" style="margin:-4px 0 12px">Husk passordet. Mangler du det senere, kan en forelder lage en ny kode til deg.</div>' : '') +
      (S.err ? '<div class="err" role="alert">' + esc(S.err) + '</div>' : '') +
      '<button class="btn" type="submit">' + (up ? 'Kom i gang' : 'Logg inn') + '</button></form>' +
      '<div style="margin-top:14px;display:flex;flex-direction:column;gap:2px">' + (up ? '<button class="link" data-a="authmode" data-v="kid-in">Har du vært her før? Logg inn</button>' : '<button class="link" data-a="authmode" data-v="kid-up">Første gang? Bruk koden din</button>') + '<button class="link" data-a="authmode" data-v="in">Jeg er forelder</button></div></div>';
  }
  const up = m === 'up', rs = m === 'reset';
  return '<div class="authbox"><h1>Hus<span style="color:var(--xp)">Helt</span></h1><div class="st" style="margin-bottom:22px">Husarbeid som spill, for hele familien.</div>' +
    '<form id="authform"><label class="field"><span>E-post</span><input id="a-email" type="email" autocomplete="email" required></label>' +
    (rs ? '' : '<label class="field"><span>Passord' + (up ? ' (minst 6 tegn)' : '') + '</span><input id="a-pw" type="password" autocomplete="' + (up ? 'new-password' : 'current-password') + '" required minlength="6"></label>') +
    (S.err ? '<div class="err" role="alert">' + esc(S.err) + '</div>' : '') +
    '<button class="btn" type="submit">' + (rs ? 'Send lenke for nytt passord' : up ? 'Lag konto' : 'Logg inn') + '</button></form>' +
    '<div style="margin-top:14px;display:flex;flex-direction:column;gap:2px">' +
    (up ? '<button class="link" data-a="authmode" data-v="in">Har du konto? Logg inn</button>' : '<button class="link" data-a="authmode" data-v="up">Ny her? Lag konto</button>') +
    (rs ? '<button class="link" data-a="authmode" data-v="in">Tilbake til innlogging</button>' : '<button class="link" data-a="authmode" data-v="reset">Glemt passord?</button>') +
    '<button class="btn ghost" style="margin-top:14px" data-a="authmode" data-v="kid-up">Jeg er barn og har en kode</button></div></div>';
}
function startView() {
  const m = S.startMode;
  let h = '<div class="authbox"><h1>Velkommen</h1>';
  if (S.err) h += '<div class="err" role="alert">' + esc(S.err) + '</div>';
  if (m === 'choose') {
    h += '<div class="st" style="margin-bottom:18px">Er du forelder og skal sette opp familien, eller har du fått en kode?</div><button class="btn" data-a="startmode" data-v="create">Jeg er forelder: lag familie</button><div style="height:10px"></div><button class="btn ghost" data-a="startmode" data-v="join">Jeg har en kode</button>';
  } else if (m === 'create') {
    h += '<form id="createform"><label class="field"><span>Familiens navn</span><input id="s-fam" required maxlength="30" placeholder="For eksempel Hansen"></label><label class="field"><span>Ditt navn</span><input id="s-name" required maxlength="20"></label><button class="btn" type="submit">Opprett</button></form><button class="link" data-a="startmode" data-v="choose">Tilbake</button>';
  } else {
    h += '<form id="joinform"><label class="field"><span>Kode (for eksempel K7M2-9XQA)</span><input id="s-code" required maxlength="9" autocapitalize="characters" autocomplete="off"></label><label class="field"><span>Ditt navn</span><input id="s-name" required maxlength="20"></label><button class="btn" type="submit">Bli med</button></form><button class="link" data-a="startmode" data-v="choose">Tilbake</button>';
  }
  h += '<div style="margin-top:20px"><button class="link" data-a="logout">Logg ut</button></div></div>';
  return h;
}

function shell() {
  const adult = isAdult();
  const tabs = adult ? [['a-home', 'ctrl', 'Kontroll'], ['a-quests', 'quests', 'Quests'], ['a-pay', 'wallet', 'Lønn'], ['a-fam', 'family', 'Familie']] : [['home', 'home', 'Hjem'], ['quests', 'quests', 'Quests'], ['loot', 'gift', 'Loot'], ['me', 'me', 'Meg']];
  const pend = adult ? S.data.quests.filter(q => L.qState(q) === 'wait').length : 0;
  const views = { 'a-home': aHome, 'a-quests': aQuests, 'a-pay': aPay, 'a-fam': aFam, home: kHome, quests: kQuests, loot: kLoot, me: kMe };
  const n = unread();
  let body;
  try { body = (views[S.tab] || (adult ? aHome : kHome))(); } catch (e) { console.error(e); body = '<div class="empty">Noe gikk galt i visningen. Last siden på nytt.</div>'; }
  return (store.demo ? '<div class="demo-banner">Demo-modus: data lagres bare i denne nettleseren. Se README for å koble til Firebase.</div>' : '') +
    '<header><div class="logo">Hus<span>Helt</span></div><div class="hbtns">' +
    (store.demo ? '<button class="modebtn" data-a="demorole">Vis som ' + (adult ? 'barn' : 'forelder') + '</button>' : '') +
    '<button class="bellbtn" data-a="inbox" aria-label="Varsler">' + ico('bell') + (n ? '<span class="badge">' + n + '</span>' : '') + '</button></div></header>' +
    '<main id="main">' + body + '</main>' +
    '<nav>' + tabs.map(t => '<button data-a="tab" data-v="' + t[0] + '" class="' + (S.tab === t[0] ? 'on' : '') + '">' + ico(t[1]) + t[2] + (t[0] === 'a-home' && pend ? '<span class="badge">' + pend + '</span>' : '') + '</button>').join('') + '</nav>' +
    (S.sheet ? sheetView() : '') + (S.ov ? '<div class="overlay"><canvas id="cv"></canvas><div class="ovb">' + S.ov + '</div></div>' : '');
}

function sheetView() {
  const seen = S.prevSeen, list = myNotifs().slice(0, 25);
  const txt = n => n.type === 'done' ? esc(n.from) + ' er ferdig med «' + esc(n.text) + '». Venter på deg.' : n.type === 'approved' ? '«' + esc(n.text) + '» er godkjent. +' + (n.payload ? n.payload.kr : 0) + ' kr, +' + (n.payload ? n.payload.xp : 0) + ' XP' : n.type === 'msg' ? esc(n.from) + ': ' + esc(n.text) : esc(n.text);
  return '<div class="overlay sheet" data-a="closesheet"><div class="ovb" data-stop="1"><div class="row"><h1 class="grow" style="font-size:22px">Varsler</h1><button class="btn sm ghost" data-a="closesheet">Lukk</button></div>' +
    (list.length ? list.map(n => '<div class="notif' + (n.at > seen ? ' new' : '') + '"><div>' + txt(n) + '</div><div class="st">' + fmt(n.at) + '</div></div>').join('') : '<div class="empty">Ingen varsler ennå.</div>') +
    '<div class="st" style="margin-top:10px">Varsler vises når du åpner appen. Appen sender ikke push-varsler til lukket telefon.</div></div></div>';
}

/* ---------- avatar og profilkort ---------- */
function profileCard(c) {
  const th = ITEMBY[c.eq.theme] || ITEMBY.dusk, st = c.eq.sticker ? ITEMBY[c.eq.sticker] : null, fr = c.eq.frame ? 'f-' + c.eq.frame : 'f-none';
  const p = L.progress(c.xpTotal), pc = Math.min(100, Math.round(p.xp / p.need * 100));
  return '<div class="profile" style="background:' + th.c + '">' + (st ? '<div class="sticker" aria-hidden="true">' + st.e + '</div>' : '') +
    '<div class="row"><div class="mono ' + fr + '"><div class="in">' + avatarSvg(c.av, c.eq) + '</div></div><div class="grow"><div class="pname">' + esc(c.name) + '</div><div class="pill">' + esc(c.title) + '</div></div></div>' +
    '<div class="xpbar"><i style="width:' + pc + '%"></i></div><div class="xpnum"><span>Level ' + p.lvl + ' · ' + p.xp + ' / ' + p.need + ' XP</span><span>Neste: Level ' + (p.lvl + 1) + '</span></div></div>';
}
const bars = c => { const w = L.weekView(c), di = L.dayIdx(L.today()); return '<div class="bars">' + w.arr.map((v, i) => '<div class="' + (i === di ? 'today' : '') + '" style="height:' + Math.max(4, v * 22) + 'px"></div>').join('') + '</div><div class="days">' + DAYS.map(d => '<span>' + d + '</span>').join('') + '</div>'; };

/* ---------- barnets sider ---------- */
function qcard(q, mine) {
  const s = L.qState(q);
  const cls = 'q' + (s === 'wait' ? ' wait' : '') + (s === 'back' ? ' back' : '') + (s === 'done' ? ' done' : '');
  let act = '', st = '';
  if (s === 'open' || s === 'back') act = '<button class="btn sm" data-a="take" data-id="' + q.id + '">Ta quest</button>';
  if (s === 'taken') { act = '<button class="btn sm ok" data-a="done" data-id="' + q.id + '">Ferdig</button>'; st = '<div class="st">Pågår</div>'; }
  if (s === 'wait') st = '<div class="st">Venter på godkjenning</div>';
  if (s === 'done') st = '<div class="st">Ferdig ' + (q.rep === 'Én gang' ? '' : 'for denne perioden') + '</div>';
  if (s === 'back') st = '<div class="st" style="color:var(--bad)">' + esc(q.msg || 'Prøv igjen') + '</div>';
  return '<div class="' + cls + '"><div class="ico">' + ico(q.ic) + '</div><div class="grow"><div class="t">' + esc(q.title) + '</div><div class="rw"><span class="kr">+' + q.kr + ' kr</span><span class="xp">+' + q.xp + ' XP</span></div>' + st + '</div>' + act + '</div>';
}
function myQuests() { const c = myChild(); if (!c) return []; return S.data.quests.filter(q => q.childId === c.id && homeVisible(q)); }

function goalBlock(c, adult) {
  const g = c.goal; if (!g || !g.on) return '';
  const v = L.goalView(g), pace = { ahead: 'Foran skjema', on: 'På skjema', behind: 'Bak skjema' }[v.pace] || '';
  const ticks = [25, 50, 75].map(m => '<b class="' + (v.pct >= m ? 'hit' : '') + '" style="left:' + m + '%"></b>').join('');
  let sub;
  if (g.reached) sub = adult ? 'Målet er nådd. Husk å gi belønningen.' : 'Målet er nådd. Belønningen er din.';
  else sub = (g.xp || 0) + ' av ' + g.target + ' XP' + (g.need > 0 ? ' · ' + (g.pw || 0) + ' av ' + g.need + ' uker med ukemål nådd' : '') + (v.days != null ? ' · ' + v.days + ' dager igjen' : '') + (pace ? ' · ' + pace : '');
  return '<div class="card goal' + (g.reached ? ' reached' : '') + '"><div class="row"><div class="grow"><div class="st">' + (adult ? 'Langtidsmål' : 'Stort mål') + '</div><div class="gt">' + esc(g.title || 'Mål') + '</div>' + (g.prize ? '<div class="st">Belønning: ' + esc(g.prize) + '</div>' : '') + '</div><div class="gp">' + v.pct + '<small>%</small></div></div>' +
    '<div class="gbar"><i style="width:' + v.pct + '%"></i>' + ticks + '</div><div class="st" style="margin-top:8px">' + esc(sub) + '</div>' +
    (adult && g.reached ? '<button class="btn sm ok" style="margin-top:10px" data-a="goalclaim" data-c="' + c.id + '">Belønning gitt, fjern målet</button>' : '') + '</div>';
}
function goalEditor(c) {
  const g = c.goal, pot = L.weeklyPotential(S.data.quests.filter(q => q.childId === c.id));
  if (!g) return '<div class="st" style="margin-top:12px">Langtidsmål (for eksempel en sydentur)</div><button class="btn sm ghost" style="margin-top:6px" data-a="goalnew" data-c="' + c.id + '">Lag langtidsmål</button>';
  const v = L.goalView(g), id = c.id, hd = L.goalHardness(g, pot);
  const inp = (f, label, val, ex) => '<label class="field"><span>' + label + '</span><input data-f="' + f + '" data-c="' + id + '" value="' + esc(val) + '"' + (ex || '') + '></label>';
  let h = '<div class="st" style="margin-top:14px"><b>Langtidsmål</b></div>' +
    inp('gTitle', 'Navn', g.title, ' maxlength="30"') + inp('gPrize', 'Belønning', g.prize, ' maxlength="40"') +
    '<div class="two"><label class="field"><span>XP som kreves</span><input type="number" min="100" step="100" data-f="gTarget" data-c="' + id + '" value="' + g.target + '"></label>' +
    '<label class="field"><span>Frist (valgfri)</span><input type="date" data-f="gEnd" data-c="' + id + '" value="' + esc(g.end || '') + '"></label></div>' +
    '<label class="field"><span>Uker der ukemålet må nås (0 = ikke krav)</span><input type="number" min="0" max="104" data-f="gNeed" data-c="' + id + '" value="' + (g.need || 0) + '"></label>' +
    '<div class="st" style="margin-bottom:6px">Sett kravet som andel av maks mulig innsats:</div><div class="seg" style="margin-bottom:10px">' + [60, 70, 80, 90].map(n => '<button data-a="goalpct" data-c="' + id + '" data-v="' + n + '">' + n + ' %</button>').join('') + '</div>' +
    (hd ? '<div class="st" style="margin-bottom:8px"><b>Hvor strengt er dette?</b> ' + (hd.pct != null ? hd.label + ' (' + hd.pct + ' % av maks mulig XP til fristen). ' : '') + 'Det tilsvarer ' + hd.weeksFull + ' uker der alle quests gjøres. ' + (hd.pct != null && hd.pct <= 40 ? 'Dette er lett å nå. Øk kravet hvis belønningen er stor.' : '') + '</div>' : '<div class="st" style="margin-bottom:8px">Legg inn quests først, så viser appen hvor strengt kravet er.</div>') +
    '<div class="st" style="margin-bottom:8px">Appen kontrollerer ikke selve oppgaven. Det gjør du når du godkjenner, så godkjenn bare når det faktisk er gjort.</div>' +
    '<div class="st">Fremdrift: ' + (g.xp || 0) + ' av ' + g.target + ' XP (' + v.pct + ' %). XP teller fra ' + esc(g.start || '') + '.' + (pot ? ' Hvis alle quests til ' + esc(c.name) + ' gjøres hver uke, gir det ca. ' + pot + ' XP per uke.' : '') + (v.perWeek != null && !g.reached ? ' For å nå målet innen fristen trengs ca. ' + v.perWeek + ' XP per uke.' : '') + '</div>' +
    '<div class="two" style="margin-top:10px"><button class="btn sm ghost" style="width:100%" data-a="goalreset" data-c="' + id + '">' + (S.confirm === 'greset:' + id ? 'Trykk igjen for å nullstille' : 'Nullstill fremdrift') + '</button><button class="btn sm ghost" style="width:100%" data-a="goaldel" data-c="' + id + '">' + (S.confirm === 'gdel:' + id ? 'Trykk igjen for å slette' : 'Slett mål') + '</button></div>';
  return h;
}

function kHome() {
  const c = myChild();
  if (!c) return '<div class="empty">Fant ikke profilen din. Be en forelder sjekke at koden din er riktig.</div>';
  const qs = myQuests(), open = q => ['open', 'back', 'taken'].indexOf(L.qState(q)) >= 0;
  const boss = qs.filter(q => q.boss && open(q))[0];
  const free = qs.filter(q => !q.boss && q.xp <= 15 && ['open', 'back'].indexOf(L.qState(q)) >= 0).slice(0, 2);
  const w = L.weekView(c), owed = (c.owed.a || 0) + (c.owed.b || 0);
  const msg = myNotifs().filter(n => n.type === 'msg')[0];
  const doy = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 864e5);
  let h = profileCard(c) + (S.profile && S.data.children[S.profile.childId] && !c.avDone && c.inv.length <= 3 && !c.coins ? '' : '') +
    '<div class="chips"><div class="chip"><div class="l">' + ico('coin') + 'Til gode</div><div class="v" style="color:var(--money)">' + owed + ' kr</div></div>' +
    '<div class="chip"><div class="l">' + ico('flame') + 'Streak</div><div class="v">' + c.streak + ' d</div></div>' +
    '<div class="chip"><div class="l">' + ico('gift') + 'Neste kiste</div><div class="v">' + (c.approved % 3) + '/3</div></div></div>' +
    '<div class="mom"><div class="av">' + (msg ? esc(msg.from.charAt(0).toUpperCase()) : 'M') + '</div><div class="bubble">' + esc(msg ? msg.text : NPC[doy % NPC.length]) + '</div></div>';
  if (splitOn()) h += '<div class="st" style="margin-top:12px">Denne uka: ' + esc(homeName(curHome())) + '</div>';
  if (boss) h += '<h2>Dagens boss</h2><div class="hero"><div class="tag">Mest XP akkurat nå</div><div class="ht">' + esc(boss.title) + '</div><div class="rw" style="margin-bottom:14px"><span class="kr">+' + boss.kr + ' kr</span><span class="xp">+' + boss.xp + ' XP</span></div>' + (L.qState(boss) === 'taken' ? '<button class="btn ok" data-a="done" data-id="' + boss.id + '">Ferdig</button>' : '<button class="btn" data-a="take" data-id="' + boss.id + '">Ta bossen</button>') + '</div>';
  if (free.length) h += '<h2>Raske XP</h2>' + free.map(q => qcard(q)).join('');
  if (c.goal && c.goal.on) h += '<h2>Årsmål</h2>' + goalBlock(c, false);
  h += '<h2>Ukens mål</h2><div class="card"><div class="row"><div class="grow">' + w.done + ' av ' + c.weekGoal + ' quests</div><div class="st">Mål nådd = ekstra kiste</div></div><div class="bar2"><i style="width:' + Math.min(100, w.done / c.weekGoal * 100) + '%"></i></div></div>';
  return h;
}
function kQuests() {
  const qs = myQuests();
  const day = qs.filter(q => q.rep === 'Daglig'), rest = qs.filter(q => q.rep !== 'Daglig');
  const list = (S.cat === 'today' ? day : rest).slice().sort((a, b) => ['done'].indexOf(L.qState(a)) - ['done'].indexOf(L.qState(b)));
  return '<div class="seg"><button data-a="cat" data-v="today" class="' + (S.cat === 'today' ? 'on' : '') + '">Hver dag</button><button data-a="cat" data-v="week" class="' + (S.cat === 'week' ? 'on' : '') + '">Uke og måned</button></div><h2>Quests</h2>' +
    (list.length ? list.map(q => qcard(q)).join('') : '<div class="empty">Ingen quests her akkurat nå. Spør mamma eller pappa om å legge til noen.</div>');
}
function chestTile(t) { const c = t === 'Legendary Chest' ? 't-leg' : t === 'Epic Chest' ? 't-epic' : t === 'Lucky Chest' ? 't-luck' : 't-mys'; return '<div class="tile ' + c + '">' + ico('gift') + '</div>'; }
function kLoot() {
  const c = myChild(); if (!c) return '';
  const spun = c.spinDay === L.today();
  return '<h2>Kister</h2>' + (c.chests.length ? '<div class="chests">' + c.chests.map((t, i) => '<div class="chest">' + chestTile(t) + '<div>' + t + '</div><button class="btn sm" style="margin-top:10px;width:100%" data-a="openchest" data-i="' + i + '">Åpne</button></div>').join('') + '</div>' : '<div class="empty">Ingen kister akkurat nå. Hver 3. godkjente quest gir en ny.</div>') +
    '<h2>Daglig spin</h2><div class="card"><div class="st" style="margin:0 0 12px">Ett gratis snurr per dag. Du får mynter, av og til noe nytt til profilen.</div><button class="btn" data-a="spin" ' + (spun ? 'disabled' : '') + '>' + (spun ? 'Kom tilbake i morgen' : 'Snurr') + '</button></div>' +
    '<div class="st" style="margin-top:14px;text-align:center">Du har ' + c.coins + ' mynter. Bruk dem i Meg-fanen. Sjanser i kistene: vanlig 70 %, sjelden 22 %, episk 7 %, legendarisk 1 %.</div>';
}
const sws = (arr, key, cur) => '<div class="sws">' + arr.map(c => '<button class="sw2' + (c === cur ? ' on' : '') + '" style="background:' + c + '" data-a="' + key + '" data-v="' + c + '" aria-label="Velg farge"></button>').join('') + '</div>';
function kMe() {
  const c = myChild(); if (!c) return '';
  const lab = t => '<div class="st" style="margin:0 0 6px">' + t + '</div>';
  let h = '<div style="margin-top:8px">' + profileCard(c) + '</div>';
  h += '<h2>Navn</h2><label class="field"><input id="f-name" data-f="childName" value="' + esc(c.name) + '" maxlength="14" aria-label="Kallenavn"></label>';
  h += '<h2>Velg en stil</h2><div class="presets">' + PRESETS.map((p, i) => '<button class="preset" data-a="preset" data-i="' + i + '">' + avatarSvg(p, { top: p.top }) + p.n + '</button>').join('') + '</div>';
  h += '<h2>Lag din egen</h2><div class="card">' + lab('Kjønn') + '<div class="seg" style="margin-bottom:14px">' + [['f', 'Jente'], ['m', 'Gutt'], ['n', 'Annet']].map(g => '<button data-a="g" data-v="' + g[0] + '" class="' + (c.av.g === g[0] ? 'on' : '') + '">' + g[1] + '</button>').join('') + '</div>' +
    lab('Hudtone') + '<div style="margin-bottom:14px">' + sws(SKIN, 'skin', c.av.skin) + '</div>' + lab('Hårstil') + '<div class="seg" style="margin-bottom:14px">' + HAIRS.map(x => '<button data-a="hs" data-v="' + x[0] + '" class="' + (c.av.hs === x[0] ? 'on' : '') + '">' + x[1] + '</button>').join('') + '</div>' +
    lab('Hårfarge') + '<div style="margin-bottom:14px">' + sws(HAIRC, 'hc', c.av.hc) + '</div>' + lab('Fargen på overdelen') + sws(TOPC, 'tc', c.av.tc) + '</div>';
  [['theme', 'Tema'], ['top', 'Overdel'], ['acc', 'Tilbehør'], ['pet', 'Kjæledyr'], ['frame', 'Ramme'], ['sticker', 'Klistremerke']].forEach(g => {
    h += '<h2>' + g[1] + '</h2><div class="grid">' + ITEMS.filter(it => it.slot === g[0]).map(it => {
      const own = c.inv.indexOf(it.id) >= 0, on = c.eq[it.slot] === it.id;
      const vis = it.c ? '<div class="sw" style="background:' + it.c + '"></div>' : (it.e || (it.id === 'gold' ? '🟡' : '🌈'));
      return '<button class="item' + (own ? '' : ' locked') + (on ? ' on' : '') + '" data-a="' + (own ? 'equip' : 'buy') + '" data-id="' + it.id + '" aria-label="' + it.n + (own ? '' : ', koster ' + PRICE[it.rar] + ' mynter') + '">' + (own ? vis : '<span style="opacity:.5">' + vis + '</span>') + '<small>' + (own ? it.n : PRICE[it.rar] + ' ◎') + '</small></button>';
    }).join('') + '</div>';
  });
  h += '<div class="st" style="margin-top:8px">Du har ' + c.coins + ' mynter (◎). Sjeldnere ting koster mer.</div>';
  h += '<h2>Titler</h2><div class="seg">' + L.titlesFor(c).map(t => '<button data-a="title" data-v="' + esc(t) + '" class="' + (c.title === t ? 'on' : '') + '">' + esc(t) + '</button>').join('') + '</div>';
  h += '<h2>Din uke</h2><div class="card">' + bars(c) + '</div>';
  h += '<div style="margin-top:24px"><button class="link" data-a="logout">Logg ut</button></div>';
  return h;
}

/* ---------- foreldrenes sider ---------- */
function qHome(q) { return splitOn() ? (q.home && q.home !== 'both' ? q.home : curHome()) : 'a'; }
function aHome() {
  const ks = kids(), pend = S.data.quests.filter(q => L.qState(q) === 'wait');
  if (!ks.length) return '<h2>Kom i gang</h2><div class="card"><div class="st" style="margin-bottom:10px"><b>Steg 1 av 3.</b> Legg til barnet. Du får en kode som barnet bruker for å logge inn på sin egen telefon.</div><form id="childform"><label class="field"><span>Barnets navn eller kallenavn</span><input id="c-name" maxlength="14" required></label><button class="btn" type="submit">Legg til barn</button></form></div>';
  let h = '';
  ks.filter(c => !c.joined && !store.demo).forEach(c => {
    h += '<div class="card goal"><div class="st"><b>' + esc(c.name) + ' har ikke logget inn ennå</b></div><div class="st" style="margin:8px 0">Steg 2 av 3: Gi koden til ' + esc(c.name) + '. Barnet åpner appen, trykker «Jeg er barn og har en kode», skriver koden og velger et passord.</div><span class="code">' + esc(c.code || '') + '</span><div class="two" style="margin-top:12px"><button class="btn sm" style="width:100%" data-a="share" data-c="' + c.id + '">Del invitasjon</button><button class="btn sm ghost" style="width:100%" data-a="newcode" data-c="' + c.id + '">Ny kode</button></div>' + (S.data.quests.some(q => q.childId === c.id) ? '' : '<div class="st" style="margin-top:12px"><b>Steg 3 av 3:</b> Legg inn quests under Quests-fanen. Der finnes en ferdig pakke med forslag.</div>') + '</div>';
  });
  h += '<h2>Venter på deg</h2>';
  h += pend.length ? pend.map(q => { const c = S.data.children[q.childId]; return '<div class="card"><div class="row"><div class="q" style="margin:0;padding:0;background:none"><div class="ico">' + ico(q.ic) + '</div></div><div class="grow"><div class="t" style="font-weight:700">' + esc(q.title) + '</div><div class="st">' + esc(c ? c.name : '') + ' · +' + q.kr + ' kr · +' + q.xp + ' XP' + (splitOn() ? ' · ' + esc(homeName(qHome(q))) : '') + '</div></div></div>' +
    '<label class="field" style="margin:12px 0 0"><span>Melding hvis du sender tilbake (valgfri)</span><input id="rm-' + q.id + '" maxlength="80"></label><div class="two" style="margin-top:10px"><button class="btn sm ghost" style="width:100%" data-a="reject" data-id="' + q.id + '">Send tilbake</button><button class="btn sm ok" style="width:100%" data-a="approve" data-id="' + q.id + '">Godkjenn</button></div></div>'; }).join('') : '<div class="empty">Ingenting å godkjenne akkurat nå.</div>';
  if (splitOn()) h += '<div class="st" style="margin-top:14px">Denne uka: ' + esc(homeName(curHome())) + '</div>';
  ks.forEach(c => {
    const p = L.progress(c.xpTotal), w = L.weekView(c);
    h += '<h2>' + esc(c.name) + '</h2><div class="card"><div class="row"><div class="mono f-none" style="width:56px;height:56px;border-radius:30%;background:' + (ITEMBY[c.eq.theme] || ITEMBY.dusk).c + '"><div class="in">' + avatarSvg(c.av, c.eq) + '</div></div><div class="grow"><div style="font-weight:700">Level ' + p.lvl + ' · ' + esc(c.title) + '</div><div class="st">Streak ' + c.streak + ' d · ' + w.done + ' av ' + c.weekGoal + ' quests denne uka</div></div></div>' + bars(c) +
      '<div style="margin-top:14px" class="seg">' + ['Fin innsats!', 'Bra jobba i dag', 'Husk lekser først'].map(m => '<button data-a="quickmsg" data-c="' + c.id + '" data-m="' + esc(m) + '">' + esc(m) + '</button>').join('') + '</div>' +
      '<div class="row" style="margin-top:8px"><input id="msg-' + c.id + '" maxlength="80" placeholder="Egen melding" style="flex:1;min-height:42px;border-radius:12px;border:1px solid var(--line);background:var(--bg);color:var(--fg);padding:8px 12px;font:inherit;min-width:0"><button class="btn sm" data-a="sendmsg" data-c="' + c.id + '">Send</button></div></div>';
  });
  return h;
}
function aQuests() {
  const ks = kids();
  if (!ks.length) return '<div class="empty">Legg til et barn i Familie-fanen først.</div>';
  if (S.form) return questForm();
  let h = '<h2>Quests</h2><button class="btn" data-a="newquest">Ny quest</button>';
  ks.forEach(c => {
    const qs = S.data.quests.filter(q => q.childId === c.id);
    h += '<h2>' + esc(c.name) + '</h2>' + (qs.length ? qs.map(q => '<div class="q"><div class="ico">' + ico(q.ic) + '</div><div class="grow"><div class="t">' + esc(q.title) + (q.boss ? ' · boss' : '') + '</div><div class="st">' + q.rep + ' · ' + q.kr + ' kr · ' + q.xp + ' XP' + (splitOn() && q.home && q.home !== 'both' ? ' · ' + esc(homeName(q.home)) : '') + '</div></div>' +
      '<button class="btn sm ghost" data-a="editquest" data-id="' + q.id + '" aria-label="Rediger ' + esc(q.title) + '">Endre</button>' +
      (S.confirm === 'del:' + q.id ? '<button class="btn sm danger" data-a="delquest" data-id="' + q.id + '">Sikker?</button>' : '<button class="btn sm ghost" data-a="delquest" data-id="' + q.id + '" aria-label="Slett ' + esc(q.title) + '">' + ico('trash') + '</button>') + '</div>').join('') : '<div class="empty">Ingen quests ennå.</div><button class="btn ghost" data-a="pack" data-c="' + c.id + '">Legg inn forslagspakke (7 vanlige quests)</button>');
  });
  return h;
}
function questForm() {
  const f = S.form, ks = kids();
  return '<h2>' + (f.id ? 'Endre quest' : 'Ny quest') + '</h2>' +
    (f.id ? '' : '<div class="st" style="margin-bottom:6px">Ferdige forslag</div><div class="seg" style="margin-bottom:12px">' + L.TEMPLATES.map((t, i) => '<button data-a="tpl" data-i="' + i + '">' + esc(t.title) + '</button>').join('') + '</div>') +
    '<div class="card"><label class="field"><span>Tittel</span><input id="q-title" value="' + esc(f.title) + '" maxlength="40"></label>' +
    '<div class="two"><label class="field"><span>Belønning (kr)</span><input id="q-kr" type="number" min="0" max="1000" value="' + f.kr + '"></label><label class="field"><span>XP</span><input id="q-xp" type="number" min="0" max="500" value="' + f.xp + '"></label></div>' +
    '<div class="st" style="margin:-4px 0 12px">Tommelfingerregel: 10 min = 10 XP, 30 min = 40 XP.</div>' +
    '<label class="field"><span>Gjentakelse</span><select id="q-rep">' + ['Daglig', 'Ukentlig', 'Månedlig', 'Én gang'].map(r => '<option' + (f.rep === r ? ' selected' : '') + '>' + r + '</option>').join('') + '</select></label>' +
    (f.id ? '' : '<label class="field"><span>Til</span><select id="q-child">' + (ks.length > 1 ? '<option value="all">Alle barn</option>' : '') + ks.map(c => '<option value="' + c.id + '"' + (f.childId === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('') + '</select></label>') +
    (splitOn() ? '<label class="field"><span>Hvilket hjem</span><select id="q-home"><option value="both"' + (f.home === 'both' ? ' selected' : '') + '>Begge</option><option value="a"' + (f.home === 'a' ? ' selected' : '') + '>' + esc(homeName('a')) + '</option><option value="b"' + (f.home === 'b' ? ' selected' : '') + '>' + esc(homeName('b')) + '</option></select></label>' : '') +
    '<label class="field"><span>Ikon</span><select id="q-ic">' + QUEST_ICONS.map(i => '<option value="' + i[0] + '"' + (f.ic === i[0] ? ' selected' : '') + '>' + i[1] + '</option>').join('') + '</select></label>' +
    '<label class="check"><input id="q-boss" type="checkbox"' + (f.boss ? ' checked' : '') + '> Boss (vises øverst på barnets side)</label>' +
    '<div class="two"><button class="btn ghost" data-a="cancelform">Avbryt</button><button class="btn" data-a="savequest">Lagre</button></div></div>';
}
function aPay() {
  const ks = kids();
  if (!ks.length) return '<div class="empty">Ingen barn er lagt til ennå.</div>';
  let h = '';
  ks.forEach(c => {
    h += '<h2>' + esc(c.name) + '</h2><div class="card">';
    const homes = splitOn() ? ['a', 'b'] : ['a'];
    homes.forEach(hm => { const v = c.owed[hm] || 0; h += '<div class="row" style="margin-bottom:10px"><div class="grow"><div class="st">' + (splitOn() ? esc(homeName(hm)) + ' skylder' : 'Opptjent og ikke utbetalt') + '</div><div class="big-n" style="font-size:34px">' + v + ' kr</div></div><button class="btn ok sm" data-a="pay" data-c="' + c.id + '" data-h="' + hm + '" ' + (v ? '' : 'disabled') + '>Utbetalt</button></div>'; });
    h += '<div class="st">Appen flytter ikke penger. Betal selv (for eksempel med Vipps) og trykk «Utbetalt» så saldoen nullstilles. Totalt utbetalt: ' + c.paidTotal + ' kr.</div></div>';
  });
  h += '<h2>Historikk</h2>' + (S.data.ledger.length ? S.data.ledger.slice(0, 25).map(e => '<div class="hist' + (e.undone ? ' undone' : '') + '"><div class="grow"><div>' + (e.type === 'payout' ? 'Utbetalt til ' + esc(e.childName) : esc(e.childName) + ' · ' + esc(e.title)) + '</div><div class="st">' + fmtDay(e.at) + ' · ' + esc(e.by) + (splitOn() ? ' · ' + esc(homeName(e.home)) : '') + '</div></div><div>' + (e.type === 'payout' ? '−' : '+') + e.kr + ' kr</div>' + (e.type === 'quest' && !e.undone ? '<button class="btn sm ghost" data-a="undo" data-id="' + e.id + '">Angre</button>' : '') + '</div>').join('') : '<div class="empty">Ingenting ennå.</div>');
  return h;
}
function aFam() {
  const f = fam(), ks = kids(), uid = S.user.uid;
  let h = '<h2>Familien ' + esc(f.name) + '</h2><div class="card"><div class="st">Kode for å invitere en voksen (for eksempel den andre forelderen)</div><div style="margin-top:8px"><span class="code">' + esc(f.adultCode) + '</span></div></div>';
  h += '<h2>Delt bosted</h2><div class="card"><label class="check"><input type="checkbox" data-f="splitOn"' + (splitOn() ? ' checked' : '') + '> Barnet bor uke om hos to voksne</label>';
  if (splitOn()) {
    h += '<div class="two"><label class="field"><span>Hjem 1</span><input data-f="homeA" value="' + esc(homeName('a')) + '" maxlength="20"></label><label class="field"><span>Hjem 2</span><input data-f="homeB" value="' + esc(homeName('b')) + '" maxlength="20"></label></div>' +
      '<div class="row" style="margin-bottom:12px"><div class="grow">Denne uka: <b>' + esc(homeName(curHome())) + '</b></div><button class="btn sm ghost" data-a="swapweek">Bytt uke</button></div>' +
      '<label class="field"><span>Hvilket hjem er du?</span><select data-f="myHome"><option value=""' + (!(f.adults[uid] && f.adults[uid].home) ? ' selected' : '') + '>Velg</option><option value="a"' + (f.adults[uid] && f.adults[uid].home === 'a' ? ' selected' : '') + '>' + esc(homeName('a')) + '</option><option value="b"' + (f.adults[uid] && f.adults[uid].home === 'b' ? ' selected' : '') + '>' + esc(homeName('b')) + '</option></select></label>' +
      '<div class="st">Opptjente penger regnes på hjemmet som gjelder den uka. Quests kan låses til ett hjem eller gjelde begge. Den andre forelderen ser alt, men dere trenger ikke bruke appen til å kommunisere med hverandre.</div>';
  } else h += '<div class="st">Skru på hvis barnet bor uke om. Da får dere hvert sitt hjem med egne quests og egen utbetaling.</div>';
  h += '</div><h2>Barn</h2>';
  ks.forEach(c => {
    h += '<div class="card"><div class="row"><div class="grow"><b>' + esc(c.name) + '</b><div class="st">Level ' + L.levelOf(c.xpTotal) + '</div></div><label class="field" style="margin:0"><span>Ukemål (quests)</span><select data-f="goal" data-c="' + c.id + '">' + [3, 4, 5, 6, 7].map(n => '<option' + (c.weekGoal === n ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></label></div>' +
      goalEditor(c) + '<div class="st" style="margin-top:14px">Kode barnet bruker for å bli med</div><div style="margin-top:6px"><span class="code">' + esc(c.code || '') + '</span></div></div>';
  });
  h += '<div class="card"><form id="childform"><label class="field"><span>Legg til barn (navn)</span><input id="c-name" maxlength="14" required></label><button class="btn" type="submit">Legg til</button></form></div>';
  h += '<h2>Konto</h2><div class="card"><div class="st">Innlogget som ' + esc(S.user.email || '') + '</div><div style="margin-top:12px" class="two"><button class="btn ghost" data-a="logout">Logg ut</button>' + (store.demo ? '<button class="btn ghost" data-a="resetdemo">Nullstill demo</button>' : '') + '</div></div>';
  h += '<div class="st" style="margin-top:14px">Personvern: appen lagrer kallenavn, quests og poeng. Ingen annonser og ingen sporing.</div>';
  return h;
}

/* ---------- feiring ---------- */
let raf = 0;
function startConfetti() {
  const cv = $('#cv'); if (!cv) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ov = cv.parentElement; cv.width = ov.clientWidth; cv.height = ov.clientHeight;
  const cx = cv.getContext('2d'), cols = ['#b39cff', '#5eead4', '#f5c76b', '#ff8fb5', '#ffffff'], parts = [];
  for (let i = 0; i < 90; i++) parts.push({ x: cv.width / 2, y: cv.height / 2.4, vx: (Math.random() - .5) * 13, vy: -Math.random() * 12 - 3, r: Math.random() * 5 + 2.5, c: cols[i % 5], a: Math.random() * 6 });
  cancelAnimationFrame(raf);
  (function f() { cx.clearRect(0, 0, cv.width, cv.height); parts.forEach(p => { p.vy += .35; p.x += p.vx; p.y += p.vy; p.a += .2; cx.fillStyle = p.c; cx.save(); cx.translate(p.x, p.y); cx.rotate(p.a); cx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); cx.restore(); }); if (parts.some(p => p.y < cv.height + 20)) raf = requestAnimationFrame(f); })();
}
function showOv(html) { S.ov = html + '<button class="btn" style="width:240px" data-a="closeov">Fortsett</button>'; render(); }
function checkCelebrate() {
  if (isAdult() || S.ov || !S.data || !S.user) return;
  const key = 'hushelt-celeb-' + S.user.uid, mine = myNotifs().filter(n => n.type === 'approved');
  const last = get(key);
  if (last === null) { put(key, String(Date.now())); return; }
  const next = mine.filter(n => n.at > +last).sort((a, b) => a.at - b.at)[0];
  if (!next) return;
  put(key, String(next.at));
  const p = next.payload || { kr: 0, xp: 0 };
  jingle(p.lvlUp ? [523, 659, 784, 1047] : [523, 659, 784]); vib(p.lvlUp ? [60, 40, 120] : 30);
  showOv('<div class="ov-big pop">' + (p.lvlUp ? 'Level ' + p.lvl : 'Godkjent') + '</div><div class="ov-sub">' + esc(p.lvlUp ? 'Rolig nå. Du går forbi alle.' : OK[Math.floor(Math.random() * OK.length)]) + '</div>' +
    '<div class="ov-card pop"><div class="n" style="color:var(--money)">+' + p.kr + ' kr</div><div class="n" style="color:var(--xp)">+' + p.xp + ' XP</div>' + (p.perfect ? '<div class="st" style="margin-top:8px">Ukemål nådd: ekstra kiste</div>' : '') + (p.goalHit ? '<div class="st" style="margin-top:8px"><b>Stort mål nådd!</b> ' + esc((myChild().goal && myChild().goal.prize) || '') + '</div>' : p.gm ? '<div class="st" style="margin-top:8px">' + p.gm + ' % av det store målet</div>' : '') + ((p.chests || []).length ? '<div class="st" style="margin-top:8px">Ny kiste: ' + esc(p.chests.join(', ')) + '</div>' : '') + '</div>');
}

/* ---------- handlinger ---------- */
const fid = () => S.profile.familyId;
const questById = id => S.data.quests.filter(q => q.id === id)[0];
function setAvatar(patch) { const c = myChild(); return store.saveChild(fid(), c.id, patch); }

document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el) return;
  if (el.dataset.a === 'closesheet' && e.target.closest('[data-stop]') && el.classList.contains('overlay')) return;
  act(el.dataset.a, el, e);
});
document.addEventListener('submit', e => { e.preventDefault(); const id = e.target.id; if (id === 'authform') doAuth(); else if (id === 'kidform') doKid(); else if (id === 'createform') doCreate(); else if (id === 'joinform') doJoin(); else if (id === 'childform') doAddChild(); });
document.addEventListener('focusout', () => { setTimeout(() => { if (S.dirty && !(document.activeElement && document.activeElement.matches && document.activeElement.matches('input,select,textarea'))) render(); }, 60); });
document.addEventListener('change', e => { const t = e.target, f = t.dataset && t.dataset.f; if (f) onField(f, t); });

async function doAuth() {
  const email = $('#a-email').value.trim(), pw = $('#a-pw') ? $('#a-pw').value : '';
  S.err = '';
  await run(async () => {
    try {
      if (S.authMode === 'reset') { await store.resetPw(email); S.authMode = 'in'; S.err = ''; toast('Hvis e-posten finnes, er en lenke sendt.'); render(); return; }
      if (S.authMode === 'up') await store.signUp(email, pw); else await store.signIn(email, pw);
    } catch (e) { S.err = friendly(e); render(); }
  });
}
const kidEmail = code => code.trim().toLowerCase().replace(/[^a-z0-9]/g, '') + '@barn.hushelt.app';
async function doKid() {
  const code = $('#k-code').value.trim().toUpperCase(), pw = $('#k-pw').value, up = S.authMode === 'kid-up';
  S.err = '';
  await run(async () => {
    try {
      if (!up) { await store.signIn(kidEmail(code), pw); return; }
      S.joining = true;
      const u = await store.signUp(kidEmail(code), pw);
      const uid = (u && u.user && u.user.uid) || (S.user && S.user.uid);
      try { await store.joinFamily(uid, { code, userName: 'Barn' }); }
      catch (e) { S.joining = false; S.profile = null; S.view = 'start'; S.startMode = 'join'; S.err = friendly(e); render(); return; }
      S.profile = await store.getProfile(uid); S.joining = false; S.tab = ''; startFamily();
    } catch (e) { S.joining = false; S.err = friendly(e); render(); }
  });
}
async function doCreate() {
  await run(async () => {
    try { await store.createFamily(S.user.uid, { familyName: $('#s-fam').value.trim(), userName: $('#s-name').value.trim() }); S.profile = await store.getProfile(S.user.uid); S.tab = 'a-fam'; startFamily(); }
    catch (e) { S.err = friendly(e); render(); }
  });
}
async function doJoin() {
  await run(async () => {
    try { await store.joinFamily(S.user.uid, { code: $('#s-code').value, userName: $('#s-name').value.trim() }); S.profile = await store.getProfile(S.user.uid); S.tab = ''; startFamily(); }
    catch (e) { S.err = friendly(e); render(); }
  });
}
async function doAddChild() {
  const name = $('#c-name').value.trim(); if (!name) return;
  await run(async () => { const r = await store.addChild(fid(), { name }); toast('Lagt til. Koden til ' + name + ' er ' + r.code); });
}
function readForm() {
  return { title: $('#q-title').value.trim(), kr: Math.max(0, +$('#q-kr').value || 0), xp: Math.max(0, +$('#q-xp').value || 0), rep: $('#q-rep').value, ic: $('#q-ic').value, boss: $('#q-boss').checked, childId: $('#q-child') ? $('#q-child').value : S.form.childId, home: $('#q-home') ? $('#q-home').value : (S.form.home || 'both') };
}
async function onField(f, t) {
  const F = fid();
  if (f === 'childName') { const v = t.value.trim().slice(0, 14); if (v) await run(() => store.saveChild(F, S.profile.childId, { name: v })); }
  else if (f === 'splitOn') await run(() => store.updateFamily(F, { 'split.on': t.checked, 'split.start': fam().split && fam().split.start ? fam().split.start : L.mondayOf(L.today()) }));
  else if (f === 'homeA') await run(() => store.updateFamily(F, { 'homeNames.a': t.value.trim() || 'Hos mamma' }));
  else if (f === 'homeB') await run(() => store.updateFamily(F, { 'homeNames.b': t.value.trim() || 'Hos pappa' }));
  else if (f === 'myHome') await run(() => store.updateFamily(F, { ['adults.' + S.user.uid + '.home']: t.value || null }));
  else if (/^g(Title|Prize|Target|End|Need)$/.test(f) && t.dataset.c) {
    const c = S.data.children[t.dataset.c], g = Object.assign({}, c.goal);
    if (f === 'gTitle') g.title = t.value.trim();
    else if (f === 'gPrize') g.prize = t.value.trim();
    else if (f === 'gTarget') { g.target = Math.max(100, Math.round(+t.value || 0)); }
    else if (f === 'gEnd') g.end = t.value || '';
    else if (f === 'gNeed') g.need = Math.max(0, Math.round(+t.value || 0));
    const done = L.goalPct(g) >= 100;
    if (g.reached && !done) { g.reached = false; g.reachedAt = ''; } else if (!g.reached && done) { g.reached = true; g.reachedAt = L.today(); }
    await run(() => store.saveChild(F, c.id, { goal: g }));
  }
  else if (f === 'goal') await run(() => store.saveChild(F, t.dataset.c, { weekGoal: +t.value }));
}

async function act(a, el, ev) {
  const F = S.profile ? S.profile.familyId : null, v = el.dataset.v, id = el.dataset.id;
  switch (a) {
    case 'authmode': S.authMode = v; S.err = ''; render(); break;
    case 'startmode': S.startMode = v; S.err = ''; render(); break;
    case 'logout': await store.signOut(); break;
    case 'tab': S.tab = v; S.form = null; S.confirm = null; render(); beep(440, .05); break;
    case 'cat': S.cat = v; render(); break;
    case 'inbox': S.sheet = true; S.prevSeen = S.profile.seenAt || 0; S.profile.seenAt = Date.now(); store.setProfile(S.user.uid, { seenAt: S.profile.seenAt }).catch(() => {}); render(); break;
    case 'closesheet': S.sheet = false; render(); break;
    case 'closeov': S.ov = null; cancelAnimationFrame(raf); render(); checkCelebrate(); break;
    case 'demorole': { const r = isAdult() ? 'child' : 'adult'; store.setDemoRole(r); S.profile = await store.getProfile(); S.tab = r === 'adult' ? 'a-home' : 'home'; render(); break; }
    case 'resetdemo': store.resetDemo(); S.profile = await store.getProfile(); S.tab = 'a-home'; render(); break;
    /* barn */
    case 'take': await run(() => store.setQuestState(F, id, { st: 'taken', by: S.profile.childId })); beep(520, .1, 'square'); break;
    case 'done': await run(async () => { const q = questById(id); await store.setQuestState(F, id, { st: 'wait', by: S.profile.childId }); await store.addNotif(F, { type: 'done', to: 'adults', from: myChild().name, text: q.title }); }, 'Sendt til godkjenning'); beep(660, .15); break;
    case 'openchest': await run(async () => {
      const c = myChild(), i = +el.dataset.i, type = c.chests[i]; if (!type) return;
      const r = L.rollChest(type, c.inv), patch = { chests: c.chests.filter((_, k) => k !== i) };
      if (r.item) patch.inv = c.inv.concat([r.item]); else patch.coins = c.coins + r.coins;
      await store.saveChild(F, c.id, patch); jingle([200, 300, 500, 800, 1200]); vib([40, 30, 80]);
      const it = r.item ? ITEMBY[r.item] : null;
      showOv('<div class="ov-sub">' + esc(type) + '</div><div class="ov-card pop"><div class="n">' + (it ? esc(it.n) : '+' + r.coins + ' mynter') + '</div><div class="st" style="margin-top:6px">' + (it ? RARITY_NAME[it.rar] + ' ' + SLOT_NAME[it.slot] + '. Ta det på under Meg.' : 'Bruk dem i Meg-fanen.') + '</div></div>');
    }); break;
    case 'spin': await run(async () => {
      const c = myChild(); if (c.spinDay === L.today()) return;
      const r = L.spinReward(c.inv), patch = { spinDay: L.today() };
      if (r.item) patch.inv = c.inv.concat([r.item]); else patch.coins = c.coins + r.coins;
      await store.saveChild(F, c.id, patch); jingle([392, 523, 659]);
      showOv('<div class="ov-sub">Daglig spin</div><div class="ov-card pop"><div class="n">' + (r.item ? esc(ITEMBY[r.item].n) : '+' + r.coins + ' mynter') + '</div></div>');
    }); break;
    case 'preset': { const p = PRESETS[+el.dataset.i], c = myChild(); await run(() => setAvatar({ av: { g: p.g, skin: p.skin, hs: p.hs, hc: p.hc, tc: p.tc }, eq: Object.assign({}, c.eq, { top: p.top }) })); break; }
    case 'g': { const c = myChild(); await run(() => setAvatar({ av: Object.assign({}, c.av, { g: v, hs: { f: 'long', m: 'short', n: 'bob' }[v] }) })); break; }
    case 'skin': case 'hs': case 'hc': case 'tc': { const c = myChild(); await run(() => setAvatar({ av: Object.assign({}, c.av, { [a]: v }) })); break; }
    case 'equip': { const c = myChild(), it = ITEMBY[id]; const cur = c.eq[it.slot] === id && it.slot !== 'theme' && it.slot !== 'top' ? null : id; await run(() => setAvatar({ eq: Object.assign({}, c.eq, { [it.slot]: cur }) })); beep(600, .08); break; }
    case 'buy': { const c = myChild(), it = ITEMBY[id], p = PRICE[it.rar]; if (c.coins < p) { toast('Du trenger ' + (p - c.coins) + ' mynter til'); break; } await run(() => setAvatar({ inv: c.inv.concat([id]), coins: c.coins - p }), it.n + ' er din'); jingle([523, 784]); break; }
    case 'title': await run(() => setAvatar({ title: v })); break;
    /* voksne */
    case 'approve': await run(async () => { const q = questById(id); await store.approveQuest(F, id, { name: myName(), home: qHome(q) }); }, 'Godkjent'); jingle([523, 659]); break;
    case 'reject': await run(async () => { const q = questById(id), inp = $('#rm-' + id), m = (inp && inp.value.trim()) || BACK[Math.floor(Math.random() * BACK.length)]; await store.setQuestState(F, id, { st: 'back', msg: m }); await store.addNotif(F, { type: 'back', to: q.childId, from: myName(), text: '«' + q.title + '» ble sendt tilbake: ' + m }); }, 'Sendt tilbake'); break;
    case 'quickmsg': await run(() => store.addNotif(F, { type: 'msg', to: el.dataset.c, from: myName(), text: el.dataset.m }), 'Sendt'); break;
    case 'sendmsg': { const inp = $('#msg-' + el.dataset.c), m = inp && inp.value.trim(); if (!m) break; await run(() => store.addNotif(F, { type: 'msg', to: el.dataset.c, from: myName(), text: m }), 'Sendt'); inp.value = ''; break; }
    case 'newquest': S.form = { title: '', kr: 20, xp: 30, rep: 'Ukentlig', ic: 'spark', boss: false, childId: kids()[0].id, home: 'both' }; render(); break;
    case 'editquest': { const q = questById(id); S.form = { id: q.id, title: q.title, kr: q.kr, xp: q.xp, rep: q.rep, ic: q.ic, boss: !!q.boss, childId: q.childId, home: q.home || 'both' }; render(); break; }
    case 'tpl': { const t = L.TEMPLATES[+el.dataset.i], cur = readForm(); S.form = Object.assign({}, S.form, cur, { title: t.title, kr: t.kr, xp: t.xp, rep: t.rep, ic: t.ic, boss: !!t.boss }); render(); break; }
    case 'cancelform': S.form = null; render(); break;
    case 'savequest': await run(async () => {
      const f = readForm(); if (!f.title) { toast('Skriv en tittel først'); return; }
      if (S.form.id) await store.saveQuest(F, Object.assign({ id: S.form.id }, f));
      else { const targets = f.childId === 'all' ? kids().map(c => c.id) : [f.childId]; for (const cid of targets) await store.saveQuest(F, Object.assign({}, f, { childId: cid })); }
      S.form = null; render();
    }, 'Quest lagret'); break;
    case 'delquest': if (S.confirm === 'del:' + id) { S.confirm = null; await run(() => store.deleteQuest(F, id), 'Slettet'); } else { S.confirm = 'del:' + id; render(); } break;
    case 'pay': await run(() => { const c = S.data.children[el.dataset.c], h = el.dataset.h; return store.payout(F, c.id, h, c.owed[h] || 0, { name: myName() }); }, 'Utbetaling registrert'); jingle([784, 1047]); break;
    case 'undo': await run(() => store.undoLedger(F, id, { name: myName() }), 'Godkjenning trukket tilbake'); break;
    case 'share': { const c = S.data.children[el.dataset.c], url = location.href.split('#')[0].split('?')[0], txt = 'Hei ' + c.name + '! Åpne ' + url + ' , trykk «Jeg er barn og har en kode», skriv inn koden ' + c.code + ' og velg et passord.'; try { if (navigator.share) { await navigator.share({ text: txt }); break; } await navigator.clipboard.writeText(txt); toast('Invitasjonen er kopiert'); } catch (e) { /* avbrutt */ } break; }
    case 'newcode': await run(async () => { const code = await store.newChildCode(F, el.dataset.c); toast('Ny kode: ' + code); }); break;
    case 'pack': await run(async () => { for (const t of L.TEMPLATES.slice(0, 7)) await store.saveQuest(F, { title: t.title, ic: t.ic, kr: t.kr, xp: t.xp, rep: t.rep, boss: !!t.boss, childId: el.dataset.c, home: 'both' }); }, 'Quests lagt til'); break;
    case 'goalpct': { const cid = el.dataset.c, c = S.data.children[cid], pot = L.weeklyPotential(S.data.quests.filter(q => q.childId === cid)); if (!pot) { toast('Legg inn quests først'); break; } const sg = L.goalSuggest(pot, c.goal.start, c.goal.end, +v); const g = Object.assign({}, c.goal, { target: sg.target, need: sg.need }); g.reached = L.goalPct(g) >= 100; await run(() => store.saveChild(F, cid, { goal: g }), 'Kravet er satt til ' + v + ' % av maks'); break; }
    case 'goalnew': { const t = L.today(), cid = el.dataset.c, end = L.addDays(t, 365), pot = L.weeklyPotential(S.data.quests.filter(q => q.childId === cid)), sg = pot ? L.goalSuggest(pot, t, end, 80) : { target: 20000, need: 40 }; await run(() => store.saveChild(F, cid, { goal: { on: true, title: 'Sydentur', prize: 'Tur til syden', target: sg.target, need: sg.need, pw: 0, xp: 0, start: t, end, reached: false, reachedAt: '' } }), 'Mål opprettet. Kravet er satt til 80 % av maks.'); break; }
    case 'goalreset': { const cid = el.dataset.c; if (S.confirm === 'greset:' + cid) { S.confirm = null; const g = Object.assign({}, S.data.children[cid].goal, { xp: 0, pw: 0, reached: false, reachedAt: '', start: L.today() }); await run(() => store.saveChild(F, cid, { goal: g }), 'Fremdrift nullstilt'); } else { S.confirm = 'greset:' + cid; render(); } break; }
    case 'goaldel': { const cid = el.dataset.c; if (S.confirm === 'gdel:' + cid) { S.confirm = null; await run(() => store.saveChild(F, cid, { goal: null }), 'Mål slettet'); } else { S.confirm = 'gdel:' + cid; render(); } break; }
    case 'goalclaim': await run(() => store.saveChild(F, el.dataset.c, { goal: null }), 'Målet er fjernet'); break;
    case 'swapweek': await run(() => store.updateFamily(F, { 'split.first': fam().split.first === 'a' ? 'b' : 'a' }), 'Byttet uke'); break;
    default: break;
  }
}

boot();
