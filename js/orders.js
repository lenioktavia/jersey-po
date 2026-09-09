const Orders = {
  init() {
    document.getElementById("orderForm").addEventListener("submit", e => this.save(e));
    document.getElementById("orderProduct").addEventListener("change", () => this.showSelectedProduct());
    document.getElementById("orderSearch").addEventListener("input", () => this.render());
    document.getElementById("orderFilters").addEventListener("click", e => {
      const btn = e.target.closest("[data-filter]"); if (!btn) return;
      App.state.filter = btn.dataset.filter;
      document.querySelectorAll("#orderFilters .filter").forEach(b => b.classList.toggle("active", b === btn));
      this.render();
    });
  },

  isLate(o) {
    if (!o.deadline || o.status === "Selesai") return false;
    const today = this.startOfDay(new Date());
    const deadline = this.startOfDay(new Date(`${o.deadline}T00:00:00`));
    return deadline < today;
  },

  lateDays(o) {
    if (!this.isLate(o)) return 0;
    const today = this.startOfDay(new Date()), d = this.startOfDay(new Date(`${o.deadline}T00:00:00`));
    return Math.floor((today - d) / 86400000);
  },

  startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); },

  openModal(order = null) {
    if (!App.state.products.length) { App.toast("Tambahkan produk terlebih dahulu.", true); App.navigate("products"); return; }
    document.getElementById("orderModalTitle").textContent = order ? "Edit Pesanan" : "Tambah Pesanan";
    document.getElementById("orderId").value = order?.id || "";
    document.getElementById("orderDate").value = order?.order_date || new Date().toISOString().slice(0,10);
    document.getElementById("orderDeadline").value = order?.deadline || "";
    document.getElementById("customerName").value = order?.customer_name || "";
    document.getElementById("customerWhatsapp").value = order?.whatsapp || "";
    document.getElementById("orderProduct").value = order?.product_id || "";
    document.getElementById("orderQuantity").value = order?.quantity || 1;
    document.getElementById("orderStatus").value = order?.status || "Pending";
    document.getElementById("orderDesignUrl").value = order?.design_url || "";
    document.getElementById("orderReceiptUrl").value = order?.receipt_url || "";
    document.getElementById("orderNotes").value = order?.notes || "";
    this.showSelectedProduct();
    document.getElementById("orderModal").classList.remove("hidden");
  },

  populateProducts() {
    const select = document.getElementById("orderProduct");
    const current = select.value;
    select.innerHTML = '<option value="">Pilih Produk</option>' + App.state.products.map(p => `<option value="${p.id}">${App.escape(p.name)}</option>`).join("");
    if (current && App.state.products.some(p => p.id === current)) select.value = current;
  },

  showSelectedProduct() {
    const id = document.getElementById("orderProduct").value;
    const p = App.state.products.find(x => x.id === id);
    const box = document.getElementById("selectedProductBox");
    const btn = document.getElementById("selectedProductOpen");
    if (!p) { box.classList.add("hidden"); return; }
    box.classList.remove("hidden");
    document.getElementById("selectedProductName").textContent = p.name;
    document.getElementById("selectedProductImage").src = p.image_url || "";
    const valid = App.safeUrl(p.design_url);
    document.getElementById("selectedProductDesign").textContent = valid ? "Desain Google Drive tersedia." : "Belum ada link desain produk.";
    btn.classList.toggle("hidden", !valid);
    btn.onclick = () => window.open(valid, "_blank", "noopener,noreferrer");
    const designInput = document.getElementById("orderDesignUrl");
    if (!designInput.value && valid) designInput.value = valid;
  },

  async save(e) {
    e.preventDefault();
    const btn = document.getElementById("saveOrderBtn"); btn.disabled=true; btn.textContent="Menyimpan...";
    const id = document.getElementById("orderId").value;
    const design_url = document.getElementById("orderDesignUrl").value.trim();
    const receipt_url = document.getElementById("orderReceiptUrl").value.trim();
    try {
      if (design_url && !App.safeUrl(design_url)) throw new Error("Link desain tidak valid.");
      if (receipt_url && !App.safeUrl(receipt_url)) throw new Error("Link resi tidak valid.");
      const payload = {
        ...(id ? { id } : {}),
        order_date: document.getElementById("orderDate").value,
        customer_name: document.getElementById("customerName").value.trim(),
        whatsapp: document.getElementById("customerWhatsapp").value.trim() || null,
        product_id: document.getElementById("orderProduct").value,
        quantity: Number(document.getElementById("orderQuantity").value),
        deadline: document.getElementById("orderDeadline").value,
        design_url: design_url || null,
        receipt_url: receipt_url || null,
        status: document.getElementById("orderStatus").value,
        notes: document.getElementById("orderNotes").value.trim() || null
      };
      const { error } = await supabaseClient.from("orders").upsert(payload, { onConflict:"id" });
      if (error) throw error;
      document.getElementById("orderModal").classList.add("hidden");
      App.toast(id ? "Pesanan berhasil diperbarui" : "Pesanan berhasil ditambahkan");
      await App.loadAll();
    } catch (err) { App.toast(err.message || "Gagal menyimpan pesanan", true); }
    finally { btn.disabled=false; btn.textContent="Simpan"; }
  },

  async remove(id) {
    if (!confirm("Hapus pesanan ini?")) return;
    const { error } = await supabaseClient.from("orders").delete().eq("id", id);
    if (error) { App.toast("Gagal menghapus pesanan: " + error.message, true); return; }
    App.toast("Pesanan berhasil dihapus"); await App.loadAll();
  },

  render() {
    const q = (document.getElementById("orderSearch")?.value || "").toLowerCase().trim();
    let rows = [...App.state.orders];
    const filter = App.state.filter;localeCompare
    if (filter === "late") rows = rows.filter(o => this.isLate(o));
    else if (filter !== "all") rows = rows.filter(o => o.status === filter);
    rows = rows.filter(o => `${o.order_number} ${o.customer_name} ${o.products?.name || ""}`.toLowerCase().includes(q));
    rows.sort((a,b) => String(a.deadline).localeCompare(String(b.deadline)));
    const el = document.getElementById("ordersTable");
    if (!rows.length) { el.innerHTML = '<div class="empty">Tidak ada pesanan yang cocok.</div>'; return; }
    el.innerHTML = `<table class="table"><thead><tr><th>Order</th><th>Customer</th><th>Produk</th><th>Qty</th><th>Deadline</th><th>Status</th><th>Desain</th><th>Resi</th><th>Aksi</th></tr></thead><tbody>${rows.map(o => this.row(o)).join("")}</tbody></table>`;
  },

  row(o) {
    const late = this.isLate(o), p = o.products;
    return `<tr class="${late ? "late-row" : ""}">
      <td><strong>${App.escape(o.order_number)}</strong><div class="muted">${this.date(o.order_date)}</div></td>
      <td>${App.escape(o.customer_name)}${o.whatsapp ? `<div class="muted">${App.escape(o.whatsapp)}</div>` : ""}</td>
      <td>${App.escape(p?.name || "Produk dihapus")}</td>
      <td>${o.quantity}</td>
      <td>${this.date(o.deadline)}${late ? `<div class="late-days">${this.lateDays(o)} hari</div>` : ""}</td>
      <td><span class="status ${late ? "late" : this.statusClass(o.status)}">${late ? "TERLAMBAT" : App.escape(o.status)}</span></td>
      <td>${this.linkButton(o.design_url, "Buka")}</td>
      <td>${this.linkButton(o.receipt_url, "Buka")}</td>
      <td><div class="actions"><button class="btn btn-light btn-sm" data-edit-order="${o.id}">Edit</button><button class="btn btn-light btn-sm" data-delete-order="${o.id}">Hapus</button></div></td>
    </tr>`;
  },

  compactTable(rows, type) {
    if (!rows.length) return '<div class="empty">Tidak ada data.</div>';
    return `<table class="table"><thead><tr><th>Order</th><th>Customer</th><th>Produk</th><th>Deadline</th><th>Status</th>${type==="late"?"<th>Terlambat</th>":""}</tr></thead><tbody>${rows.map(o => `<tr class="${this.isLate(o)?"late-row":""}"><td><strong>${App.escape(o.order_number)}</strong></td><td>${App.escape(o.customer_name)}</td><td>${App.escape(o.products?.name || "—")}</td><td>${this.date(o.deadline)}</td><td><span class="status ${this.isLate(o)?"late":this.statusClass(o.status)}">${this.isLate(o)?"TERLAMBAT":App.escape(o.status)}</span></td>${type==="late"?`<td class="late-days">${this.lateDays(o)} hari</td>`:""}</tr>`).join("")}</tbody></table>`;
  },

  renderLate() {
    const rows = App.state.orders
  .filter(o => this.isLate(o))
  .sort((a,b) => String(a.deadline).localeCompare(String(b.deadline)));
    const el = document.getElementById("lateTable");
    if (!rows.length) { el.innerHTML = '<div class="empty">Tidak ada pesanan terlambat.</div>'; return; }
    el.innerHTML = `<table class="table"><thead><tr><th>Order</th><th>Customer</th><th>Produk</th><th>Deadline</th><th>Status</th><th>Terlambat</th><th>Aksi</th></tr></thead><tbody>${rows.map(o => `<tr class="late-row"><td><strong>${App.escape(o.order_number)}</strong></td><td>${App.escape(o.customer_name)}</td><td>${App.escape(o.products?.name || "—")}</td><td>${this.date(o.deadline)}</td><td><span class="status late">TERLAMBAT</span></td><td class="late-days">${this.lateDays(o)} hari</td><td><button class="btn btn-light btn-sm" data-edit-order="${o.id}">Edit</button></td></tr>`).join("")}</tbody></table>`;
  },

  linkButton(url, label) {
    const valid = App.safeUrl(url);
    return valid ? `<a class="btn btn-light btn-sm" href="${App.escape(valid)}" target="_blank" rel="noopener noreferrer">${label}</a>` : "—";
  },

  statusClass(s) { return ({Pending:"pending",Diproses:"process",Selesai:"done",Dibatalkan:"cancel"})[s] || "cancel"; },
  date(v) { return v ? new Date(`${v}T00:00:00`).toLocaleDateString("id-ID",{day:"2-digit",month:"2-digit",year:"numeric"}) : "—"; }
};

document.addEventListener("click", e => {
  const edit = e.target.closest("[data-edit-order]"), del = e.target.closest("[data-delete-order]");
  if (edit) Orders.openModal(App.state.orders.find(o => o.id === edit.dataset.editOrder));
  if (del) Orders.remove(del.dataset.deleteOrder);
});
Orders.init();
