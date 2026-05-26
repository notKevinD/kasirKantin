"use client";

import Image from "next/image";
import {
  Banknote,
  BarChart3,
  CalendarDays,
  CreditCard,
  FileSpreadsheet,
  Pencil,
  Minus,
  Plus,
  Printer,
  ReceiptText,
  Search,
  ShieldCheck,
  ShoppingCart,
  Utensils,
  Users,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { formatOrderDate, formatRupiah } from "@/lib/format";
import {
  getReportRangeWindow,
  reportRanges,
  type ReportRange,
} from "@/lib/report-range";

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
  isActive: boolean;
};

type UserAccount = CurrentUser & {
  createdAt: string;
  updatedAt: string;
};

type AuditLog = {
  id: string;
  userId: string | null;
  username: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: unknown;
  createdAt: string;
};

type ActiveTab = "kasir" | "menu" | "riwayat" | "pengguna" | "audit";

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
  initialUsers,
  initialAuditLogs,
  user,
}: {
  initialProducts: Product[];
  initialCategories: Category[];
  initialOrders: Order[];
  initialUsers: UserAccount[];
  initialAuditLogs: AuditLog[];
  user: CurrentUser;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [categories, setCategories] = useState(initialCategories);
  const [orders, setOrders] = useState(initialOrders);
  const [users, setUsers] = useState(initialUsers);
  const [auditLogs, setAuditLogs] = useState(initialAuditLogs);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState("all");
  const [query, setQuery] = useState("");
  const [menuQuery, setMenuQuery] = useState("");
  const [orderType, setOrderType] = useState("Dine in");
  const [paymentMethod, setPaymentMethod] = useState("Tunai");
  const [cashReceived, setCashReceived] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("kasir");
  const [reportRange, setReportRange] = useState<ReportRange>("today");
  const [customStartDate, setCustomStartDate] = useState(getDateInputValue(new Date()));
  const [customEndDate, setCustomEndDate] = useState(getDateInputValue(new Date()));
  const [checkoutMode, setCheckoutMode] = useState<"now" | "later">("now");
  const [lastOrder, setLastOrder] = useState<Order | null>(
    orders.find((order) => order.status === "paid") ?? null,
  );
  const [printOrder, setPrintOrder] = useState<Order | null>(lastOrder);
  const [printMode, setPrintMode] = useState<"receipt" | "kitchen">("receipt");
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
  const [isOrderConfirmOpen, setIsOrderConfirmOpen] = useState(false);
  const [userForm, setUserForm] = useState({
    name: "",
    username: "",
    password: "",
    role: "cashier",
  });
  const [userPasswords, setUserPasswords] = useState<Record<string, string>>({});
  const [isSavingUser, setIsSavingUser] = useState(false);
  const canManageMenu = user.role === "owner" || user.role === "admin";
  const canManageUsers = user.role === "owner" || user.role === "admin";
  const canViewReports = user.role === "owner" || user.role === "admin";
  const canVoidOrder = user.role === "owner" || user.role === "admin";
  const tabs: { id: ActiveTab; label: string }[] = [
    { id: "kasir", label: "Kasir" },
    ...(canManageMenu ? [{ id: "menu" as ActiveTab, label: "Menu" }] : []),
    ...(canViewReports
      ? [{ id: "riwayat" as ActiveTab, label: "Riwayat & Laporan" }]
      : []),
    ...(canManageUsers
      ? [
          { id: "pengguna" as ActiveTab, label: "Pengguna" },
          { id: "audit" as ActiveTab, label: "Audit" },
        ]
      : []),
  ];

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

  const paidOrders = orders.filter((order) => order.status === "paid");
  const inProgressOrders = orders.filter((order) => order.status === "in_progress");
  const todayOrders = paidOrders.filter((order) =>
    isOrderInRange(order, "today", customStartDate, customEndDate),
  );
  const todaySales = todayOrders.reduce((sum, order) => sum + order.total, 0);
  const qrisSales = todayOrders
    .filter((order) => order.paymentMethod === "QRIS manual")
    .reduce((sum, order) => sum + order.total, 0);
  const reportOrders = paidOrders.filter((order) =>
    isOrderInRange(order, reportRange, customStartDate, customEndDate),
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

  function requestOrderConfirmation() {
    if (isSavingOrder) return;
    if (cart.length === 0) return;

    if (
      checkoutMode === "now" &&
      paymentMethod === "Tunai" &&
      Number(cashReceived || 0) < cartTotal
    ) {
      alert("Uang diterima masih kurang dari total belanja.");
      return;
    }

    setIsOrderConfirmOpen(true);
  }

  async function submitOrder() {
    if (isSavingOrder) return;
    if (cart.length === 0) return;
    if (
      checkoutMode === "now" &&
      paymentMethod === "Tunai" &&
      Number(cashReceived || 0) < cartTotal
    ) {
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
            status: checkoutMode === "later" ? "in_progress" : "paid",
            paymentMethod:
              checkoutMode === "later" ? "Belum bayar" : paymentMethod,
            cashReceived:
              checkoutMode === "now" && paymentMethod === "Tunai"
                ? Number(cashReceived)
                : null,
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
      if (order.status === "paid") {
        setLastOrder(order);
        setPrintMode("receipt");
      } else {
        setPrintMode("kitchen");
      }
      setPrintOrder(order);
      setCart([]);
      setCashReceived("");
      setEditingOrderId(null);
      setCheckoutMode("now");
      setIsOrderConfirmOpen(false);

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

  async function deleteCategory(category: Category) {
    const usedCount = products.filter(
      (product) => product.categoryId === category.id,
    ).length;

    if (usedCount > 0) {
      alert(
        `Kategori "${category.name}" masih dipakai ${usedCount} menu. Pindahkan atau hapus menunya dulu.`,
      );
      return;
    }

    const confirmed = window.confirm(`Hapus kategori "${category.name}"?`);
    if (!confirmed) return;

    const response = await fetch(`/api/categories/${category.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      alert(await getErrorMessage(response, "Kategori belum bisa dihapus."));
      return;
    }

    const nextCategories = categories.filter((item) => item.id !== category.id);
    setCategories(nextCategories);

    if (activeCategoryId === category.id) {
      setActiveCategoryId("all");
    }

    if (productForm.categoryId === category.id) {
      setProductForm((current) => ({
        ...current,
        categoryId: nextCategories[0]?.id ?? "",
      }));
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
    const nextOrders = paidOrders.filter((order) =>
      isOrderInRange(order, range, customStartDate, customEndDate),
    );
    setReportRange(range);
    setLastOrder(nextOrders[0] ?? null);
  }

  function changeCustomReportDate(type: "start" | "end", value: string) {
    const nextStartDate = type === "start" ? value : customStartDate;
    const nextEndDate = type === "end" ? value : customEndDate;

    setCustomStartDate(nextStartDate);
    setCustomEndDate(nextEndDate);

    if (reportRange === "custom") {
      const nextOrders = paidOrders.filter((order) =>
        isOrderInRange(order, "custom", nextStartDate, nextEndDate),
      );
      setLastOrder(nextOrders[0] ?? null);
    }
  }

  function startEditOrder(order: Order, mode?: "now" | "later") {
    setEditingOrderId(order.id);
    setOrderType(order.orderType);
    const nextCheckoutMode =
      mode ?? (order.status === "in_progress" ? "later" : "now");
    setCheckoutMode(nextCheckoutMode);
    setPaymentMethod(order.paymentMethod === "Belum bayar" ? "Tunai" : order.paymentMethod);
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
    setCheckoutMode("now");
  }

  async function deleteOrder(order: Order) {
    if (!canVoidOrder) {
      alert("Akses void transaksi hanya untuk admin/owner.");
      return;
    }

    const confirmed = window.confirm(
      `Batalkan transaksi ${order.orderNumber}? Transaksi tidak akan dihitung di laporan aktif.`,
    );

    if (!confirmed) return;

    const response = await fetch(`/api/orders/${order.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      alert("Transaksi belum bisa dihapus.");
      return;
    }

    const nextOrders = orders.map((item) =>
      item.id === order.id ? { ...item, status: "cancelled" } : item,
    );
    setOrders(nextOrders);
    setLastOrder(nextOrders.find((item) => item.status === "paid") ?? null);

    if (editingOrderId === order.id) {
      cancelEditOrder();
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSavingUser) return;
    setIsSavingUser(true);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userForm),
      });

      if (!response.ok) {
        alert(await getErrorMessage(response, "User belum bisa dibuat."));
        return;
      }

      const createdUser = (await response.json()) as UserAccount;
      setUsers((current) => [createdUser, ...current]);
      setUserForm({ name: "", username: "", password: "", role: "cashier" });
      refreshAuditLogs();
    } finally {
      setIsSavingUser(false);
    }
  }

  async function updateUser(
    target: UserAccount,
    data: Partial<Pick<UserAccount, "name" | "username" | "role" | "isActive">> & {
      password?: string;
    },
  ) {
    const response = await fetch(`/api/users/${target.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      alert(await getErrorMessage(response, "User belum bisa diubah."));
      return;
    }

    const updatedUser = (await response.json()) as UserAccount;
    setUsers((current) =>
      current.map((item) => (item.id === updatedUser.id ? updatedUser : item)),
    );
    refreshAuditLogs();
  }

  async function resetUserPassword(target: UserAccount) {
    const password = userPasswords[target.id] || "";

    if (password.length < 8) {
      alert("Password minimal 8 karakter.");
      return;
    }

    await updateUser(target, { password });
    setUserPasswords((current) => ({ ...current, [target.id]: "" }));
  }

  async function refreshAuditLogs() {
    if (!canManageUsers) return;

    const response = await fetch("/api/audit-logs");
    if (!response.ok) return;
    const logs = (await response.json()) as AuditLog[];
    setAuditLogs(logs);
  }

  function exportReportExcel() {
    const params = new URLSearchParams({ range: reportRange });

    if (reportRange === "custom") {
      params.set("startDate", customStartDate);
      params.set("endDate", customEndDate);
    }

    window.location.href = `/api/reports/export?${params.toString()}`;
  }

  function printPaidReceipt(order: Order) {
    setPrintMode("receipt");
    setPrintOrder(order);
    window.setTimeout(() => window.print(), 100);
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

        <nav className="mb-4 flex flex-wrap gap-2">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
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
          <div className="grid flex-1 gap-4 xl:h-[calc(100vh-178px)] xl:min-h-[620px] xl:grid-cols-[280px_minmax(0,1fr)_420px]">
            <section className="rounded-[8px] border border-[#d6c9aa] bg-[#fffdf5] p-4 xl:flex xl:min-h-0 xl:flex-col">
              <h2 className="mb-3 text-lg font-black">Transaksi Berjalan</h2>
              {inProgressOrders.length === 0 ? (
                <div className="grid min-h-32 place-items-center rounded-[8px] border border-dashed border-[#c8b98f] px-3 text-center text-sm font-bold text-[#68705c]">
                  Belum ada pesanan dine in yang belum bayar.
                </div>
              ) : (
                <div className="space-y-3 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1">
                  {inProgressOrders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-[8px] border border-[#e1d5b8] bg-white p-3"
                    >
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-black">{order.orderNumber}</p>
                          <p className="text-xs font-bold text-[#68705c]">
                            {formatOrderDate(order.createdAt)}
                          </p>
                        </div>
                        <p className="font-black text-[#d85f32]">
                          {formatRupiah(order.total)}
                        </p>
                      </div>
                      <p className="mb-3 text-sm font-bold text-[#68705c]">
                        {order.items.length} jenis item - {order.orderType}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => startEditOrder(order, "later")}
                          className="h-10 rounded-[8px] bg-[#eef3df] text-sm font-black text-[#28451f]"
                        >
                          Tambah/Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => startEditOrder(order, "now")}
                          className="h-10 rounded-[8px] bg-[#28451f] text-sm font-black text-white"
                        >
                          Bayar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[8px] border border-[#d6c9aa] bg-[#fffdf5] p-4 xl:flex xl:min-h-0 xl:flex-col">
              <div className="mb-4 flex shrink-0 flex-wrap items-center gap-3">
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

              <div className="grid grid-cols-2 gap-3 overflow-y-auto pr-1 xl:min-h-0 xl:flex-1 2xl:grid-cols-3">
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
                          src={getDisplayImageUrl(product.imageUrl)}
                          alt={product.name}
                          fill
                          unoptimized={isUploadedImage(product.imageUrl)}
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

            <aside className="rounded-[8px] border border-[#d6c9aa] bg-[#fffdf5] p-4 xl:sticky xl:top-4 xl:flex xl:h-full xl:min-h-0 xl:flex-col">
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

              <div className="space-y-3 overflow-y-auto pr-1 xl:min-h-0 xl:flex-1">
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

              <div className="mt-4 shrink-0 space-y-3 border-t border-[#d6c9aa] pt-4">
                <div className="flex items-center justify-between text-xl font-black">
                  <span>Total</span>
                  <span>{formatRupiah(cartTotal)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setCheckoutMode("now")}
                    className={`h-12 rounded-[8px] font-bold ${
                      checkoutMode === "now"
                        ? "bg-[#28451f] text-white"
                        : "bg-[#eef3df]"
                    }`}
                  >
                    Bayar sekarang
                  </button>
                  <button
                    onClick={() => setCheckoutMode("later")}
                    className={`h-12 rounded-[8px] font-bold ${
                      checkoutMode === "later"
                        ? "bg-[#28451f] text-white"
                        : "bg-[#eef3df]"
                    }`}
                  >
                    Bayar nanti
                  </button>
                </div>
                {checkoutMode === "now" && (
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
                )}
                {checkoutMode === "now" && paymentMethod === "Tunai" && (
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
                  onClick={requestOrderConfirmation}
                  disabled={cart.length === 0 || isSavingOrder}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-[8px] bg-[#28451f] text-lg font-black text-white disabled:opacity-50"
                >
                  <Printer size={22} />{" "}
                  {isSavingOrder
                    ? "Menyimpan..."
                    : editingOrderId
                    ? checkoutMode === "later"
                      ? "Simpan Transaksi Berjalan"
                      : "Simpan Perubahan & Cetak"
                    : checkoutMode === "later"
                    ? "Simpan Pesanan"
                    : "Simpan & Cetak Nota"}
                </button>
              </div>
            </aside>
          </div>
        )}

        {activeTab === "menu" && canManageMenu && (
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
                <div className="mt-4 space-y-2 border-t border-[#d6c9aa] pt-4">
                  {categories.map((category) => {
                    const usedCount = products.filter(
                      (product) => product.categoryId === category.id,
                    ).length;

                    return (
                      <div
                        key={category.id}
                        className="flex items-center justify-between gap-3 rounded-[8px] border border-[#e1d5b8] bg-white px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-black">{category.name}</p>
                          <p className="text-xs font-bold text-[#68705c]">
                            {usedCount} menu
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteCategory(category)}
                          disabled={usedCount > 0}
                          className="h-10 rounded-[8px] bg-[#f5ded5] px-3 text-sm font-black text-[#a13f28] disabled:opacity-45"
                          title={
                            usedCount > 0
                              ? "Kategori masih dipakai menu"
                              : "Hapus kategori"
                          }
                        >
                          Hapus
                        </button>
                      </div>
                    );
                  })}
                </div>
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
                            src={getDisplayImageUrl(product.imageUrl)}
                            alt={product.name}
                            fill
                            unoptimized={isUploadedImage(product.imageUrl)}
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

        {activeTab === "riwayat" && canViewReports && (
          <section className="space-y-4">
            <div className="rounded-[8px] border border-[#d6c9aa] bg-[#fffdf5] p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-xl font-black">
                  <CalendarDays size={22} /> Periode Laporan
                </h2>
                <div className="flex flex-wrap items-center gap-2">
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
                  {reportRange === "custom" && (
                    <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-[150px_150px]">
                      <label className="block">
                        <span className="mb-1 block text-xs font-bold uppercase text-[#68705c]">
                          Dari
                        </span>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(event) =>
                            changeCustomReportDate("start", event.target.value)
                          }
                          className="h-11 w-full rounded-[8px] border border-[#d6c9aa] bg-white px-3 font-bold outline-none"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-bold uppercase text-[#68705c]">
                          Sampai
                        </span>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(event) =>
                            changeCustomReportDate("end", event.target.value)
                          }
                          className="h-11 w-full rounded-[8px] border border-[#d6c9aa] bg-white px-3 font-bold outline-none"
                        />
                      </label>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={exportReportExcel}
                    className="flex h-11 items-center gap-2 rounded-[8px] bg-[#d85f32] px-4 text-sm font-black text-white"
                  >
                    <FileSpreadsheet size={18} /> Export Excel
                  </button>
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
                onPrint={printPaidReceipt}
                canEdit={canVoidOrder}
              />
            </div>

            <SoldProductsReport products={soldProducts} />
          </section>
        )}

        {activeTab === "pengguna" && canManageUsers && (
          <section className="grid gap-4 lg:grid-cols-[420px_1fr]">
            <form
              onSubmit={createUser}
              className="rounded-[8px] border border-[#d6c9aa] bg-[#fffdf5] p-4"
            >
              <h2 className="mb-4 flex items-center gap-2 text-xl font-black">
                <Users size={22} /> Tambah User
              </h2>
              <FormInput
                label="Nama"
                value={userForm.name}
                onChange={(value) =>
                  setUserForm((current) => ({ ...current, name: value }))
                }
              />
              <FormInput
                label="Username"
                value={userForm.username}
                onChange={(value) =>
                  setUserForm((current) => ({ ...current, username: value }))
                }
              />
              <FormInput
                label="Password awal"
                type="password"
                value={userForm.password}
                onChange={(value) =>
                  setUserForm((current) => ({ ...current, password: value }))
                }
              />
              <label className="mb-3 block">
                <span className="mb-1 block text-sm font-bold text-[#68705c]">
                  Role
                </span>
                <select
                  value={userForm.role}
                  onChange={(event) =>
                    setUserForm((current) => ({
                      ...current,
                      role: event.target.value,
                    }))
                  }
                  className="h-12 w-full rounded-[8px] border border-[#d6c9aa] bg-white px-3 outline-none"
                >
                  <option value="cashier">Kasir</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </select>
              </label>
              <button
                disabled={isSavingUser}
                className="h-12 w-full rounded-[8px] bg-[#28451f] font-black text-white disabled:opacity-50"
              >
                {isSavingUser ? "Menyimpan..." : "Simpan User"}
              </button>
            </form>

            <div className="rounded-[8px] border border-[#d6c9aa] bg-[#fffdf5] p-4">
              <h2 className="mb-4 text-xl font-black">Daftar User</h2>
              <div className="space-y-3">
                {users.map((account) => (
                  <div
                    key={account.id}
                    className="rounded-[8px] border border-[#e1d5b8] bg-white p-3"
                  >
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-black">{account.name}</p>
                        <p className="text-sm font-bold text-[#68705c]">
                          @{account.username} - {roleLabel(account.role)}
                        </p>
                      </div>
                      <span
                        className={`rounded-[8px] px-3 py-1 text-sm font-black ${
                          account.isActive
                            ? "bg-[#eef3df] text-[#28451f]"
                            : "bg-[#f5ded5] text-[#a13f28]"
                        }`}
                      >
                        {account.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </div>

                    <div className="grid gap-2 md:grid-cols-[1fr_160px_150px]">
                      <input
                        value={account.name}
                        onChange={(event) =>
                          setUsers((current) =>
                            current.map((item) =>
                              item.id === account.id
                                ? { ...item, name: event.target.value }
                                : item,
                            ),
                          )
                        }
                        onBlur={(event) =>
                          updateUser(account, { name: event.target.value })
                        }
                        className="h-11 rounded-[8px] border border-[#d6c9aa] px-3 outline-none"
                      />
                      <select
                        value={account.role}
                        onChange={(event) =>
                          updateUser(account, { role: event.target.value })
                        }
                        className="h-11 rounded-[8px] border border-[#d6c9aa] bg-white px-3 outline-none"
                      >
                        <option value="cashier">Kasir</option>
                        <option value="admin">Admin</option>
                        <option value="owner">Owner</option>
                      </select>
                      <button
                        type="button"
                        disabled={account.id === user.id}
                        onClick={() =>
                          updateUser(account, { isActive: !account.isActive })
                        }
                        className="h-11 rounded-[8px] bg-[#f4efe2] px-3 font-black text-[#28451f] disabled:opacity-50"
                      >
                        {account.isActive ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                    </div>

                    <div className="mt-2 grid gap-2 md:grid-cols-[1fr_150px]">
                      <input
                        type="password"
                        value={userPasswords[account.id] ?? ""}
                        onChange={(event) =>
                          setUserPasswords((current) => ({
                            ...current,
                            [account.id]: event.target.value,
                          }))
                        }
                        placeholder="Password baru"
                        className="h-11 rounded-[8px] border border-[#d6c9aa] px-3 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => resetUserPassword(account)}
                        className="h-11 rounded-[8px] bg-[#28451f] px-3 font-black text-white"
                      >
                        Reset Password
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === "audit" && canManageUsers && (
          <section className="rounded-[8px] border border-[#d6c9aa] bg-[#fffdf5] p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-xl font-black">
                <ShieldCheck size={22} /> Audit Aktivitas
              </h2>
              <button
                type="button"
                onClick={refreshAuditLogs}
                className="h-11 rounded-[8px] bg-[#eef3df] px-4 font-black text-[#28451f]"
              >
                Refresh
              </button>
            </div>
            <div className="overflow-hidden rounded-[8px] border border-[#e1d5b8]">
              <table className="w-full border-collapse bg-white text-left text-sm">
                <thead className="bg-[#eef3df] uppercase text-[#68705c]">
                  <tr>
                    <th className="p-3">Waktu</th>
                    <th className="p-3">User</th>
                    <th className="p-3">Aksi</th>
                    <th className="p-3">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="border-t border-[#e1d5b8]">
                      <td className="p-3 font-bold">{formatOrderDate(log.createdAt)}</td>
                      <td className="p-3">{log.username ?? "-"}</td>
                      <td className="p-3 font-black">{log.action}</td>
                      <td className="p-3 text-[#68705c]">
                        {formatAuditMetadata(log.metadata)}
                      </td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-6 text-center font-bold text-[#68705c]">
                        Belum ada aktivitas tercatat.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </section>

      <OrderConfirmationModal
        isOpen={isOrderConfirmOpen}
        isSaving={isSavingOrder}
        isEditing={Boolean(editingOrderId)}
        cart={cart}
        checkoutMode={checkoutMode}
        orderType={orderType}
        paymentMethod={checkoutMode === "later" ? "Belum bayar" : paymentMethod}
        cashReceived={
          checkoutMode === "now" && paymentMethod === "Tunai"
            ? Number(cashReceived || 0)
            : null
        }
        changeAmount={
          checkoutMode === "now" && paymentMethod === "Tunai" ? changeAmount : null
        }
        total={cartTotal}
        onCheckoutModeChange={setCheckoutMode}
        onCancel={() => setIsOrderConfirmOpen(false)}
        onConfirm={submitOrder}
      />
      <PrintableReceipt order={printOrder} mode={printMode} />
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

function OrderConfirmationModal({
  isOpen,
  isSaving,
  isEditing,
  cart,
  checkoutMode,
  orderType,
  paymentMethod,
  cashReceived,
  changeAmount,
  total,
  onCheckoutModeChange,
  onCancel,
  onConfirm,
}: {
  isOpen: boolean;
  isSaving: boolean;
  isEditing: boolean;
  cart: CartItem[];
  checkoutMode: "now" | "later";
  orderType: string;
  paymentMethod: string;
  cashReceived: number | null;
  changeAmount: number | null;
  total: number;
  onCheckoutModeChange: (mode: "now" | "later") => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-xl overflow-hidden rounded-[8px] bg-[#fffdf5] shadow-2xl">
        <div className="border-b border-[#d6c9aa] px-4 py-3">
          <h2 className="text-xl font-black">
            {isEditing ? "Konfirmasi Perubahan Transaksi" : "Konfirmasi Pesanan"}
          </h2>
          <p className="text-sm font-bold text-[#68705c]">
            Cek item, jumlah, dan pembayaran sebelum disimpan.
          </p>
        </div>

        <div className="max-h-[58vh] overflow-y-auto px-4 py-3">
          <div className="mb-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onCheckoutModeChange("now")}
              className={`h-12 rounded-[8px] font-black ${
                checkoutMode === "now"
                  ? "bg-[#28451f] text-white"
                  : "bg-[#eef3df] text-[#28451f]"
              }`}
            >
              Bayar sekarang
            </button>
            <button
              type="button"
              onClick={() => onCheckoutModeChange("later")}
              className={`h-12 rounded-[8px] font-black ${
                checkoutMode === "later"
                  ? "bg-[#28451f] text-white"
                  : "bg-[#eef3df] text-[#28451f]"
              }`}
            >
              Bayar nanti
            </button>
          </div>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <DetailBox label="Jenis" value={orderType} />
            <DetailBox label="Pembayaran" value={paymentMethod} />
          </div>

          <div className="space-y-2">
            {cart.map((item) => (
              <div
                key={item.lineId}
                className="rounded-[8px] border border-[#e1d5b8] bg-white p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black">{item.productName}</p>
                    <p className="text-sm font-bold text-[#68705c]">
                      {item.quantity} x {formatRupiah(item.unitPrice)}
                    </p>
                    {item.note && (
                      <p className="mt-1 text-xs font-bold text-[#a13f28]">
                        Catatan: {item.note}
                      </p>
                    )}
                  </div>
                  <p className="font-black">
                    {formatRupiah(item.unitPrice * item.quantity)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-[#d6c9aa] bg-white px-4 py-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xl font-black">
              <span>Total</span>
              <span>{formatRupiah(total)}</span>
            </div>
            {cashReceived !== null && (
              <>
                <div className="flex justify-between text-sm font-bold text-[#68705c]">
                  <span>Uang diterima</span>
                  <span>{formatRupiah(cashReceived)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-[#68705c]">
                  <span>Kembalian</span>
                  <span>{formatRupiah(changeAmount ?? 0)}</span>
                </div>
              </>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="h-12 rounded-[8px] bg-[#f5ded5] font-black text-[#a13f28] disabled:opacity-50"
            >
              Cek Lagi
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isSaving}
              className="h-12 rounded-[8px] bg-[#28451f] font-black text-white disabled:opacity-50"
            >
              {isSaving
                ? "Menyimpan..."
                : checkoutMode === "later"
                ? "Simpan Pesanan"
                : "Konfirmasi & Cetak"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderDetail({
  order,
  onEdit,
  onDelete,
  onPrint,
  canEdit,
}: {
  order: Order | null;
  onEdit: (order: Order) => void;
  onDelete: (order: Order) => void;
  onPrint: (order: Order) => void;
  canEdit: boolean;
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
          {canEdit && (
            <>
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
                Void
              </button>
            </>
          )}
          <button
            onClick={() => onPrint(order)}
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
        accept="image/png,image/jpeg,image/webp"
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
  type = "text",
  value,
  inputMode,
  onChange,
}: {
  label: string;
  type?: string;
  value: string;
  inputMode?: "numeric";
  onChange: (value: string) => void;
}) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-sm font-bold text-[#68705c]">{label}</span>
      <input
        type={type}
        value={value}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-[8px] border border-[#d6c9aa] bg-white px-3 outline-none"
      />
    </label>
  );
}

function PrintableReceipt({
  order,
  mode,
}: {
  order: Order | null;
  mode: "receipt" | "kitchen";
}) {
  if (!order) return null;

  if (mode === "kitchen") {
    return (
      <div className="receipt-print hidden">
        <div className="receipt-paper">
          <div className="receipt-head">
            <h2>Kitchen Order</h2>
            <p>Joyful Healthy Bistro & Cafe</p>
          </div>
          <div className="receipt-line" />
          <p>No: {order.orderNumber}</p>
          <p>{formatOrderDate(order.createdAt)}</p>
          <p>Jenis: {order.orderType}</p>
          <p>Status: Belum bayar</p>
          <div className="receipt-line" />
          {order.items.map((item) => (
            <div key={item.id ?? item.productName} className="receipt-item">
              <p className="receipt-item-title">
                {item.quantity}x {item.productName}
              </p>
              {item.note && <p>Catatan: {item.note}</p>}
            </div>
          ))}
          <div className="receipt-line" />
          <p className="center">Untuk kitchen</p>
        </div>
      </div>
    );
  }

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

function isOrderInRange(
  order: Order,
  range: ReportRange,
  customStartDate: string,
  customEndDate: string,
) {
  const orderDate = new Date(order.createdAt);
  const { start, end } = getReportRangeWindow(range, new Date(), {
    startDate: customStartDate,
    endDate: customEndDate,
  });
  return orderDate >= start && orderDate < end;
}

function getDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function isUploadedImage(imageUrl: string | null) {
  return Boolean(
    imageUrl?.startsWith("/uploads/") || imageUrl?.startsWith("/api/uploads/"),
  );
}

function getDisplayImageUrl(imageUrl: string | null) {
  if (!imageUrl) return "";

  if (imageUrl.startsWith("/uploads/")) {
    return imageUrl.replace("/uploads/", "/api/uploads/");
  }

  return imageUrl;
}

async function getErrorMessage(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { message?: string };
    return data.message || fallback;
  } catch {
    return fallback;
  }
}

function roleLabel(role: string) {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Admin";
  return "Kasir";
}

function formatAuditMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return "-";

  const record = metadata as Record<string, unknown>;
  return Object.entries(record)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(", ");
}
