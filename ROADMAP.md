# Roadmap Pengembangan Joyful POS

Catatan fitur lanjutan yang disarankan setelah tahap kasir, menu, user, dan laporan dasar.

## Prioritas Dekat

1. Export laporan ke Excel.
   - Sheet ringkasan penjualan.
   - Sheet transaksi.
   - Sheet detail item transaksi.
   - Sheet menu terjual.

2. Filter laporan custom tanggal.
   - Tanggal mulai.
   - Tanggal akhir.
   - Tetap pertahankan shortcut hari ini, kemarin, 7 hari, 14 hari, 30 hari.

3. Cetak atau export laporan kas harian.
   - Total penjualan.
   - Tunai.
   - QRIS manual.
   - Jumlah transaksi.
   - Menu terlaris.

4. Nama kasir di transaksi.
   - Setiap transaksi menyimpan user pembuat transaksi.
   - Laporan bisa difilter berdasarkan kasir.

5. Void transaksi dengan alasan.
   - Saat transaksi dibatalkan, admin wajib mengisi alasan.
   - Alasan masuk audit log.

## Prioritas Berikutnya

6. Diskon dan penyesuaian harga.
   - Diskon per transaksi.
   - Diskon per item.
   - Catatan alasan diskon.

7. Nomor meja atau nama pelanggan.
   - Berguna untuk dine in.
   - Dicetak di nota.

8. Backup data.
   - Export data penting.
   - Backup database otomatis di VPS.

9. Stok bahan/menu.
   - Stok masuk.
   - Stok keluar dari penjualan.
   - Peringatan stok rendah.

10. Pembayaran online/QRIS gateway.
    - Integrasi payment gateway.
    - Status pembayaran otomatis.
    - Cocok untuk pemesanan online dine in.
