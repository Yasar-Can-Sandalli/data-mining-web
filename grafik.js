// Grafik yardımcıları (Chart.js + elle çizilen SVG boxplot)
import { UYGULAMALAR, UYG_ADI } from "./sabitler.js";
import { ceyrekler, pearson, bicim, mod } from "./istatistik.js";

export const RENK = {
  ink: "#1E1B4B", teal: "#0F9D94", coral: "#E2553E", amber: "#C2841A",
  violet: "#5A48D6", lilac: "#B9B3F0", line: "#E3E3EE", muted: "#62607E", bg: "#F5F6FA"
};

const ornekler = new Map();

function hazirla(canvas, config) {
  if (!window.Chart) return null;
  const C = window.Chart;
  C.defaults.font.family = "Inter, system-ui, sans-serif";
  C.defaults.color = RENK.muted;
  C.defaults.locale = "tr-TR";
  const eski = ornekler.get(canvas);
  if (eski) eski.destroy();
  const g = new C(canvas, config);
  ornekler.set(canvas, g);
  return g;
}

const ortakEksen = (baslik) => ({
  grid: { color: RENK.line }, border: { display: false },
  title: baslik ? { display: true, text: baslik, color: RENK.muted, font: { size: 12, weight: "600" } } : undefined
});

// İsimli, uygulamalara göre yığılmış yatay çubuk
export function kisiCubuk(canvas, satirlar, opts = {}) {
  const s = [...satirlar].sort((a, b) => b.toplam - a.toplam);
  return hazirla(canvas, {
    type: "bar",
    data: {
      labels: s.map(r => r.ad),
      datasets: UYGULAMALAR.map(u => ({
        label: u.ad, data: s.map(r => r[u.k] || 0), backgroundColor: u.renk,
        borderColor: "#fff", borderWidth: 1, borderSkipped: false, barPercentage: 0.85
      }))
    },
    plugins: [{
      id: "toplamlar",
      afterDatasetsDraw(ch) {
        const { ctx } = ch, son = ch.getDatasetMeta(ch.data.datasets.length - 1);
        ctx.save(); ctx.font = "600 12px Inter, sans-serif"; ctx.fillStyle = RENK.ink; ctx.textBaseline = "middle";
        son.data.forEach((bar, i) => ctx.fillText(" " + s[i].toplam + " dk", bar.x + 4, bar.y));
        ctx.restore();
      }
    }],
    options: {
      indexAxis: "y", maintainAspectRatio: false, animation: { duration: 400 }, layout: { padding: { right: 60 } },
      plugins: {
        legend: { position: "top", labels: { boxWidth: 12, usePointStyle: true } },
        tooltip: { callbacks: { footer: it => "Toplam: " + s[it[0].dataIndex].toplam + " dk" } }
      },
      scales: {
        x: { stacked: true, ...ortakEksen("Günlük ekran süresi (dk)") },
        y: { stacked: true, grid: { display: false }, ticks: { autoSkip: false, font: { size: opts.kucuk ? 10 : 12 }, color: RENK.ink } }
      }
    }
  });
}

export function histogramVeri(degerler) {
  const x = degerler.filter(Number.isFinite);
  if (!x.length) return { etiket: [], frekans: [] };
  const k = Math.max(4, Math.ceil(1 + Math.log2(x.length)));     // Sturges
  const min = Math.min(...x), max = Math.max(...x);
  const adimRaw = (max - min) / k || 1;
  const genislik = Math.ceil(adimRaw / 30) * 30;                  // okunur sınırlar (30 dk katları)
  const bas = Math.floor(min / 30) * 30;
  const sinif = Math.ceil((max - bas + 1) / genislik);
  const frekans = new Array(sinif).fill(0);
  x.forEach(v => { frekans[Math.min(sinif - 1, Math.floor((v - bas) / genislik))]++; });
  const etiket = frekans.map((_, i) => `${bas + i * genislik}–${bas + (i + 1) * genislik}`);
  return { etiket, frekans };
}

export function histogram(canvas, degerler, birim = "dk") {
  const h = histogramVeri(degerler);
  return hazirla(canvas, {
    type: "bar",
    data: { labels: h.etiket, datasets: [{ data: h.frekans, backgroundColor: RENK.violet, borderRadius: 3, barPercentage: 1, categoryPercentage: 0.96 }] },
    options: {
      maintainAspectRatio: false, plugins: { legend: { display: false } },
      scales: { x: { ...ortakEksen(`Ekran süresi (${birim})`), grid: { display: false } }, y: { ...ortakEksen("Kişi sayısı"), ticks: { precision: 0 } } }
    }
  });
}

// En çok kullanılan uygulama (kategorik mod)
export function modGrafik(canvas, satirlar) {
  const m = mod(satirlar.map(r => r.en_cok).filter(v => v && v !== "yok"));
  const renk = Object.fromEntries(UYGULAMALAR.map(u => [u.k, u.renk]));
  return hazirla(canvas, {
    type: "bar",
    data: {
      labels: m.sayim.map(e => UYG_ADI[e[0]] || e[0]),
      datasets: [{ data: m.sayim.map(e => e[1]), backgroundColor: m.sayim.map(e => renk[e[0]] || RENK.muted), borderRadius: 4 }]
    },
    options: {
      maintainAspectRatio: false, plugins: { legend: { display: false } },
      scales: { x: { grid: { display: false }, ticks: { color: RENK.ink, font: { weight: "600" } } }, y: { ...ortakEksen("Kişi sayısı"), ticks: { precision: 0 } } }
    }
  });
}

// Saçılım: ekran süresi ↔ adım
export function sacilim(canvas, satirlar, { cizgi = false, vurguId = null } = {}) {
  const nokta = satirlar.filter(r => Number.isFinite(r.adim)).map(r => ({ x: r.toplam, y: r.adim, ad: r.ad, id: r.id }));
  const ds = [{
    type: "scatter", label: "Katılımcılar", data: nokta,
    pointRadius: nokta.map(p => (p.id === vurguId ? 11 : 6)),
    pointBackgroundColor: nokta.map(p => (p.id === vurguId ? RENK.coral : "rgba(90,72,214,.75)")),
    pointBorderColor: nokta.map(p => (p.id === vurguId ? RENK.ink : "#fff")),
    pointBorderWidth: nokta.map(p => (p.id === vurguId ? 2.5 : 1.5)),
    order: 1
  }];
  if (cizgi && nokta.length >= 3) {
    const p = pearson(nokta.map(q => q.x), nokta.map(q => q.y));
    const xs = nokta.map(q => q.x), a = Math.min(...xs), b = Math.max(...xs);
    ds.push({ type: "line", label: "Doğrusal eğilim", data: [{ x: a, y: p.kesisim + p.egim * a }, { x: b, y: p.kesisim + p.egim * b }],
      borderColor: RENK.coral, borderWidth: 2.5, borderDash: [6, 4], pointRadius: 0 });
  }
  return hazirla(canvas, {
    type: "scatter",
    data: { datasets: ds },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => c.raw.ad ? `${c.raw.ad}: ${c.raw.x} dk · ${bicim(c.raw.y, 0)} adım` : "" } }
      },
      scales: { x: ortakEksen("Günlük ekran süresi (dk)"), y: ortakEksen("Günlük adım") }
    }
  });
}

// Boxplot (SVG) – aykırı değerler isimleriyle
export function boxplotSvg(kap, satirlar, alan = "toplam", birim = "dk") {
  const veri = satirlar.filter(r => Number.isFinite(r[alan]));
  if (veri.length < 4) { kap.innerHTML = `<p class="bos">Boxplot için en az 4 kişi gerekli.</p>`; return; }
  const x = veri.map(r => r[alan]);
  const c = ceyrekler(x);
  const icerde = x.filter(v => v >= c.alt && v <= c.ust);
  const bL = Math.min(...icerde), bH = Math.max(...icerde);
  const aykiri = veri.filter(r => r[alan] < c.alt || r[alan] > c.ust);
  const min = Math.min(...x, c.alt > 0 ? c.alt : Math.min(...x)), max = Math.max(...x, c.ust);
  const W = 900, H = 230, P = 40;
  const pad = (max - min) * 0.06 || 1;
  const lo = Math.max(0, min - pad), hi = max + pad;
  const sx = v => P + ((v - lo) / (hi - lo)) * (W - 2 * P);
  const yM = 105, kH = 62;
  const tik = [];
  const adimT = Math.pow(10, Math.floor(Math.log10((hi - lo) / 5)));
  const adim = [1, 2, 5, 10].map(m => m * adimT).find(s => (hi - lo) / s <= 8) || adimT * 10;
  for (let t = Math.ceil(lo / adim) * adim; t <= hi; t += adim) tik.push(t);
  const etiketler = aykiri.map(r => ({ x: sx(r[alan]), ad: r.ad, v: r[alan] })).sort((a, b) => a.x - b.x);
  let son = -1e9, sira = 0;
  etiketler.forEach(e => { sira = e.x - son < 110 ? sira + 1 : 0; e.y = yM - kH / 2 - 16 - sira * 15; son = e.x; });
  kap.innerHTML = `
  <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Boxplot">
    <line x1="${P}" x2="${W - P}" y1="${H - 42}" y2="${H - 42}" stroke="${RENK.line}" stroke-width="1.5"/>
    ${tik.map(t => `<line x1="${sx(t)}" x2="${sx(t)}" y1="${H - 42}" y2="${H - 36}" stroke="${RENK.muted}"/>
      <text x="${sx(t)}" y="${H - 20}" text-anchor="middle" font-size="13" fill="${RENK.muted}">${bicim(t, 0)}</text>`).join("")}
    <text x="${W / 2}" y="${H - 2}" text-anchor="middle" font-size="12" fill="${RENK.muted}">${alan === "toplam" ? "Günlük ekran süresi" : alan} (${birim})</text>
    ${c.ust <= hi ? `<line x1="${sx(c.ust)}" x2="${sx(c.ust)}" y1="18" y2="${H - 46}" stroke="${RENK.coral}" stroke-dasharray="5 4"/>
      <text x="${sx(c.ust) + (sx(c.ust) > W - 160 ? -6 : 6)}" y="${H - 50}" font-size="12" fill="${RENK.coral}" font-weight="600" text-anchor="${sx(c.ust) > W - 160 ? "end" : "start"}">üst sınır ${bicim(c.ust, 1)}</text>` : ""}
    ${c.alt >= lo ? `<line x1="${sx(c.alt)}" x2="${sx(c.alt)}" y1="18" y2="${H - 46}" stroke="${RENK.coral}" stroke-dasharray="5 4"/>
      <text x="${sx(c.alt) + (sx(c.alt) < 160 ? 6 : -6)}" y="${H - 50}" font-size="12" fill="${RENK.coral}" font-weight="600" text-anchor="${sx(c.alt) < 160 ? "start" : "end"}">alt sınır ${bicim(c.alt, 1)}</text>` : ""}
    <line x1="${sx(bL)}" x2="${sx(c.q1)}" y1="${yM}" y2="${yM}" stroke="${RENK.ink}" stroke-width="2"/>
    <line x1="${sx(c.q3)}" x2="${sx(bH)}" y1="${yM}" y2="${yM}" stroke="${RENK.ink}" stroke-width="2"/>
    <line x1="${sx(bL)}" x2="${sx(bL)}" y1="${yM - 14}" y2="${yM + 14}" stroke="${RENK.ink}" stroke-width="2"/>
    <line x1="${sx(bH)}" x2="${sx(bH)}" y1="${yM - 14}" y2="${yM + 14}" stroke="${RENK.ink}" stroke-width="2"/>
    <rect x="${sx(c.q1)}" y="${yM - kH / 2}" width="${Math.max(2, sx(c.q3) - sx(c.q1))}" height="${kH}" fill="#ECE9FB" stroke="${RENK.violet}" stroke-width="2" rx="3"/>
    <line x1="${sx(c.q2)}" x2="${sx(c.q2)}" y1="${yM - kH / 2}" y2="${yM + kH / 2}" stroke="${RENK.violet}" stroke-width="4"/>
    <text x="${sx(c.q2)}" y="${yM + kH / 2 + 18}" text-anchor="middle" font-size="12" fill="${RENK.violet}" font-weight="700">medyan ${bicim(c.q2, 1)}</text>
    ${aykiri.map(r => `<circle cx="${sx(r[alan])}" cy="${yM}" r="7" fill="${RENK.coral}" stroke="#fff" stroke-width="1.5"/>`).join("")}
    ${etiketler.map(e => `<text x="${e.x}" y="${e.y}" text-anchor="middle" font-size="12.5" font-weight="700" fill="${RENK.coral}">${kacis(e.ad)} (${bicim(e.v, 0)})</text>`).join("")}
  </svg>`;
}

export function kacis(s) {
  return String(s ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}
