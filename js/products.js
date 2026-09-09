const Products = {
  openModal(product = null) {
    const modal = document.getElementById("productModal");
    document.getElementById("productModalTitle").textContent = product ? "Edit Produk" : "Tambah Produk";
    document.getElementById("productId").value = product?.id || "";
    document.getElementById("productName").value = product?.name || "";
    document.getElementById("productDesignUrl").value = product?.design_url || "";
    document.getElementById("productDescription").value = product?.description || "";
    document.getElementById("productImage").value = "";
    this.setPreview(product?.image_url || null);
    modal.classList.remove("hidden");
  },

  setPreview(url) {
    const img = document.getElementById("productPreview");
    const box = document.querySelector(".image-preview");
    img.src = url || "";
    box.classList.toggle("has-image", !!url);
  },

  async save(e) {
    e.preventDefault();
    const btn = document.getElementById("saveProductBtn");
    btn.disabled = true; btn.textContent = "Menyimpan...";
    const id = document.getElementById("productId").value || crypto.randomUUID();
    const name = document.getElementById("productName").value.trim();
    const design_url = document.getElementById("productDesignUrl").value.trim();
    const description = document.getElementById("productDescription").value.trim();
    if (design_url && !App.safeUrl(design_url)) { App.toast("Link desain tidak valid.", true); btn.disabled=false; btn.textContent="Simpan"; return; }

    const old = App.state.products.find(p => p.id === id);
    const file = document.getElementById("productImage").files[0];
    let image_url = old?.image_url || null, image_path = old?.image_path || null, uploadedPath = null;

    try {
      if (file) {
        if (!file.type.startsWith("image/")) throw new Error("File harus berupa gambar.");
        if (file.size > 5 * 1024 * 1024) throw new Error("Ukuran foto maksimal 5 MB.");
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
        uploadedPath = `${id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabaseClient.storage.from("product-images").upload(uploadedPath, file, { upsert: false, contentType: file.type });
        if (uploadError) throw uploadError;
        image_path = uploadedPath;
        image_url = supabaseClient.storage.from("product-images").getPublicUrl(uploadedPath).data.publicUrl;
      }

      const payload = { id, name, design_url: design_url || null, description: description || null, image_url, image_path };
      const { error } = await supabaseClient.from("products").upsert(payload, { onConflict: "id" });
      if (error) {
        if (uploadedPath) await supabaseClient.storage.from("product-images").remove([uploadedPath]);
        throw error;
      }

      if (file && old?.image_path && old.image_path !== image_path) {
        await supabaseClient.storage.from("product-images").remove([old.image_path]);
      }

      this.close();
      App.toast(old ? "Produk berhasil diperbarui" : "Produk berhasil ditambahkan");
      await App.loadAll();
    } catch (err) {
      App.toast(err.message || "Gagal menyimpan produk", true);
    } finally {
      btn.disabled = false; btn.textContent = "Simpan";
    }
  },

  async remove(id) {
    const product = App.state.products.find(p => p.id === id);
    if (!product) return;
    const used = App.state.orders.some(o => o.product_id === id);
    const message = used
      ? "Produk ini sudah digunakan pada pesanan. Hapus produk akan gagal jika masih direferensikan. Lanjutkan?"
      : "Hapus produk ini?";
    if (!confirm(message)) return;
    const { error } = await supabaseClient.from("products").delete().eq("id", id);
    if (error) { App.toast("Gagal menghapus produk: " + error.message, true); return; }
    if (product.image_path) await supabaseClient.storage.from("product-images").remove([product.image_path]);
    App.toast("Produk berhasil dihapus");
    await App.loadAll();
  },

  render() {
    const q = (document.getElementById("productSearch")?.value || "").toLowerCase().trim();
    const products = App.state.products.filter(p => `${p.name} ${p.description || ""}`.toLowerCase().includes(q));
    const el = document.getElementById("productsTable");
    if (!products.length) { el.innerHTML = '<div class="empty">Belum ada produk.</div>'; return; }
    el.innerHTML = `<table class="table"><thead><tr><th>Foto</th><th>Nama Produk</th><th>Link Desain</th><th>Keterangan</th><th>Dibuat</th><th>Aksi</th></tr></thead><tbody>
      ${products.map(p => `<tr>
        <td>${p.image_url ? `<img class="product-thumb" src="${App.escape(p.image_url)}" alt="">` : "—"}</td>
        <td><strong>${App.escape(p.name)}</strong></td>
        <td>${p.design_url && App.safeUrl(p.design_url) ? `<a class="btn btn-light btn-sm" href="${App.escape(App.safeUrl(p.design_url))}" target="_blank" rel="noopener noreferrer">Buka Desain</a>` : "—"}</td>
        <td>${App.escape(p.description || "—")}</td>
        <td>${this.date(p.created_at)}</td>
        <td><div class="actions"><button class="btn btn-light btn-sm" data-edit-product="${p.id}">Edit</button><button class="btn btn-light btn-sm" data-delete-product="${p.id}">Hapus</button></div></td>
      </tr>`).join("")}
    </tbody></table>`;
  },

  date(v) { return v ? new Date(v).toLocaleDateString("id-ID", { day:"2-digit", month:"2-digit", year:"numeric" }) : "—"; },

  close() { document.getElementById("productModal").classList.add("hidden"); }
};

document.getElementById("productForm").addEventListener("submit", e => Products.save(e));
document.getElementById("productImage").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => Products.setPreview(reader.result);
  reader.readAsDataURL(file);
});
document.getElementById("productSearch").addEventListener("input", () => Products.render());
document.addEventListener("click", e => {
  const edit = e.target.closest("[data-edit-product]");
  const del = e.target.closest("[data-delete-product]");
  if (edit) Products.openModal(App.state.products.find(p => p.id === edit.dataset.editProduct));
  if (del) Products.remove(del.dataset.deleteProduct);
  const close = e.target.closest("[data-close]");
  if (close) document.getElementById(close.dataset.close).classList.add("hidden");
});
