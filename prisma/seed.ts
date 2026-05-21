import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

const products = [
  {
    name: "Nasi Goreng Joyful",
    category: "Makanan",
    price: 18000,
    imageUrl: "/menu/nasi-goreng.svg",
    description: "Nasi goreng rumahan dengan telur dan sayuran.",
    sortOrder: 1,
  },
  {
    name: "Mie Goreng Sayur",
    category: "Makanan",
    price: 16000,
    imageUrl: "/menu/mie-goreng.svg",
    description: "Mie goreng praktis untuk makan siang cepat.",
    sortOrder: 2,
  },
  {
    name: "Rice Bowl Tempe",
    category: "Makanan",
    price: 20000,
    imageUrl: "/menu/rice-bowl.svg",
    description: "Nasi, tempe, sayuran, dan saus spesial.",
    sortOrder: 3,
  },
  {
    name: "Roti Bakar Cokelat",
    category: "Snack",
    price: 12000,
    imageUrl: "/menu/roti-bakar.svg",
    description: "Roti bakar hangat dengan cokelat.",
    sortOrder: 4,
  },
  {
    name: "Es Teh Manis",
    category: "Minuman",
    price: 6000,
    imageUrl: "/menu/es-teh.svg",
    description: "Teh manis dingin.",
    sortOrder: 5,
  },
  {
    name: "Lemon Tea",
    category: "Minuman",
    price: 9000,
    imageUrl: "/menu/lemon-tea.svg",
    description: "Teh lemon segar.",
    sortOrder: 6,
  },
  {
    name: "Kopi Susu Joyful",
    category: "Minuman",
    price: 14000,
    imageUrl: "/menu/kopi-susu.svg",
    description: "Kopi susu creamy khas Joyful.",
    sortOrder: 7,
  },
  {
    name: "Paket Hemat Bistro",
    category: "Paket",
    price: 25000,
    imageUrl: "/menu/paket-hemat.svg",
    description: "Makanan utama dan es teh.",
    sortOrder: 8,
  },
];

async function main() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      name: "Admin Joyful",
      passwordHash: hashPassword("admin123"),
      role: "admin",
    },
    create: {
      name: "Admin Joyful",
      username: "admin",
      passwordHash: hashPassword("admin123"),
      role: "admin",
    },
  });

  for (const product of products) {
    await prisma.product.create({ data: product });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
