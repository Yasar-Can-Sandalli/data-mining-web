// Tarayıcıda Python (Pyodide) – pandas + matplotlib
const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";

let hazirlik = null;

function scriptYukle(src) {
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src; s.onload = res; s.onerror = () => rej(new Error("Pyodide indirilemedi (internet?)"));
    document.head.appendChild(s);
  });
}

// durum(metin) ile yükleme ilerlemesi bildirilir
export function pythonHazirla(durum = () => {}) {
  if (hazirlik) return hazirlik;
  hazirlik = (async () => {
    durum("Python indiriliyor…");
    if (!window.loadPyodide) await scriptYukle(PYODIDE_URL + "pyodide.js");
    const py = await window.loadPyodide({ indexURL: PYODIDE_URL });
    durum("pandas ve matplotlib yükleniyor…");
    await py.loadPackage(["pandas", "matplotlib"]);
    await py.runPythonAsync(`
import warnings, io, base64, json
warnings.filterwarnings("ignore")
import matplotlib
matplotlib.use("AGG")
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
plt.rcParams.update({"figure.dpi": 100, "font.size": 10})

def _grafikleri_al():
    sonuc = []
    for no in plt.get_fignums():
        fig = plt.figure(no)
        fig.tight_layout()
        tampon = io.BytesIO()
        fig.savefig(tampon, format="png", bbox_inches="tight")
        sonuc.append(base64.b64encode(tampon.getvalue()).decode())
    plt.close("all")
    return json.dumps(sonuc)

def _veriyi_yukle(metin):
    global df
    df = pd.DataFrame(json.loads(metin))
    sutunlar = ["ad","whatsapp","instagram","youtube","tiktok","x","oyun","diger","toplam","adim","en_cok"]
    df = df[[s for s in sutunlar if s in df.columns]]
    if "adim" in df.columns:
        df["adim"] = pd.to_numeric(df["adim"], errors="coerce")
`);
    durum("");
    return py;
  })().catch(e => { hazirlik = null; throw e; });
  return hazirlik;
}

// satirlar: katılımcı listesi → df
export async function calistir(kod, satirlar) {
  const py = await pythonHazirla();
  const veri = satirlar.map(r => ({
    ad: r.ad, whatsapp: r.whatsapp, instagram: r.instagram, youtube: r.youtube, tiktok: r.tiktok,
    x: r.x, oyun: r.oyun, diger: r.diger, toplam: r.toplam, adim: r.adim ?? null, en_cok: r.en_cok
  }));
  py.globals.get("_veriyi_yukle")(JSON.stringify(veri));
  let cikti = "";
  py.setStdout({ batched: s => { cikti += s + "\n"; } });
  py.setStderr({ batched: s => { cikti += s + "\n"; } });
  let hata = null;
  try {
    await py.runPythonAsync(kod);
  } catch (e) {
    const satir = String(e.message || e).trim().split("\n");
    hata = satir.slice(-3).join("\n");
  }
  const grafikler = JSON.parse(py.globals.get("_grafikleri_al")());
  return { cikti: cikti.trimEnd(), hata, grafikler };
}

// Python hata mesajına Türkçe ipucu
export function hataIpucu(hata) {
  if (!hata) return "";
  if (/NameError/.test(hata)) return "İpucu: bir değişken ya da fonksiyon adını yanlış yazmış olabilirsin (büyük/küçük harf önemli).";
  if (/KeyError/.test(hata)) return "İpucu: sütun adı yanlış. Sütunlar: ad, whatsapp, instagram, youtube, tiktok, x, oyun, diger, toplam, adim, en_cok";
  if (/SyntaxError|IndentationError/.test(hata)) return "İpucu: parantez, tırnak ya da girinti hatası var; satırları kontrol et.";
  return "";
}
