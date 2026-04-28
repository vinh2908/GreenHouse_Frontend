window.renderAllProducts = async function () {
    const grid = document.getElementById('shop-product-grid'); if (!grid) return;
    try {
        const response = await fetch(`${API_URL}/products`); const products = await response.json(); grid.innerHTML = '';
        products.forEach(sp => {
            grid.innerHTML += `<div class="card shop-card" onclick="showProductDetail('${sp.id}')"><img loading="lazy" src="${sp.anh}" class="card-img"><div class="card-content"><h4 style="margin:0 0 10px; font-size:18px; color:#333;">${sp.ten}</h4><div style="font-weight:bold; color:#e91e63; margin-bottom:15px; font-size:18px;">${parseInt(sp.gia).toLocaleString()} đ</div><div style="display:flex; gap:10px;"><button type="button" class="btn-primary" style="flex:1; padding:12px 0;" onclick="event.stopPropagation(); buyNow('${sp.ten}', ${sp.gia}, '${sp.anh}', '${sp.id}')">MUA NGAY</button><button type="button" style="width:50px; border-radius:8px; border:2px solid #4CAF50; background:white; color:#4CAF50; cursor:pointer;" onclick="event.stopPropagation(); addToCartFull('${sp.ten}', ${sp.gia}, '${sp.anh}', '${sp.id}')"><i class="fas fa-cart-plus"></i></button></div></div></div>`;
        });
    } catch (error) { console.error("Lỗi API Sản phẩm:", error); grid.innerHTML = '<p style="text-align:center; width: 100%; color: red;">Lỗi kết nối đến máy chủ!</p>'; }
}
window.showProductDetail = async function (id) {
    if (!db) return;
    const doc = await db.collection("products").doc(id).get(); if (!doc.exists) return;
    let p = doc.data(); let albumHtml = '';
    if (p.album && p.album.length > 0) { p.album.forEach(link => { albumHtml += `<img loading="lazy" src="${link}" class="pd-thumb" onclick="changeMainImg(this, '${link}')">`; }); }
    let modalHTML = `
        <div id="productDetailModal" class="modal" style="display:flex; z-index:10005; align-items:center;">
            <div class="modal-content modal-lg" style="width: 850px; max-width: 95%; display: flex; gap: 30px; flex-wrap: wrap;">
                <span class="close-modal" onclick="closeDiag('productDetailModal')">×</span>
                <div class="pd-images" style="flex: 1; min-width: 300px;">
                    <img loading="lazy" src="${p.anh}" class="pd-main-img" id="main-pd-img" style="width:100%; height:350px; object-fit:cover; border-radius:10px;">
                    <div class="pd-gallery" style="display:flex; gap:10px; overflow-x:auto; margin-top:10px;"><img loading="lazy" src="${p.anh}" class="pd-thumb active" onclick="changeMainImg(this, '${p.anh}')">${albumHtml}</div>
                </div>
                <div class="pd-info" style="flex: 1; min-width: 300px;">
                    <h2 style="color: #2e7d32; font-size: 26px; margin: 0 0 15px 0;">${p.ten}</h2><h3 style="color: #e91e63; font-size: 24px; margin: 0 0 20px 0;">${parseInt(p.gia).toLocaleString()} VNĐ</h3>
                    <div class="pd-desc" style="background:#f9f9f9; padding:15px; border-radius:10px; max-height:200px; overflow-y:auto; color:#555;">${p.mota ? p.mota.replace(/\n/g, '<br>') : ''}</div>
                    <div style="display:flex; gap:15px; margin-top:25px;"><button class="btn-primary" style="flex:1; padding:15px;" onclick="closeDiag('productDetailModal'); buyNow('${p.ten}', ${p.gia}, '${p.anh}', '${p.id}')">MUA NGAY</button><button style="padding:15px; border-radius:10px; border:2px solid #4CAF50; background:white; color:#4CAF50; font-weight:bold; cursor:pointer;" onclick="addToCartFull('${p.ten}', ${p.gia}, '${p.anh}', '${p.id}')"><i class="fas fa-cart-plus"></i> THÊM VÀO GIỎ</button></div>
                </div>
            </div>
        </div>`;
    let oldModal = document.getElementById('productDetailModal'); if (oldModal) oldModal.remove(); document.body.insertAdjacentHTML('beforeend', modalHTML);
};
window.changeMainImg = function (element, src) {
    document.getElementById('main-pd-img').src = src; let thumbs = element.parentElement.querySelectorAll('.pd-thumb');
    thumbs.forEach(t => { t.style.border = '2px solid transparent'; t.style.opacity = '0.6'; });
    element.style.border = '2px solid #4CAF50'; element.style.opacity = '1';
};
window.buyNow = function (ten, gia, anh, id) {
    if (!currentUser) return showToast("Vui lòng đăng nhập!", "error");
    let existingItem = cart.find(item => item.id === id);
    if (existingItem) { existingItem.sl += 1; existingItem.selected = true; } else { cart.push({ id: id || Date.now(), ten, gia, anh, sl: 1, selected: true }); }
    localStorage.setItem('cart', JSON.stringify(cart)); updateHeaderAuth(); moFormThanhToan();
};
window.addToCartFull = function (ten, gia, anh, id) {
    if (!currentUser) return showToast("Vui lòng đăng nhập!", "error");
    let existingItem = cart.find(item => item.id === id);
    if (existingItem) existingItem.sl += 1; else cart.push({ id: id || Date.now(), ten, gia, anh, sl: 1, selected: true });
    localStorage.setItem('cart', JSON.stringify(cart)); updateHeaderAuth(); showToast("Đã thêm vào giỏ hàng!", "success");
}