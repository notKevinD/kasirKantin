from __future__ import annotations

import math
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "promo"
OUT_FILE = OUT_DIR / "joyful-pos-promo.mp4"

W, H = 1080, 1920
FPS = 30
DURATION = 24
TOTAL_FRAMES = FPS * DURATION

BG = "#f4efe2"
PAPER = "#fffdf5"
GREEN = "#28451f"
GREEN_2 = "#eef3df"
ORANGE = "#d85f32"
GOLD = "#e1a93b"
MUTED = "#68705c"
BORDER = "#d6c9aa"
RED_BG = "#f5ded5"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            continue
    return ImageFont.load_default()


F = {
    "tiny": font(24),
    "small": font(30),
    "body": font(38),
    "body_b": font(38, True),
    "mid": font(52, True),
    "big": font(78, True),
    "huge": font(104, True),
    "num": font(62, True),
}


def ease(x: float) -> float:
    x = max(0, min(1, x))
    return 1 - pow(1 - x, 3)


def clamp(x: float, lo: float = 0, hi: float = 1) -> float:
    return max(lo, min(hi, x))


def scene_progress(t: float, start: float, end: float) -> float:
    return clamp((t - start) / (end - start))


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def with_alpha(color: str, alpha: int) -> tuple[int, int, int, int]:
    return (*hex_to_rgb(color), alpha)


def draw_round(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    fill: str,
    radius: int = 28,
    outline: str | None = None,
    width: int = 3,
) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def text(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    value: str,
    fnt: ImageFont.FreeTypeFont,
    fill: str = GREEN,
    anchor: str | None = None,
    align: str = "left",
    spacing: int = 8,
) -> None:
    draw.multiline_text(xy, value, font=fnt, fill=fill, anchor=anchor, align=align, spacing=spacing)


def centered_text(draw: ImageDraw.ImageDraw, y: int, value: str, fnt: ImageFont.FreeTypeFont, fill: str = GREEN) -> None:
    text(draw, (W // 2, y), value, fnt, fill, anchor="ma", align="center")


def logo(draw: ImageDraw.ImageDraw, cx: int, cy: int, r: int, scale: float = 1) -> None:
    r = int(r * scale)
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=PAPER, outline=GREEN, width=max(4, r // 14))
    bowl_w, bowl_h = int(r * 1.15), int(r * 0.55)
    bx1, by1 = cx - bowl_w // 2, cy - int(r * 0.05)
    bx2, by2 = cx + bowl_w // 2, cy + bowl_h
    draw.pieslice((bx1, by1 - bowl_h, bx2, by2), 0, 180, fill=GREEN)
    draw.rounded_rectangle((bx1, by1 - 5, bx2, by2), radius=bowl_w // 3, fill=GREEN)
    for dx, col in [(-28, ORANGE), (0, GOLD), (28, "#6c9a3f")]:
        draw.ellipse((cx + dx - 14, by1 - 34, cx + dx + 14, by1 - 6), fill=col)
    text(draw, (cx, cy + int(r * 0.55)), "Joyful", font(max(24, r // 3), True), GREEN, anchor="mm")


def card(draw: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int, label: str, value: str, accent: str = GREEN_2) -> None:
    draw_round(draw, (x, y, x + w, y + h), accent, 22)
    text(draw, (x + 26, y + 22), label.upper(), F["tiny"], MUTED)
    text(draw, (x + 26, y + 58), value, F["mid"], GREEN)


def tablet_ui(draw: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int, p: float) -> None:
    draw_round(draw, (x, y, x + w, y + h), "#1f261c", 40)
    pad = 24
    draw_round(draw, (x + pad, y + pad, x + w - pad, y + h - pad), BG, 24)
    sx, sy = x + pad + 24, y + pad + 24
    logo(draw, sx + 42, sy + 42, 42)
    text(draw, (sx + 100, sy + 22), "Joyful POS", F["small"], GREEN)
    text(draw, (sx + 100, sy + 56), "Kasir Kantin Tablet", F["body_b"], GREEN)
    for i, (lbl, val) in enumerate([("Hari ini", "Rp 204.000"), ("Transaksi", "12"), ("QRIS", "Rp 86.000")]):
        card(draw, sx + 20 + i * 205, sy + 120, 185, 95, lbl, val, GREEN_2)
    menu_x, menu_y = sx + 20, sy + 250
    cart_x = sx + w - pad * 2 - 250
    for i, name in enumerate(["Rice Bowl", "Roti Bakar", "Es Teh", "Lemon Tea", "Paket Hemat", "Kopi Susu"]):
        col, row = i % 3, i // 3
        px, py = menu_x + col * 180, menu_y + row * 220
        slide = int((1 - ease(clamp(p * 2 - i * 0.08))) * 80)
        draw_round(draw, (px, py + slide, px + 160, py + 190 + slide), PAPER, 18, BORDER, 2)
        draw_round(draw, (px, py + slide, px + 160, py + 90 + slide), "#eef3df" if i % 2 == 0 else "#fff3d8", 18)
        text(draw, (px + 12, py + 112 + slide), name, F["tiny"], GREEN)
        text(draw, (px + 12, py + 145 + slide), f"Rp {6 + i * 3}.000", F["small"], ORANGE)
    draw_round(draw, (cart_x, menu_y, cart_x + 235, menu_y + 425), PAPER, 20, BORDER, 2)
    text(draw, (cart_x + 18, menu_y + 18), "Pesanan", F["body_b"], GREEN)
    for i, (name, qty) in enumerate([("Rice Bowl", 2), ("Es Teh", 3), ("Kopi Susu", 1)]):
        yy = menu_y + 82 + i * 84
        draw_round(draw, (cart_x + 16, yy, cart_x + 218, yy + 62), "#ffffff", 12, BORDER, 1)
        text(draw, (cart_x + 30, yy + 12), name, F["tiny"], GREEN)
        text(draw, (cart_x + 168, yy + 12), str(qty), F["small"], GREEN)
    text(draw, (cart_x + 18, menu_y + 350), "Total", F["small"], GREEN)
    text(draw, (cart_x + 92, menu_y + 344), "Rp 77.000", F["body_b"], GREEN)


def feature_chip(draw: ImageDraw.ImageDraw, x: int, y: int, label: str, p: float, delay: float) -> None:
    pp = ease(clamp((p - delay) / 0.24))
    yy = y + int((1 - pp) * 40)
    draw_round(draw, (x, yy, x + 430, yy + 80), PAPER, 22, BORDER, 2)
    draw.ellipse((x + 24, yy + 24, x + 56, yy + 56), fill=ORANGE)
    text(draw, (x + 78, yy + 21), label, F["body_b"], GREEN)


def draw_scene(frame: int) -> Image.Image:
    t = frame / FPS
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    # Soft background bands
    draw.rectangle((0, 0, W, H), fill=BG)
    draw_round(draw, (-120, 1180, 540, 1900), "#eef3df", 70)
    draw_round(draw, (600, -120, 1220, 520), "#fff3d8", 70)

    if t < 3.5:
        p = ease(scene_progress(t, 0, 3.5))
        logo(draw, W // 2, 470 - int((1 - p) * 40), 150, 1 + 0.04 * math.sin(t * 3))
        centered_text(draw, 700, "Joyful POS", F["huge"], GREEN)
        centered_text(draw, 820, "Aplikasi kasir tablet untuk kantin", F["mid"], MUTED)
        draw_round(draw, (175, 1030, 905, 1140), GREEN, 28)
        centered_text(draw, 1060, "Transaksi lebih cepat, rapi, dan tercatat", F["body_b"], PAPER)

    elif t < 8:
        p = scene_progress(t, 3.5, 8)
        centered_text(draw, 140, "Catat pesanan dalam hitungan detik", F["big"], GREEN)
        centered_text(draw, 230, "Menu bergambar, catatan item, dan total otomatis", F["body"], MUTED)
        tablet_ui(draw, 95, 340, 890, 1180, p)

    elif t < 12.5:
        p = scene_progress(t, 8, 12.5)
        centered_text(draw, 150, "Dine in bisa bayar nanti", F["big"], GREEN)
        centered_text(draw, 235, "Pesanan berjalan tetap aman sampai pelanggan bayar", F["body"], MUTED)
        for i, (num, price, note) in enumerate([("#001", "Rp 39.000", "Less ice"), ("#002", "Rp 62.000", "Tanpa pedas"), ("#003", "Rp 26.000", "Bungkus")]):
            y = 410 + i * 260 + int((1 - ease(clamp(p * 2 - i * 0.2))) * 70)
            draw_round(draw, (110, y, 970, y + 210), PAPER, 28, BORDER, 3)
            text(draw, (145, y + 36), f"{num}  Transaksi berjalan", F["mid"], GREEN)
            text(draw, (760, y + 44), price, F["body_b"], ORANGE)
            text(draw, (145, y + 102), f"Catatan kitchen: {note}", F["body"], MUTED)
            draw_round(draw, (700, y + 125, 940, y + 180), GREEN, 14)
            text(draw, (820, y + 153), "Cetak kitchen", F["small"], PAPER, anchor="mm")

    elif t < 17:
        p = scene_progress(t, 12.5, 17)
        centered_text(draw, 150, "Laporan shift langsung jelas", F["big"], GREEN)
        centered_text(draw, 235, "Tunai, QRIS, diskon, refund, dan void tercatat", F["body"], MUTED)
        card(draw, 110, 390, 390, 160, "Penjualan", "Rp 1.245.000")
        card(draw, 580, 390, 390, 160, "Transaksi", "86")
        card(draw, 110, 600, 390, 160, "QRIS", "Rp 520.000")
        card(draw, 580, 600, 390, 160, "Tunai", "Rp 725.000")
        # bar chart
        base_y = 1250
        for i, h in enumerate([260, 380, 300, 520, 430]):
            bh = int(h * ease(p))
            x = 160 + i * 160
            draw_round(draw, (x, base_y - bh, x + 85, base_y), ORANGE if i == 3 else GREEN, 18)
        text(draw, (145, 1340), "Produk terjual + export Excel", F["mid"], GREEN)

    elif t < 21:
        p = scene_progress(t, 17, 21)
        centered_text(draw, 150, "Dibuat untuk operasional nyata", F["big"], GREEN)
        feature_chip(draw, 95, 360, "Multiuser: owner, admin, kasir", p, 0.05)
        feature_chip(draw, 555, 360, "Audit log setiap perubahan", p, 0.15)
        feature_chip(draw, 95, 500, "Refund dan void pakai alasan", p, 0.25)
        feature_chip(draw, 555, 500, "Upload foto menu sendiri", p, 0.35)
        feature_chip(draw, 95, 640, "Cetak nota dan kitchen order", p, 0.45)
        feature_chip(draw, 555, 640, "Laporan harian dan shift", p, 0.55)
        draw_round(draw, (120, 960, 960, 1280), PAPER, 34, BORDER, 3)
        text(draw, (170, 1025), "Semua transaksi punya jejak:", F["mid"], GREEN)
        text(draw, (170, 1115), "siapa kasirnya, kapan terjadi,\ndan apa yang diubah.", F["body"], MUTED)

    else:
        p = scene_progress(t, 21, 24)
        logo(draw, W // 2, 420, 135)
        centered_text(draw, 650, "Joyful POS", F["huge"], GREEN)
        centered_text(draw, 780, "Kasir kantin yang lebih cepat dan tertata", F["mid"], MUTED)
        draw_round(draw, (170, 990, 910, 1120), GREEN, 34)
        centered_text(draw, 1030, "Siap dipakai di tablet kasir", F["body_b"], PAPER)
        centered_text(draw, 1280, "Menu  |  Transaksi  |  Shift  |  Laporan", F["body_b"], GREEN)
        centered_text(draw, 1430, "Joyful Healthy Bistro & Cafe", F["body"], MUTED)

    return img


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    writer = cv2.VideoWriter(
        str(OUT_FILE),
        cv2.VideoWriter_fourcc(*"mp4v"),
        FPS,
        (W, H),
    )
    if not writer.isOpened():
        raise RuntimeError("Tidak bisa membuat video writer MP4.")

    for frame in range(TOTAL_FRAMES):
        img = draw_scene(frame)
        arr = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
        writer.write(arr)
        if frame % 90 == 0:
            print(f"render {frame}/{TOTAL_FRAMES}")

    writer.release()
    print(f"saved: {OUT_FILE}")


if __name__ == "__main__":
    main()
