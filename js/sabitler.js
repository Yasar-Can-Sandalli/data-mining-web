// Uygulama listesi, aşamalar ve sunumda gösterilecek Python kodları

export const UYGULAMALAR = [
  { k: "whatsapp",  ad: "WhatsApp",  renk: "#25A35A", unvan: "WhatsApp Kralı / Kraliçesi", emoji: "💬" },
  { k: "instagram", ad: "Instagram", renk: "#D63F8C", unvan: "Reels Profesörü",            emoji: "📸" },
  { k: "youtube",   ad: "YouTube",   renk: "#E2553E", unvan: "YouTube Akademisyeni",       emoji: "▶️" },
  { k: "tiktok",    ad: "TikTok",    renk: "#1E1B4B", unvan: "TikTok Dansçısı",            emoji: "🎵" },
  { k: "x",         ad: "X",         renk: "#62607E", unvan: "X Muhabiri",                 emoji: "🐦" },
  { k: "oyun",      ad: "Oyunlar",   renk: "#5A48D6", unvan: "Oyun Efsanesi",              emoji: "🎮" },
  { k: "diger",     ad: "Diğer",     renk: "#C2841A", unvan: null,                         emoji: "📱" }
];

export const UYG_ADI = Object.fromEntries(UYGULAMALAR.map(u => [u.k, u.ad]));
UYG_ADI.yok = "—";

export const ASAMALAR = [
  { no: 1, ad: "Veri toplama" },
  { no: 2, ad: "Analiz" },
  { no: 3, ad: "Hesap makinesi" },
  { no: 4, ad: "Python" },
  { no: 5, ad: "Korelasyon & tahmin" },
  { no: 6, ad: "Ödüller" }
];

// Hesap makinesi görevleri (değişken: günlük toplam ekran süresi, dk)
export const GOREVLER = [
  { k: "ortalama", ad: "Ortalama",          ipucu: "x̄ = Σx / n" },
  { k: "medyan",   ad: "Medyan",            ipucu: "Sırala → tam ortadaki değer (n çiftse ortadaki ikisinin ortalaması)" },
  { k: "mod",      ad: "Mod",               ipucu: "Sınıfta en çok kullanılan uygulama hangisi? (kategorik mod)" },
  { k: "varyans",  ad: "Varyans (÷ n)",     ipucu: "σ² = Σ(x − x̄)² / n   ya da kısa yol: Σx²/n − x̄²" },
  { k: "std",      ad: "Standart sapma",    ipucu: "σ = √σ²" }
];

// Sunumda adım adım verilecek Python kodları. Katılımcı ekranında `df` hazır gelir.
export const KODLAR = [
  {
    id: "ozet",
    ad: "1 · Özet istatistikler",
    kod:
`print(df["toplam"].describe().round(1))
print("Varyans:", round(df["toplam"].var(ddof=0), 1))
print("Std    :", round(df["toplam"].std(ddof=0), 1))`
  },
  {
    id: "cubuk",
    ad: "2 · İsimli çubuk grafik",
    kod:
`s = df.sort_values("toplam")
plt.figure(figsize=(7, 9))
plt.barh(s["ad"], s["toplam"], color="#5A48D6")
plt.xlabel("Günlük ekran süresi (dk)")
plt.show()`
  },
  {
    id: "dagilim",
    ad: "3 · Histogram + boxplot",
    kod:
`fig, (a1, a2) = plt.subplots(1, 2, figsize=(10, 4))
a1.hist(df["toplam"], bins=6, color="#0F9D94")
a1.set_title("Histogram")
a2.boxplot(df["toplam"], vert=False)
a2.set_title("Boxplot")
plt.show()`
  },
  {
    id: "mod",
    ad: "4 · En çok kullanılan uygulama (mod)",
    kod:
`sayim = df["en_cok"].value_counts()
print(sayim)
sayim.plot.bar(color="#E2553E")
plt.show()`
  },
  {
    id: "korelasyon",
    ad: "5 · Korelasyon: ekran süresi ↔ adım",
    kod:
`print("r =", round(df["toplam"].corr(df["adim"]), 2))
plt.scatter(df["toplam"], df["adim"], color="#1E1B4B")
plt.xlabel("Ekran süresi (dk)")
plt.ylabel("Adım")
plt.show()`
  }
];
