"use client";

import Image from "next/image";
import {
  Banknote,
  BarChart3,
  CalendarDays,
  CreditCard,
  Pencil,
  Minus,
  Plus,
  Printer,
  ReceiptText,
  Search,
  ShoppingCart,
  Utensils,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { formatOrderDate, formatRupiah } from "@/lib/format";

type Product = {
  id: string;
  name: string;
  categoryId: string;
  category: Category;
  price: number;
  imageUrl: string | null;
  description: string | null;
  isAvailable: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type Category = {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type OrderItem = {
  id?: string;
  productId: string | null;
  productName: string;
  unitPrice: number;
  quantity: number;
  note: string | null;
  subtotal: number;
};

type Order = {
  id: string;
  orderNumber: string;
  orderType: string;
  status: string;
  paymentMethod: string;
  total: number;
  cashReceived: number | null;
  changeAmount: number | null;
  note: string | null;
  createdAt: string;
  items: OrderItem[];
};

type CartItem = {
  lineId: string;
  productId: string | null;
  productName: string;
  unitPrice: number;
  quantity: number;
  note: string;
};

type CurrentUser = {
  id: string;
  name: string;
  username: string;
  role: string;
};

type ReportRange = "today" | "yesterday" | "7days" | "14days" | "30days";

const reportRanges: { id: ReportRange; label: string }[] = [
  { id: "today", label: "Hari ini" },
  { id: "yesterday", label: "Kemarin" },
  { id: "7days", label: "7 hari" },
  { id: "14days", label: "14 hari" },
  { id: "30days", label: "30 hari" },
];

const emptyProductForm = {
  name: "",
  categoryId: "",
  price: "",
  description: "",
};

export function PosApp({
  initialProducts,
  initialCategories,
  initialOrders,
  user,
}: {
  initialProducts: Product[];
  initialCategories: Category[];
  initialOrders: Order[];
  user: CurrentUser;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [categories, setCategories] = useState(initialCategories);
  const [orders, setOrders] = useState(initialOrders);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState("all");
  const [query, setQuery] = useState("");
  const [menuQuery, setMenuQuery] = useState("");
  const [orderType, setOrderType] = useState("Dine in");
  const [paymentMethod, setPaymentMethod] = useState("Tunai");
  const [cashReceived, setCashReceived] = useState("");
  const [activeTab, setActiveTab] = useState<"kasir" | "menu" | "riwayat">(
    "kasir",
  );
  const [reportRange, setReportRange] = useState<ReportRange>("today");
  const [lastOrder, setLastOrder] = useState<Order | null>(orders[0] ?? null);
  const [productForm, setProductForm] = useState({
    ...emptyProductForm,
    categoryId: initialCategories[0]?.id ?? "",
  });
  const [productImage, setProductImage] = useState<File | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const visibleProducts = products.filter((product) => {
    const matchesCategory =
      activeCategoryId === "all" || product.categoryId === activeCategoryId;
    const matchesQuery = product.name.toLowerCase().includes(query.toLowerCase());
    return matchesCategory && matchesQuery;
  });
  const visibleMenuProducts = products.filter((product) => {
    const normalizedQuery = menuQuery.trim().toLowerCase();

    if (!normalizedQuery) return true;

    return (
      product.name.toLowerCase().includes(normalizedQuery) ||
      product.category.name.toLowerCase().includes(normalizedQuery)
    );
  });

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  const changeAmount =
    paymentMethod === "Tunai"
      ? Math.max(Number(cashReceived || 0) - cartTotal, 0)
      : 0;

  const todayOrders = orders.filter((order) =>
    isOrderInRange(order, "today"),
  );
  const todaySales = todayOrders.reduce((sum, order) => sum + order.total, 0);
  const qrisSales = todayOrders
    .filter((order) => order.paymentMethod === "QRIS manual")
    .reduce((sum, order) => sum + order.total, 0);
  const reportOrders = orders.filter((order) =>
    isOrderInRange(order, reportRange),
  );
  const reportSales = reportOrders.reduce((sum, order) => sum + order.total, 0);
  const reportCashSales = reportOrders
    .filter((order) => order.paymentMethod === "Tunai")
    .reduce((sum, order) => sum + order.total, 0);
  const reportQrisSales = reportOrders
    .filter((order) => order.paymentMethod === "QRIS manual")
    .reduce((sum, order) => sum + order.total, 0);
  const soldProducts = getSoldProducts(reportOrders);

  function addToCart(product: Product) {
    if (!product.isAvailable) return;

    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);

      if (existing) {
        return current.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [
        ...current,
        {
          lineId: product.id,
          productId: product.id,
          productName: product.name,
          unitPrice: product.price,
          quantity: 1,
          note: "",
        },
      ];
    });
  }

  function updateQuantity(lineId: string, direction: 1 | -1) {
    setCart((current) =>
      current
        .map((item) =>
          item.lineId === lineId
            ? { ...item, quantity: item.quantity + direction }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function updateNote(lineId: string, note: string) {
    setCart((current) =>
      current.map((item) =>
        item.lineId === lineId ? { ...item, note } : item,
      ),
    );
  }

  async function submitOrder() {
    if (isSavingOrder) return;
    if (cart.length === 0) return;
    if (paymentMethod === "Tunai" && Number(cashReceived || 0) < cartTotal) {
      alert("Uang diterima masih kurang dari total belanja.");
      return;
    }

    setIsSavingOrder(true);

    try {
      const response = await fetch(
        editingOrderId ? `/api/orders/${editingOrderId}` : "/api/orders",
        {
          method: editingOrderId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderType,
            paymentMethod,
            cashReceived:
              paymentMethod === "Tunai" ? Number(cashReceived) : null,
            items: cart.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              note: item.note,
            })),
          }),
        },
      );

      if (!response.ok) {
        alert(await getErrorMessage(response, "Transaksi belum bisa disimpan."));
        return;
      }

      const order = (await response.json()) as Order;
      setOrders((current) =>
        editingOrderId
          ? current.map((item) => (item.id === order.id ? order : item))
          : [order, ...current],
      );
      setLastOrder(order);
      setCart([]);
      setCashReceived("");
      setEditingOrderId(null);
      window.setTimeout(() => window.print(), 350);
    } finally {
      setIsSavingOrder(false);
    }
  }

  async function addProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSavingProduct) return;
    setIsSavingProduct(true);

    try {
      const editedProduct = products.find((item) => item.id === editingProductId);
      const imageUrl = productImage
        ? await uploadProductImage(productImage)
        : editedProduct?.imageUrl ?? null;

      if (productImage && !imageUrl) return;

      const payload = {
        ...productForm,
        imageUrl,
        price: Number(productForm.price),
      };

      if (editingProductId) {
        const response = await fetch(`/api/products/${editingProductId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          alert(
            await getErrorMessage(
              response,
              "Menu belum bisa disimpan. Cek nama, kategori, dan harga.",
            ),
          );
          return;
        }

        const product = (await response.json()) as Product;
        setProducts((current) =>
          current.map((item) => (item.id === product.id ? product : item)),
        );
        resetProductForm(event.currentTarget);
        return;
      }

      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          sortOrder: products.length + 1,
        }),
      });

      if (!response.ok) {
        alert(
          await getErrorMessage(
            response,
            "Menu belum bisa ditambahkan. Cek nama, kategori, dan harga.",
          ),
        );
        return;
      }

      const product = (await response.json()) as Product;
      setProducts((current) => [...current, product]);
      resetProductForm(event.currentTarget);
    } finally {
      setIsSavingProduct(false);
    }
  }

  async function uploadProductImage(file: File) {
    setIsUploadingPhoto(true);
    const uploadData = new FormData();
    uploadData.append("file", file);

    try {
      const uploadResponse = await fetch("/api/uploads", {
        method: "POST",
        body: uploadData,
      });

      if (!uploadResponse.ok) {
        alert(await getErrorMessage(uploadResponse, "Foto menu belum bisa diupload."));
        return null;
      }

      const uploadResult = (await uploadResponse.json()) as { url: string };
      return uploadResult.url;
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  function resetProductForm(form?: HTMLFormElement) {
    setProductForm({
      ...emptyProductForm,
      categoryId: categories[0]?.id ?? "",
    });
    setProductImage(null);
    setEditingProductId(null);
    form?.reset();
  }

  function startEditProduct(product: Product) {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name,
      categoryId: product.categoryId,
      price: String(product.price),
      description: product.description ?? "",
    });
    setProductImage(null);
  }

  async function deleteProduct(product: Product) {
    const confirmed = window.confirm(
      `Hapus menu "${product.name}"? Riwayat transaksi lama tetap tersimpan.`,
    );

    if (!confirmed) return;

    const response = await fetch(`/api/products/${product.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      alert("Menu belum bisa dihapus.");
      return;
    }

    setProducts((current) => current.filter((item) => item.id !== product.id));
    setCart((current) =>
      current.filter((item) => item.productId !== product.id),
    );

    if (editingProductId === product.id) {
      resetProductForm();
    }
  }

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSavingCategory) return;
    setIsSavingCategory(true);

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: categoryName,
          sortOrder: categories.length + 1,
        }),
      });

      if (!response.ok) {
        alert(
          await getErrorMessage(
            response,
            "Kategori belum bisa ditambahkan. Pastikan namanya belum ada.",
          ),
        );
        return;
      }

      const category = (await response.json()) as Category;
      setCategories((current) => [...current, category]);
      setProductForm((current) => ({ ...current, categoryId: category.id }));
      setCategoryName("");
    } finally {
      setIsSavingCategory(false);
    }
  }

  async function toggleProduct(product: Product) {
    const response = await fetch(`/api/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: !product.isAvailable }),
    });

    if (!response.ok) return;
    const updated = (await response.json()) as Product;
    setProducts((current) =>
      current.map((item) => (item.id === product.id ? updated : item)),
    );
  }

  function changeReportRange(range: ReportRange) {
    const nextOrders = orders.filter((order) => isOrderInRange(order, range));
    setReportRange(range);
    setLastOrder(nextOrders[0] ?? null);
  }

  function startEditOrder(order: Order) {
    setEditingOrderId(order.id);
    setOrderType(order.orderType);
    setPaymentMethod(order.paymentMethod);
    setCashReceived(order.cashReceived === null ? "" : String(order.cashReceived));
    setCart(
      order.items.map((item) => ({
        lineId: item.productId ?? item.id ?? crypto.randomUUID(),
        productId: item.productId,
        productName: item.productName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        note: item.note ?? "",
      })),
    );
    setActiveTab("kasir");
  }

  function cancelEditOrder() {
    setEditingOrderId(null);
    setCart([]);
    setCashReceived("");
  }

  async function deleteOrder(order: Order) {
    const confirmed = window.confirm(
      `Hapus transaksi ${order.orderNumber}? Data transaksi ini akan hilang dari laporan.`,
    );

    if (!confirmed) return;

    const response = await fetch(`/api/orders/${order.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      alert("Transaksi belum bisa dihapus.");
      return;
    }

    const nextOrders = orders.filter((item) => item.id !== order.id);
    setOrders(nextOrders);
    setLastOrder(nextOrders[0] ?? null);

    if (editingOrderId === order.id) {
      cancelEditOrder();
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen bg-[#f4efe2] text-[#24351f]">
      <section className="app-shell mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-5 py-4">
        <header className="mb-4 flex flex-col gap-4 rounded-[8px] border border-[#d6c9aa] bg-[#fffdf5] px-4 py-3 shadow-sm xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/joyful-logo.svg"
              alt="Joyful Healthy Bistro & Cafe"
              width={72}
              height={72}
              priority
              className="rounded-full"
            />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6c7b43]">
                Joyful POS
              </p>
              <h1 className="text-xl font-bold sm:text-2xl">
                Kasir Kantin Tablet
              </h1>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch xl:justify-end">
            <div className="grid flex-1 grid-cols-1 gap-2 text-left sm:grid-cols-3 sm:text-center xl:min-w-[460px]">
              <Summary label="Penjualan hari ini" value={formatRupiah(todaySales)} />
              <Summary label="Transaksi" value={`${todayOrders.length}`} />
              <Summary label="QRIS manual" value={formatRupiah(qrisSales)} />
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2 sm:min-w-[250px]">
              <div className="rounded-[8px] border border-[#d6c9aa] bg-white px-3 py-2">
                <p className="text-xs font-bold uppercase text-[#68705c]">
                  Login
                </p>
                <p className="font-black leading-tight">{user.name}</p>
              </div>
              <button
                onClick={logout}
                className="h-full min-h-12 rounded-[8px] bg-[#f5ded5] px-4 font-black text-[#a13f28]"
              >
                Keluar
              </button>
            </div>
          </div>
        </header>

        <nav className="mb-4 flex gap-2">
          {[
            ["kasir", "Kasir"],
            ["menu", "Menu"],
            ["riwayat", "Riwayat & Laporan"],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as "kasir" | "menu" | "riwayat")}
              className={`h-12 rounded-[8px] px-5 text-base font-bold ${
                activeTab === id
                  ? "bg-[#28451f] text-[#fffdf5]"
                  : "border border-[#d6c9aa] bg-[#fffdf5] text-[#28451f]"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {activeTab === "kasir" && (
          <div className="grid flex-1 gap-4 lg:grid-cols-[1fr_420px]">
            <section className="rounded-[8px] border border-[#d6c9aa] bg-[#fffdf5] p-4">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="flex h-12 min-w-[280px] flex-1 items-center gap-2 rounded-[8px] border border-[#d6c9aa] bg-white px-3">
                  <Search size={20} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Cari menu..."
                    className="h-full flex-1 bg-transparent text-base outline-none"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {[{ id: "all", name: "Semua" }, ...categories].map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setActiveCategoryId(category.id)}
                      className={`h-12 rounded-[8px] px-4 font-bold ${
                        activeCategoryId === category.id
                          ? "bg-[#d85f32] text-white"
                          : "bg-[#eef3df] text-[#28451f]"
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                {visibleProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="overflow-hidden rounded-[8px] border border-[#d6c9aa] bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-55"
                    disabled={!product.isAvailable}
                  >
                    <div className="relative aspect-[4/3] bg-[#eef3df]">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          fill
                          unoptimized={product.imageUrl.startsWith("/uploads/")}
                          className="object-cover"
                        />
                      ) : null}
                      {!product.isAvailable && (
                        <div className="absolute inset-0 grid place-items-center bg-black/45 text-lg font-bold text-white">
                          Tidak tersedia
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-1 text-lg font-bold">{product.name}</p>
                      <p className="mt-1 text-sm text-[#68705c]">
                        {product.description}
                      </p>
                      <p className="mt-3 text-xl font-black text-[#d85f32]">
                        {formatRupiah(product.price)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <aside className="rounded-[8px] border border-[#d6c9aa] bg-[#fffdf5] p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-xl font-black">
                  <ShoppingCart size={22} />{" "}
                  {editingOrderId ? "Edit Transaksi" : "Pesanan"}
                </h2>
                <button
                  onClick={editingOrderId ? cancelEditOrder : () => setCart([])}
                  className="rounded-[8px] px-3 py-2 text-sm font-bold text-[#a13f28]"
                >
                  {editingOrderId ? "Batal Edit" : "Kosongkan"}
                </button>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-2">
                {["Dine in", "Bungkus"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setOrderType(type)}
                    className={`h-12 rounded-[8px] font-bold ${
                      orderType === type
                        ? "bg-[#28451f] text-white"
                        : "bg-[#eef3df]"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div className="max-h-[42vh] space-y-3 overflow-y-auto pr-1">
                {cart.length === 0 && (
                  <div className="grid min-h-40 place-items-center rounded-[8px] border border-dashed border-[#c8b98f] text-center text-[#68705c]">
                    Pilih menu untuk mulai mencatat pesanan.
                  </div>
                )}
                {cart.map((item) => (
                  <div
                    key={item.lineId}
                    className="rounded-[8px] border border-[#e1d5b8] bg-white p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold">{item.productName}</p>
                        <p className="text-sm text-[#68705c]">
                          {formatRupiah(item.unitPrice)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.lineId, -1)}
                          className="grid h-9 w-9 place-items-center rounded-[8px] bg-[#eef3df]"
                          aria-label="Kurangi jumlah"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="w-7 text-center text-lg font-black">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.lineId, 1)}
                          className="grid h-9 w-9 place-items-center rounded-[8px] bg-[#28451f] text-white"
                          aria-label="Tambah jumlah"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                    <input
                      value={item.note}
                      onChange={(event) =>
                        updateNote(item.lineId, event.target.value)
                      }
                      placeholder="Catatan: tidak pedas, es sedikit..."
                      className="mt-3 h-10 w-full rounded-[8px] border border-[#e1d5b8] px-3 outline-none"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-3 border-t border-[#d6c9aa] pt-4">
                <div className="flex items-center justify-between text-xl font-black">
                  <span>Total</span>
                  <span>{formatRupiah(cartTotal)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPaymentMethod("Tunai")}
                    className={`flex h-12 items-center justify-center gap-2 rounded-[8px] font-bold ${
                      paymentMethod === "Tunai"
                        ? "bg-[#d85f32] text-white"
                        : "bg-[#eef3df]"
                    }`}
                  >
                    <Banknote size={18} /> Tunai
                  </button>
                  <button
                    onClick={() => setPaymentMethod("QRIS manual")}
                    className={`flex h-12 items-center justify-center gap-2 rounded-[8px] font-bold ${
                      paymentMethod === "QRIS manual"
                        ? "bg-[#d85f32] text-white"
                        : "bg-[#eef3df]"
                    }`}
                  >
                    <CreditCard size={18} /> QRIS
                  </button>
                </div>
                {paymentMethod === "Tunai" && (
                  <div>
                    <input
                      value={cashReceived}
                      onChange={(event) => setCashReceived(event.target.value)}
                      inputMode="numeric"
                      placeholder="Uang diterima"
                      className="h-12 w-full rounded-[8px] border border-[#d6c9aa] px-3 text-lg font-bold outline-none"
                    />
                    <p className="mt-2 text-sm font-bold text-[#68705c]">
                      Kembalian: {formatRupiah(changeAmount)}
                    </p>
                  </div>
                )}
                <button
                  onClick={submitOrder}
                  disabled={cart.length === 0 || isSavingOrder}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-[8px] bg-[#28451f] text-lg font-black text-white disabled:opacity-50"
                >
                  <Printer size={22} />{" "}
                  {isSavingOrder
                    ? "Menyimpan..."
                    : editingOrderId
                    ? "Simpan Perubahan & Cetak"
                    : "Simpan & Cetak Nota"}
                </button>
              </div>
            </aside>
          </div>
        )}

        {activeTab === "menu" && (
          <section className="grid gap-4 lg:grid-cols-[420px_1fr]">
            <div className="space-y-4">
              <form
                onSubmit={addCategory}
                className="rounded-[8px] border border-[#d6c9aa] bg-[#fffdf5] p-4"
              >
                <h2 className="mb-4 text-xl font-black">Tambah Kategori</h2>
                <FormInput
                  label="Nama kategori"
                  value={categoryName}
                  onChange={setCategoryName}
                />
                <button
                  disabled={isSavingCategory}
                  className="h-12 w-full rounded-[8px] bg-[#d85f32] font-black text-white disabled:opacity-50"
                >
                  {isSavingCategory ? "Menyimpan..." : "Simpan Kategori"}
                </button>
              </form>

              <form
                onSubmit={addProduct}
                className="rounded-[8px] border border-[#d6c9aa] bg-[#fffdf5] p-4"
              >
                <h2 className="mb-4 flex items-center gap-2 text-xl font-black">
                  <Utensils size={22} />{" "}
                  {editingProductId ? "Edit Menu" : "Tambah Menu"}
                </h2>
                <FormInput
                  label="Nama menu"
                  value={productForm.name}
                  onChange={(value) =>
                    setProductForm((current) => ({ ...current, name: value }))
                  }
                />
                <CategorySelect
                  categories={categories}
                  value={productForm.categoryId}
                  onChange={(value) =>
                    setProductForm((current) => ({
                      ...current,
                      categoryId: value,
                    }))
                  }
                />
                <FormInput
                  label="Harga"
                  value={productForm.price}
                  inputMode="numeric"
                  onChange={(value) =>
                    setProductForm((current) => ({ ...current, price: value }))
                  }
                />
                <FormInput
                  label="Deskripsi singkat"
                  value={productForm.description}
                  onChange={(value) =>
                    setProductForm((current) => ({
                      ...current,
                      description: value,
                    }))
                  }
                />
                <PhotoInput
                  fileName={productImage?.name ?? ""}
                  onChange={setProductImage}
                  disabled={isSavingProduct}
                  helperText={
                    editingProductId
                      ? "Kosongkan jika tidak ingin mengganti foto."
                      : "Pilih foto dari tablet atau komputer."
                  }
                />
                <div className="mt-2 grid gap-2">
                  <button
                    disabled={isSavingProduct}
                    className="h-12 w-full rounded-[8px] bg-[#28451f] font-black text-white disabled:opacity-50"
                  >
                    {isUploadingPhoto
                      ? "Mengupload foto..."
                      : isSavingProduct
                      ? "Menyimpan..."
                      : editingProductId
                      ? "Simpan Perubahan"
                      : "Simpan Menu"}
                  </button>
                  {editingProductId && (
                    <button
                      type="button"
                      onClick={() => resetProductForm()}
                      className="h-11 w-full rounded-[8px] bg-[#eef3df] font-black text-[#28451f]"
                    >
                      Batal Edit
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="rounded-[8px] border border-[#d6c9aa] bg-[#fffdf5] p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-black">Daftar Menu</h2>
                <div className="flex h-12 min-w-[260px] flex-1 items-center gap-2 rounded-[8px] border border-[#d6c9aa] bg-white px-3 md:max-w-md">
                  <Search size={20} />
                  <input
                    value={menuQuery}
                    onChange={(event) => setMenuQuery(event.target.value)}
                    placeholder="Cari nama atau kategori..."
                    className="h-full flex-1 bg-transparent text-base outline-none"
                  />
                </div>
              </div>
              {visibleMenuProducts.length === 0 && (
                <div className="rounded-[8px] border border-dashed border-[#c8b98f] p-6 text-center font-bold text-[#68705c]">
                  Menu tidak ditemukan.
                </div>
              )}
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {visibleMenuProducts.map((product) => (
                  <div
                    key={product.id}
                    className="rounded-[8px] border border-[#e1d5b8] bg-white p-3"
                  >
                    <div className="flex gap-3">
                      <div className="relative h-20 w-24 overflow-hidden rounded-[8px] bg-[#eef3df]">
                        {product.imageUrl ? (
                          <Image
                            src={product.imageUrl}
                            alt={product.name}
                            fill
                            unoptimized={product.imageUrl.startsWith("/uploads/")}
                            className="object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-black">{product.name}</p>
                        <p className="text-sm text-[#68705c]">
                          {product.category.name}
                        </p>
                        <p className="font-bold text-[#d85f32]">
                          {formatRupiah(product.price)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <button
                        onClick={() => toggleProduct(product)}
                        className={`h-10 rounded-[8px] text-sm font-bold ${
                          product.isAvailable
                            ? "bg-[#eef3df] text-[#28451f]"
                            : "bg-[#f5ded5] text-[#a13f28]"
                        }`}
                      >
                        {product.isAvailable ? "Tersedia" : "Habis"}
                      </button>
                      <button
                        onClick={() => startEditProduct(product)}
                        className="flex h-10 items-center justify-center gap-1 rounded-[8px] bg-[#f4efe2] text-sm font-bold text-[#28451f]"
                      >
                        <Pencil size={15} /> Edit
                      </button>
                      <button
                        onClick={() => deleteProduct(product)}
                        className="h-10 rounded-[8px] bg-[#f5ded5] text-sm font-bold text-[#a13f28]"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === "riwayat" && (
          <section className="space-y-4">
            <div className="rounded-[8px] border border-[#d6c9aa] bg-[#fffdf5] p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-xl font-black">
                  <CalendarDays size={22} /> Periode Laporan
                </h2>
                <div className="flex flex-wrap gap-2">
                  {reportRanges.map((range) => (
                    <button
                      key={range.id}
                      onClick={() => changeReportRange(range.id)}
                      className={`h-11 rounded-[8px] px-4 text-sm font-black ${
                        reportRange === range.id
                          ? "bg-[#28451f] text-white"
                          : "bg-[#eef3df] text-[#28451f]"
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <Summary label="Total penjualan" value={formatRupiah(reportSales)} />
                <Summary label="Jumlah transaksi" value={`${reportOrders.length}`} />
                <Summary label="Tunai" value={formatRupiah(reportCashSales)} />
                <Summary label="QRIS manual" value={formatRupiah(reportQrisSales)} />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_440px]">
              <div className="rounded-[8px] border border-[#d6c9aa] bg-[#fffdf5] p-4">
                <h2 className="mb-4 flex items-center gap-2 text-xl font-black">
                  <ReceiptText size={22} /> Riwayat Transaksi
                </h2>
                <div className="space-y-3">
                  {reportOrders.length === 0 && (
                    <div className="rounded-[8px] border border-dashed border-[#c8b98f] p-6 text-center font-bold text-[#68705c]">
                      Belum ada transaksi pada periode ini.
                    </div>
                  )}
                  {reportOrders.map((order) => (
                    <button
                      key={order.id}
                      onClick={() => setLastOrder(order)}
                      className={`flex w-full items-center justify-between rounded-[8px] border p-3 text-left ${
                        lastOrder?.id === order.id
                          ? "border-[#d85f32] bg-[#fff5ec]"
                          : "border-[#e1d5b8] bg-white"
                      }`}
                    >
                      <div>
                        <p className="font-black">{order.orderNumber}</p>
                        <p className="text-sm text-[#68705c]">
                          {formatOrderDate(order.createdAt)} - {order.orderType}
                        </p>
                        <p className="mt-1 text-xs font-bold text-[#68705c]">
                          {order.items.length} jenis item
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-black">{formatRupiah(order.total)}</p>
                        <p className="text-sm text-[#68705c]">
                          {order.paymentMethod}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <OrderDetail
                order={lastOrder}
                onEdit={startEditOrder}
                onDelete={deleteOrder}
              />
            </div>

            <SoldProductsReport products={soldProducts} />
          </section>
        )}
      </section>

      <PrintableReceipt order={lastOrder} />
    </main>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] bg-[#eef3df] px-3 py-2">
      <p className="break-words text-[11px] font-bold uppercase leading-tight text-[#68705c]">
        {label}
      </p>
      <p className="mt-1 text-lg font-black leading-tight">{value}</p>
    </div>
  );
}

function OrderDetail({
  order,
  onEdit,
  onDelete,
}: {
  order: Order | null;
  onEdit: (order: Order) => void;
  onDelete: (order: Order) => void;
}) {
  if (!order) {
    return (
      <aside className="rounded-[8px] border border-[#d6c9aa] bg-[#fffdf5] p-4">
        <h2 className="mb-4 text-xl font-black">Detail Transaksi</h2>
        <div className="rounded-[8px] border border-dashed border-[#c8b98f] p-6 text-center font-bold text-[#68705c]">
          Pilih transaksi untuk melihat detail nota.
        </div>
      </aside>
    );
  }

  return (
    <aside className="rounded-[8px] border border-[#d6c9aa] bg-[#fffdf5] p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Detail Transaksi</h2>
          <p className="text-sm font-bold text-[#68705c]">{order.orderNumber}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            onClick={() => onEdit(order)}
            className="flex h-10 items-center gap-2 rounded-[8px] bg-[#f4efe2] px-3 text-sm font-black text-[#28451f]"
          >
            <Pencil size={16} /> Edit
          </button>
          <button
            onClick={() => onDelete(order)}
            className="h-10 rounded-[8px] bg-[#f5ded5] px-3 text-sm font-black text-[#a13f28]"
          >
            Hapus
          </button>
          <button
            onClick={() => window.print()}
            className="flex h-10 items-center gap-2 rounded-[8px] bg-[#28451f] px-3 text-sm font-black text-white"
          >
            <Printer size={16} /> Cetak
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
        <DetailBox label="Waktu" value={formatOrderDate(order.createdAt)} />
        <DetailBox label="Jenis" value={order.orderType} />
        <DetailBox label="Pembayaran" value={order.paymentMethod} />
        <DetailBox label="Status" value={order.status === "paid" ? "Lunas" : order.status} />
      </div>

      <div className="space-y-2">
        {order.items.map((item) => (
          <div
            key={item.id ?? `${order.id}-${item.productName}`}
            className="rounded-[8px] border border-[#e1d5b8] bg-white p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black">{item.productName}</p>
                <p className="text-sm text-[#68705c]">
                  {item.quantity} x {formatRupiah(item.unitPrice)}
                </p>
                {item.note && (
                  <p className="mt-1 text-xs font-bold text-[#a13f28]">
                    Catatan: {item.note}
                  </p>
                )}
              </div>
              <p className="font-black">{formatRupiah(item.subtotal)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-2 border-t border-[#d6c9aa] pt-4">
        <div className="flex justify-between text-lg font-black">
          <span>Total</span>
          <span>{formatRupiah(order.total)}</span>
        </div>
        {order.cashReceived !== null && (
          <>
            <div className="flex justify-between text-sm font-bold text-[#68705c]">
              <span>Uang diterima</span>
              <span>{formatRupiah(order.cashReceived)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-[#68705c]">
              <span>Kembalian</span>
              <span>{formatRupiah(order.changeAmount ?? 0)}</span>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

function DetailBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] bg-[#eef3df] px-3 py-2">
      <p className="text-xs font-bold uppercase text-[#68705c]">{label}</p>
      <p className="font-black">{value}</p>
    </div>
  );
}

function SoldProductsReport({
  products,
}: {
  products: { name: string; quantity: number; total: number }[];
}) {
  return (
    <section className="rounded-[8px] border border-[#d6c9aa] bg-[#fffdf5] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-black">
          <BarChart3 size={22} /> Menu Terjual
        </h2>
        <p className="text-sm font-bold text-[#68705c]">
          Dihitung dari transaksi pada periode yang dipilih.
        </p>
      </div>

      {products.length === 0 ? (
        <div className="rounded-[8px] border border-dashed border-[#c8b98f] p-6 text-center font-bold text-[#68705c]">
          Belum ada menu terjual pada periode ini.
        </div>
      ) : (
        <div className="overflow-hidden rounded-[8px] border border-[#e1d5b8]">
          <table className="w-full border-collapse bg-white text-left">
            <thead className="bg-[#eef3df] text-sm uppercase text-[#68705c]">
              <tr>
                <th className="p-3">Menu</th>
                <th className="p-3 text-right">Jumlah Laku</th>
                <th className="p-3 text-right">Total Penjualan</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.name} className="border-t border-[#e1d5b8]">
                  <td className="p-3 font-black">{product.name}</td>
                  <td className="p-3 text-right font-black">
                    {product.quantity}
                  </td>
                  <td className="p-3 text-right font-black text-[#d85f32]">
                    {formatRupiah(product.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function PhotoInput({
  fileName,
  helperText,
  disabled,
  onChange,
}: {
  fileName: string;
  helperText: string;
  disabled?: boolean;
  onChange: (file: File | null) => void;
}) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-sm font-bold text-[#68705c]">
        Upload foto menu
      </span>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        disabled={disabled}
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        className="block w-full rounded-[8px] border border-[#d6c9aa] bg-white px-3 py-3 text-sm disabled:opacity-50 file:mr-3 file:rounded-[8px] file:border-0 file:bg-[#eef3df] file:px-3 file:py-2 file:font-bold file:text-[#28451f]"
      />
      <span className="mt-1 block text-xs font-bold text-[#68705c]">
        {fileName || helperText}
      </span>
    </label>
  );
}

function CategorySelect({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-sm font-bold text-[#68705c]">
        Kategori
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-[8px] border border-[#d6c9aa] bg-white px-3 outline-none"
      >
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function FormInput({
  label,
  value,
  inputMode,
  onChange,
}: {
  label: string;
  value: string;
  inputMode?: "numeric";
  onChange: (value: string) => void;
}) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-sm font-bold text-[#68705c]">{label}</span>
      <input
        value={value}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-[8px] border border-[#d6c9aa] bg-white px-3 outline-none"
      />
    </label>
  );
}

function PrintableReceipt({ order }: { order: Order | null }) {
  if (!order) return null;

  return (
    <div className="receipt-print hidden">
      <div className="receipt-paper">
        <div className="receipt-head">
          <Image
            src="/joyful-logo.svg"
            alt="Joyful"
            width={72}
            height={72}
            className="mx-auto"
          />
          <h2>Joyful</h2>
          <p>Healthy Bistro & Cafe</p>
        </div>
        <div className="receipt-line" />
        <p>No: {order.orderNumber}</p>
        <p>{formatOrderDate(order.createdAt)}</p>
        <p>Jenis: {order.orderType}</p>
        <div className="receipt-line" />
        {order.items.map((item) => (
          <div key={item.id ?? item.productName} className="receipt-row">
            <span>
              {item.quantity}x {item.productName}
            </span>
            <span>{formatRupiah(item.subtotal)}</span>
          </div>
        ))}
        <div className="receipt-line" />
        <div className="receipt-row total">
          <span>Total</span>
          <span>{formatRupiah(order.total)}</span>
        </div>
        <div className="receipt-row">
          <span>{order.paymentMethod}</span>
          <span>
            {order.cashReceived ? formatRupiah(order.cashReceived) : "Lunas"}
          </span>
        </div>
        {order.changeAmount !== null && (
          <div className="receipt-row">
            <span>Kembali</span>
            <span>{formatRupiah(order.changeAmount)}</span>
          </div>
        )}
        <div className="receipt-line" />
        <p className="center">Terima kasih</p>
      </div>
    </div>
  );
}

function isOrderInRange(order: Order, range: ReportRange) {
  const orderDate = new Date(order.createdAt);
  const todayStart = startOfDay(new Date());
  const tomorrowStart = addDays(todayStart, 1);

  if (range === "today") {
    return orderDate >= todayStart && orderDate < tomorrowStart;
  }

  if (range === "yesterday") {
    const yesterdayStart = addDays(todayStart, -1);
    return orderDate >= yesterdayStart && orderDate < todayStart;
  }

  const days = range === "7days" ? 7 : range === "14days" ? 14 : 30;
  const start = addDays(todayStart, -(days - 1));
  return orderDate >= start && orderDate < tomorrowStart;
}

function getSoldProducts(orders: Order[]) {
  const map = new Map<string, { name: string; quantity: number; total: number }>();

  for (const order of orders) {
    for (const item of order.items) {
      const current = map.get(item.productName) ?? {
        name: item.productName,
        quantity: 0,
        total: 0,
      };

      current.quantity += item.quantity;
      current.total += item.subtotal;
      map.set(item.productName, current);
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.quantity !== a.quantity) return b.quantity - a.quantity;
    return b.total - a.total;
  });
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

async function getErrorMessage(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { message?: string };
    return data.message || fallback;
  } catch {
    return fallback;
  }
}
