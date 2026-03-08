# Güzellik Salonu Randevu Sistemi (Örnek Proje)

Bu proje, güzellik salonları için **web tabanlı bir randevu sistemi** örneğidir.  
Tamamen **HTML, CSS ve JavaScript** ile, istemci tarafında (front-end) çalışacak şekilde hazırlanmıştır.

## Özellikler

- **Kullanıcı Paneli**
  - Hizmetleri görüntüleme
  - Uygun tarih ve saate randevu oluşturma
  - Randevuları görüntüleme, durum takibi

- **Yönetici Paneli**
  - Hizmet ekleme / silme
  - Personel ekleme / silme
  - Randevu listesini görüntüleme

- **Teknik Detaylar**
  - Veriler örnek olarak **`localStorage`** içinde tutulur (gerçek veritabanı yerine).
  - Tasarım modern ve mobil uyumludur (responsive).

## Dosya Yapısı

- `index.html` – Ana sayfa, proje tanıtımı ve giriş alanı
- `kullanici.html` – Kullanıcı paneli (randevu alma ve görüntüleme)
- `admin.html` – Yönetici paneli (hizmet, personel, randevu yönetimi)
- `assets/style.css` – Ortak stil dosyası
- `assets/app.js` – Tüm sayfalar için temel JavaScript kodları

## Çalıştırma

Herhangi bir ek kurulum gerekmez.  
Klasörü bilgisayarınızda açıp `index.html` dosyasını çift tıklayarak veya tarayıcıda açarak projeyi kullanabilirsiniz.

Gerçek bir veritabanı / sunucu tarafı geliştirme eklemek isterseniz, `app.js` içindeki `localStorage` yapısını, seçeceğiniz arka uç (ör. PHP, Node.js, .NET vb.) ile REST API üzerinden gerçek bir veritabanına bağlayabilirsiniz.

