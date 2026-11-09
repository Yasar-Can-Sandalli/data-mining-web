// ============================================================
//  SUNUM EKRANI (projeksiyon) – yönetici paneli
// ============================================================
import { veriKatmani } from "./veri.js";
import { ETKINLIK_ADI } from "./ayarlar.js";
import { UYGULAMALAR, UYG_ADI, ASAMALAR, GOREVLER, KODLAR } from "./sabitler.js";
import * as I from "./istatistik.js";
import { kisiCubuk, histogram, modGrafik, sacilim, boxplotSvg, kacis } from "./grafik.js";
import { pythonHazirla, calistir, hataIpucu } from "./python.js";
import { odulleriHesapla } from "./oduller.js";

const $ = s => document.querySelector(s);
const govde = $("#govde");
let V, kontrol = null, satirlar = [], cizilen = null, sekme = "ozet", gorulenIsim = new Set(), seciliKod = KODLAR[0].id;

const katilimciUrl = () => {
  const u = new URL("index.html", location.href);
  if (V?.demo && new URL(location.href).searchParams.has("demo")) u.searchParams.set("demo", "1");
  return u.href;
};

// ------------------------------------------------------------
// Üst çubuk
// ------------------------------------------------------------
function adimlariCiz() {
  $("#adimlar").innerHTML = ASAMALAR.map(a => `
    <button data-a="${a.no}" class="${a.no === kontrol.asama ? "aktif" : a.no < kontrol.asama ? "gecti" : ""}"><b>${a.no}</b><span>${a.ad}</span></button>`).join("");
}
$("#adimlar").onclick = async e => {
  const b = e.target.closest("button[data-a]"); if (!b) return;
  const no = Number(b.dataset.a);
  const patch = { asama: no };
  if (no === 5 && !kontrol.korelasyonGoster) patch.tahminAcik = true;
  await V.kontrolYaz(patch);
};

function ciz(zorla = false) {
  if (!kontrol) return;
  adimlariCiz();
  $("#kisiSayi").textContent = satirlar.length;
  const a = kontrol.asama;
  const anahtar = a + "|" + (a === 2 ? sekme : "");
  if (zorla || anahtar !== cizilen) {
    cizilen = anahtar;
    ({ 1: s1, 2: s2, 3: s3, 4: s4, 5: s5, 6: s6 })[a]?.();
    if (a >= 3) pythonHazirla().catch(() => {});
  } else {
    guncelle[a]?.();
  }
}
const guncelle = {};

const baslik = (etiket, renk, h, p, sag = "") => `
  <div class="s-baslik"><div><span class="etiket ${renk}">${etiket}</span><h2>${h}</h2>${p ? `<p>${p}</p>` : ""}</div><div>${sag}</div></div>`;

// ------------------------------------------------------------
// 1 · VERİ TOPLAMA
// ------------------------------------------------------------
function s1() {
  govde.innerHTML = `
    ${baslik("Aşama 1", "coral", "Telefonunla katıl", "QR kodu okut · son 7 günün günlük ortalama ekran süresini ve adım sayını gir")}
    <div class="qr-alan">
      <div class="kart qr-kart"><div id="qr"></div><div class="qr-url">${kacis(katilimciUrl().replace(/^https?:\/\//, ""))}</div></div>
      <div class="s-izgara">
        <div class="kart panel" style="display:flex;align-items:center;gap:24px">
          <div class="dev-sayi" id="dev">${satirlar.length}</div>
          <div><h3 style="font-size:22px;margin:0">kişi veri gönderdi</h3><p class="soluk" style="margin:4px 0 0">${kacis(ETKINLIK_ADI)}</p></div>
        </div>
        <div class="kart panel"><h3>Katılanlar</h3><div class="isimler" id="isimler"></div></div>
        <div class="kart panel">
          <h3>Değerleri nereden bulurum?</h3>
          <p style="margin:0;font-size:17px;line-height:1.6">📱 <b>iPhone:</b> Ayarlar → Ekran Süresi → Tüm Etkinlikleri Gör → Hafta<br>
          🤖 <b>Android:</b> Ayarlar → Dijital Denge (Dijital Sağlıklılık)<br>
          🚶 <b>Adım:</b> Sağlık (iPhone) · Google Fit / Samsung Health / Mi Fitness</p>
        </div>
      </div>
    </div>`;
  qrCiz();
  isimleriCiz(true);
  guncelle[1] = () => { $("#dev").textContent = satirlar.length; isimleriCiz(); };
}
function qrCiz() {
  const el = $("#qr");
  if (!window.qrcode) { setTimeout(qrCiz, 200); return; }
  const q = window.qrcode(0, "M"); q.addData(katilimciUrl()); q.make();
  el.innerHTML = q.createSvgTag({ cellSize: 8, margin: 2, scalable: true });
}
function isimleriCiz(ilk = false) {
  const el = $("#isimler"); if (!el) return;
  const s = [...satirlar].sort((a, b) => (b.zaman || 0) - (a.zaman || 0));
  el.innerHTML = s.length ? s.map(r => `<span class="isim" style="${gorulenIsim.has(r.id) || ilk ? "animation:none" : ""}">${kacis(r.ad)}</span>`).join("")
    : `<span class="soluk">Henüz kimse yok… ilk sen ol!</span>`;
  s.forEach(r => gorulenIsim.add(r.id));
}

// ------------------------------------------------------------
// 2 · ANALİZ
// ------------------------------------------------------------
function s2() {
  const sekmeler = [["ozet", "Özet istatistikler"], ["kisiler", "Kişi kişi"], ["dagilim", "Dağılım"], ["uygulamalar", "Uygulamalar"]];
  govde.innerHTML = `
    ${baslik("Aşama 2", "teal", "Sınıfımızın ekran süresi", `n = ${satirlar.length} kişi · değişken: günlük toplam ekran süresi (dk)`,
      `<div class="sekmeler" id="sekmeler">${sekmeler.map(([k, a]) => `<button data-s="${k}" class="${k === sekme ? "aktif" : ""}">${a}</button>`).join("")}</div>`)}
    <div id="s2icerik"></div>`;
  $("#sekmeler").onclick = e => { const b = e.target.closest("button"); if (!b) return; sekme = b.dataset.s; ciz(true); };
  ({ ozet: s2Ozet, kisiler: s2Kisiler, dagilim: s2Dagilim, uygulamalar: s2Uyg })[sekme]();
}
function s2Ozet() {
  const el = $("#s2icerik");
  const ciz2 = () => {
    if (!satirlar.length) { el.innerHTML = `<div class="kart panel bos">Henüz veri yok.</div>`; return; }
    const o = I.ozet(satirlar.map(r => r.toplam));
    const m = I.mod(satirlar.map(r => r.en_cok).filter(v => v && v !== "yok"));
    const aykiri = satirlar.filter(r => r.toplam > o.ust || r.toplam < o.alt);
    const fark = o.ortalama - o.medyan;
    el.innerHTML = `
      <div class="kpi-izgara">
        <div class="kart kpi vurgu"><div class="d">${I.bicim(o.ortalama, 1)}<small>dk</small></div><div class="e">Ortalama · ${I.sureYaz(o.ortalama)}</div><div class="f">x̄ = Σx / n</div></div>
        <div class="kart kpi mor"><div class="d">${I.bicim(o.medyan, 1)}<small>dk</small></div><div class="e">Medyan · ${I.sureYaz(o.medyan)}</div><div class="f">sıralı verinin ortası</div></div>
        <div class="kart kpi"><div class="d">${m.degerler.map(v => UYG_ADI[v]).join(" & ") || "—"}</div><div class="e">Mod · en çok kullanılan uygulama (${m.frekans} kişi)</div><div class="f">kategorik mod</div></div>
        <div class="kart kpi"><div class="d">${I.bicim(o.min, 0)}–${I.bicim(o.max, 0)}</div><div class="e">Değişim aralığı (range) = ${I.bicim(o.aralik, 0)} dk</div><div class="f">max − min</div></div>
        <div class="kart kpi vurgu"><div class="d">${I.bicim(o.varyans, 1)}<small>dk²</small></div><div class="e">Varyans (÷ n) · örneklem (÷ n−1): ${I.bicim(o.varyansOrn, 1)}</div><div class="f">σ² = Σ(x − x̄)² / n</div></div>
        <div class="kart kpi vurgu"><div class="d">${I.bicim(o.std, 1)}<small>dk</small></div><div class="e">Standart sapma · örneklem: ${I.bicim(o.stdOrn, 1)}</div><div class="f">σ = √σ²</div></div>
        <div class="kart kpi mor"><div class="d">${I.bicim(o.iqr, 1)}<small>dk</small></div><div class="e">IQR · Q1 ${I.bicim(o.q1, 1)} – Q3 ${I.bicim(o.q3, 1)}</div><div class="f">Q3 − Q1 (pandas yöntemi)</div></div>
        <div class="kart kpi"><div class="d">${I.bicim(o.carpiklik, 2)}</div><div class="e">Çarpıklık · ${o.carpiklik > 0.5 ? "sağa çarpık" : o.carpiklik < -0.5 ? "sola çarpık" : "yaklaşık simetrik"}</div><div class="f">Σ(x − x̄)³ / (n·σ³)</div></div>
      </div>
      <div class="kart panel" style="margin-top:18px">
        <h3>Ne görüyoruz?</h3>
        <ul style="margin:0;padding-left:20px;font-size:18px;line-height:1.7">
          <li>Ortalama medyandan <b>${I.bicim(Math.abs(fark), 1)} dk ${fark >= 0 ? "büyük" : "küçük"}</b> → ${fark > 5 ? "birkaç yüksek değer ortalamayı yukarı çekiyor (sağa çarpıklık)." : fark < -5 ? "birkaç düşük değer ortalamayı aşağı çekiyor." : "dağılım dengeli görünüyor."}</li>
          <li>Değerler ortalamadan tipik olarak <b>±${I.sureYaz(o.std)}</b> sapıyor.</li>
          <li>Tukey sınırları: <b>${I.bicim(o.alt, 1)}</b> – <b>${I.bicim(o.ust, 1)}</b> dk → ${aykiri.length ? `aykırı değer: <b style="color:var(--coral)">${aykiri.map(r => kacis(r.ad)).join(", ")}</b>` : "aykırı değer yok."}</li>
        </ul>
      </div>`;
  };
  ciz2();
  guncelle[2] = ciz2;
}
function s2Kisiler() {
  const yuk = Math.max(360, satirlar.length * 26 + 90);
  $("#s2icerik").innerHTML = `<div class="kart panel"><h3>Kişi kişi günlük ekran süresi <span class="soluk" style="font-weight:500">uygulamalara göre</span></h3>
    <div class="grafik-kutu" style="height:${yuk}px"><canvas id="kisiG"></canvas></div></div>`;
  const ciz2 = () => { const k = $("#kisiG"); if (k) { k.parentElement.style.height = Math.max(360, satirlar.length * 26 + 90) + "px"; kisiCubuk(k, satirlar); } };
  setTimeout(ciz2, 0);
  guncelle[2] = ciz2;
}
function s2Dagilim() {
  $("#s2icerik").innerHTML = `
    <div class="s-izgara" style="grid-template-columns: 1.1fr .9fr">
      <div class="kart panel"><h3>Histogram</h3><div class="grafik-kutu" style="height:380px"><canvas id="histG"></canvas></div></div>
      <div class="kart panel" id="dagYorum"></div>
    </div>
    <div class="kart panel" style="margin-top:18px"><h3>Boxplot <span class="soluk" style="font-weight:500">aykırı değerler isimleriyle</span></h3><div id="boxG"></div></div>`;
  const ciz2 = () => {
    if (!$("#histG")) return;
    const x = satirlar.map(r => r.toplam);
    histogram($("#histG"), x);
    boxplotSvg($("#boxG"), satirlar);
    const o = I.ozet(x);
    $("#dagYorum").innerHTML = `<h3>Şekil</h3>
      <table class="tablo"><tbody>
        <tr><td>Mod (uygulama)</td><td class="s">${I.mod(satirlar.map(r => r.en_cok).filter(v => v && v !== "yok")).degerler.map(v => UYG_ADI[v]).join(", ") || "—"}</td></tr>
        <tr><td>Medyan</td><td class="s">${I.bicim(o.medyan, 1)}</td></tr>
        <tr><td>Ortalama</td><td class="s">${I.bicim(o.ortalama, 1)}</td></tr>
        <tr><td>Çarpıklık</td><td class="s">${I.bicim(o.carpiklik, 2)}</td></tr>
        <tr><td>Q1 · Q3 · IQR</td><td class="s">${I.bicim(o.q1, 1)} · ${I.bicim(o.q3, 1)} · ${I.bicim(o.iqr, 1)}</td></tr>
        <tr><td>Tukey sınırları</td><td class="s">${I.bicim(o.alt, 1)} – ${I.bicim(o.ust, 1)}</td></tr>
      </tbody></table>
      <p style="font-size:17px;line-height:1.6;margin:14px 0 0">${o.ortalama > o.medyan ? "Ortalama > medyan: kuyruk <b>sağa</b> uzanıyor. Ortalama her zaman kuyruğu takip eder." : "Ortalama ≤ medyan: kuyruk sağa uzanmıyor."}</p>`;
  };
  setTimeout(ciz2, 0);
  guncelle[2] = ciz2;
}
function s2Uyg() {
  $("#s2icerik").innerHTML = `
    <div class="s-izgara" style="grid-template-columns: .9fr 1.1fr">
      <div class="kart panel"><h3>En çok kullanılan uygulama (mod)</h3><div class="grafik-kutu" style="height:380px"><canvas id="modG"></canvas></div></div>
      <div class="kart panel"><h3>Uygulama bazında (dk/gün)</h3><div id="uygTablo"></div></div>
    </div>`;
  const ciz2 = () => {
    if (!$("#modG")) return;
    modGrafik($("#modG"), satirlar);
    $("#uygTablo").innerHTML = `<table class="tablo"><thead><tr><th>Uygulama</th><th style="text-align:right">Ortalama</th><th style="text-align:right">Medyan</th><th style="text-align:right">Std</th><th>En çok</th></tr></thead><tbody>
      ${UYGULAMALAR.map(u => {
        const x = satirlar.map(r => r[u.k] || 0);
        const en = [...satirlar].sort((a, b) => (b[u.k] || 0) - (a[u.k] || 0))[0];
        return `<tr><td><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${u.renk};margin-right:8px"></span>${u.ad}</td>
          <td class="s">${I.bicim(I.ortalama(x), 1)}</td><td class="s">${I.bicim(I.medyan(x), 1)}</td><td class="s">${I.bicim(I.std(x), 1)}</td>
          <td>${en && en[u.k] ? `${kacis(en.ad)} <span class="soluk">(${I.sureYaz(en[u.k])})</span>` : "—"}</td></tr>`;
      }).join("")}</tbody></table>`;
  };
  setTimeout(ciz2, 0);
  guncelle[2] = ciz2;
}

// ------------------------------------------------------------
// 3 · HESAP MAKİNESİ (ilerleme)
// ------------------------------------------------------------
function s3() {
  govde.innerHTML = `
    ${baslik("Aşama 3", "violet", "Sıra sizde: hesap makinesiyle bulun", "Telefonlarınızda: ortalama, medyan, mod, varyans ve standart sapma",
      `<button class="btn ${kontrol.cevapGoster ? "hayalet" : "coral"}" id="cevapBtn">${kontrol.cevapGoster ? "Cevapları gizle" : "Cevapları göster"}</button>`)}
    <div class="s-izgara" style="grid-template-columns: 1.3fr .7fr">
      <div class="kart panel"><h3>Kaç kişi buldu?</h3><div class="ilerleme" id="ilerleme"></div></div>
      <div class="kart panel"><h3>İpuçları</h3>
        <ul style="margin:0;padding-left:20px;font-size:16.5px;line-height:1.75">
          ${GOREVLER.map(g => `<li><b>${g.ad}:</b> <span class="mono" style="font-size:14px">${g.ipucu}</span></li>`).join("")}
        </ul></div>
    </div>`;
  $("#cevapBtn").onclick = () => V.kontrolYaz({ cevapGoster: !kontrol.cevapGoster });
  const ciz2 = () => {
    const el = $("#ilerleme"); if (!el) return;
    const cb = $("#cevapBtn");
    cb.className = "btn " + (kontrol.cevapGoster ? "hayalet" : "coral");
    cb.textContent = kontrol.cevapGoster ? "Cevapları gizle" : "Cevapları göster";
    const x = satirlar.map(r => r.toplam);
    const m = I.mod(satirlar.map(r => r.en_cok).filter(v => v && v !== "yok"));
    const dogru = { ortalama: I.ortalama(x), medyan: I.medyan(x), mod: m.degerler.map(v => UYG_ADI[v]).join(", "), varyans: I.varyans(x, 0), std: I.std(x, 0) };
    const n = Math.max(1, satirlar.length);
    el.innerHTML = GOREVLER.map(g => {
      const bulan = satirlar.filter(r => r.hesap?.[g.k]).sort((a, b) => a.hesap[g.k] - b.hesap[g.k]);
      return `<div class="satir"><div>${g.ad}${kontrol.cevapGoster ? `<div class="ilk" style="color:var(--coral);font-weight:700">= ${typeof dogru[g.k] === "number" ? I.bicim(dogru[g.k], 2) : dogru[g.k]}</div>` : ""}</div>
        <div><div class="cubuk"><i style="width:${(bulan.length / n) * 100}%"></i></div>
        <div class="ilk">${bulan.length ? `🥇 ilk: <b>${kacis(bulan[0].ad)}</b>${bulan[1] ? ` · 🥈 ${kacis(bulan[1].ad)}` : ""}${bulan[2] ? ` · 🥉 ${kacis(bulan[2].ad)}` : ""}` : "henüz kimse"}</div></div>
        <div style="text-align:right;font-family:var(--baslik);font-size:22px">${bulan.length}<span class="soluk" style="font-size:14px">/${satirlar.length}</span></div></div>`;
    }).join("");
  };
  ciz2();
  guncelle[3] = ciz2;
}

// ------------------------------------------------------------
// 4 · PYTHON
// ------------------------------------------------------------
function s4() {
  govde.innerHTML = `
    ${baslik("Aşama 4", "", "Aynı grafikleri Python ile üretin", "Kodu telefonunuzdaki editöre yazın ya da “Sunumdaki kodu getir”e basın · veri <code>df</code> olarak hazır",
      `<span class="rehber" id="pyDurum"></span>`)}
    <div class="s-izgara" style="grid-template-columns: 300px 1fr">
      <div class="kart panel"><h3>Kodlar</h3><div class="kod-liste" id="kodListe"></div></div>
      <div class="s-izgara">
        <pre class="kod-blok" id="kodBlok"></pre>
        <div style="display:flex;gap:10px">
          <button class="btn coral" id="gonderBtn">📲 Katılımcılara gönder</button>
          <button class="btn violet" id="burdaBtn">▶ Burada çalıştır</button>
        </div>
        <div class="kart panel gizli" id="pySonuc"><pre class="cikti" id="pyCikti" style="font-size:15px"></pre><div class="grafikler" id="pyGrafik" style="display:grid;gap:12px"></div></div>
      </div>
    </div>`;
  const listeCiz = () => {
    $("#kodListe").innerHTML = KODLAR.map(k => `<button data-k="${k.id}" class="${k.id === seciliKod ? "aktif" : ""}">${k.ad}${kontrol.kodId === k.id ? `<span class="gonderildi">● telefonlara gönderildi</span>` : ""}</button>`).join("");
    $("#kodBlok").textContent = KODLAR.find(k => k.id === seciliKod).kod;
  };
  listeCiz();
  $("#kodListe").onclick = e => { const b = e.target.closest("button"); if (!b) return; seciliKod = b.dataset.k; listeCiz(); $("#pySonuc").classList.add("gizli"); };
  $("#gonderBtn").onclick = () => V.kontrolYaz({ kodId: seciliKod });
  $("#burdaBtn").onclick = async () => {
    const b = $("#burdaBtn"); b.disabled = true; b.innerHTML = `<span class="yukleniyor"></span> Çalışıyor`;
    try {
      const s = await calistir(KODLAR.find(k => k.id === seciliKod).kod, satirlar);
      $("#pySonuc").classList.remove("gizli");
      $("#pyCikti").className = "cikti" + (s.hata ? " hata" : "");
      $("#pyCikti").textContent = s.hata ? s.hata + "\n" + hataIpucu(s.hata) : (s.cikti || "✓");
      $("#pyGrafik").innerHTML = s.grafikler.map(g => `<img alt="Grafik" src="data:image/png;base64,${g}" style="max-height:70vh;object-fit:contain">`).join("");
    } catch (err) {
      $("#pySonuc").classList.remove("gizli"); $("#pyCikti").className = "cikti hata"; $("#pyCikti").textContent = "Python yüklenemedi: " + err.message;
    }
    b.disabled = false; b.textContent = "▶ Burada çalıştır";
  };
  const durum = $("#pyDurum");
  durum.innerHTML = `<span class="yukleniyor"></span> Python hazırlanıyor…`;
  pythonHazirla().then(() => { durum.textContent = "✅ Python hazır"; }).catch(e => { durum.textContent = "⚠️ " + e.message; });
  guncelle[4] = listeCiz;
}

// ------------------------------------------------------------
// 5 · KORELASYON & TAHMİN
// ------------------------------------------------------------
function s5() {
  govde.innerHTML = `
    ${baslik("Aşama 5", "amber", "Ekran süresi arttıkça adım azalıyor mu?", "Önce tahmin edin: korelasyon katsayısı r kaç?", `<div style="display:flex;gap:10px" id="s5btn"></div>`)}
    <div class="s-izgara" style="grid-template-columns: 1.25fr .75fr">
      <div class="kart panel"><h3>Ekran süresi ↔ günlük adım</h3><div class="grafik-kutu" style="height:520px"><canvas id="sacG"></canvas></div></div>
      <div class="kart panel" id="s5sag"></div>
    </div>`;
  const ciz2 = () => {
    if (!$("#sacG")) return;
    const goster = kontrol.korelasyonGoster;
    $("#s5btn").innerHTML = goster
      ? `<button class="btn hayalet" id="gizleBtn">Sonucu gizle</button>`
      : `<button class="btn ${kontrol.tahminAcik ? "hayalet" : "teal"}" id="tahminBtn">${kontrol.tahminAcik ? "Tahminleri kapat" : "Tahminleri aç"}</button>
         <button class="btn coral" id="gosterBtn">🔍 Sonucu göster</button>`;
    $("#tahminBtn") && ($("#tahminBtn").onclick = () => V.kontrolYaz({ tahminAcik: !kontrol.tahminAcik }));
    $("#gosterBtn") && ($("#gosterBtn").onclick = () => V.kontrolYaz({ korelasyonGoster: true, tahminAcik: false }));
    $("#gizleBtn") && ($("#gizleBtn").onclick = () => V.kontrolYaz({ korelasyonGoster: false }));
    sacilim($("#sacG"), satirlar, { cizgi: goster });
    const tahminler = satirlar.filter(r => Number.isFinite(r.tahmin));
    const adimli = satirlar.filter(r => Number.isFinite(r.adim)).length;
    if (!goster) {
      $("#s5sag").innerHTML = `<h3>Tahminler</h3>
        <div class="dev-sayi" style="color:var(--violet)">${tahminler.length}</div>
        <p class="soluk" style="font-size:17px">kişi tahmin gönderdi${kontrol.tahminAcik ? " · tahminler <b style='color:var(--teal)'>açık</b>" : " · tahminler kapalı"}</p>
        <p style="font-size:17px;line-height:1.6">r = −1 → ekran arttıkça adım düzenli azalır<br>r = 0 → doğrusal ilişki yok<br>r = +1 → ekran arttıkça adım artar</p>
        <p class="not">Grafikte ${adimli} kişi var (adımını bilmeyenler hariç).</p>`;
      return;
    }
    const p = I.pearson(satirlar.map(r => r.toplam), satirlar.map(r => r.adim));
    const enIyi = [...tahminler].sort((a, b) => Math.abs(a.tahmin - p.r) - Math.abs(b.tahmin - p.r)).slice(0, 3);
    const saatlik = p.egim * 60;
    $("#s5sag").innerHTML = `
      <div class="r-dev">r = ${I.bicim(p.r, 2)}</div>
      <p style="font-size:20px;font-weight:600;margin:8px 0 0">${I.yorumR(p.r)}</p>
      <p style="font-size:17px;line-height:1.6">Doğrusal eğilime göre günde <b>1 saat fazla</b> ekran ≈ <b>${I.bicim(Math.abs(saatlik), 0)} adım ${saatlik < 0 ? "daha az" : "daha fazla"}</b>.</p>
      <h3 style="margin-top:14px">🔮 En yakın tahminler</h3>
      <div class="odul-liste">${enIyi.map((r, i) => `<div><b>${["🥇", "🥈", "🥉"][i]}</b> ${kacis(r.ad)} <span class="soluk" style="margin-left:auto">${I.bicim(r.tahmin, 2)}</span></div>`).join("") || `<p class="soluk">Tahmin yok.</p>`}</div>
      <p class="not" style="margin-top:14px">⚠️ Korelasyon nedensellik değildir · n = ${p.n} · veriler kendi beyanımız</p>`;
  };
  ciz2();
  guncelle[5] = ciz2;
}

// ------------------------------------------------------------
// 6 · ÖDÜLLER
// ------------------------------------------------------------
function s6() {
  govde.innerHTML = `
    ${baslik("Aşama 6", "coral", "Ödül töreni 🏆", "Veriler konuştu…",
      `<div style="display:flex;gap:10px"><button class="btn hayalet" id="oncekiBtn">← Önceki</button><button class="btn coral" id="sonrakiBtn">Sonraki ödül →</button></div>`)}
    <div class="s-izgara" style="grid-template-columns: 1.4fr .6fr">
      <div class="kart odul-sahne" id="sahne"></div>
      <div class="kart panel"><h3>Açıklananlar</h3><div class="odul-liste" id="acik"></div></div>
    </div>`;
  const ilerle = d => {
    const o = odulleriHesapla(satirlar);
    const yeni = Math.max(-1, Math.min(o.length - 1, kontrol.odulIndex + d));
    if (yeni !== kontrol.odulIndex) V.kontrolYaz({ odulIndex: yeni });
  };
  $("#oncekiBtn").onclick = () => ilerle(-1);
  $("#sonrakiBtn").onclick = () => ilerle(1);
  let sonGosterilen = null;
  const ciz2 = () => {
    if (!$("#sahne")) return;
    const o = odulleriHesapla(satirlar);
    const i = kontrol.odulIndex;
    $("#sonrakiBtn").disabled = i >= o.length - 1;
    $("#oncekiBtn").disabled = i < 0;
    const x = o[i];
    const imza = x ? x.id + x.adlar : "bos";
    if (imza !== sonGosterilen) {
      sonGosterilen = imza;
      $("#sahne").innerHTML = x
        ? `<div class="odul-kart"><div class="em">${x.emoji}</div><div class="u">${kacis(x.unvan)}</div><div class="k">${kacis(x.adlar)}</div><div class="a">${kacis(x.aciklama)}</div></div>`
        : `<div class="odul-kart"><div class="em">🥁</div><div class="k" style="font-size:44px">Hazır mısınız?</div><div class="a">${o.length} ödül var · “Sonraki ödül”e basın (→ tuşu da çalışır)</div></div>`;
    }
    $("#acik").innerHTML = o.slice(0, i + 1).map(z => `<div><span style="font-size:22px">${z.emoji}</span><div><div class="ilk">${kacis(z.unvan)}</div><b>${kacis(z.adlar)}</b></div></div>`).join("") || `<p class="soluk">—</p>`;
  };
  ciz2();
  guncelle[6] = ciz2;
}
document.addEventListener("keydown", e => {
  if (kontrol?.asama !== 6 || e.target.closest("input,textarea")) return;
  if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") { e.preventDefault(); $("#sonrakiBtn")?.click(); }
  if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); $("#oncekiBtn")?.click(); }
});

// ------------------------------------------------------------
// Ayarlar
// ------------------------------------------------------------
function ayarlariBagla() {
  $("#ayarBtn").onclick = () => {
    $("#ayarModal").classList.remove("gizli");
    $("#ayarBilgi").innerHTML = V.demo ? "Demo modu: veriler bu tarayıcıda tutuluyor." : "Firebase’e bağlı · katılımcı adresi: <b>" + kacis(katilimciUrl()) + "</b>";
    $("#demoAraclar").classList.toggle("gizli", !V.demo);
    $("#katilimciAc").href = katilimciUrl();
    $("#silMesaj").innerHTML = ""; $("#silOnay").value = "";
  };
  $("#ayarKapat").onclick = () => $("#ayarModal").classList.add("gizli");
  $("#ornekBtn").onclick = async () => { await V.ornekVeriEkle(32); $("#ayarModal").classList.add("gizli"); };
  $("#silBtn").onclick = async () => {
    if ($("#silOnay").value.trim().toLocaleUpperCase("tr-TR") !== "SİL") { $("#silMesaj").innerHTML = `<div class="mesaj hata">Onay için SİL yaz.</div>`; return; }
    try { const n = await V.tumunuSil(); $("#silMesaj").innerHTML = `<div class="mesaj ok">${n} kayıt silindi.</div>`; gorulenIsim.clear(); }
    catch (e) { $("#silMesaj").innerHTML = `<div class="mesaj hata">${kacis(e.message)}</div>`; }
  };
  $("#cikisBtn").onclick = async () => { await V.cikis(); location.reload(); };
}

// ------------------------------------------------------------
// BAŞLAT
// ------------------------------------------------------------
async function panelBaslat() {
  $("#girisSahne").classList.add("gizli");
  $("#uygulama").classList.remove("gizli");
  ayarlariBagla();
  try { await V.kontrolHazirla(); } catch (e) { return hata(e); }
  V.kontrolDinle(k => { kontrol = k; ciz(); }, e => hata(e));
  V.katilimcilariDinle(l => { satirlar = l; ciz(); }, e => hata(e));
}
function hata(e) { govde.innerHTML = `<div class="kart panel"><div class="mesaj hata">Hata: ${kacis(e.message || e)}</div></div>`; }

(async function () {
  try {
    V = await veriKatmani();
    if (V.demo) $("#demoSerit").classList.remove("gizli");
    if (await V.yoneticiDurumu()) return panelBaslat();
    $("#girisSahne").classList.remove("gizli");
    if (V.demo) { $("#eposta").value = "demo@hastak"; $("#sifre").value = "demo"; }
    $("#girisForm").onsubmit = async e => {
      e.preventDefault();
      try { await V.yoneticiGiris($("#eposta").value.trim(), $("#sifre").value); panelBaslat(); }
      catch (err) { $("#girisMesaj").innerHTML = `<div class="mesaj hata">Giriş başarısız: ${kacis(err.message)}</div>`; }
    };
  } catch (e) { document.body.innerHTML = `<div class="kart panel" style="margin:20px"><div class="mesaj hata">Başlatılamadı: ${kacis(e.message)}</div></div>`; }
})();
