// ============================================================
//  KATILIMCI EKRANI (telefon)
// ============================================================
import { veriKatmani } from "./veri.js";
import { ETKINLIK_ADI } from "./ayarlar.js";
import { UYGULAMALAR, UYG_ADI, ASAMALAR, GOREVLER } from "./sabitler.js";
import * as I from "./istatistik.js";
import { hesapMakinesi } from "./hesapmakinesi.js";
import { pythonHazirla, calistir, hataIpucu } from "./python.js";
import { sacilim, kacis } from "./grafik.js";
import { odulleriHesapla } from "./oduller.js";
import { KODLAR } from "./sabitler.js";

const $ = s => document.querySelector(s);
const govde = $("#govde");

let V, uid, kontrol = null, satirlar = [], cizilenAsama = null, duzenle = false;
const benim = () => satirlar.find(r => r.id === uid);

function asamaEtiketi() {
  const a = ASAMALAR.find(x => x.no === kontrol?.asama);
  $("#asama").textContent = a ? `${a.no}/6 · ${a.ad}` : "…";
}

// ------------------------------------------------------------
// Ana çizim: aşama değiştiğinde tam çizim, veri değiştiğinde parça güncelleme
// ------------------------------------------------------------
function ciz(zorla = false) {
  if (!kontrol) return;
  asamaEtiketi();
  const a = kontrol.asama;
  const anahtar = a + "|" + (a === 1 ? (benim() && !duzenle ? "kayitli" : "form") : "");
  if (zorla || anahtar !== cizilenAsama) {
    cizilenAsama = anahtar;
    ({ 1: asama1, 2: asama3, 3: asama2, 4: asama5, 5: asama4, 6: asama6 })[a]?.();
    if (a >= 3) pythonHazirla().catch(() => {});        // Python'u arka planda hazırla
  } else {
    guncelle[a]?.();
  }
}
const guncelle = {};

// ------------------------------------------------------------
// 1 · VERİ TOPLAMA
// ------------------------------------------------------------
function asama1() {
  const b = benim();
  if (b && !duzenle) {
    govde.innerHTML = `
      <div class="kart">
        <span class="etiket teal">Kaydedildi ✓</span>
        <h2 style="margin-top:10px">Teşekkürler, ${kacis(b.ad.split(" ")[0])}!</h2>
        <p class="soluk">Verilerin sınıfın veri setine eklendi. Sunum ekranına bak; analiz birazdan başlıyor.</p>
        <div class="mini-izgara" style="margin-top:12px">
          <div class="mini"><div class="d">${I.sureYaz(b.toplam)}</div><div class="e">Günlük ekran süren</div></div>
          <div class="mini"><div class="d">${b.adim == null ? "—" : I.bicim(b.adim, 0)}</div><div class="e">Günlük adım</div></div>
        </div>
        <button class="btn ikincil" id="duzenleBtn" style="margin-top:14px;width:100%">Verilerimi düzenle</button>
      </div>
      <div class="kart"><h3>Sınıfta şu an</h3><div id="canliSayi" class="buyuk-sayi">${satirlar.length} kişi</div></div>`;
    $("#duzenleBtn").onclick = () => { duzenle = true; ciz(true); };
    guncelle[1] = () => { const el = $("#canliSayi"); if (el) el.textContent = satirlar.length + " kişi"; };
    return;
  }
  guncelle[1] = () => {};
  const s = b || {};
  const sa = k => (s[k] ? Math.floor(s[k] / 60) : "");
  const dk = k => (s[k] ? s[k] % 60 : "");
  govde.innerHTML = `
    <form class="kart" id="form" novalidate style="display:grid;gap:16px">
      <div>
        <span class="etiket coral">Canlı veri seti</span>
        <h2 style="margin-top:10px">Sınıfın ekran süresi</h2>
        <p class="soluk" style="margin:4px 0 0">Bu verilerle birazdan ortalama, medyan, varyans ve standart sapmayı canlı hesaplayacağız.</p>
      </div>
      <div class="alan">
        <label for="ad">Ad Soyad</label>
        <input class="girdi" id="ad" maxlength="40" autocomplete="name" placeholder="Örn. Yaşar Can Sandallı" value="${kacis(s.ad || "")}" required>
      </div>
      <div class="rehber">
        📱 <b>Değerleri nereden bulurum?</b><br>
        iPhone: <b>Ayarlar → Ekran Süresi → Tüm Uygulama ve Web Sitesi Etkinliğini Gör → Hafta</b> (“Günlük ortalama” yazar)<br>
        Android: <b>Ayarlar → Dijital Denge ve ebeveyn denetimleri</b> (bazı telefonlarda “Dijital Sağlıklılık”)<br>
        Son 7 günün <b>günlük ortalamasını</b> gir; kullanmadığın uygulamayı boş bırak.
      </div>
      <div>
        <div class="uyg-baslik"><span>Uygulama</span><span>Saat</span><span>Dakika</span></div>
        ${UYGULAMALAR.map(u => `
          <div class="uyg-satir">
            <div class="uyg-ad"><i style="background:${u.renk}"></i>${u.ad}</div>
            <input class="girdi sure" data-k="${u.k}" data-t="sa" type="number" inputmode="numeric" min="0" max="24" placeholder="0" value="${sa(u.k)}" aria-label="${u.ad} saat">
            <input class="girdi sure" data-k="${u.k}" data-t="dk" type="number" inputmode="numeric" min="0" max="59" placeholder="0" value="${dk(u.k)}" aria-label="${u.ad} dakika">
          </div>`).join("")}
      </div>
      <div class="toplam-kutu"><span>Günlük toplam</span><strong id="toplamYaz">0 dk</strong></div>
      <div class="alan">
        <label for="adim">Günlük ortalama adım sayın</label>
        <input class="girdi" id="adim" type="number" inputmode="numeric" min="0" max="100000" placeholder="Örn. 6500" value="${s.adim ?? ""}" ${s.adim === null && b ? "disabled" : ""}>
        <label class="onay"><input type="checkbox" id="adimYok" ${s.adim === null && b ? "checked" : ""}> Bilmiyorum / telefonum saymıyor</label>
        <div class="rehber">iPhone: <b>Sağlık → Adımlar</b> · Android: <b>Google Fit / Samsung Health / Mi Fitness</b></div>
      </div>
      <label class="onay"><input type="checkbox" id="onay" ${b ? "checked" : ""}> Adım ve verilerim sunum ekranında gösterilebilir. Veriler sunumdan sonra silinecek.</label>
      <div id="formMesaj"></div>
      <button class="btn coral" type="submit" style="padding:15px">${b ? "Güncelle" : "Gönder"}</button>
    </form>`;
  const form = $("#form");
  const oku = () => {
    const v = {};
    for (const u of UYGULAMALAR) {
      const saat = Number(form.querySelector(`[data-k="${u.k}"][data-t="sa"]`).value || 0);
      const dakika = Number(form.querySelector(`[data-k="${u.k}"][data-t="dk"]`).value || 0);
      v[u.k] = Math.round(saat * 60 + dakika);
    }
    return v;
  };
  const toplamGoster = () => {
    const v = oku(); const t = Object.values(v).reduce((a, x) => a + x, 0);
    $("#toplamYaz").textContent = I.sureYaz(t);
    $("#toplamYaz").style.color = t > 1440 ? "var(--coral)" : "";
  };
  form.addEventListener("input", toplamGoster);
  toplamGoster();
  $("#adimYok").onchange = e => { $("#adim").disabled = e.target.checked; if (e.target.checked) $("#adim").value = ""; };
  form.onsubmit = async e => {
    e.preventDefault();
    const m = $("#formMesaj");
    const ad = $("#ad").value.trim().replace(/\s+/g, " ");
    const v = oku();
    const hatalar = [];
    if (ad.length < 2) hatalar.push("Adını yaz.");
    for (const u of UYGULAMALAR) {
      const s1 = Number(form.querySelector(`[data-k="${u.k}"][data-t="sa"]`).value || 0);
      const d1 = Number(form.querySelector(`[data-k="${u.k}"][data-t="dk"]`).value || 0);
      if (s1 < 0 || d1 < 0 || d1 > 59 || s1 > 24 || !Number.isInteger(s1) || !Number.isInteger(d1)) hatalar.push(`${u.ad}: saat 0–24, dakika 0–59 arası tam sayı olmalı.`);
    }
    const toplam = Object.values(v).reduce((a, x) => a + x, 0);
    if (toplam > 1440) hatalar.push("Toplam 24 saati geçemez 🙂");
    let adim = null;
    if (!$("#adimYok").checked) {
      const ham = $("#adim").value.trim();
      if (!ham) hatalar.push("Adım sayını yaz ya da “Bilmiyorum”u işaretle.");
      else { adim = Math.round(Number(ham)); if (!(adim >= 0 && adim <= 100000)) hatalar.push("Adım 0–100.000 arası olmalı."); }
    }
    if (!$("#onay").checked) hatalar.push("Onay kutusunu işaretle.");
    if (hatalar.length) { m.innerHTML = `<div class="mesaj hata">${hatalar.map(kacis).join("<br>")}</div>`; return; }
    const enCok = toplam ? UYGULAMALAR.reduce((a, u) => (v[u.k] > v[a] ? u.k : a), UYGULAMALAR[0].k) : "yok";
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true; btn.innerHTML = `<span class="yukleniyor"></span> Gönderiliyor`;
    try {
      await V.formKaydet(uid, { ad, ...v, toplam, adim, en_cok: enCok });
      duzenle = false;
      // ciz() veri dinleyicisinden gelecek; yine de garanti olsun:
      setTimeout(() => ciz(true), 300);
    } catch (err) {
      m.innerHTML = `<div class="mesaj hata">Kaydedilemedi: ${kacis(err.message)}</div>`;
      btn.disabled = false; btn.textContent = b ? "Güncelle" : "Gönder";
    }
  };
}

// ------------------------------------------------------------
// 2 · ANALİZ (gözler sunum ekranında)
// ------------------------------------------------------------
function asama2() {
  govde.innerHTML = `
    <div class="kart" style="text-align:center;padding:26px 16px">
      <div style="font-size:44px">👀</div>
      <h2>Gözler sunum ekranında</h2>
      <p class="soluk">Sınıfın verisi analiz ediliyor. Aşağıda kendi yerini görebilirsin.</p>
    </div>
    <div class="kart" id="benKart"></div>`;
  guncelle[3] = benKartiCiz;
  benKartiCiz();
}
function benKartiCiz() {
  const el = $("#benKart"); if (!el) return;
  const b = benim();
  if (!b) { el.innerHTML = `<p class="soluk">Veri göndermediğin için kişisel özetin yok; sınıfla birlikte izleyebilirsin.</p>`; return; }
  const top = satirlar.map(r => r.toplam);
  const ort = I.ortalama(top), med = I.medyan(top);
  const sira = [...satirlar].sort((x, y) => y.toplam - x.toplam).findIndex(r => r.id === uid) + 1;
  const s = I.std(top);
  const z = s > 0 ? (b.toplam - ort) / s : 0;
  el.innerHTML = `
    <h3>Sen ve sınıf</h3>
    <div class="mini-izgara" style="margin-top:10px">
      <div class="mini"><div class="d ben">${I.sureYaz(b.toplam)}</div><div class="e">Senin günlük süren</div></div>
      <div class="mini"><div class="d">${sira}/${satirlar.length}</div><div class="e">En çoktan aza sıran</div></div>
      <div class="mini"><div class="d">${I.sureYaz(ort)}</div><div class="e">Sınıf ortalaması</div></div>
      <div class="mini"><div class="d">${I.sureYaz(med)}</div><div class="e">Sınıf medyanı</div></div>
    </div>
    <p class="rehber" style="margin:12px 0 0">Ortalamadan <b>${I.bicim(Math.abs(z), 2)} standart sapma</b> ${z >= 0 ? "yukarıdasın" : "aşağıdasın"}.
    ${Math.abs(z) > 2 ? "Bu oldukça uç bir değer! 😮" : Math.abs(z) < 0.5 ? "Tam sınıfın ortasındasın." : ""}</p>`;
}

// ------------------------------------------------------------
// 3 · HESAP MAKİNESİ
// ------------------------------------------------------------
let hm = null, siraliGoster = false, modSecim = null;
function dogruCevaplar() {
  const x = satirlar.map(r => r.toplam);
  const m = I.mod(satirlar.map(r => r.en_cok).filter(v => v && v !== "yok"));
  return { ortalama: I.ortalama(x), medyan: I.medyan(x), mod: m.degerler, varyans: I.varyans(x, 0), std: I.std(x, 0) };
}
function asama3() {
  govde.innerHTML = `
    <div class="kart">
      <span class="etiket violet">Sıra sende</span>
      <h2 style="margin-top:10px">Hesap makinesiyle bul</h2>
      <p class="soluk" style="margin:4px 0 0">Değişken: sınıfın <b>günlük toplam ekran süresi (dk)</b>. Sayılara dokununca hesap makinesine eklenir.</p>
    </div>
    <div class="kart">
      <div class="cip-baslik">
        <h3>Veri seti <span class="soluk" id="nYaz"></span></h3>
        <div class="anahtar"><button type="button" data-s="0">Geliş sırası</button><button type="button" data-s="1">Sıralı</button></div>
      </div>
      <div class="cipler" id="cipler"></div>
      <div class="cipler" style="margin-top:8px" id="yardimcilar"></div>
    </div>
    <div class="kart">
      <div class="cip-baslik"><h3>Mod için: herkesin en çok kullandığı uygulama</h3></div>
      <div class="cipler" id="katCipler"></div>
      <p class="rehber" style="margin:8px 0 0">Say bakalım: en çok tekrar eden uygulama hangisi? (“Sıralı” seçilince aynı uygulamalar yan yana gelir.)</p>
    </div>
    <div class="kart" id="hm"></div>
    <div class="kart" style="display:grid;gap:10px" id="gorevler"></div>`;
  hm = hesapMakinesi($("#hm"));
  govde.querySelector(".anahtar").onclick = e => { const b = e.target.closest("button"); if (!b) return; siraliGoster = b.dataset.s === "1"; ciplerCiz(); };
  $("#cipler").onclick = e => { const b = e.target.closest(".cip"); if (b) hm.sayiEkle(b.dataset.v); };
  $("#yardimcilar").onclick = e => { const b = e.target.closest(".cip"); if (b) hm.sayiEkle(b.dataset.v); };
  gorevlerCiz();
  ciplerCiz();
  guncelle[2] = () => { ciplerCiz(); gorevDurum(); };
}
function ciplerCiz() {
  const gelis = [...satirlar].sort((p, q) => (p.zaman || 0) - (q.zaman || 0));
  const x = gelis.map(r => r.toplam);
  const liste = siraliGoster ? I.sirali(x) : x;
  const n = liste.length;
  const ortaIdx = n % 2 ? [(n - 1) / 2] : [n / 2 - 1, n / 2];
  $("#nYaz").textContent = `(n = ${n})`;
  govde.querySelectorAll(".anahtar button").forEach(b => b.classList.toggle("aktif", (b.dataset.s === "1") === siraliGoster));
  $("#cipler").innerHTML = liste.map((v, i) =>
    `<button type="button" class="cip ${siraliGoster && kontrol.cevapGoster && ortaIdx.includes(i) ? "orta" : ""}" data-v="${v}" title="${i + 1}. değer">${v}</button>`).join("");
  const renk = Object.fromEntries(UYGULAMALAR.map(u => [u.k, u.renk]));
  const sira = Object.fromEntries(UYGULAMALAR.map((u, i) => [u.k, i]));
  let kat = gelis.map(r => r.en_cok).filter(v => v && v !== "yok");
  if (siraliGoster) kat = [...kat].sort((p, q) => sira[p] - sira[q]);
  $("#katCipler").innerHTML = kat.map(k => `<span class="cip" style="font-family:var(--font)"><i style="display:inline-block;width:9px;height:9px;border-radius:3px;background:${renk[k]};margin-right:6px"></i>${UYG_ADI[k]}</span>`).join("");
  const sx = I.toplamF(x), sx2 = x.reduce((a, v) => a + v * v, 0);
  $("#yardimcilar").innerHTML = `
    <button type="button" class="cip yardim" data-v="${n}">n = ${n}</button>
    <button type="button" class="cip yardim" data-v="${sx}">Σx = ${sx}</button>
    <button type="button" class="cip yardim" data-v="${sx2}">Σx² = ${sx2}</button>`;
}
function gorevlerCiz() {
  const el = $("#gorevler");
  el.innerHTML = `<h3>Görevler</h3>` + GOREVLER.map(g => `
    <div class="gorev" data-g="${g.k}">
      <div class="gorev-ust"><b>${g.ad}</b><span class="durum"></span></div>
      <div class="ipucu">${g.ipucu}</div>
      ${g.k === "mod" ? `
        <div class="secenekler">${UYGULAMALAR.map(u => `<button type="button" data-m="${u.k}">${u.ad}</button>`).join("")}</div>
        <div class="gorev-satir"><button type="button" class="btn violet kontrol" style="width:100%">Kontrol et</button></div>` : `
        <div class="gorev-satir">
          <input class="girdi" inputmode="decimal" placeholder="Cevabın">
          <button type="button" class="btn ikincil sonucAl" title="Hesap makinesindeki son sonucu yaz">ANS</button>
          <button type="button" class="btn violet kontrol">Kontrol</button>
        </div>`}
      <div class="geri"></div>
    </div>`).join("");
  el.onclick = async e => {
    const kutu = e.target.closest(".gorev"); if (!kutu) return;
    const g = kutu.dataset.g;
    if (e.target.dataset.m) {
      modSecim = e.target.dataset.m;
      kutu.querySelectorAll("[data-m]").forEach(b => b.classList.toggle("secili", b.dataset.m === modSecim));
      return;
    }
    if (e.target.closest(".sonucAl")) { const s = hm.sonuc(); if (s !== null) kutu.querySelector("input").value = String(Math.round(s * 1000) / 1000).replace(".", ","); return; }
    if (!e.target.closest(".kontrol")) return;
    const d = dogruCevaplar();
    let dogru;
    if (g === "mod") dogru = modSecim && d.mod.includes(modSecim);
    else {
      const cevap = sayiOku(kutu.querySelector("input").value);
      dogru = I.yakinMi(cevap, d[g]);
    }
    const geri = kutu.querySelector(".geri");
    if (dogru) {
      geri.innerHTML = `<div class="mesaj ok">Doğru! 🎉${benim() ? "" : " <small>(1. aşamada veri göndermediğin için skor tablosuna yazılmadı)</small>"}</div>`;
      if (benim() && !benim().hesap?.[g]) { try { await V.hesapKaydet(uid, g); } catch { /* sessiz */ } }
      kutu.classList.add("tamam");
    } else {
      geri.innerHTML = `<div class="mesaj hata">${g === "mod" && !modSecim ? "Önce bir uygulama seç." : "Henüz değil, tekrar dene."}</div>`;
    }
  };
  gorevDurum();
}
// "14.755,2" · "14755,2" · "14755.2" hepsini sayı olarak oku
function sayiOku(metin) {
  let t = String(metin).replace(/\s/g, "");
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if ((t.match(/\./g) || []).length > 1) t = t.replace(/\./g, "");
  return t === "" ? NaN : Number(t);
}
function gorevDurum() {
  const b = benim(), d = dogruCevaplar();
  govde.querySelectorAll(".gorev").forEach(k => {
    const g = k.dataset.g;
    const tamam = !!b?.hesap?.[g];
    k.classList.toggle("tamam", tamam || k.classList.contains("tamam"));
    k.querySelector(".durum").innerHTML = tamam ? `<span class="etiket teal">✓</span>` : "";
    const ip = k.querySelector(".ipucu");
    if (kontrol.cevapGoster) {
      const c = g === "mod" ? d.mod.map(m => UYG_ADI[m]).join(", ") : I.bicim(d[g], 2);
      ip.innerHTML = `Cevap: <b>${kacis(c)}</b>`;
    } else {
      ip.textContent = GOREVLER.find(x => x.k === g).ipucu;
    }
  });
}

// ------------------------------------------------------------
// 4 · PYTHON
// ------------------------------------------------------------
function asama4() {
  govde.innerHTML = `
    <div class="kart">
      <span class="etiket">Python · pandas</span>
      <h2 style="margin-top:10px">Kodu çalıştır, grafiği sen üret</h2>
      <p class="soluk" style="margin:4px 0 0">Sınıfın verisi <code>df</code> adıyla hazır. Sunumdaki kodu yaz ya da getir, ▶ Çalıştır'a bas.</p>
      <p class="rehber" style="margin:8px 0 0" id="pyDurum"></p>
    </div>
    <div class="kart" style="display:grid;gap:10px">
      <textarea class="editor" id="editor" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off"
        placeholder='print(df["toplam"].mean())'></textarea>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn violet" id="calistirBtn">▶ Çalıştır</button>
        <button class="btn ikincil" id="getirBtn">Sunumdaki kodu getir</button>
        <button class="btn hayalet" id="temizleBtn">Temizle</button>
      </div>
      <div class="rehber">Sütunlar: <code>ad, whatsapp, instagram, youtube, tiktok, x, oyun, diger, toplam, adim, en_cok</code></div>
    </div>
    <div class="kart gizli" id="sonucKart"><h3>Çıktı</h3><pre class="cikti" id="cikti"></pre><div class="grafikler" id="grafikler"></div></div>`;
  const ed = $("#editor");
  ed.addEventListener("keydown", e => {
    if (e.key === "Tab") { e.preventDefault(); const s = ed.selectionStart; ed.setRangeText("    ", s, ed.selectionEnd, "end"); }
  });
  $("#temizleBtn").onclick = () => { ed.value = ""; ed.focus(); };
  $("#getirBtn").onclick = () => {
    const k = KODLAR.find(x => x.id === kontrol.kodId);
    if (k) { ed.value = k.kod; } else { alertMesaj("Sunum ekranı henüz bir kod göndermedi."); }
    const gb = $("#getirBtn"); gb.classList.remove("coral"); gb.textContent = "Sunumdaki kodu getir";
  };
  $("#calistirBtn").onclick = async () => {
    const btn = $("#calistirBtn"); btn.disabled = true; btn.innerHTML = `<span class="yukleniyor"></span> Çalışıyor`;
    try {
      const s = await calistir(ed.value, satirlar);
      $("#sonucKart").classList.remove("gizli");
      const c = $("#cikti");
      c.className = "cikti" + (s.hata ? " hata" : "");
      c.textContent = s.hata ? s.hata + "\n" + hataIpucu(s.hata) : (s.cikti || (s.grafikler.length ? "✓ Grafik oluşturuldu" : "✓ Çalıştı (çıktı yok — print() kullanmayı dene)"));
      $("#grafikler").innerHTML = s.grafikler.map(g => `<img alt="Grafik" src="data:image/png;base64,${g}">`).join("");
    } catch (err) {
      $("#sonucKart").classList.remove("gizli");
      $("#cikti").className = "cikti hata"; $("#cikti").textContent = "Python yüklenemedi: " + err.message;
    }
    btn.disabled = false; btn.textContent = "▶ Çalıştır";
  };
  pyDurumGoster();
  guncelle[5] = () => {};
}
function pyDurumGoster() {
  const el = $("#pyDurum"); if (!el) return;
  el.innerHTML = `<span class="yukleniyor"></span> Python hazırlanıyor (ilk seferde ~20 sn)…`;
  pythonHazirla(m => { if ($("#pyDurum") && m) $("#pyDurum").innerHTML = `<span class="yukleniyor"></span> ${m}`; })
    .then(() => { if ($("#pyDurum")) $("#pyDurum").innerHTML = "✅ Python hazır."; })
    .catch(e => { if ($("#pyDurum")) $("#pyDurum").innerHTML = "⚠️ Python yüklenemedi: " + kacis(e.message) + " — sayfayı yenile."; });
}
function alertMesaj(t) {
  const d = document.createElement("div"); d.className = "mesaj bilgi"; d.textContent = t;
  $("#editor").after(d); setTimeout(() => d.remove(), 2500);
}

// ------------------------------------------------------------
// 5 · KORELASYON & TAHMİN
// ------------------------------------------------------------
function asama5() {
  govde.innerHTML = `<div id="k5"></div>`;
  sonCizim5 = "";
  guncelle[4] = k5Ciz;
  k5Ciz();
}
let sonCizim5 = "";
function k5Ciz() {
  const el = $("#k5"); if (!el) return;
  const b = benim();
  const durum = kontrol.korelasyonGoster ? "sonuc" : "tahmin";
  if (durum === "tahmin") {
    if (sonCizim5 === "tahmin" + (b?.tahmin ?? "") + kontrol.tahminAcik) return;
    sonCizim5 = "tahmin" + (b?.tahmin ?? "") + kontrol.tahminAcik;
    const t = b?.tahmin ?? 0;
    el.innerHTML = `
      <div class="kart" style="display:grid;gap:12px">
        <div><span class="etiket amber">Tahmin yarışması</span>
          <h2 style="margin-top:10px">Ekran süresi arttıkça adım azalıyor mu?</h2>
          <p class="soluk" style="margin:4px 0 0">Sınıfın verisinde <b>ekran süresi</b> ile <b>adım</b> arasındaki korelasyon katsayısı <b>r</b> kaç çıkacak? En yakın tahmin “Kâhin” ödülünü alır.</p></div>
        <div style="text-align:center"><div class="buyuk-sayi" id="tYaz" style="color:var(--violet)">${I.bicim(t, 2)}</div></div>
        <input type="range" id="tSur" min="-1" max="1" step="0.05" value="${t}" style="width:100%;accent-color:var(--violet)" ${kontrol.tahminAcik ? "" : "disabled"}>
        <div style="display:flex;justify-content:space-between" class="rehber"><span>−1 güçlü negatif</span><span>0 ilişki yok</span><span>+1 güçlü pozitif</span></div>
        ${!b ? `<div class="mesaj bilgi">Tahmin için önce 1. aşamada veri göndermiş olman gerekiyordu.</div>` :
          kontrol.tahminAcik ? `<button class="btn coral" id="tGonder">${Number.isFinite(b.tahmin) ? "Tahminimi güncelle" : "Tahminimi gönder"}</button>` :
          `<div class="mesaj bilgi">${Number.isFinite(b.tahmin) ? "Tahminin kaydedildi: " + I.bicim(b.tahmin, 2) + ". Sonuç birazdan!" : "Tahminler henüz açılmadı, sunum ekranını bekle."}</div>`}
        <div id="tMesaj"></div>
      </div>`;
    const sur = $("#tSur");
    sur.oninput = () => { $("#tYaz").textContent = I.bicim(Number(sur.value), 2); };
    const g = $("#tGonder");
    if (g) g.onclick = async () => {
      g.disabled = true;
      try { await V.tahminKaydet(uid, Math.round(Number(sur.value) * 100) / 100); $("#tMesaj").innerHTML = `<div class="mesaj ok">Kaydedildi ✓</div>`; }
      catch (err) { $("#tMesaj").innerHTML = `<div class="mesaj hata">${kacis(err.message)}</div>`; }
      g.disabled = false;
    };
    return;
  }
  // Sonuç
  sonCizim5 = "sonuc";
  const p = I.pearson(satirlar.map(r => r.toplam), satirlar.map(r => r.adim));
  const kt = b && Number.isFinite(b.adim) ? p.kesisim + p.egim * b.toplam : NaN;
  const kendiTahmin = Number.isFinite(kt) ? kt : null;
  el.innerHTML = `
    <div class="kart" style="display:grid;gap:10px">
      <span class="etiket violet">Sonuç</span>
      <div style="text-align:center"><div class="soluk">Sınıfın korelasyon katsayısı</div><div class="buyuk-sayi" style="font-size:52px;color:var(--violet)">r = ${I.bicim(p.r, 2)}</div>
      <div class="soluk">${I.yorumR(p.r)} · ${p.n} kişi</div></div>
      ${b && Number.isFinite(b.tahmin) ? `<div class="mesaj ${Math.abs(b.tahmin - p.r) < 0.15 ? "ok" : "bilgi"}">Senin tahminin <b>${I.bicim(b.tahmin, 2)}</b> · fark <b>${I.bicim(Math.abs(b.tahmin - p.r), 2)}</b></div>` : ""}
    </div>
    <div class="kart"><h3>Saçılım grafiği <span class="soluk" style="font-weight:500">(sen: kırmızı nokta)</span></h3>
      <div class="grafik-kutu" style="height:280px"><canvas id="sacilim"></canvas></div></div>
    ${kendiTahmin !== null ? `<div class="kart"><h3>Modelin senin için tahmini</h3>
      <p class="rehber" style="margin:6px 0 0">Doğrusal modele göre <b>${I.sureYaz(b.toplam)}</b> ekran süresi olan birinin günlük adımı ≈ <b>${I.bicim(Math.max(0, kendiTahmin), 0)}</b>. Senin gerçek adımın: <b>${I.bicim(b.adim, 0)}</b>.
      ${b.adim > kendiTahmin ? "Modelin tahmininden fazla yürüyorsun 💪" : "Modelin tahmininden az yürüyorsun 🚶"}</p>
      <p class="not" style="margin:8px 0 0">Not: korelasyon nedensellik değildir; bu sadece doğrusal bir eğilim.</p></div>` : ""}`;
  sacilim($("#sacilim"), satirlar, { cizgi: true, vurguId: uid });
}

// ------------------------------------------------------------
// 6 · ÖDÜLLER
// ------------------------------------------------------------
function asama6() {
  govde.innerHTML = `
    <div class="kart" style="text-align:center;padding:22px 16px"><div style="font-size:44px">🏆</div><h2>Ödül töreni</h2>
      <p class="soluk">Ödüller sunum ekranında tek tek açıklanıyor.</p></div>
    <div class="kart" id="odulListe"></div>`;
  guncelle[6] = odulListeCiz;
  odulListeCiz();
}
function odulListeCiz() {
  const el = $("#odulListe"); if (!el) return;
  const o = odulleriHesapla(satirlar).slice(0, kontrol.odulIndex + 1);
  el.innerHTML = o.length ? o.map(x => `
    <div class="odul-mini"><div class="em">${x.emoji}</div><div><div class="u">${kacis(x.unvan)}</div>
    <div class="k ${x.kisiler.some(k => k.id === uid) ? "ben" : ""}">${kacis(x.adlar)}${x.kisiler.some(k => k.id === uid) ? " (sen!)" : ""}</div></div></div>`).join("")
    : `<p class="bos">İlk ödül birazdan…</p>`;
}

// ------------------------------------------------------------
// BAŞLAT
// ------------------------------------------------------------
(async function () {
  $("#etkinlik").textContent = ETKINLIK_ADI;
  try {
    V = await veriKatmani();
    if (V.demo) $("#demoSerit").classList.remove("gizli");
    uid = await V.anonimGiris();
    V.kontrolDinle(k => {
      const eski = kontrol?.asama;
      const kodDegisti = kontrol && kontrol.kodId !== k.kodId;
      kontrol = k;
      if (eski !== k.asama) duzenle = false;
      if (eski === k.asama && (k.asama === 2)) { gorevDurum(); ciplerCiz(); }
      if (eski === k.asama && k.asama === 5 && kodDegisti && k.kodId) {
        const btn = $("#getirBtn"); if (btn) { btn.classList.add("coral"); btn.textContent = "Yeni kod geldi → getir"; }
      }
      ciz();
    }, e => hataGoster(e));
    V.katilimcilariDinle(liste => { satirlar = liste; ciz(); }, e => hataGoster(e));
  } catch (e) { hataGoster(e); }
})();

function hataGoster(e) {
  govde.innerHTML = `<div class="kart"><div class="mesaj hata">Bağlantı hatası: ${kacis(e.message || e)}<br>İnternetini kontrol edip sayfayı yenile.</div></div>`;
}