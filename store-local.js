// Demo-lagring: alt ligger i nettleseren på denne enheten. Brukes når Firebase ikke er satt opp i config.js.
import * as L from './logic.js';

const KEY = 'hushelt-demo-v3';

export function createLocalStore() {
  let db = null;
  const subs = new Set();
  const load = () => { try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { db = null; } if (!db) db = seed(); };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* privat modus */ } subs.forEach(f => f()); };
  const id = () => Math.random().toString(36).slice(2, 10);
  function seed() {
    const t = L.today();
    const kid = { ...L.newChild('Deg'), code: 'DEMO-BARN' };
    const quests = {};
    L.TEMPLATES.slice(0, 6).forEach((tp, i) => { quests['q' + i] = { title: tp.title, ic: tp.ic, kr: tp.kr, xp: tp.xp, rep: tp.rep, boss: !!tp.boss, childId: 'c1', home: 'both', st: 'open', by: '', doneKey: '' }; });
    return {
      profile: { familyId: 'demo', role: 'adult', name: 'Forelder', childId: '', seenAt: 0 },
      family: { name: 'Demo-familien', ownerUid: 'demo', adults: { demo: { name: 'Forelder', home: 'a' } }, split: { on: false, first: 'a', start: L.mondayOf(t) }, homeNames: { a: 'Hos mamma', b: 'Hos pappa' }, adultCode: 'DEMO-VOKS' },
      children: { c1: kid }, quests, notifs: [], ledger: {}
    };
  }
  load();
  const snapshot = () => ({
    family: { id: 'demo', ...db.family },
    children: Object.fromEntries(Object.entries(db.children).map(([k, v]) => [k, { id: k, ...v }])),
    quests: Object.entries(db.quests).map(([k, v]) => ({ id: k, ...v })),
    notifs: db.notifs.slice().sort((a, b) => b.at - a.at).slice(0, 40),
    ledger: Object.entries(db.ledger).map(([k, v]) => ({ id: k, ...v })).sort((a, b) => b.at - a.at).slice(0, 60)
  });
  const me = { name: 'Forelder' };
  const ok = async () => {};

  return {
    demo: true,
    onAuth(cb) { setTimeout(() => cb({ uid: 'demo', email: 'demo@lokal' }), 0); return () => {}; },
    signUp: ok, signIn: ok, signOut: ok, resetPw: ok,
    async getProfile() { return db.profile; },
    setDemoRole(role) { db.profile.role = role; db.profile.childId = role === 'child' ? 'c1' : ''; save(); },
    resetDemo() { localStorage.removeItem(KEY); load(); save(); },
    createFamily: ok, joinFamily: ok,
    subscribeFamily(fid, role, cb) { const f = () => cb(snapshot()); subs.add(f); setTimeout(f, 0); return () => subs.delete(f); },
    async addChild(fid, { name }) { const cid = id(), code = L.makeCode(); db.children[cid] = { ...L.newChild(name), code }; save(); return { cid, code }; },
    async saveChild(fid, cid, patch) { Object.assign(db.children[cid], patch); save(); },
    async updateFamily(fid, patch) {
      Object.keys(patch).forEach(k => {
        if (k.indexOf('.') > 0) { const p = k.split('.'); let o = db.family; for (let i = 0; i < p.length - 1; i++) o = o[p[i]]; o[p[p.length - 1]] = patch[k]; } else db.family[k] = patch[k];
      });
      save();
    },
    async setProfile(uid, patch) { Object.assign(db.profile, patch); save(); },
    async saveQuest(fid, q) { const { id: qid, ...rest } = q; if (qid) Object.assign(db.quests[qid], rest); else db.quests[id()] = { st: 'open', by: '', doneKey: '', ...rest }; save(); },
    async deleteQuest(fid, qid) { delete db.quests[qid]; save(); },
    async setQuestState(fid, qid, patch) { Object.assign(db.quests[qid], patch); save(); },
    async addNotif(fid, n) { db.notifs.push({ id: id(), at: Date.now(), ...n }); db.notifs = db.notifs.slice(-80); save(); },
    async approveQuest(fid, qid, who) {
      const q = db.quests[qid];
      if (!q || L.qState(q) !== 'wait') throw new Error('not-waiting');
      const s = L.today(), c = db.children[q.childId];
      const r = L.approve(c, q, s, who.home);
      db.children[q.childId] = { ...c, ...r.child };
      q.st = 'done'; q.doneKey = L.cycleKey(q.rep, s);
      db.ledger[id()] = { at: Date.now(), type: 'quest', childId: q.childId, childName: c.name, title: q.title, kr: q.kr, xp: q.xp, home: who.home, wk: r.info.wk, di: r.info.di, g: r.info.g, by: who.name, undone: false, qid };
      db.notifs.push({ id: id(), at: Date.now(), type: 'approved', to: q.childId, from: who.name, text: q.title, payload: r.info });
      if (r.info.goalHit) db.notifs.push({ id: id(), at: Date.now() + 1, type: 'msg', to: 'adults', from: c.name, text: c.name + ' har nådd målet: ' + ((c.goal && c.goal.prize) || 'målet') });
      save(); return r.info;
    },
    async undoLedger(fid, lid, who) {
      const e = db.ledger[lid];
      if (!e || e.undone || e.type !== 'quest') throw new Error('cannot-undo');
      db.children[e.childId] = { ...db.children[e.childId], ...L.undo(db.children[e.childId], e) };
      e.undone = true; if (e.qid && db.quests[e.qid]) db.quests[e.qid].st = 'wait';
      db.notifs.push({ id: id(), at: Date.now(), type: 'msg', to: e.childId, from: who.name, text: 'Godkjenningen av «' + e.title + '» ble trukket tilbake.' });
      save();
    },
    async payout(fid, cid, home, amount, who) {
      const c = db.children[cid];
      db.children[cid] = { ...c, ...L.payout(c, home, amount) };
      db.ledger[id()] = { at: Date.now(), type: 'payout', childId: cid, childName: c.name, title: 'Utbetaling', kr: amount, xp: 0, home, by: who.name, undone: false };
      db.notifs.push({ id: id(), at: Date.now(), type: 'payout', to: cid, from: who.name, text: amount + ' kr er utbetalt.' });
      save();
    }
  };
}
