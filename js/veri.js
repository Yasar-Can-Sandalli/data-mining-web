// ============================================================
//  Veri katmanı: Firebase (gerçek) veya DEMO (tarayıcı içi prova)
//  İki ekran da sadece bu dosyadaki fonksiyonları kullanır.
// ============================================================
import { firebaseConfig, ADMIN_EMAIL } from "./ayarlar.js";

const FB = "https://www.gstatic.com/firebasejs/10.12.2";

const url = new URL(location.href);
export const DEMO = url.searchParams.has("demo") || !firebaseConfig.apiKey;

const BOS_KONTROL = { asama: 1, sekme: "ozet", kodId: null, cevapGoster: false, tahminAcik: false, korelasyonGoster: false, odulIndex: -1 };

function msYap(t) {
  if (t === null || t === undefined) return null;
  if (typeof t === "number") return t;
  if (typeof t.toMillis === "function") return t.toMillis();
  return null;
}

function normalize(id, d) {
  const hesap = {};
  if (d.hesap) for (const [k, v] of Object.entries(d.hesap)) hesap[k] = msYap(v);
  return { ...d, id, zaman: msYap(d.zaman), tahminZaman: msYap(d.tahminZaman), hesap };
}

// ------------------------------------------------------------
//  FIREBASE
// ------------------------------------------------------------
async function firebaseKatmani() {
  const [{ initializeApp }, A, F] = await Promise.all([
    import(`${FB}/firebase-app.js`),
    import(`${FB}/firebase-auth.js`),
    import(`${FB}/firebase-firestore.js`)
  ]);
  const app = initializeApp(firebaseConfig);
  const auth = A.getAuth(app);
  const db = F.getFirestore(app);
  const kontrolRef = F.doc(db, "kontrol", "durum");

  function kullaniciBekle() {
    return new Promise(res => {
      const kapat = A.onAuthStateChanged(auth, u => { kapat(); res(u); });
    });
  }

  return {
    demo: false,
    async anonimGiris() {
      let u = await kullaniciBekle();
      if (!u) u = (await A.signInAnonymously(auth)).user;
      return u.uid;
    },
    async yoneticiDurumu() {
      const u = await kullaniciBekle();
      return u && !u.isAnonymous && u.email === ADMIN_EMAIL ? u.email : null;
    },
    async yoneticiGiris(eposta, sifre) {
      const k = await A.signInWithEmailAndPassword(auth, eposta, sifre);
      if (k.user.email !== ADMIN_EMAIL) { await A.signOut(auth); throw new Error("Bu hesap yönetici değil."); }
      return k.user.email;
    },
    async cikis() { await A.signOut(auth); },

    kontrolDinle(cb, hata) {
      return F.onSnapshot(kontrolRef,
        s => cb({ ...BOS_KONTROL, ...(s.exists() ? s.data() : {}) }),
        e => hata && hata(e));
    },
    async kontrolYaz(patch) { await F.setDoc(kontrolRef, patch, { merge: true }); },
    async kontrolHazirla() {
      const s = await F.getDoc(kontrolRef);
      if (!s.exists() || s.data().asama === undefined) await F.setDoc(kontrolRef, BOS_KONTROL, { merge: true });
    },

    katilimcilariDinle(cb, hata) {
      return F.onSnapshot(F.collection(db, "katilimcilar"),
        s => cb(s.docs.map(d => normalize(d.id, d.data({ serverTimestamps: "estimate" })))),
        e => hata && hata(e));
    },
    async formKaydet(uid, veri) {
      await F.setDoc(F.doc(db, "katilimcilar", uid), { ...veri, zaman: F.serverTimestamp() }, { merge: true });
    },
    async hesapKaydet(uid, gorev) {
      await F.updateDoc(F.doc(db, "katilimcilar", uid), { [`hesap.${gorev}`]: F.serverTimestamp() });
    },
    async tahminKaydet(uid, deger) {
      await F.updateDoc(F.doc(db, "katilimcilar", uid), { tahmin: deger, tahminZaman: F.serverTimestamp() });
    },
    async tumunuSil() {
      const s = await F.getDocs(F.collection(db, "katilimcilar"));
      const parcalar = [];
      for (let i = 0; i < s.docs.length; i += 400) parcalar.push(s.docs.slice(i, i + 400));
      for (const p of parcalar) {
        const b = F.writeBatch(db);
        p.forEach(d => b.delete(d.ref));
        await b.commit();
      }
      await F.setDoc(kontrolRef, BOS_KONTROL);
      return s.docs.length;
    }
  };
}

// ------------------------------------------------------------
//  DEMO: localStorage + sekmeler arası senkron (prova için)
// ------------------------------------------------------------
function demoKatmani() {
  const ANAHTAR = "hastak_canli_demo";
  const oku = () => {
    try { return JSON.parse(localStorage.getItem(ANAHTAR)) || { kontrol: { ...BOS_KONTROL }, katilimcilar: {} }; }
    catch { return { kontrol: { ...BOS_KONTROL }, katilimcilar: {} }; }
  };
  const dinleyiciler = new Set();
  const yay = () => { const d = oku(); dinleyiciler.forEach(f => f(d)); };
  const yaz = d => { localStorage.setItem(ANAHTAR, JSON.stringify(d)); yay(); };
  window.addEventListener("storage", e => { if (e.key === ANAHTAR) yay(); });

  let uid = sessionStorage.getItem("hastak_demo_uid");
  if (!uid) { uid = "demo_" + Math.random().toString(36).slice(2, 10); sessionStorage.setItem("hastak_demo_uid", uid); }

  return {
    demo: true,
    async anonimGiris() { return uid; },
    async yoneticiDurumu() { return sessionStorage.getItem("hastak_demo_admin"); },
    async yoneticiGiris(eposta) { sessionStorage.setItem("hastak_demo_admin", eposta || "demo"); return eposta || "demo"; },
    async cikis() { sessionStorage.removeItem("hastak_demo_admin"); },
    kontrolDinle(cb) {
      const f = d => cb({ ...BOS_KONTROL, ...d.kontrol });
      dinleyiciler.add(f); f(oku());
      return () => dinleyiciler.delete(f);
    },
    async kontrolYaz(patch) { const d = oku(); d.kontrol = { ...d.kontrol, ...patch }; yaz(d); },
    async kontrolHazirla() {},
    katilimcilariDinle(cb) {
      const f = d => cb(Object.entries(d.katilimcilar).map(([id, v]) => normalize(id, v)));
      dinleyiciler.add(f); f(oku());
      return () => dinleyiciler.delete(f);
    },
    async formKaydet(u, veri) { const d = oku(); d.katilimcilar[u] = { ...(d.katilimcilar[u] || {}), ...veri, zaman: Date.now() }; yaz(d); },
    async hesapKaydet(u, gorev) {
      const d = oku(); const k = d.katilimcilar[u]; if (!k) throw new Error("Önce formu doldur.");
      k.hesap = { ...(k.hesap || {}), [gorev]: Date.now() }; yaz(d);
    },
    async tahminKaydet(u, deger) {
      const d = oku(); const k = d.katilimcilar[u]; if (!k) throw new Error("Önce formu doldur.");
      k.tahmin = deger; k.tahminZaman = Date.now(); yaz(d);
    },
    async tumunuSil() { const n = Object.keys(oku().katilimcilar).length; yaz({ kontrol: { ...BOS_KONTROL }, katilimcilar: {} }); return n; },
    // Sadece demo: prova için sahte sınıf verisi
    async ornekVeriEkle(adet = 32) {
      const d = oku();
      const adlar = ["Ali Yılmaz","Ayşe Kaya","Mehmet Demir","Zeynep Çelik","Emre Şahin","Elif Aydın","Burak Öztürk","Selin Arslan","Can Doğan","Merve Koç","Kerem Kurt","Ece Aslan","Mert Polat","Buse Erdoğan","Onur Kılıç","Gizem Yıldız","Hakan Çetin","Derya Güneş","Furkan Aksoy","İrem Taş","Oğuz Bulut","Sude Karaca","Barış Özkan","Melis Tekin","Umut Yavuz","Dilara Acar","Serkan Uçar","Ceren Bozkurt","Tolga Kara","Nisa Duman","Yusuf Ateş","Ebru Sarı","Kaan Işık","Ilgın Tuna","Arda Er"];
      let tohum = 7; const rnd = () => (tohum = (tohum * 16807) % 2147483647) / 2147483647;
      const uyg = ["whatsapp","instagram","youtube","tiktok","x","oyun","diger"];
      const agirlik = [70, 75, 45, 30, 10, 25, 20];
      for (let i = 0; i < Math.min(adet, adlar.length); i++) {
        const carpan = i === 3 ? 2.4 : (0.45 + rnd() * 1.1);
        const k = { ad: adlar[i] };
        uyg.forEach((u, j) => { k[u] = Math.max(0, Math.round(agirlik[j] * carpan * (rnd() < (i === 3 ? 0 : 0.25) ? 0 : 0.4 + rnd() * 1.3) / 1)); });
        k.toplam = uyg.reduce((s, u) => s + k[u], 0);
        const enCok = uyg.reduce((m, u) => (k[u] > (k[m] ?? -1) ? u : m), "whatsapp");
        k.en_cok = k.toplam ? enCok : "yok";
        k.adim = rnd() < 0.12 ? null : Math.max(800, Math.round((11000 - k.toplam * 13 + (rnd() - 0.5) * 5000) / 10) * 10);
        k.zaman = Date.now() - (adet - i) * 1500;
        k.hesap = {};
        d.katilimcilar["ornek_" + i] = k;
      }
      yaz(d);
    }
  };
}

let katman = null;
export async function veriKatmani() {
  if (!katman) katman = DEMO ? demoKatmani() : await firebaseKatmani();
  return katman;
}
