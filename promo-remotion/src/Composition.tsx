import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const colors = {
  background: "#f2eddf",
  panel: "#fffdf6",
  green: "#214d1c",
  mint: "#eaf2dc",
  orange: "#dd5b2e",
  line: "#d8c9a6",
  text: "#0b2614",
  muted: "#62705d",
};

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const useEntrance = (delay = 0) => {
  const frame = useCurrentFrame();
  return spring({
    frame: frame - delay,
    fps: 30,
    config: { damping: 18, stiffness: 90 },
  });
};

const FadeIn: React.FC<{
  delay?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ delay = 0, children, style }) => {
  const frame = useCurrentFrame();
  const enter = useEntrance(delay);
  const opacity = interpolate(frame, [delay, delay + 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${(1 - enter) * 48}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const LogoMark: React.FC<{ size?: number }> = ({ size = 156 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: "#fff",
      border: `4px solid ${colors.green}`,
      display: "grid",
      placeItems: "center",
      boxShadow: "0 18px 42px rgba(33,77,28,0.18)",
      overflow: "hidden",
    }}
  >
    <Img
      src={staticFile("joyful-logo.svg")}
      style={{ width: size * 0.94, height: size * 0.94 }}
    />
  </div>
);

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill
    style={{
      background: colors.background,
      padding: 64,
      overflow: "hidden",
    }}
  >
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          "radial-gradient(circle at 18% 12%, rgba(221,91,46,0.14), transparent 26%), radial-gradient(circle at 80% 20%, rgba(33,77,28,0.14), transparent 24%)",
      }}
    />
    <div style={{ position: "relative", zIndex: 1, height: "100%" }}>
      {children}
    </div>
  </AbsoluteFill>
);

const Header: React.FC = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 28,
      padding: "24px 28px",
      borderRadius: 24,
      background: colors.panel,
      border: `2px solid ${colors.line}`,
      boxShadow: "0 20px 60px rgba(80,58,20,0.12)",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
      <LogoMark size={104} />
      <div>
        <div
          style={{
            fontSize: 30,
            letterSpacing: 8,
            color: "#5e783f",
            fontWeight: 800,
          }}
        >
          JOYFUL POS
        </div>
        <div style={{ fontSize: 40, fontWeight: 900 }}>Kasir Kantin Tablet</div>
      </div>
    </div>
    <div
      style={{
        borderRadius: 16,
        background: colors.mint,
        padding: "18px 26px",
        minWidth: 230,
      }}
    >
      <div style={{ fontSize: 22, color: colors.muted, fontWeight: 800 }}>
        PENJUALAN HARI INI
      </div>
      <div style={{ fontSize: 36, fontWeight: 900 }}>Rp 204.000</div>
    </div>
  </div>
);

const MenuCard: React.FC<{
  name: string;
  category: string;
  price: number;
  tone?: string;
  delay?: number;
}> = ({ name, category, price, tone = "#eaf2dc", delay = 0 }) => (
  <FadeIn delay={delay}>
    <div
      style={{
        borderRadius: 18,
        background: colors.panel,
        border: `2px solid ${colors.line}`,
        overflow: "hidden",
        boxShadow: "0 12px 28px rgba(80,58,20,0.12)",
      }}
    >
      <div
        style={{
          height: 190,
          background: tone,
          display: "grid",
          placeItems: "center",
          fontSize: 78,
        }}
      >
        {category === "Minuman" ? "🥤" : category === "Snack" ? "🥪" : "🍛"}
      </div>
      <div style={{ padding: 24 }}>
        <div style={{ fontSize: 30, fontWeight: 900 }}>{name}</div>
        <div style={{ fontSize: 22, color: colors.muted, marginTop: 6 }}>
          {category}
        </div>
        <div
          style={{
            fontSize: 32,
            color: colors.orange,
            fontWeight: 900,
            marginTop: 18,
          }}
        >
          {formatRupiah(price)}
        </div>
      </div>
    </div>
  </FadeIn>
);

const Stat: React.FC<{ label: string; value: string; delay?: number }> = ({
  label,
  value,
  delay = 0,
}) => (
  <FadeIn delay={delay}>
    <div
      style={{
        background: colors.mint,
        borderRadius: 18,
        padding: "24px 26px",
      }}
    >
      <div style={{ color: colors.muted, fontSize: 21, fontWeight: 900 }}>
        {label}
      </div>
      <div style={{ fontSize: 34, fontWeight: 950, marginTop: 8 }}>{value}</div>
    </div>
  </FadeIn>
);

const HeroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = interpolate(Math.sin(frame / 14), [-1, 1], [0.98, 1.03]);

  return (
    <Shell>
      <FadeIn>
        <Header />
      </FadeIn>
      <div style={{ height: 160 }} />
      <div style={{ textAlign: "center" }}>
        <FadeIn delay={8}>
          <div
            style={{
              display: "inline-block",
              transform: `scale(${pulse})`,
              marginBottom: 48,
            }}
          >
            <LogoMark size={240} />
          </div>
        </FadeIn>
        <FadeIn delay={18}>
          <h1
            style={{
              margin: 0,
              fontSize: 82,
              lineHeight: 1.02,
              fontWeight: 950,
            }}
          >
            Kasir kantin yang siap dipakai di tablet
          </h1>
        </FadeIn>
        <FadeIn delay={34}>
          <p
            style={{
              margin: "34px auto 0",
              maxWidth: 820,
              fontSize: 36,
              lineHeight: 1.35,
              color: colors.muted,
              fontWeight: 700,
            }}
          >
            Catat pesanan, cetak nota, kelola menu, dan lihat laporan penjualan
            dalam satu aplikasi.
          </p>
        </FadeIn>
      </div>
    </Shell>
  );
};

const PosScene: React.FC = () => (
  <Shell>
    <FadeIn>
      <Header />
    </FadeIn>
    <div
      style={{
        marginTop: 54,
        display: "grid",
        gridTemplateColumns: "1.4fr 0.85fr",
        gap: 28,
      }}
    >
      <div
        style={{
          borderRadius: 28,
          border: `2px solid ${colors.line}`,
          background: colors.panel,
          padding: 28,
        }}
      >
        <FadeIn delay={8}>
          <div
            style={{
              height: 72,
              borderRadius: 16,
              border: `2px solid ${colors.line}`,
              color: "#8b9686",
              display: "flex",
              alignItems: "center",
              padding: "0 24px",
              fontSize: 28,
            }}
          >
            Cari menu...
          </div>
        </FadeIn>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 22,
            marginTop: 28,
          }}
        >
          <MenuCard
            delay={16}
            name="Rice Bowl Tempe"
            category="Makanan"
            price={20000}
          />
          <MenuCard
            delay={22}
            name="Roti Bakar Cokelat"
            category="Snack"
            price={13000}
            tone="#fff2d9"
          />
          <MenuCard
            delay={28}
            name="Es Teh Manis"
            category="Minuman"
            price={6000}
          />
          <MenuCard
            delay={34}
            name="Paket Hemat Bistro"
            category="Makanan"
            price={25000}
            tone="#f8eed0"
          />
        </div>
      </div>
      <OrderPanel />
    </div>
  </Shell>
);

const OrderPanel: React.FC = () => (
  <FadeIn delay={22}>
    <div
      style={{
        borderRadius: 28,
        border: `2px solid ${colors.line}`,
        background: colors.panel,
        padding: 28,
        minHeight: 1060,
      }}
    >
      <div style={{ fontSize: 40, fontWeight: 950, marginBottom: 26 }}>
        Pesanan
      </div>
      {[
        ["Rice Bowl Tempe", "2 x Rp 20.000", "Rp 40.000"],
        ["Es Teh Manis", "2 x Rp 6.000", "Rp 12.000"],
        ["Roti Bakar", "1 x Rp 13.000", "Rp 13.000"],
      ].map(([name, qty, total], index) => (
        <FadeIn key={name} delay={30 + index * 7}>
          <div
            style={{
              borderRadius: 18,
              border: `2px solid ${colors.line}`,
              padding: 20,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 18,
                fontSize: 27,
                fontWeight: 900,
              }}
            >
              <span>{name}</span>
              <span>{total}</span>
            </div>
            <div style={{ fontSize: 22, color: colors.muted, marginTop: 8 }}>
              {qty}
            </div>
          </div>
        </FadeIn>
      ))}
      <div
        style={{
          borderTop: `2px solid ${colors.line}`,
          marginTop: 28,
          paddingTop: 28,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 40,
            fontWeight: 950,
          }}
        >
          <span>Total</span>
          <span>Rp 65.000</span>
        </div>
        <div
          style={{
            marginTop: 24,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
          }}
        >
          <div style={pill(true)}>Tunai</div>
          <div style={pill(false)}>QRIS</div>
        </div>
        <div
          style={{
            marginTop: 18,
            borderRadius: 16,
            background: colors.green,
            color: "#fff",
            textAlign: "center",
            padding: 22,
            fontSize: 26,
            fontWeight: 900,
          }}
        >
          Simpan & Cetak Nota
        </div>
      </div>
    </div>
  </FadeIn>
);

const pill = (active: boolean): React.CSSProperties => ({
  borderRadius: 16,
  background: active ? colors.orange : colors.mint,
  color: active ? "#fff" : colors.green,
  textAlign: "center",
  padding: 20,
  fontSize: 24,
  fontWeight: 850,
});

const DineInScene: React.FC = () => (
  <Shell>
    <SceneTitle
      eyebrow="DINE IN"
      title="Pesanan bisa dibayar sekarang atau nanti"
      text="Cocok untuk pelanggan makan dulu, menambah pesanan di tengah, lalu bayar setelah selesai."
    />
    <div style={{ marginTop: 70, display: "grid", gap: 28 }}>
      {[
        ["#001", "Dine in", "Belum bayar", "Kitchen note dicetak"],
        ["#002", "Tambah menu", "In progress", "Catatan: less ice"],
        ["#003", "Bayar", "Lunas", "Nota pembayaran dicetak"],
      ].map(([no, type, status, note], index) => (
        <FadeIn key={no} delay={index * 12}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "130px 1fr 220px",
              gap: 22,
              alignItems: "center",
              borderRadius: 24,
              background: colors.panel,
              border: `2px solid ${colors.line}`,
              padding: 28,
            }}
          >
            <div style={{ fontSize: 42, fontWeight: 950 }}>{no}</div>
            <div>
              <div style={{ fontSize: 34, fontWeight: 950 }}>{type}</div>
              <div style={{ fontSize: 24, color: colors.muted, marginTop: 8 }}>
                {note}
              </div>
            </div>
            <div
              style={{
                borderRadius: 16,
                background: status === "Lunas" ? colors.green : colors.mint,
                color: status === "Lunas" ? "#fff" : colors.green,
                padding: "18px 20px",
                textAlign: "center",
                fontSize: 24,
                fontWeight: 900,
              }}
            >
              {status}
            </div>
          </div>
        </FadeIn>
      ))}
    </div>
  </Shell>
);

const ReportScene: React.FC = () => (
  <Shell>
    <SceneTitle
      eyebrow="LAPORAN"
      title="Owner bisa cek penjualan dengan cepat"
      text="Ada periode harian, mingguan, bulanan, custom, produk terjual, shift kasir, dan export Excel."
    />
    <div
      style={{
        marginTop: 64,
        borderRadius: 28,
        background: colors.panel,
        border: `2px solid ${colors.line}`,
        padding: 30,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Stat label="TOTAL PENJUALAN" value="Rp 2.840.000" delay={8} />
        <Stat label="TRANSAKSI" value="128" delay={14} />
        <Stat label="TUNAI" value="Rp 1.420.000" delay={20} />
        <Stat label="QRIS" value="Rp 1.320.000" delay={26} />
      </div>
      <div style={{ marginTop: 34 }}>
        {[
          ["Rice Bowl Tempe", "42 laku", "Rp 840.000"],
          ["Es Teh Manis", "68 laku", "Rp 408.000"],
          ["Roti Bakar", "31 laku", "Rp 403.000"],
          ["Paket Hemat Bistro", "18 laku", "Rp 450.000"],
        ].map(([menu, qty, total], index) => (
          <FadeIn key={menu} delay={38 + index * 6}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 180px 220px",
                borderTop: `2px solid ${colors.line}`,
                padding: "23px 0",
                fontSize: 27,
                fontWeight: 850,
              }}
            >
              <span>{menu}</span>
              <span>{qty}</span>
              <span style={{ color: colors.orange, textAlign: "right" }}>
                {total}
              </span>
            </div>
          </FadeIn>
        ))}
      </div>
    </div>
  </Shell>
);

const FeatureScene: React.FC = () => (
  <Shell>
    <SceneTitle
      eyebrow="SIAP DIKEMBANGKAN"
      title="Fondasi sistem kasir yang lebih rapi"
      text="Bukan sekadar catat penjualan. Sistemnya sudah disiapkan untuk operasional kantin yang makin kompleks."
    />
    <div
      style={{
        marginTop: 72,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 24,
      }}
    >
      {[
        ["Login multiuser", "Owner dan admin punya akses berbeda."],
        ["Audit aktivitas", "Edit, void, refund, dan perubahan tercatat."],
        ["Upload foto menu", "Foto menu tersimpan di aplikasi."],
        ["Shift kasir", "Modal awal, tutup shift, dan cetak laporan."],
        ["Metode pembayaran", "Tunai, QRIS, transfer, dan siap gateway."],
        ["Export Excel", "Laporan bisa diunduh untuk rekap."],
      ].map(([title, text], index) => (
        <FadeIn key={title} delay={index * 7}>
          <div
            style={{
              minHeight: 190,
              borderRadius: 24,
              border: `2px solid ${colors.line}`,
              background: colors.panel,
              padding: 28,
            }}
          >
            <div style={{ color: colors.orange, fontSize: 30, fontWeight: 950 }}>
              {String(index + 1).padStart(2, "0")}
            </div>
            <div style={{ fontSize: 31, fontWeight: 950, marginTop: 18 }}>
              {title}
            </div>
            <div
              style={{
                fontSize: 23,
                color: colors.muted,
                lineHeight: 1.35,
                marginTop: 10,
              }}
            >
              {text}
            </div>
          </div>
        </FadeIn>
      ))}
    </div>
  </Shell>
);

const CtaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const scale = spring({
    frame,
    fps: 30,
    config: { damping: 15, stiffness: 120 },
  });

  return (
    <Shell>
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <div style={{ transform: `scale(${scale})` }}>
          <LogoMark size={230} />
        </div>
        <FadeIn delay={14}>
          <h2
            style={{
              margin: "64px 0 0",
              fontSize: 82,
              lineHeight: 1.04,
              fontWeight: 950,
            }}
          >
            Joyful POS
            <br />
            untuk operasional kantin yang lebih tertata
          </h2>
        </FadeIn>
        <FadeIn delay={30}>
          <div
            style={{
              marginTop: 56,
              display: "inline-flex",
              borderRadius: 24,
              background: colors.green,
              color: "#fff",
              padding: "28px 42px",
              fontSize: 34,
              fontWeight: 900,
              boxShadow: "0 24px 70px rgba(33,77,28,0.24)",
            }}
          >
            Pesanan cepat. Laporan jelas. Data tersimpan.
          </div>
        </FadeIn>
      </div>
    </Shell>
  );
};

const SceneTitle: React.FC<{ eyebrow: string; title: string; text: string }> = ({
  eyebrow,
  title,
  text,
}) => (
  <div>
    <FadeIn>
      <div
        style={{
          color: "#5e783f",
          fontSize: 26,
          letterSpacing: 8,
          fontWeight: 900,
        }}
      >
        {eyebrow}
      </div>
    </FadeIn>
    <FadeIn delay={8}>
      <h2
        style={{
          margin: "18px 0 0",
          fontSize: 72,
          lineHeight: 1.06,
          fontWeight: 950,
        }}
      >
        {title}
      </h2>
    </FadeIn>
    <FadeIn delay={20}>
      <p
        style={{
          margin: "28px 0 0",
          fontSize: 34,
          lineHeight: 1.36,
          color: colors.muted,
          fontWeight: 700,
        }}
      >
        {text}
      </p>
    </FadeIn>
  </div>
);

export const JoyfulPosPromo: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      <Sequence durationInFrames={fps * 4}>
        <HeroScene />
      </Sequence>
      <Sequence from={fps * 4} durationInFrames={fps * 5}>
        <PosScene />
      </Sequence>
      <Sequence from={fps * 9} durationInFrames={fps * 4}>
        <DineInScene />
      </Sequence>
      <Sequence from={fps * 13} durationInFrames={fps * 4}>
        <ReportScene />
      </Sequence>
      <Sequence from={fps * 17} durationInFrames={fps * 4}>
        <FeatureScene />
      </Sequence>
      <Sequence from={fps * 21} durationInFrames={fps * 3}>
        <CtaScene />
      </Sequence>
    </AbsoluteFill>
  );
};
