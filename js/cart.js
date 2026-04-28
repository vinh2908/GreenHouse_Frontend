window.openCart = function () {
    if (!currentUser) return showToast("Vui lòng đăng nhập!", "error");
    document.getElementById('cartModal').style.display = 'flex';
    renderCart();
};
function renderCart() {
    const listArea = document.getElementById('cartList'); if (!listArea) return;
    listArea.innerHTML = ''; let totalThanhToan = 0;
    if (cart.length === 0) { listArea.innerHTML = '<p style="text-align:center; padding:20px; color:#999;">Giỏ hàng trống.</p>'; document.getElementById('cartTotal').innerText = '0 VNĐ'; return; }
    listArea.innerHTML = `<div style="display: flex; font-weight: bold; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 10px; align-items:center;"><div style="width: 30px;"><input type="checkbox" onclick="toggleSelectAll(this.checked)" checked></div><div style="width: 60px;">Ảnh</div><div style="flex: 1;">Sản phẩm</div><div style="width: 100px; text-align:center;">Số lượng</div><div style="width: 100px; text-align:right;">Giá</div><div style="width: 40px;"></div></div>`;
    cart.forEach((item, index) => {
        if (item.selected === undefined) item.selected = true;
        const thanhTien = item.gia * (item.sl || 1); if (item.selected) totalThanhToan += thanhTien;
        listArea.innerHTML += `<div style="display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #f5f5f5;"><div style="width: 30px;"><input type="checkbox" ${item.selected ? 'checked' : ''} onclick="toggleCartItem(${index})" style="width:16px;height:16px;"></div><div style="width: 60px;"><img loading="lazy" src="${item.anh}" style="width:45px; height:45px; object-fit:cover; border-radius:5px;"></div><div style="flex: 1; font-weight:bold; font-size:14px; color:#333;">${item.ten}<br><small style="color:#e91e63">${item.gia.toLocaleString()} đ</small></div><div style="width: 100px; display: flex; align-items: center; justify-content:center; background:#f5f5f5; border-radius:20px; padding:2px;"><button type="button" onclick="updateCartQty(${index}, -1)" style="border:none; background:none; cursor:pointer; font-weight:bold; padding:2px 10px;">-</button><span style="min-width:25px; text-align:center; font-weight:bold;">${item.sl || 1}</span><button type="button" onclick="updateCartQty(${index}, 1)" style="border:none; background:none; cursor:pointer; font-weight:bold; padding:2px 10px;">+</button></div><div style="width: 100px; text-align: right; color:#e91e63; font-weight:bold;">${thanhTien.toLocaleString()} đ</div><div style="width: 40px; text-align:center;"><button type="button" onclick="removeFromCart(${index})" style="color:#ff4d4d; border:none; background:none; cursor:pointer; font-size:18px;"><i class="fas fa-trash"></i></button></div></div>`;
    });
    const finalTotal = totalThanhToan - currentDiscount;
    if(document.getElementById('cartTotal')) document.getElementById('cartTotal').innerText = (finalTotal > 0 ? finalTotal : 0).toLocaleString() + " VNĐ";
}
window.renderCart = renderCart;
window.updateCartQty = function (index, change) {
    if (cart[index].sl + change > 0) { cart[index].sl += change; localStorage.setItem('cart', JSON.stringify(cart)); renderCart(); updateHeaderAuth(); }
}
window.toggleCartItem = function (index) { cart[index].selected = !cart[index].selected; localStorage.setItem('cart', JSON.stringify(cart)); renderCart(); }
window.toggleSelectAll = function (checked) { cart.forEach(item => item.selected = checked); localStorage.setItem('cart', JSON.stringify(cart)); renderCart(); }
window.removeFromCart = function (index) { cart.splice(index, 1); localStorage.setItem('cart', JSON.stringify(cart)); renderCart(); updateHeaderAuth(); }
window.applyVoucher = function () {
    const code = document.getElementById('voucherCode').value.trim();
    if (!code) return showToast("Nhập mã!", "error");
    if (code === "CLEAR10") { currentDiscount = 10000; showToast("Thành công!"); renderCart(); } else { showToast("Mã không hợp lệ!", "error"); }
}
window.updateCheckoutQty = function (id, change) {
    var item = cart.find(x => x.id === id);
    if (item && item.sl + change > 0) { item.sl += change; localStorage.setItem('cart', JSON.stringify(cart)); renderCheckoutItems(); updateHeaderAuth(); }
}
window.renderCheckoutItems = function () {
    var selectedItems = cart.filter(x => x.selected); var container = document.getElementById('checkoutItemsContainer'); if (!container) return;
    var subTotal = 0; var html = '';
    selectedItems.forEach(item => {
        var itemTotal = item.gia * (item.sl || 1); subTotal += itemTotal;
        html += `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding-bottom:8px; border-bottom:1px dashed #ddd;"><div style="display:flex; align-items:center; gap:10px;"><img loading="lazy" src="${item.anh}" style="width:40px; height:40px; border-radius:5px; object-fit:cover;"><div><div style="font-weight:bold; font-size:14px;">${item.ten}</div><div style="color:#e91e63; font-size:13px;">${item.gia.toLocaleString()} đ</div></div></div><div style="display:flex; align-items:center; background:#fff; border:1px solid #ddd; border-radius:20px; padding:2px 5px;"><button type="button" onclick="updateCheckoutQty('${item.id}', -1)" style="border:none; background:none; cursor:pointer; font-weight:bold; padding:2px 8px;">-</button><span style="font-weight:bold; min-width:20px; text-align:center;">${item.sl || 1}</span><button type="button" onclick="updateCheckoutQty('${item.id}', 1)" style="border:none; background:none; cursor:pointer; font-weight:bold; padding:2px 8px;">+</button></div></div>`;
    });
    container.innerHTML = html;
    var finalTotal = subTotal - currentDiscount; if (finalTotal < 0) finalTotal = 0;
    var ckTotalText = document.getElementById('ckTotalText'); if (ckTotalText) { ckTotalText.innerText = finalTotal.toLocaleString() + " VNĐ"; ckTotalText.dataset.val = finalTotal; }
}
window.moFormThanhToan = function () {
    var selectedItems = cart.filter(x => x.selected); if (selectedItems.length === 0) return showToast("Chọn ít nhất 1 SP!", "error");
    closeModal('cartModal'); renderCheckoutItems();
    if (currentUser) {
        var ckName = document.getElementById('ckName'); var ckPhone = document.getElementById('ckPhone');
        if (ckName) ckName.value = currentUser.name || ''; if (ckPhone) ckPhone.value = currentUser.phone || '';
    }
    setTimeout(function () {
        var ckModal = document.getElementById('checkoutModal');
        if (ckModal) { ckModal.style.display = 'flex'; var method = document.getElementById('ckMethod'); if (method) method.value = "COD"; var billInput = document.getElementById('billUpload'); if (billInput) billInput.value = ''; var billPreview = document.getElementById('billPreview'); if (billPreview) billPreview.style.display = 'none'; toggleQR(); }
    }, 150);
}
window.toggleQR = function () {
    var method = document.getElementById('ckMethod'); var qrBox = document.getElementById('qrBox'); var btnXacNhan = document.getElementById('btnXacNhan');
    if (method && qrBox && btnXacNhan) {
        if (method.value === "BANK") {
            qrBox.style.display = 'block'; var qrMaDon = document.getElementById('qrMaDon'); if (qrMaDon) qrMaDon.innerText = Math.floor(Math.random() * 99999);
            var qrImg = qrBox.querySelector('img'); if (qrImg) qrImg.src = MY_BANK_QR;
            var billInput = document.getElementById('billUpload'); if (!billInput || !billInput.files || billInput.files.length === 0) { btnXacNhan.style.backgroundColor = '#cccccc'; btnXacNhan.style.pointerEvents = 'none'; btnXacNhan.disabled = true; }
        } else { qrBox.style.display = 'none'; btnXacNhan.style.backgroundColor = '#4CAF50'; btnXacNhan.style.pointerEvents = 'auto'; btnXacNhan.disabled = false; }
    }
}
window.kiemTraBill = function () {
    var billInput = document.getElementById('billUpload'); var btnXacNhan = document.getElementById('btnXacNhan'); var billPreview = document.getElementById('billPreview');
    if (billInput && billInput.files && billInput.files.length > 0) { billPreview.style.display = 'block'; btnXacNhan.style.backgroundColor = '#4CAF50'; btnXacNhan.style.pointerEvents = 'auto'; btnXacNhan.disabled = false; } 
    else { billPreview.style.display = 'none'; btnXacNhan.style.backgroundColor = '#cccccc'; btnXacNhan.style.pointerEvents = 'none'; btnXacNhan.disabled = true; }
}
window.xacNhanDonHang = async function () {
    if (!db) return showToast('Lỗi kết nối Firebase!', 'error');
    var name = document.getElementById('ckName').value.trim(); var phone = document.getElementById('ckPhone').value.trim(); var addr = document.getElementById('ckAddress').value.trim(); var method = document.getElementById('ckMethod').value;
    if (!name || !phone || !addr) return showToast("Vui lòng điền đủ thông tin nhận hàng!", "error");
    var selectedItems = cart.filter(x => x.selected); if (selectedItems.length === 0) return showToast("Không có sản phẩm nào được chọn!", "warning");
    let btnXacNhan = document.getElementById('btnXacNhan'); if (btnXacNhan) { btnXacNhan.disabled = true; btnXacNhan.innerText = "ĐANG XỬ LÝ..."; }
    try {
        let realTotal = 0; let realItemsDisplay = [];
        for (let item of selectedItems) {
            let productDoc = await db.collection("products").doc(item.id).get();
            if (productDoc.exists) { let realPrice = productDoc.data().gia; realTotal += realPrice * item.sl; realItemsDisplay.push(`${item.ten} (x${item.sl})`); }
        }
        realTotal = realTotal - currentDiscount; if (realTotal < 0) realTotal = 0;
        var newOrder = { id: 'DH' + Math.floor(Math.random() * 100000), user: currentUser ? currentUser.phone : phone, customerInfo: { name: name, phone: phone, address: addr }, items: realItemsDisplay.join(', '), total: realTotal, status: 'pending', date: new Date().toLocaleString() + ' ' + (method === 'BANK' ? '(QR Ngân hàng)' : '(COD)'), method: method, isPaid: method === 'BANK' ? true : false };
        const response = await fetch(`${API_URL}/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newOrder) });
        if (!response.ok) throw new Error("Máy chủ Backend từ chối đơn hàng");
        cart = cart.filter(x => !x.selected); localStorage.setItem('cart', JSON.stringify(cart)); currentDiscount = 0; renderCart(); updateHeaderAuth(); closeModal('checkoutModal'); showToast("Đặt hàng thành công!", "success");
    } catch (error) { showToast("Lỗi kết nối máy chủ!", "error"); } 
    finally { if (btnXacNhan) { btnXacNhan.disabled = false; btnXacNhan.innerText = "HOÀN TẤT ĐƠN HÀNG"; } }
}