# HASTAK Canlı – Kurulum Rehberi

Site iki sayfadan oluşur:

| Sayfa | Kim açar | Adres |
|---|---|---|
| `index.html` | Katılımcılar (telefon, QR ile) | `https://yasar-can-sandalli.github.io/hastak-canli/` |
| `sunum.html` | Sunum bilgisayarı (projeksiyon) | `https://yasar-can-sandalli.github.io/hastak-canli/sunum.html` |

Veriler **Firebase Firestore**'da tutulur. Site **GitHub Pages**'te yayınlanır.

---

## 0 · Prova (Firebase olmadan, hemen)

`js/ayarlar.js` içinde `apiKey` boşsa site otomatik **DEMO MODU**nda çalışır.
Bu modda veriler sadece tarayıcında tutulur.

1. Klasörde bir terminal aç: `python -m http.server 8000`
2. Tarayıcıda `http://localhost:8000/sunum.html` → **Giriş yap** (demo'da şifre sorulmaz).
3. ⚙︎ **Ayarlar → "Prova: 32 örnek katılımcı ekle"** → bütün aşamaları gez.
4. Aynı tarayıcıda yeni sekmede `http://localhost:8000/index.html` aç. Bu sekme bir katılımcı gibi davranır.

> Yayındaki sitede de adresin sonuna `?demo=1` eklersen demo moduna geçer:
> `…/sunum.html?demo=1`. Grupça prova yapmak için kullanabilirsiniz.

---

## 1 · Firebase (1. kısım: konsol ayarları)

1. https://console.firebase.google.com → **Proje oluştur** → ad: `hastak-canli` → Google Analytics **kapalı**.
2. **Build → Firestore Database → Create database** → konum `eur3 (europe-west)` → **production mode**.
3. **Build → Authentication → Get started → Sign-in method**:
   - **Anonymous** → Enable
   - **Email/Password** → Enable
4. **Authentication → Users → Add user**: yönetici e-posta ve şifresi.
5. ⚙︎ **Project settings → General → Your apps → `</>` Web** → takma ad `hastak-web` → **Register app**.
   Çıkan `firebaseConfig` bloğunu kopyala.

## 2 · Kodu Firebase'e bağla

`js/ayarlar.js` dosyasını aç:

```js
export const firebaseConfig = {
  apiKey: "AIza…",
  authDomain: "hastak-canli.firebaseapp.com",
  projectId: "hastak-canli",
  storageBucket: "hastak-canli.appspot.com",
  messagingSenderId: "…",
  appId: "1:…:web:…"
};
export const ADMIN_EMAIL = "yonetici@ornek.com";   // 4. adımdaki e-posta
```

## 3 · Güvenlik kurallarını yapıştır

1. Firebase → **Firestore Database → Rules** sekmesi.
2. İçindekini sil, `firestore.rules` dosyasının **tamamını** yapıştır.
3. `ADMIN_EPOSTA_BURAYA` yazısını yönetici e-postanla değiştir (tırnaklar kalsın).
4. **Publish**.

Bu kurallar şunları sağlar:

- Herkes yalnızca **kendi** kaydını yazabilir.
- Değerler kontrol edilir: süre 0–1440 dk arası olmalı, toplam elle değiştirilemez.
- Form sadece **1. aşamada** açıktır.
- Aşamaları ve veri silmeyi sadece yönetici yapabilir.

## 4 · GitHub Pages'te yayınla

1. https://github.com/new → repo adı `hastak-canli` → **Public** → Create.
2. **"uploading an existing file"** bağlantısına tıkla.
3. Klasördeki **her şeyi** sürükle: `index.html`, `sunum.html`, `css/`, `js/`, `firestore.rules`, `KURULUM.md`. Klasör yapısı aynen kalmalı.
4. **Commit changes**.
5. Repo → **Settings → Pages** → Source: **Deploy from a branch** → Branch: `main`, klasör `/ (root)` → **Save**.
6. 1–2 dakika bekle. Adres: `https://yasar-can-sandalli.github.io/hastak-canli/`

## 5 · Alan adını Firebase'e tanıt

Firebase → **Authentication → Settings → Authorized domains → Add domain** → `yasar-can-sandalli.github.io`

## 6 · Test

1. Bilgisayarda `…/sunum.html` → yönetici e-posta ve şifresiyle giriş yap.
2. Telefonda QR'ı okut → formu doldur → sunum ekranında ismin belirmeli.
3. 2–6 arası aşamaları gez.
4. Test verisini silmek için: ⚙︎ **Ayarlar** → kutuya `SİL` yaz → **Sil**.

---

## Sunum günü kontrol listesi

- [ ] Sunumdan **önce** ⚙︎ Ayarlar'dan test verilerini sil. Aşama 1'den başlarsın.
- [ ] Sunum bilgisayarında `sunum.html` açık ve giriş yapılmış olsun.
- [ ] Tarayıcıyı tam ekran yap (F11). Yazılar küçükse Ctrl + `+`.
- [ ] Python ilk açılışta yaklaşık 20 MB indirir. Katılımcılar siteyi Aşama 1'de açtığı için Aşama 4'e kadar hazır olur.
- [ ] Ödüllerde → tuşu ya da sunum kumandası "sonraki ödül" işini görür.
- [ ] Sunumdan **sonra**: ⚙︎ Ayarlar → `SİL` → tüm veriler silinir.

## Aşamalar

| # | Sunum ekranı | Katılımcı ekranı |
|---|---|---|
| 1 | QR + canlı sayaç + isimler | Form: uygulama süreleri (sa/dk), adım, onay |
| 2 | Kaç kişi buldu + ilk bulanlar · "Cevapları göster" | Hesap makinesi + 5 görev (ortalama, medyan, mod, varyans, std) |
| 3 | Özet istatistikler · kişi kişi grafik · histogram + boxplot · uygulamalar | Kendi yeri (sıra, ortalamadan sapma) |
| 4 | Python kodları · "Katılımcılara gönder" · "Burada çalıştır" | Kod editörü (`df` hazır) + "Sunumdaki kodu getir" |
| 5 | Saçılım grafiği · tahminler · "Sonucu göster" (r + eğilim çizgisi) | r tahmini (−1…+1) → sonuç + kendi noktası |
| 6 | Ödüller tek tek | Açıklanan ödüller |

## Dosyalar

```
index.html        katılımcı sayfası
sunum.html        sunum ekranı
css/stil.css      tasarım
js/ayarlar.js     ← Firebase bilgileri buraya
js/sabitler.js    uygulama listesi, görevler, Python kodları (buradan değiştirilebilir)
js/veri.js        Firebase / demo veri katmanı
js/istatistik.js  ortalama, medyan, varyans, çeyrekler (pandas ile aynı yöntem), korelasyon
js/grafik.js      grafikler (Chart.js) ve boxplot
js/hesapmakinesi.js
js/python.js      tarayıcıda Python (Pyodide: pandas + matplotlib)
js/oduller.js     ödül hesapları
js/katilimci.js   katılımcı ekranı mantığı
js/sunum.js       sunum ekranı mantığı
firestore.rules   Firebase güvenlik kuralları
```
