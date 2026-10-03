// Ren logikk uten DOM og uten Firebase. Brukes av begge lagringsløsningene og kan testes i node.
import { ITEMS } from './avatar.js';

export function pad(n) { return String(n).padStart(2, '0'); }
export function today(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function parse(s) { var p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2], 12); }
export function addDays(s, n) { var d = parse(s); d.setDate(d.getDate() + n); return today(d); }
export function daysBetween(a, b) { return Math.round((parse(b) - parse(a)) / 864e5); }
export function dayIdx(s) { return (parse(s).getDay() + 6) % 7; } // mandag = 0
export function mondayOf(s) { return addDays(s, -dayIdx(s)); }

export function cycleKey(rep, s) {
  s = s || today();
  if (rep === 'Daglig') return s;
  if (rep === 'Ukentlig') return mondayOf(s);
  if (rep === 'Månedlig') return s.slice(0, 7);
  return 'once';
}
// Tilstand for en quest akkurat nå. En ferdig quest blir åpen igjen når perioden er over.
export function qState(q, s) {
  if (q.st === 'done' && q.doneKey !== cycleKey(q.rep, s)) return 'open';
  return q.st || 'open';
}
// Hvilket hjem som gjelder denne uka ('a' eller 'b'). Uten delt bosted alltid 'a'.
export function homeFor(family, s) {
  var sp = family && family.split;
  if (!sp || !sp.on) return 'a';
  var w = Math.floor(daysBetween(mondayOf(sp.start), mondayOf(s || today())) / 7);
  var even = ((w % 2) + 2) % 2 === 0;
  return even ? sp.first : (sp.first === 'a' ? 'b' : 'a');
}

// Nivåer. Fra nivå n til n+1 trengs 40 + 12n XP. Nivå regnes alltid ut fra total-XP.
export function need(l) { return 40 + 12 * l; }
export function cum(l) { return 40 * (l - 1) + 6 * l * (l - 1); }
export function levelOf(xp) { var l = 1; while (xp >= cum(l + 1)) l++; return l; }
export function progress(xp) { var l = levelOf(xp); return { lvl: l, xp: xp - cum(l), need: need(l) }; }

export function newChild(name) {
  return {
    name: name, av: { g: 'f', skin: '#f3c9a5', hs: 'long', hc: '#6b4226', tc: '#7b5cf0' },
    eq: { theme: 'dusk', frame: null, sticker: null, acc: null, top: 'hoodie', pet: null },
    inv: ['dusk', 'hoodie', 'tee'], chests: [], coins: 0, title: 'Nybegynner',
    xpTotal: 0, owed: { a: 0, b: 0 }, earnedTotal: 0, paidTotal: 0,
    streak: 0, bestStreak: 0, shields: 0, lastDay: '', approved: 0,
    weekKey: '', weekArr: [0, 0, 0, 0, 0, 0, 0], weekDone: 0, weekGoal: 5, counts: {}, spinDay: '', goal: null
  };
}

// Langtidsmål (for eksempel «Sydentur»): XP som teller fra startdato, valgfri frist.
export function goalPct(g) { return g && g.target > 0 ? Math.min(100, Math.floor((g.xp || 0) / g.target * 100)) : 0; }
export function goalView(g, s) {
  s = s || today();
  var pct = goalPct(g), left = Math.max(0, g.target - (g.xp || 0)), out = { pct: pct, left: left, days: null, pace: null, perWeek: null };
  if (g.end) {
    out.days = Math.max(0, daysBetween(s, g.end));
    var total = Math.max(1, daysBetween(g.start || s, g.end)), el = Math.max(0, daysBetween(g.start || s, s));
    var want = el / total * 100;
    out.pace = g.reached ? null : (pct >= want + 3 ? 'ahead' : pct >= want - 3 ? 'on' : 'behind');
    out.perWeek = out.days > 0 ? Math.ceil(left / Math.max(1, out.days / 7)) : left;
  }
  return out;
}
export function weeklyPotential(quests) {
  var m = { 'Daglig': 7, 'Ukentlig': 1, 'Månedlig': 12 / 52, 'Én gang': 0 }, t = 0;
  quests.forEach(function (q) { t += q.xp * (m[q.rep] || 0); });
  return Math.round(t);
}
export function titlesFor(c) {
  var l = levelOf(c.xpTotal), t = ['Nybegynner'];
  if (l >= 3) t.push('Lærling');
  if (c.approved >= 10) t.push('Pålitelig');
  if ((c.bestStreak || 0) >= 7) t.push('Streak-maskin');
  if (c.approved >= 25) t.push('Ryddig');
  if (l >= 10) t.push('Husets Helt');
  if (l >= 25) t.push('Legende');
  return t;
}

// Ukens data hører til inneværende uke; gamle uker vises som nuller.
export function weekView(c, s) {
  return c.weekKey === mondayOf(s || today()) ? { arr: c.weekArr, done: c.weekDone } : { arr: [0, 0, 0, 0, 0, 0, 0], done: 0 };
}

export function approve(child, quest, s, home) {
  var c = JSON.parse(JSON.stringify(child));
  var wk = mondayOf(s), di = dayIdx(s);
  if (c.weekKey !== wk) { c.weekKey = wk; c.weekArr = [0, 0, 0, 0, 0, 0, 0]; c.weekDone = 0; }
  c.weekArr[di] += 1; c.weekDone += 1;
  var before = levelOf(c.xpTotal);
  c.xpTotal += quest.xp;
  var after = levelOf(c.xpTotal);
  if (c.lastDay !== s) {
    var gap = c.lastDay ? daysBetween(c.lastDay, s) : 1;
    if (gap === 1) c.streak += 1;
    else {
      var missed = gap - 1;
      if (c.shields >= missed) { c.shields -= missed; c.streak += 1; } else { c.streak = 1; }
    }
    if (c.streak % 7 === 0) c.shields = Math.min(3, c.shields + 1);
    c.lastDay = s;
  }
  c.bestStreak = Math.max(c.bestStreak || 0, c.streak);
  c.approved += 1;
  var chests = [];
  if (c.approved % 3 === 0) chests.push('Mystery Box');
  for (var l = before + 1; l <= after; l++) { if (l % 10 === 0) chests.push('Epic Chest'); else if (l % 5 === 0) chests.push('Lucky Chest'); }
  var perfect = c.weekDone === c.weekGoal;
  if (perfect) chests.push('Lucky Chest');
  c.chests = c.chests.concat(chests);
  c.coins += Math.ceil(quest.xp / 2) + (after > before ? 25 * (after - before) : 0);
  c.owed[home] = (c.owed[home] || 0) + quest.kr;
  c.earnedTotal += quest.kr;
  c.counts[quest.title] = (c.counts[quest.title] || 0) + 1;
  var g = false, gm = 0, gHit = false;
  if (c.goal && c.goal.on && !c.goal.reached && s >= (c.goal.start || '')) {
    var p0 = goalPct(c.goal); g = true;
    c.goal.xp = (c.goal.xp || 0) + quest.xp;
    var p1 = goalPct(c.goal);
    [25, 50, 75, 100].forEach(function (m) { if (p0 < m && p1 >= m) gm = m; });
    if (p1 >= 100) { c.goal.reached = true; c.goal.reachedAt = s; gHit = true; }
  }
  return { child: c, info: { g: g, gm: gm, goalHit: gHit, kr: quest.kr, xp: quest.xp, lvl: after, lvlUp: after > before, chests: chests, perfect: perfect, streak: c.streak, wk: wk, di: di, home: home } };
}

export function undo(child, e) {
  var c = JSON.parse(JSON.stringify(child));
  c.xpTotal = Math.max(0, c.xpTotal - e.xp);
  c.owed[e.home] = Math.max(0, (c.owed[e.home] || 0) - e.kr);
  c.earnedTotal = Math.max(0, c.earnedTotal - e.kr);
  c.approved = Math.max(0, c.approved - 1);
  c.coins = Math.max(0, c.coins - Math.ceil(e.xp / 2));
  if (c.counts[e.title]) c.counts[e.title] = Math.max(0, c.counts[e.title] - 1);
  if (e.g && c.goal) {
    c.goal.xp = Math.max(0, (c.goal.xp || 0) - e.xp);
    if (c.goal.reached && c.goal.xp < c.goal.target) { c.goal.reached = false; c.goal.reachedAt = ''; }
  }
  if (c.weekKey === e.wk) { c.weekArr[e.di] = Math.max(0, c.weekArr[e.di] - 1); c.weekDone = Math.max(0, c.weekDone - 1); }
  return c;
}

export function payout(child, home, amount) {
  var c = JSON.parse(JSON.stringify(child));
  c.owed[home] = Math.max(0, (c.owed[home] || 0) - amount);
  c.paidTotal += amount;
  return c;
}

// Kister og spin
var WEIGHTS = {
  'Mystery Box': { c: 75, r: 22, e: 3, l: 0 }, 'Lucky Chest': { c: 45, r: 40, e: 13, l: 2 },
  'Epic Chest': { c: 0, r: 50, e: 42, l: 8 }, 'Legendary Chest': { c: 0, r: 0, e: 40, l: 60 }
};
export function rollChest(type, inv, rnd) {
  rnd = rnd || Math.random;
  var w = WEIGHTS[type] || WEIGHTS['Mystery Box'], tot = 0, k;
  for (k in w) tot += w[k];
  var x = rnd() * tot, rar = 'c';
  for (k in w) { if (x < w[k]) { rar = k; break; } x -= w[k]; }
  var pool = ITEMS.filter(function (i) { return i.rar === rar && inv.indexOf(i.id) < 0; });
  if (!pool.length) pool = ITEMS.filter(function (i) { return inv.indexOf(i.id) < 0; });
  if (!pool.length) return { coins: 40 };
  return { item: pool[Math.floor(rnd() * pool.length)].id };
}
export function spinReward(inv, rnd) {
  rnd = rnd || Math.random;
  if (rnd() < 0.12) {
    var pool = ITEMS.filter(function (i) { return i.rar === 'c' && inv.indexOf(i.id) < 0; });
    if (pool.length) return { item: pool[Math.floor(rnd() * pool.length)].id };
  }
  return { coins: 5 + Math.floor(rnd() * 16) };
}

export function makeCode(rnd) {
  rnd = rnd || Math.random;
  var a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = '';
  for (var i = 0; i < 8; i++) s += a[Math.floor(rnd() * a.length)];
  return s.slice(0, 4) + '-' + s.slice(4);
}

export const TEMPLATES = [
  { title: 'Tømme vaskemaskinen', ic: 'washer', kr: 10, xp: 10, rep: 'Daglig' },
  { title: 'Tømme oppvaskmaskinen', ic: 'dish', kr: 15, xp: 25, rep: 'Daglig' },
  { title: 'Ta ut søppel', ic: 'trash', kr: 10, xp: 10, rep: 'Daglig' },
  { title: 'Støvsuge rommet', ic: 'vac', kr: 20, xp: 40, rep: 'Ukentlig' },
  { title: 'Vaske bad', ic: 'bath', kr: 50, xp: 100, rep: 'Ukentlig', boss: true },
  { title: 'Rydde kjøkken', ic: 'kitchen', kr: 25, xp: 40, rep: 'Ukentlig' },
  { title: 'Rydde rommet', ic: 'bed', kr: 20, xp: 30, rep: 'Ukentlig' },
  { title: 'Handle inn', ic: 'cart', kr: 30, xp: 50, rep: 'Ukentlig' },
  { title: 'Ute-jobb (plen, løv)', ic: 'leaf', kr: 40, xp: 60, rep: 'Månedlig' }
];
