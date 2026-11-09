// Basit, güvenli ifade değerlendirici + hesap makinesi bileşeni

// ifade: "12+3*(4-1)^2/√9" gibi (× ÷ − yerine * / - kullanılır)
export function degerlendir(ifade) {
  const t = [];
  let i = 0;
  while (i < ifade.length) {
    const ch = ifade[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/[0-9.]/.test(ch)) {
      let j = i; while (j < ifade.length && /[0-9.]/.test(ifade[j])) j++;
      const sayi = Number(ifade.slice(i, j));
      if (!Number.isFinite(sayi)) throw new Error("Hatalı sayı");
      t.push({ s: sayi }); i = j; continue;
    }
    if ("+-*/^()√".includes(ch)) { t.push({ o: ch }); i++; continue; }
    throw new Error("Geçersiz karakter");
  }
  let k = 0;
  const bak = () => t[k], al = () => t[k++];
  function ifadeP() {
    let v = terim();
    while (bak() && (bak().o === "+" || bak().o === "-")) { const o = al().o; const s = terim(); v = o === "+" ? v + s : v - s; }
    return v;
  }
  function terim() {
    let v = us();
    while (bak() && (bak().o === "*" || bak().o === "/")) { const o = al().o; const s = us(); v = o === "*" ? v * s : v / s; }
    return v;
  }
  function us() {
    const v = tekli();
    if (bak() && bak().o === "^") { al(); return Math.pow(v, us()); }
    return v;
  }
  function tekli() {
    if (bak() && bak().o === "-") { al(); return -tekli(); }
    if (bak() && bak().o === "+") { al(); return tekli(); }
    if (bak() && bak().o === "√") { al(); return Math.sqrt(tekli()); }
    return birincil();
  }
  function birincil() {
    const x = al();
    if (!x) throw new Error("Eksik ifade");
    if ("s" in x) return x.s;
    if (x.o === "(") { const v = ifadeP(); if (!bak() || bak().o !== ")") throw new Error("Parantez kapanmadı"); al(); return v; }
    throw new Error("Beklenmeyen işaret");
  }
  const sonuc = ifadeP();
  if (k < t.length) throw new Error("Fazla işaret");
  if (!Number.isFinite(sonuc)) throw new Error("Tanımsız sonuç");
  return sonuc;
}

const GOSTER = { "*": "×", "/": "÷", "-": "−" };
export const gosterim = s => s.replace(/[*/-]/g, c => GOSTER[c]);

// kap: DOM elemanı. Döndürür: { ekle(sayıMetni), sonuc() }
export function hesapMakinesi(kap, { sonucDegisti = () => {} } = {}) {
  let ifade = "", son = null;
  kap.innerHTML = `
    <div class="hm-ekran"><div class="hm-ifade" data-r="ifade">&nbsp;</div><div class="hm-sonuc" data-r="sonuc">0</div></div>
    <div class="hm-tuslar" style="margin-top:10px">
      ${["7","8","9","/","C","4","5","6","*","⌫","1","2","3","-","(","0",".","^2","+",")","√","^","ANS","="]
        .map(t => {
          if (!t) return `<span></span>`;
          const sinif = t === "=" ? "esit" : (t === "C" || t === "⌫") ? "sil" : /[0-9.]/.test(t) && t.length === 1 ? "" : "op";
          const yazi = t === "^2" ? "x²" : t === "^" ? "xʸ" : GOSTER[t] || t;
          return `<button type="button" class="${sinif}" data-t="${t}" ${t === "=" ? 'style="grid-column: span 2"' : ""}>${yazi}</button>`;
        }).join("")}
    </div>`;
  const ifadeEl = kap.querySelector('[data-r="ifade"]'), sonucEl = kap.querySelector('[data-r="sonuc"]');
  const yenile = (onizle = true) => {
    ifadeEl.textContent = ifade ? gosterim(ifade) : " ";
    if (onizle && ifade) { try { sonucEl.textContent = bicimle(degerlendir(ifade)); } catch { /* yazılırken eksik olabilir */ } }
  };
  const bicimle = v => Number.isInteger(v) ? String(v) : String(Math.round(v * 1e6) / 1e6);
  const sayiyaBitiyor = () => /[0-9.)]$/.test(ifade);
  kap.addEventListener("click", e => {
    const b = e.target.closest("button[data-t]"); if (!b) return;
    const t = b.dataset.t;
    if (t === "C") { ifade = ""; sonucEl.textContent = "0"; yenile(false); return; }
    if (t === "⌫") { ifade = ifade.slice(0, -1); yenile(); if (!ifade) sonucEl.textContent = "0"; return; }
    if (t === "ANS") { if (son !== null) { if (sayiyaBitiyor()) ifade += "*"; ifade += bicimle(son); yenile(); } return; }
    if (t === "=") {
      try { son = degerlendir(ifade); sonucEl.textContent = bicimle(son); ifadeEl.textContent = gosterim(ifade) + " ="; ifade = ""; sonucDegisti(son); }
      catch (err) { sonucEl.textContent = "Hata: " + err.message; }
      return;
    }
    ifade += t; yenile();
  });
  return {
    sayiEkle(metin) { if (sayiyaBitiyor()) ifade += "+"; ifade += metin; yenile(); },
    sonuc: () => son
  };
}
