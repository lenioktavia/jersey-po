const App = {
  state: { page: "dashboard", products: [], orders: [], filter: "all" },

  async init() {
    if (!SUPABASE_URL.startsWith("http") || SUPABASE_ANON_KEY.includes("MASUKKAN")) {
      alert("Isi SUPABASE_URL dan SUPABASE_ANON_KEY di js/supabase.js terlebih dahulu.");
      return;
    }

    supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (session) this.showApp(session);
      else this.showAuth();
    });

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) this.showApp(session);
    else this.showAuth();

    document.querySelectorAll(".nav-item").forEach(btn => btn.addEventListener("click", () => this.navigate(btn.dataset.page)));
    document.querySelectorAll("[data-page-link]").forEach(btn => btn.addEventListener("click", () => this.navigate(btn.dataset.pageLink)));
    document.getElementById("menuBtn").addEventListener("click", () => document.getElementById("sidebar").classList.toggle("open"));
    document.getElementById("logoutBtn").addEventListener("click", () => this.logout());
    document.getElementById("quickOrderBtn").addEventListener("click", () => Orders.openModal());
    document.getElementById("addProductBtn").addEventListener("click", () => Products.openModal());
    document.getElementById("addOrderBtn").addEventListener("click", () => Orders.openModal());
    document.getElementById("refreshLateBtn").addEventListener("click", () => this.loadAll());
    document.getElementById("loginForm").addEventListener("submit", e => this.login(e));
  },

  showAuth() {
    document.getElementById("authView").classList.remove("hidden");
    document.getElementById("appView").classList.add("hidden");
  },

  async showApp(session) {
    document.getElementById("authView").classList.add("hidden");
    document.getElementById("appView").classList.remove("hidden");
    document.getElementById("userEmail").textContent = session.user.email || "";
    await this.loadAll();
  },

  async login(e) {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) this.toast(error.message, true);
  },

  async logout() {
    await supabaseClient.auth.signOut();
  },

  navigate(page) {
    this.state.page = page;
    document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));
    document.getElementById(`page-${page}`).classList.remove("hidden");
    document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.page === page));
    const titles = {
      dashboard: ["Dashboard", "Ringkasan produksi dan pesanan."],
      orders: ["Pesanan", "Kelola seluruh pesanan jersey."],
      products: ["Produk", "Kelola produk dan desain."],
      late: ["Pesanan Terlambat", "Pesanan yang deadline-nya sudah lewat."]
    };
    document.getElementById("pageTitle").textContent = titles[page][0];
    document.getElementById("pageSubtitle").textContent = titles[page][1];
    document.getElementById("sidebar").classList.remove("open");
    if (page === "dashboard") this.renderDashboard();
    if (page === "orders") Orders.render();
    if (page === "products") Products.render();
    if (page === "late") Orders.renderLate();
  },

  async loadAll() {
  this.loading("dashboardPending");
  this.loading("ordersTable");
  this.loading("productsTable");

  try {
    // Ambil produk
    const productsResult = await supabaseClient
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (productsResult.error) {
      throw new Error(
        "Gagal memuat Produk: " + productsResult.error.message
      );
    }

    // Ambil pesanan TANPA relasi products
    const ordersResult = await supabaseClient
      .from("orders")
      .select("*")
      .order("deadline", { ascending: true });

    if (ordersResult.error) {
      throw new Error(
        "Gagal memuat Pesanan: " + ordersResult.error.message
      );
    }

    const products = productsResult.data || [];
    const orders = ordersResult.data || [];

    // Hubungkan produk dengan pesanan berdasarkan product_id
    const productMap = new Map(
      products.map(product => [product.id, product])
    );

    orders.forEach(order => {
      order.products = productMap.get(order.product_id) || null;
    });

    this.state.products = products;
    this.state.orders = orders;

    Orders.populateProducts();

    this.renderDashboard();
    Products.render();
    Orders.render();
    Orders.renderLate();

  } catch (err) {

    console.error("Jersey PO Error:", err);

    this.state.orders = [];

    this.renderDashboard();
    Products.render();
    Orders.render();
    Orders.renderLate();

    document.getElementById("dashboardPending").innerHTML = `
      <div class="empty">
        <strong>Gagal memuat pesanan.</strong>
        <br>
        ${this.escape(err.message || "Periksa koneksi Supabase.")}
      </div>
    `;

    App.toast(
      err.message || "Gagal memuat data.",
      true
    );
  }
},

  renderDashboard() {
    const orders = this.state.orders, products = this.state.products;
    const late = orders.filter(Orders.isLate);
    document.getElementById("statTotal").textContent = orders.length;
    document.getElementById("statPending").textContent = orders.filter(o => o.status === "Pending").length;
    document.getElementById("statProcess").textContent = orders.filter(o => o.status === "Diproses").length;
    document.getElementById("statDone").textContent = orders.filter(o => o.status === "Selesai").length;
    document.getElementById("statLate").textContent = late.length;
    document.getElementById("statProducts").textContent = products.length;

    const pending = orders.filter(o => o.status !== "Selesai" && o.status !== "Dibatalkan").slice(0, 8);
    document.getElementById("dashboardPending").innerHTML = Orders.compactTable(pending, "pending");
    document.getElementById("dashboardLate").innerHTML = Orders.compactTable(late.slice(0, 8), "late");
  },

  loading(id) { const el = document.getElementById(id); if (el) el.innerHTML = '<div class="loading">Memuat data...</div>'; },

  toast(message, error = false) {
    const el = document.getElementById("toast");
    el.textContent = message;
    el.className = `toast show${error ? " error" : ""}`;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove("show"), 3000);
  },

  safeUrl(value) {
    if (!value) return null;
    try {
      const u = new URL(value);
      if (u.protocol === "http:" || u.protocol === "https:") return u.href;
    } catch {}
    return null;
  },

  escape(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c]));
  }
};

document.addEventListener("DOMContentLoaded", () => App.init());
