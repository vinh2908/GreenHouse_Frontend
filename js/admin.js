function loadAdminData() { renderOrders(); renderProductsAdmin(); renderMaidsAdmin(); loadChatUsers(); }
function escapeAdminHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (char) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
}
function ensureAdminOperation() {
    if (!currentUser || currentUser.role !== 'Admin') {
        showToast("Admin session required.", "error");
        return false;
    }
    if (!localStorage.getItem('token')) {
        showToast("Missing admin token. Please log in again.", "error");
        return false;
    }
    return true;
}
window.switchTab = function (t) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    if (t === 'orders') { document.querySelectorAll('.tab-btn')[0].classList.add('active'); document.getElementById('tab-orders').classList.add('active'); } 
    else if (t === 'products') { document.querySelectorAll('.tab-btn')[1].classList.add('active'); document.getElementById('tab-products').classList.add('active'); } 
    else { document.querySelectorAll('.tab-btn')[2].classList.add('active'); document.getElementById('tab-maids').classList.add('active'); }
}
window.renderOrders = function () {
    const tb = document.querySelector('#orderTable tbody'); if (!tb || !db) return;
    db.collection("orders").orderBy("timestamp", "desc").onSnapshot((snapshot) => {
        tb.innerHTML = ''; let ordersArray = [];
        snapshot.forEach((doc) => {
            let o = doc.data(); ordersArray.push(o);
            let info = o.customerInfo || {}; let addr = info.address ? `<br><small>📍 ${info.address}</small>` : ''; let actionBtn = ''; let statusBadge = '';
            const hasPaymentProof = o.paymentProofStatus === 'ocr_verified_pending_admin' || !!o.paymentProof;
            const waitingPaymentReview = o.status === 'awaiting_payment_review' && hasPaymentProof;
            if (waitingPaymentReview) {
                statusBadge = '<span style="color:#f39c12;font-weight:bold">🧾 Chờ duyệt bill</span>';
                actionBtn = `<button class="btn-action" style="background:#3498db; margin-bottom:5px;" onclick="viewPaymentProof('${o.id}')">👁 Xem Bill</button><button class="btn-action" style="background:#2ecc71; margin-bottom:5px;" onclick="approvePaidOrder('${o.id}')">✅ Xác nhận TT</button><button class="btn-action" style="background:#e74c3c" onclick="rejectPaymentProof('${o.id}')">❌ Từ chối</button>`;
            } else if (o.status === 'pending') {
                if (o.maidId) { statusBadge = '<span style="color:#f39c12;font-weight:bold">⏳ Chờ duyệt</span>'; actionBtn = `<button class="btn-action" style="background:#2ecc71" onclick="approveBookingToPayment('${o.id}')">✅ Duyệt Lịch</button>`; } 
                else { statusBadge = '<span style="color:#f39c12">⏳ Chờ giao</span>'; actionBtn = `<button class="btn-action" style="background:#3498db" onclick="doneOrder('${o.id}')">🚚 Giao Hàng</button>`; }
            } else if (o.status === 'awaiting_payment') { statusBadge = '<span style="color:#e74c3c;font-weight:bold">⏳ Khách chưa TT</span>'; actionBtn = `<i class="fas fa-clock" style="color:#e74c3c"></i>`; } 
            else if (o.status === 'confirmed' || o.status === 'done') { statusBadge = '<span style="color:#2ecc71;font-weight:bold">✅ Hoàn tất</span>'; actionBtn = '<i class="fas fa-check" style="color:#2ecc71"></i>'; }
            let paymentBadge = (o.isPaid === true) ? `<br><span style="display:inline-block; margin-top:5px; background:#e8f5e9; color:#2e7d32; padding:4px 10px; border-radius:12px; font-size:12px; border:1px solid #4CAF50;"><i class="fas fa-money-bill-wave"></i> Đã Thanh Toán</span>` : (waitingPaymentReview ? `<br><span style="display:inline-block; margin-top:5px; background:#fff7ed; color:#c2410c; padding:4px 10px; border-radius:12px; font-size:12px; border:1px solid #fdba74;"><i class="fas fa-receipt"></i> Đã upload bill</span>` : `<br><span style="display:inline-block; margin-top:5px; background:#fdf2f2; color:#e74c3c; padding:4px 10px; border-radius:12px; font-size:12px; border:1px solid #f5b7b1;">Chưa Thanh Toán</span>`);
            tb.innerHTML += `<tr><td>#${o.id}<br><small>${o.date}</small></td><td><strong>${info.name || o.user}</strong><br><small>${info.phone || ''}</small>${addr}</td><td>${o.items}</td><td><b style="color:#e91e63">${parseInt(o.total || 0).toLocaleString()} đ</b>${paymentBadge}</td><td>${statusBadge}</td><td>${actionBtn}</td></tr>`;
        });
        if (typeof veBieuDoThongKe === 'function') veBieuDoThongKe(ordersArray);
    });
}
window.approveBookingToPayment = function (orderId) {
    if (!ensureAdminOperation()) return;
    if (!db) return;
    if (typeof Swal !== 'undefined') {
        Swal.fire({ title: 'Duyệt đơn dịch vụ?', text: "Đơn sẽ chuyển sang trạng thái CHỜ KHÁCH THANH TOÁN.", icon: 'question', showCancelButton: true, confirmButtonColor: '#4CAF50', cancelButtonColor: '#e74c3c', confirmButtonText: 'Đồng ý duyệt', cancelButtonText: 'Hủy' }).then(async (result) => {
            if (result.isConfirmed) { await db.collection("orders").doc(orderId).update({ status: 'awaiting_payment' }); showToast('Đã duyệt đơn thành công!', 'success'); }
        });
    }
}
window.doneOrder = async function (orderId) { if (!ensureAdminOperation()) return; if (!db) return; await db.collection("orders").doc(orderId).update({ status: 'done', isPaid: true }); showToast('Đã cập nhật!', 'success'); }
window.viewPaymentProof = async function (orderId) {
    if (!db) return;
    const doc = await db.collection("orders").doc(orderId).get();
    if (!doc.exists) return showToast('Không tìm thấy đơn hàng!', 'error');
    const order = doc.data() || {};
    const proof = order.paymentProof || {};
    const imageData = proof.imageData || '';
    const ocrExtract = proof.ocrExtract ? `<pre style="text-align:left; white-space:pre-wrap; max-height:160px; overflow:auto; background:#f8f9fa; padding:10px; border-radius:8px; font-size:12px;">${escapeAdminHtml(proof.ocrExtract)}</pre>` : '';
    if (!imageData) return showToast('Đơn này chưa có ảnh bill.', 'error');
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: `Bill đơn #${order.id}`,
            html: `<img src="${imageData}" style="max-width:100%; max-height:420px; object-fit:contain; border-radius:10px; border:1px solid #eee;">${ocrExtract}`,
            width: 700,
            confirmButtonText: 'Đóng'
        });
    } else {
        const win = window.open();
        if (win) win.document.write(`<img src="${imageData}" style="max-width:100%">`);
    }
}
window.approvePaidOrder = async function (orderId) {
    if (!ensureAdminOperation()) return;
    if (!db) return;
    const update = {
        status: 'done',
        isPaid: true,
        paymentProofStatus: 'admin_approved',
        paidAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (typeof Swal !== 'undefined') {
        Swal.fire({ title: 'Xác nhận thanh toán?', text: 'Đơn hàng sẽ được đánh dấu đã thanh toán và hoàn tất.', icon: 'question', showCancelButton: true, confirmButtonColor: '#4CAF50', cancelButtonColor: '#e74c3c', confirmButtonText: 'Xác nhận', cancelButtonText: 'Hủy' }).then(async (result) => {
            if (result.isConfirmed) { await db.collection("orders").doc(orderId).update(update); showToast('Đã xác nhận thanh toán!', 'success'); }
        });
    } else {
        await db.collection("orders").doc(orderId).update(update);
        showToast('Đã xác nhận thanh toán!', 'success');
    }
}
window.rejectPaymentProof = async function (orderId) {
    if (!ensureAdminOperation()) return;
    if (!db) return;
    const update = {
        status: 'awaiting_payment',
        isPaid: false,
        paymentProofStatus: 'admin_rejected',
        reviewedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (typeof Swal !== 'undefined') {
        Swal.fire({ title: 'Từ chối bill?', text: 'Khách sẽ thấy đơn cần thanh toán lại.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#e74c3c', cancelButtonColor: '#777', confirmButtonText: 'Từ chối', cancelButtonText: 'Hủy' }).then(async (result) => {
            if (result.isConfirmed) { await db.collection("orders").doc(orderId).update(update); showToast('Đã từ chối bill.', 'success'); }
        });
    } else {
        await db.collection("orders").doc(orderId).update(update);
        showToast('Đã từ chối bill.', 'success');
    }
}
window.renderProductsAdmin = async function () {
    const tb = document.querySelector('#productTable tbody'); if (!tb) return;
    tb.innerHTML = '<tr><td colspan="4" style="text-align:center;">Đang tải dữ liệu...</td></tr>';
    try {
        const response = await fetch(`${API_URL}/products`); const products = await response.json(); tb.innerHTML = '';
        products.forEach(p => { tb.innerHTML += `<tr><td><img loading="lazy" src="${p.anh}" height="40" style="object-fit:cover; border-radius:5px;"></td><td>${p.ten}</td><td>${parseInt(p.gia).toLocaleString()}</td><td><button class="btn-edit" onclick="editProduct('${p.id}')">Sửa</button><button class="btn-del" onclick="delProduct('${p.id}')">Xóa</button></td></tr>`; });
    } catch (error) { tb.innerHTML = '<tr><td colspan="4">Lỗi kết nối API!</td></tr>'; }
}
window.saveProduct = async function () {
    if (!ensureAdminOperation()) return;
    const id = document.getElementById('pId').value || 'SP' + Date.now(); let rawAlbum = document.getElementById('pAlbum') ? document.getElementById('pAlbum').value : ""; let arrAlbum = rawAlbum ? rawAlbum.split(',').map(s => s.trim()).filter(s => s) : [];
    const p = { id: id, ten: document.getElementById('pName').value, gia: parseInt(document.getElementById('pPrice').value), anh: document.getElementById('pImg').value, album: arrAlbum, mota: document.getElementById('pDesc') ? document.getElementById('pDesc').value : "" };
    try {
        const res = await fetch(`${API_URL}/products`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') }, body: JSON.stringify(p) });
        if (res.ok) { if (typeof cancelEditP === 'function') cancelEditP(); showToast("Đã lưu!", "success"); renderProductsAdmin(); } 
        else { const errData = await res.json(); showToast(errData.message || "Lỗi lưu sản phẩm!", "error"); }
    } catch (error) { showToast("Lỗi kết nối khi lưu!", "error"); }
}
window.editProduct = async function (id) {
    try {
        const res = await fetch(`${API_URL}/products`); const products = await res.json(); const p = products.find(x => x.id === id);
        if (p) {
            document.getElementById('pId').value = p.id; document.getElementById('pName').value = p.ten; document.getElementById('pPrice').value = p.gia; document.getElementById('pImg').value = p.anh;
            if (document.getElementById('pAlbum')) document.getElementById('pAlbum').value = p.album ? p.album.join(', ') : '';
            if (document.getElementById('pDesc')) document.getElementById('pDesc').value = p.mota || '';
            document.getElementById('btnSaveP').innerText = "Lưu Sửa"; if (document.getElementById('btnCancelP')) document.getElementById('btnCancelP').style.display = "inline-block";
        }
    } catch (error) { showToast("Lỗi lấy thông tin sản phẩm!", "error"); }
}
window.cancelEditP = function () {
    document.getElementById('pId').value = ''; document.getElementById('pName').value = ''; document.getElementById('pPrice').value = ''; document.getElementById('pImg').value = '';
    if (document.getElementById('pAlbum')) document.getElementById('pAlbum').value = ''; if (document.getElementById('pDesc')) document.getElementById('pDesc').value = '';
    document.getElementById('btnSaveP').innerText = "+ Thêm SP"; if (document.getElementById('btnCancelP')) document.getElementById('btnCancelP').style.display = "none";
}
window.delProduct = async function (id) {
    if (!ensureAdminOperation()) return;
    if (typeof Swal !== 'undefined') {
        Swal.fire({ title: 'Xóa sản phẩm?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Xóa' }).then(async (result) => {
            if (result.isConfirmed) {
                try { const res = await fetch(`${API_URL}/products/${id}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } }); if (res.ok) { showToast('Đã xóa', 'success'); renderProductsAdmin(); } else { const errData = await res.json(); showToast(errData.message || "Lỗi khi xóa", "error"); } } catch(e) { showToast('Lỗi khi xóa', 'error'); }
            }
        });
    } else {
        if (confirm("Xóa?")) { try { const res = await fetch(`${API_URL}/products/${id}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } }); if (res.ok) { showToast('Đã xóa', 'success'); renderProductsAdmin(); } else { const errData = await res.json(); showToast(errData.message || "Lỗi khi xóa", "error"); } } catch(e) { showToast('Lỗi khi xóa', 'error'); } }
    }
}
window.renderMaidsAdmin = function () {
    const tb = document.querySelector('#maidTable tbody'); if (!tb || !db) return;
    db.collection("maids").orderBy("timestamp", "desc").onSnapshot((snapshot) => {
        tb.innerHTML = '';
        snapshot.forEach(doc => {
            let m = doc.data(); let statusText = (m.IsAvailable === false) ? '<span style="color:red;font-weight:bold">(Bận)</span>' : '<span style="color:green;font-weight:bold">(Rảnh)</span>';
            tb.innerHTML += `<tr><td><img loading="lazy" src="${m.ImageUrl || m.img}" height="40" style="border-radius:50%; object-fit:cover"></td><td>${m.Name || m.name} ${statusText}<br><small>${m.Age || m.age}t - ${m.Home || m.hometown}</small></td><td>${m.Experience || m.exp}</td><td><button class="btn-edit" onclick="editMaidAdmin('${m.Id || m.id}')">Sửa</button><button class="btn-del" onclick="delMaidAdmin('${m.Id || m.id}')">Xóa</button></td></tr>`;
        });
    });
}
window.saveMaid = async function () {
    if (!ensureAdminOperation()) return;
    if (!db) return;
    const id = document.getElementById('mId').value || 'GV' + Date.now(); let oldStatus = true;
    const oldDoc = await db.collection("maids").doc(id).get(); if (oldDoc.exists) oldStatus = oldDoc.data().IsAvailable;
    const m = { Id: id, id: id, Name: document.getElementById('mName').value, Age: parseInt(document.getElementById('mAge').value) || 0, Home: document.getElementById('mHome').value, Experience: document.getElementById('mExp').value, Skills: document.getElementById('mSkill').value.split(',').map(s => s.trim()).filter(s => s), ImageUrl: document.getElementById('mImg').value || `https://ui-avatars.com/api/?name=${document.getElementById('mName').value}`, Bio: document.getElementById('mDesc') ? document.getElementById('mDesc').value : "", IsAvailable: oldStatus, timestamp: firebase.firestore.FieldValue.serverTimestamp() };
    await db.collection("maids").doc(id).set(m); if (typeof cancelEditM === 'function') cancelEditM(); showToast("Đã lưu!", "success");
}
window.editMaidAdmin = async function (id) {
    if (!db) return;
    const doc = await db.collection("maids").doc(id).get();
    if (doc.exists) {
        let m = doc.data(); document.getElementById('mId').value = m.Id || m.id; document.getElementById('mName').value = m.Name || m.name; document.getElementById('mAge').value = m.Age || m.age; document.getElementById('mHome').value = m.Home || m.home || m.hometown || m.queQuan || ''; document.getElementById('mExp').value = m.Experience || m.exp || m.kinhNghiem || '';
        let mangKyNang = m.Skills || m.skills || []; if (typeof mangKyNang === 'string') mangKyNang = mangKyNang.split(','); document.getElementById('mSkill').value = mangKyNang.join(', ');
        document.getElementById('mImg').value = m.ImageUrl || m.img || m.imageUrl || ''; if (document.getElementById('mDesc')) document.getElementById('mDesc').value = m.Bio || m.desc || m.bio || '';
        document.getElementById('btnSaveM').innerText = "Lưu Sửa"; if (document.getElementById('btnCancelM')) document.getElementById('btnCancelM').style.display = "inline-block";
    }
}
window.cancelEditM = function () {
    document.getElementById('mId').value = ''; document.getElementById('mName').value = ''; document.getElementById('mAge').value = ''; document.getElementById('mHome').value = ''; document.getElementById('mExp').value = ''; document.getElementById('mSkill').value = ''; document.getElementById('mImg').value = '';
    if (document.getElementById('mDesc')) document.getElementById('mDesc').value = ''; document.getElementById('btnSaveM').innerText = "+ Thêm GV"; if (document.getElementById('btnCancelM')) document.getElementById('btnCancelM').style.display = "none";
}
window.delMaidAdmin = function (id) {
    if (!ensureAdminOperation()) return;
    if (typeof Swal !== 'undefined') { Swal.fire({ title: 'Xóa nhân viên?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Đồng ý' }).then(async (result) => { if (result.isConfirmed) { if (db) await db.collection("maids").doc(id).delete(); Swal.fire('Đã xóa!', '', 'success'); } }); } 
    else { if (confirm("Xóa?")) db.collection("maids").doc(id).delete(); }
}
window.resetData = function () {
    if (!ensureAdminOperation()) return;
    showToast("Reset du lieu da bi khoa tren frontend theo chuan bao mat.", "error");
}
let myRevenueChart = null; let myStatusChart = null;
window.veBieuDoThongKe = function(orders) {
    let tongDoanhThu = 0; let choDuyet = 0, choThanhToan = 0, hoanThanh = 0;
    orders.forEach(o => { if (o.status === 'done' || o.status === 'confirmed') { tongDoanhThu += parseInt(o.total || 0); hoanThanh++; } else if (o.status === 'awaiting_payment') { choThanhToan++; } else { choDuyet++; } });
    if (myRevenueChart) myRevenueChart.destroy(); if (myStatusChart) myStatusChart.destroy();
    const ctxStatus = document.getElementById('statusChart');
    if (ctxStatus) { myStatusChart = new Chart(ctxStatus, { type: 'doughnut', data: { labels: ['Chờ duyệt/Giao', 'Chờ Thanh Toán', 'Hoàn Thành'], datasets: [{ data: [choDuyet, choThanhToan, hoanThanh], backgroundColor: ['#f39c12', '#e74c3c', '#2ecc71'], borderWidth: 0 }] }, options: { plugins: { legend: { position: 'bottom' } } } }); }
    const ctxRev = document.getElementById('revenueChart');
    if (ctxRev) { myRevenueChart = new Chart(ctxRev, { type: 'bar', data: { labels: ['Tổng Doanh Thu Tích Lũy'], datasets: [{ label: 'VNĐ', data: [tongDoanhThu], backgroundColor: '#4E9F3D', borderRadius: 8 }] }, options: { scales: { y: { beginAtZero: true } } } }); }
}
