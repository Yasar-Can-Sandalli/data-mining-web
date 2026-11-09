// Ödüller – iki ekran da aynı hesabı kullanır
import { UYGULAMALAR } from "./sabitler.js";
import { ortalama, ceyrekler, pearson, bicim, sureYaz } from "./istatistik.js";
import { GOREVLER } from "./sabitler.js";

function enler(satirlar, deger, yon = "max") {
  const g = satirlar.filter(r => Number.isFinite(deger(r)));
  if (!g.length) return [];
  const hedef = yon === "max" ? Math.max(...g.map(deger)) : Math.min(...g.map(deger));
  return g.filter(r => deger(r) === hedef);
}
const adlar = rs => rs.length > 3
  ? rs.slice(0, 3).map(r => r.ad).join(", ") + ` ve ${rs.length - 3} kişi daha (berabere)`
  : rs.map(r => r.ad).join(" & ");

export function odulleriHesapla(satirlar) {
  const liste = [];
  if (!satirlar.length) return liste;
  const ort = ortalama(satirlar.map(r => r.toplam));

  // 1) Hesap Ustası: 5 görevi ilk bitiren
  const bitiren = satirlar
    .map(r => ({ r, t: GOREVLER.every(g => r.hesap?.[g.k]) ? Math.max(...GOREVLER.map(g => r.hesap[g.k])) : null }))
    .filter(x => x.t);
  if (bitiren.length) {
    bitiren.sort((a, b) => a.t - b.t);
    liste.push({ id: "hesap", emoji: "🧮", unvan: "Hesap Ustası", kisiler: [bitiren[0].r],
      aciklama: `5 görevin hepsini ilk bitiren (${bitiren.length} kişi bitirdi)` });
  }

  // 2) Kâhin: korelasyon tahmini en yakın olan
  const p = pearson(satirlar.map(r => r.toplam), satirlar.map(r => r.adim));
  const tahminciler = satirlar.filter(r => Number.isFinite(r.tahmin));
  if (Number.isFinite(p.r) && tahminciler.length) {
    const k = enler(tahminciler, r => Math.abs(r.tahmin - p.r), "min");
    liste.push({ id: "kahin", emoji: "🔮", unvan: "Kâhin", kisiler: k,
      aciklama: `Tahmin: ${bicim(k[0].tahmin, 2)} · gerçek r = ${bicim(p.r, 2)}` });
  }

  // 3) Dijital Detoks Ustası
  const az = enler(satirlar, r => r.toplam, "min");
  liste.push({ id: "detoks", emoji: "🧘", unvan: "Dijital Detoks Ustası", kisiler: az,
    aciklama: `Günde sadece ${sureYaz(az[0].toplam)} ekran` });

  // 4) En çok yürüyen
  const yuruyen = enler(satirlar, r => r.adim, "max");
  if (yuruyen.length) liste.push({ id: "adim", emoji: "🚶", unvan: "Adım Şampiyonu", kisiler: yuruyen,
    aciklama: `Günde ${bicim(yuruyen[0].adim, 0)} adım` });

  // 5) Uygulama kralları
  for (const u of UYGULAMALAR) {
    if (!u.unvan) continue;
    const k = enler(satirlar, r => r[u.k], "max");
    if (k.length && k[0][u.k] > 0) liste.push({ id: "u_" + u.k, emoji: u.emoji, unvan: u.unvan, kisiler: k,
      aciklama: `Günde ${sureYaz(k[0][u.k])} ${u.ad}` });
  }

  // 6) İstatistiksel aykırı değer(ler)
  const c = ceyrekler(satirlar.map(r => r.toplam));
  const aykiri = satirlar.filter(r => r.toplam > c.ust).sort((a, b) => b.toplam - a.toplam);
  if (satirlar.length >= 4 && aykiri.length) liste.push({ id: "aykiri", emoji: "📈", unvan: "Resmî Aykırı Değer", kisiler: aykiri,
    aciklama: `Tukey kuralı: Q3 + 1,5·IQR = ${bicim(c.ust, 0)} dk sınırının üstünde` });

  // 7) Final: Ekran Canavarı
  const cok = enler(satirlar, r => r.toplam, "max");
  liste.push({ id: "canavar", emoji: "👑", unvan: "Ekran Canavarı", kisiler: cok,
    aciklama: `Günde ${sureYaz(cok[0].toplam)} · sınıf ortalamasının ${bicim(cok[0].toplam / ort, 1)} katı` });

  return liste.map(o => ({ ...o, adlar: adlar(o.kisiler) }));
}
