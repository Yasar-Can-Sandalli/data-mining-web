// Tanımlayıcı istatistik fonksiyonları (pandas ile aynı sonuçları verecek şekilde)

export const temiz = a => a.filter(v => typeof v === "number" && Number.isFinite(v));

export function toplamF(a) { return temiz(a).reduce((s, v) => s + v, 0); }

export function ortalama(a) {
  const x = temiz(a);
  return x.length ? toplamF(x) / x.length : NaN;
}

export function sirali(a) { return [...temiz(a)].sort((p, q) => p - q); }

export function medyan(a) {
  const s = sirali(a), n = s.length;
  if (!n) return NaN;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

// Kategorik veya sayısal mod: en sık görülen değer(ler)
export function mod(a) {
  const say = new Map();
  for (const v of a) if (v !== null && v !== undefined && v !== "") say.set(v, (say.get(v) || 0) + 1);
  if (!say.size) return { degerler: [], frekans: 0, sayim: [] };
  const sayim = [...say.entries()].sort((p, q) => q[1] - p[1]);
  const enCok = sayim[0][1];
  return { degerler: sayim.filter(e => e[1] === enCok).map(e => e[0]), frekans: enCok, sayim };
}

// ddof = 0 → popülasyon (÷ n), ddof = 1 → örneklem (÷ n−1)
export function varyans(a, ddof = 0) {
  const x = temiz(a), n = x.length;
  if (n - ddof <= 0) return NaN;
  const m = ortalama(x);
  return x.reduce((s, v) => s + (v - m) ** 2, 0) / (n - ddof);
}

export function std(a, ddof = 0) { return Math.sqrt(varyans(a, ddof)); }

// numpy / pandas varsayılanı: doğrusal enterpolasyon
export function yuzdelik(a, p) {
  const s = sirali(a), n = s.length;
  if (!n) return NaN;
  const h = (n - 1) * p, alt = Math.floor(h), ust = Math.ceil(h);
  return s[alt] + (s[ust] - s[alt]) * (h - alt);
}

export function ceyrekler(a) {
  const q1 = yuzdelik(a, 0.25), q2 = yuzdelik(a, 0.5), q3 = yuzdelik(a, 0.75);
  const iqr = q3 - q1;
  return { q1, q2, q3, iqr, alt: q1 - 1.5 * iqr, ust: q3 + 1.5 * iqr };
}

// Sunumdaki formül: Σ(x − x̄)³ / (n·σ³)
export function carpiklik(a) {
  const x = temiz(a), n = x.length;
  if (n < 3) return NaN;
  const m = ortalama(x), s = std(x, 0);
  if (!s) return 0;
  return x.reduce((t, v) => t + ((v - m) / s) ** 3, 0) / n;
}

// Pearson r – sadece iki değeri de olan çiftler (pandas .corr ile aynı)
export function pearson(xs, ys) {
  const c = [];
  for (let i = 0; i < xs.length; i++) {
    if (Number.isFinite(xs[i]) && Number.isFinite(ys[i])) c.push([xs[i], ys[i]]);
  }
  if (c.length < 3) return { r: NaN, n: c.length };
  const mx = ortalama(c.map(p => p[0])), my = ortalama(c.map(p => p[1]));
  let sxy = 0, sxx = 0, syy = 0;
  for (const [x, y] of c) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; }
  const r = sxx && syy ? sxy / Math.sqrt(sxx * syy) : NaN;
  const egim = sxx ? sxy / sxx : NaN;
  return { r, n: c.length, egim, kesisim: my - egim * mx };
}

export function ozet(a) {
  const x = temiz(a);
  const c = ceyrekler(x);
  return {
    n: x.length,
    ortalama: ortalama(x),
    medyan: medyan(x),
    min: x.length ? Math.min(...x) : NaN,
    max: x.length ? Math.max(...x) : NaN,
    aralik: x.length ? Math.max(...x) - Math.min(...x) : NaN,
    varyans: varyans(x, 0),
    varyansOrn: varyans(x, 1),
    std: std(x, 0),
    stdOrn: std(x, 1),
    carpiklik: carpiklik(x),
    ...c
  };
}

// Türkçe sayı biçimi
export function bicim(v, ond = 1) {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return v.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: ond });
}

export function sureYaz(dk) {
  if (!Number.isFinite(dk)) return "—";
  const s = Math.floor(dk / 60), d = Math.round(dk % 60);
  if (!s) return `${d} dk`;
  return d ? `${s} sa ${d} dk` : `${s} sa`;
}

// Kontrol: kullanıcının cevabı doğru mu? (yuvarlama payı)
export function yakinMi(cevap, dogru) {
  if (!Number.isFinite(cevap) || !Number.isFinite(dogru)) return false;
  return Math.abs(cevap - dogru) <= Math.max(0.051, Math.abs(dogru) * 0.005);
}

export function yorumR(r) {
  if (!Number.isFinite(r)) return "hesaplanamadı";
  const g = Math.abs(r) >= 0.7 ? "güçlü" : Math.abs(r) >= 0.3 ? "orta" : "zayıf";
  return `${g} ${r < 0 ? "negatif" : "pozitif"} ilişki`;
}
