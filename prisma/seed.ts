import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

const categories = [
  { name: "Makanan", sortOrder: 1 },
  { name: "Minuman", sortOrder: 2 },
  { name: "Snack", sortOrder: 3 },
  { name: "Paket", sortOrder: 4 },
];

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
  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminName = process.env.ADMIN_NAME || "Admin Joyful";
  const existingAdmin = await prisma.user.findUnique({
    where: { username: adminUsername },
  });
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!existingAdmin && process.env.NODE_ENV === "production" && !adminPassword) {
    throw new Error("ADMIN_PASSWORD wajib diisi saat seed pertama di production.");
  }

  await prisma.user.upsert({
    where: { username: adminUsername },
    update: {
      name: adminName,
      isActive: true,
    },
    create: {
      name: adminName,
      username: adminUsername,
      passwordHash: hashPassword(adminPassword || "admin123"),
      role: "owner",
      isActive: true,
    },
  });

  const createdCategories = new Map<string, string>();

  for (const category of categories) {
    const createdCategory = await prisma.category.upsert({
      where: { name: category.name },
      update: { sortOrder: category.sortOrder },
      create: category,
    });
    createdCategories.set(createdCategory.name, createdCategory.id);
  }

  const productCount = await prisma.product.count();

  if (productCount > 0) {
    return;
  }

  for (const product of products) {
    const categoryId = createdCategories.get(product.category);

    if (!categoryId) {
      throw new Error(`Kategori ${product.category} belum dibuat.`);
    }

    await prisma.product.create({
      data: {
        name: product.name,
        category: {
          connect: { id: categoryId },
        },
        price: product.price,
        imageUrl: product.imageUrl,
        description: product.description,
        sortOrder: product.sortOrder,
      },
    });
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
