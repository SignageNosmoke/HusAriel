// Lagring og innlogging med Firebase (gratisplanen Spark: Auth + Firestore, ingen Cloud Functions).
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, collection, onSnapshot, query, orderBy, limit, runTransaction, writeBatch } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import * as L from './logic.js';

const clean = o => JSON.parse(JSON.stringify(o)); // fjerner undefined, Firestore tåler ikke det

export function createFirebaseStore(cfg) {
  const app = initializeApp(cfg);
  const auth = getAuth(app);
  const db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  const F = fid => doc(db, 'families', fid);
  const C = (fid, name) => collection(db, 'families', fid, name);

  return {
    demo: false,
    onAuth(cb) { return onAuthStateChanged(auth, u => cb(u ? { uid: u.uid, email: u.email } : null)); },
    signUp: (e, p) => createUserWithEmailAndPassword(auth, e, p),
    signIn: (e, p) => signInWithEmailAndPassword(auth, e, p),
    signOut: () => signOut(auth),
    resetPw: e => sendPasswordResetEmail(auth, e),

    async getProfile(uid) { const s = await getDoc(doc(db, 'users', uid)); return s.exists() ? s.data() : null; },

    async createFamily(uid, { familyName, userName }) {
      const fid = doc(collection(db, 'families')).id, code = L.makeCode();
      const b = writeBatch(db);
      b.set(F(fid), clean({ name: familyName, ownerUid: uid, adults: { [uid]: { name: userName, home: null } }, split: { on: false, first: 'a', start: L.mondayOf(L.today()) }, homeNames: { a: 'Hos mamma', b: 'Hos pappa' }, adultCode: code, createdAt: Date.now() }));
      b.set(doc(db, 'users', uid), { familyId: fid, role: 'adult', name: userName, childId: '', seenAt: 0 });
      b.set(doc(db, 'joinCodes', code), { familyId: fid, role: 'adult', childId: '' });
      await b.commit();
      return { fid, code };
    },
    async joinFamily(uid, { code, userName }) {
      code = code.trim().toUpperCase();
      const s = await getDoc(doc(db, 'joinCodes', code));
      if (!s.exists()) throw new Error('code-not-found');
      const j = s.data();
      await setDoc(doc(db, 'users', uid), { familyId: j.familyId, role: j.role, name: userName, childId: j.childId || '', joinCode: code, seenAt: 0 });
      if (j.role === 'adult') await updateDoc(F(j.familyId), { ['adults.' + uid]: { name: userName, home: null } });
      return j;
    },

    subscribeFamily(fid, role, cb, onErr) {
      const st = { family: null, children: {}, quests: [], notifs: [], ledger: [] };
      let t = 0;
      const emit = () => { clearTimeout(t); t = setTimeout(() => { if (st.family) cb(st); }, 30); };
      const off = [];
      off.push(onSnapshot(F(fid), s => { st.family = s.exists() ? { id: s.id, ...s.data() } : null; emit(); }, onErr));
      off.push(onSnapshot(C(fid, 'children'), s => { st.children = {}; s.forEach(d => { st.children[d.id] = { id: d.id, ...d.data() }; }); emit(); }, onErr));
      off.push(onSnapshot(C(fid, 'quests'), s => { st.quests = s.docs.map(d => ({ id: d.id, ...d.data() })); emit(); }, onErr));
      off.push(onSnapshot(query(C(fid, 'notifs'), orderBy('at', 'desc'), limit(40)), s => { st.notifs = s.docs.map(d => ({ id: d.id, ...d.data() })); emit(); }, onErr));
      if (role === 'adult') off.push(onSnapshot(query(C(fid, 'ledger'), orderBy('at', 'desc'), limit(60)), s => { st.ledger = s.docs.map(d => ({ id: d.id, ...d.data() })); emit(); }, onErr));
      return () => off.forEach(f => f());
    },

    async addChild(fid, { name }) {
      const cref = doc(C(fid, 'children')), code = L.makeCode();
      const b = writeBatch(db);
      b.set(cref, clean({ ...L.newChild(name), code }));
      b.set(doc(db, 'joinCodes', code), { familyId: fid, role: 'child', childId: cref.id });
      await b.commit();
      return { cid: cref.id, code };
    },
    async newChildCode(fid, cid) {
      const code = L.makeCode(), b = writeBatch(db);
      b.set(doc(db, 'joinCodes', code), { familyId: fid, role: 'child', childId: cid });
      b.update(doc(C(fid, 'children'), cid), { code });
      await b.commit();
      return code;
    },
    saveChild: (fid, cid, patch) => updateDoc(doc(C(fid, 'children'), cid), clean(patch)),
    updateFamily: (fid, patch) => updateDoc(F(fid), clean(patch)),
    setProfile: (uid, patch) => updateDoc(doc(db, 'users', uid), clean(patch)),

    async saveQuest(fid, q) {
      const { id, ...rest } = q;
      if (id) return updateDoc(doc(C(fid, 'quests'), id), clean(rest));
      return addDoc(C(fid, 'quests'), clean({ st: 'open', by: '', doneKey: '', ...rest }));
    },
    deleteQuest: (fid, id) => deleteDoc(doc(C(fid, 'quests'), id)),
    setQuestState: (fid, id, patch) => updateDoc(doc(C(fid, 'quests'), id), clean(patch)),
    addNotif: (fid, n) => addDoc(C(fid, 'notifs'), clean({ at: Date.now(), ...n })),

    approveQuest(fid, qid, who) {
      return runTransaction(db, async tx => {
        const qref = doc(C(fid, 'quests'), qid), qs = await tx.get(qref);
        if (!qs.exists()) throw new Error('quest-missing');
        const q = qs.data();
        if (L.qState(q) !== 'wait') throw new Error('not-waiting');
        const cref = doc(C(fid, 'children'), q.childId), cs = await tx.get(cref);
        const s = L.today();
        const r = L.approve(cs.data(), q, s, who.home);
        tx.update(cref, clean(r.child));
        tx.update(qref, { st: 'done', doneKey: L.cycleKey(q.rep, s) });
        tx.set(doc(C(fid, 'ledger')), clean({ at: Date.now(), type: 'quest', childId: q.childId, childName: cs.data().name, title: q.title, kr: q.kr, xp: q.xp, home: who.home, wk: r.info.wk, di: r.info.di, g: r.info.g, pf: r.info.pf, by: who.name, undone: false, qid }));
        tx.set(doc(C(fid, 'notifs')), clean({ at: Date.now(), type: 'approved', to: q.childId, from: who.name, text: q.title, payload: r.info }));
        if (r.info.goalHit) {
          const gt = (cs.data().goal && cs.data().goal.prize) || 'målet';
          tx.set(doc(C(fid, 'notifs')), clean({ at: Date.now() + 1, type: 'msg', to: 'adults', from: cs.data().name, text: cs.data().name + ' har nådd målet: ' + gt }));
        }
        return r.info;
      });
    },
    undoLedger(fid, lid, who) {
      return runTransaction(db, async tx => {
        const lref = doc(C(fid, 'ledger'), lid), ls = await tx.get(lref);
        const e = ls.data();
        if (!e || e.undone || e.type !== 'quest') throw new Error('cannot-undo');
        const cref = doc(C(fid, 'children'), e.childId), cs = await tx.get(cref);
        tx.update(cref, clean(L.undo(cs.data(), e)));
        tx.update(lref, { undone: true });
        if (e.qid) { const qref = doc(C(fid, 'quests'), e.qid), qs = await tx.get(qref); if (qs.exists()) tx.update(qref, { st: 'wait' }); }
        tx.set(doc(C(fid, 'notifs')), clean({ at: Date.now(), type: 'msg', to: e.childId, from: who.name, text: 'Godkjenningen av «' + e.title + '» ble trukket tilbake.' }));
      });
    },
    payout(fid, cid, home, amount, who) {
      return runTransaction(db, async tx => {
        const cref = doc(C(fid, 'children'), cid), cs = await tx.get(cref);
        const c = cs.data();
        tx.update(cref, clean(L.payout(c, home, amount)));
        tx.set(doc(C(fid, 'ledger')), clean({ at: Date.now(), type: 'payout', childId: cid, childName: c.name, title: 'Utbetaling', kr: amount, xp: 0, home, by: who.name, undone: false }));
        tx.set(doc(C(fid, 'notifs')), clean({ at: Date.now(), type: 'payout', to: cid, from: who.name, text: amount + ' kr er utbetalt.' }));
      });
    }
  };
}
