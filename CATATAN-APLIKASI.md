# Catatan Aplikasi Joyful POS

## Yang Sudah Dibuat

- Aplikasi kasir tablet berbasis Next.js.
- Database PostgreSQL dengan Prisma.
- Login kasir/admin berbasis cookie.
- Data menu awal makanan, minuman, snack, dan paket.
- Kategori menu memakai tabel `Category`, bukan teks bebas di produk.
- Tampilan kasir dengan foto menu, kategori, pencarian, keranjang, catatan pesanan, dine in/bungkus, tunai, dan QRIS manual.
- Tambah menu baru dari halaman Menu dengan upload foto langsung.
- Tambah/edit menu memilih kategori dari dropdown agar tidak dobel karena salah ketik.
- Ubah status menu tersedia/tidak tersedia.
- Simpan transaksi ke database.
- Format nota yang siap dicetak melalui fitur print browser.
- Riwayat transaksi dengan detail item dan tombol cetak ulang.
- Laporan periode: hari ini, kemarin, 7 hari, 14 hari, dan 30 hari.
- Laporan menu terjual: jumlah laku per menu dan total penjualan per menu.

## Cara Menjalankan

Pastikan PostgreSQL Laragon aktif, lalu jalankan:

```bash
npm run dev
```

Lalu buka:

```text
http://127.0.0.1:3000
```

## Catatan Logo dan Foto Menu

Logo Joyful sementara dibuat ulang sebagai file SVG berdasarkan gambar yang diberikan di chat:

```text
public/joyful-logo.svg
```

Kalau nanti ada file logo asli dalam format PNG/SVG, file ini bisa diganti agar tampilannya lebih presisi.

Foto menu contoh ada di:

```text
public/menu/
```

Menu baru memakai upload foto langsung dari halaman Menu. File upload tersimpan di:

```text
public/uploads/
```

## Catatan Database

Database memakai PostgreSQL:

```text
DATABASE_URL="postgresql://User@localhost:5432/joyful_pos?schema=public"
```

Schema Prisma ada di:

```text
prisma/schema.prisma
```

Database `joyful_pos` sudah dibuat di PostgreSQL lokal Laragon dan migrasi Prisma sudah dijalankan.

Kategori sekarang tersimpan di tabel:

```text
Category
```

Produk menyimpan:

```text
Product.categoryId
```

Jadi kategori tidak lagi disimpan sebagai teks bebas langsung di produk.

## Login Awal

User awal dari seed:

```text
username: admin
password: nilai ADMIN_PASSWORD dari .env saat seed pertama
```

Password disimpan dalam bentuk hash, bukan teks biasa.

Catatan production:

- Isi `AUTH_SECRET` minimal 32 karakter.
- Isi `ADMIN_PASSWORD` sebelum seed pertama.
- Setelah user admin sudah ada, seed tidak akan menimpa password lama.
