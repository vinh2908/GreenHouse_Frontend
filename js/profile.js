window.openProfile = function () {
    let profileModal = document.getElementById('profileModal');
    if (profileModal) profileModal.remove(); 
    let modalHTML = `
        <div id="profileModal" class="modal" style="display:flex; z-index: 10005;">
            <div class="modal-content" style="width: 450px; max-width: 95%; border-radius: 24px; padding: 30px; text-align: center; position: relative;">
                <span class="close-modal" onclick="closeModal('profileModal')" style="position: absolute; top: 15px; right: 20px; font-size: 28px; cursor: pointer;">×</span>
                <div style="margin-bottom: 20px;">
                    <div style="width: 80px; height: 80px; background: #e8f5e9; color: #4CAF50; font-size: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px auto; border: 3px solid #4CAF50; box-shadow: 0 4px 15px rgba(76, 175, 80, 0.2);"><i class="fas fa-user-circle"></i></div>
                    <h2 style="color: #1f2937; font-weight: 900; margin: 0; font-size: 24px;" id="profileName"></h2>
                    <p style="color: #666; margin: 5px 0 0 0; font-size: 14px; font-weight: bold;" id="profilePhone"></p>
                </div>
                <div style="background: #f9f9f9; border-radius: 16px; padding: 20px; text-align: left; border: 1px dashed #ddd; margin-bottom: 20px;">
                    <h4 style="margin: 0 0 15px 0; color: #333; font-size: 16px; border-bottom: 2px solid #eee; padding-bottom: 8px;"><i class="fas fa-history" style="color: #4CAF50;"></i> Lịch sử giao dịch</h4>
                    <div id="orderList" style="max-height: 250px; overflow-y: auto; padding-right: 5px;"></div>
                </div>
                <button type="button" onclick="logout()" style="width: 100%; background: #ff4757; color: white; border: none; padding: 15px; border-radius: 15px; font-weight: 800; font-size: 16px; cursor: pointer; transition: 0.3s; box-shadow: 0 5px 15px rgba(255, 71, 87, 0.3);" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'"><i class="fas fa-sign-out-alt"></i> ĐĂNG XUẤT TÀI KHOẢN</button>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('profileName').innerText = currentUser ? currentUser.name : 'Tên Khách Hàng';
    document.getElementById('profilePhone').innerText = currentUser ? (currentUser.phone || currentUser.email) : '';
    const list = document.getElementById('orderList'); list.innerHTML = '<p style="text-align:center; color:#999;">Đang tải dữ liệu từ mây...</p>';
    if (currentUser && db) {
        db.collection("orders").where("user", "==", currentUser.phone).onSnapshot((snapshot) => {
            list.innerHTML = '';
            if (snapshot.empty) { list.innerHTML = '<p style="text-align:center; color:#999; font-style: italic;">Bạn chưa có giao dịch nào.</p>'; return; }
            let myOrders = []; snapshot.forEach(doc => myOrders.push(doc.data()));
            myOrders.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
            myOrders.forEach(o => {
                let st = ''; let action = '';
                if (o.status === 'pending') { st = '<span style="color:#f39c12; font-weight:bold;">⏳ Đang chờ duyệt</span>'; } 
                else if (o.status === 'awaiting_payment') { st = '<span style="color:#e74c3c; font-weight:bold;">❗ Chờ thanh toán</span>'; action = `<button onclick="openServicePayment('${o.id}')" style="background:#e91e63; color:white; border:none; padding:8px 15px; border-radius:8px; cursor:pointer; font-size:13px; margin-top:10px; width:100%; font-weight:bold; box-shadow:0 3px 10px rgba(233,30,99,0.3);"><i class="fas fa-credit-card"></i> THANH TOÁN NGAY</button>`; } 
                else if (o.status === 'confirmed' || o.status === 'done') { st = '<span style="color:#2ecc71;font-weight:bold;">✅ Đã thanh toán</span>'; }
                let typeIcon = o.maidId ? '<i class="fas fa-user-nurse" style="color:#4CAF50"></i>' : '<i class="fas fa-shopping-bag" style="color:#0984e3"></i>';
                list.innerHTML += `<div class="order-row" style="padding:15px; border:1px solid #eee; border-radius:12px; margin-bottom:10px; background:#fff; box-shadow:0 2px 5px rgba(0,0,0,0.02);"><div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px dashed #eee; padding-bottom:8px; align-items:center;"><b style="color:#333; font-size:14px;">${typeIcon} #${o.id}</b> ${st}</div><div style="font-size:13px; color:#555; margin-bottom:8px; line-height: 1.5;">${o.items}</div><div style="font-weight:900; color:#e91e63; text-align:right; font-size:15px;">Tổng tiền: ${parseInt(o.total || 0).toLocaleString()} đ</div>${action}</div>`;
            });
        });
    }
}
window.openServicePayment = function (orderId) {
    if (!db) return;
    db.collection("orders").doc(orderId).get().then(doc => {
        if (!doc.exists) return;
        let order = doc.data();
        let modalHTML = `
            <div id="dynamicPaymentModal" class="modal" style="display:flex; z-index: 10005;">
                <div class="modal-content" style="width:450px; text-align:center; border-radius:20px;">
                    <span class="close-modal" onclick="closeDiag('dynamicPaymentModal')">&times;</span>
                    <h2 style="color:#2e7d32; margin-top:0;"><i class="fas fa-qrcode"></i> Thanh Toán Dịch Vụ</h2>
                    <p style="color:#666; font-size:14px; margin-bottom:10px;">Mã đơn: <b style="color:#000;">#${order.id}</b></p>
                    <div style="background:#f8f9fa; padding:20px; border-radius:15px; margin-bottom:15px; border:1px dashed #4CAF50;">
                        <img loading="lazy" src="${MY_BANK_QR}" style="width:180px; height:180px; border-radius:10px; margin-bottom:15px; object-fit:cover; border:2px solid #eee;">
                        <h3 style="margin:0; color:#e91e63; font-size:26px;">${parseInt(order.total).toLocaleString()} VNĐ</h3>
                        <p style="margin:5px 0 0; font-size:13px; color:#555;">Nội dung CK: <b style="color:#000;">${order.id}</b></p>
                    </div>
                    <div style="margin-bottom: 20px; text-align: left; border-top: 1px dashed #ccc; padding-top: 15px;">
                        <label style="font-weight:bold; color:#333; display:block; margin-bottom:10px;"><i class="fas fa-file-upload"></i> Tải lên ảnh chụp màn hình (Bill):</label>
                        <input type="file" id="serviceBillUpload" accept="image/*" style="display:block; margin:0 auto; font-size: 13px;" onchange="checkServiceBill()">
                        <div id="serviceBillPreview" style="margin-top:10px; color:#4CAF50; font-weight:bold; font-size:13px; display:none; text-align:center;"><i class="fas fa-check-circle"></i> Đã tải ảnh lên thành công!</div>
                    </div>
                    <button id="btnConfirmServicePayment" disabled style="width:100%; padding:15px; font-size:16px; border-radius:12px; text-transform:uppercase; font-weight:800; background:#cccccc; color:white; border:none; cursor:not-allowed;" onclick="confirmServicePayment('${order.id}')">THANH TOÁN HOÀN TẤT</button>
                </div>
            </div>`;
        let old = document.getElementById('dynamicPaymentModal');
        if (old) old.remove();
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    });
};
window.checkServiceBill = function () {
    var billInput = document.getElementById('serviceBillUpload');
    var btnXacNhan = document.getElementById('btnConfirmServicePayment');
    var billPreview = document.getElementById('serviceBillPreview');
    if (billInput && billInput.files && billInput.files.length > 0) { billPreview.style.display = 'block'; btnXacNhan.style.background = '#4E9F3D'; btnXacNhan.style.cursor = 'pointer'; btnXacNhan.disabled = false; } 
    else { billPreview.style.display = 'none'; btnXacNhan.style.background = '#cccccc'; btnXacNhan.style.cursor = 'not-allowed'; btnXacNhan.disabled = true; }
};
window.confirmServicePayment = async function (orderId) {
    let btn = document.getElementById('btnConfirmServicePayment');
    if(btn) { btn.disabled = true; btn.innerText = "ĐANG KIỂM TRA GIAO DỊCH..."; }
    setTimeout(async () => {
        try {
            const orderDoc = await db.collection("orders").doc(orderId).get();
            if (!orderDoc.exists) return;
            const oData = orderDoc.data();
            await db.collection("orders").doc(orderId).update({ status: 'confirmed', isPaid: true });
            if (oData.maidId) {
                await db.collection("maids").doc(oData.maidId).update({
                    schedules: firebase.firestore.FieldValue.arrayUnion({ date: oData.workDate, startTime: oData.workTime, duration: oData.workDuration })
                });
            }
            showToast("Đã nhận thanh toán! Lịch nhân viên đã được cập nhật.", "success");
            if(document.getElementById('dynamicPaymentModal')) closeDiag('dynamicPaymentModal');
        } catch (error) {
            showToast("Lỗi xác nhận giao dịch!", "error");
            if(btn) { btn.disabled = false; btn.innerText = "THỬ LẠI"; }
        }
    }, 3000);
};