const SERVICE_MOMO_PHONE = '0563730648';
const SERVICE_MOMO_NAME = 'DAO PHUOC LONG';
const SERVICE_MOMO_BANK_ID = 'momo';
let currentServicePaymentOrder = null;
let serviceBillVerified = false;
let serviceBillOcrText = '';
let serviceTesseractLoaderPromise = null;
let profileOrdersUnsubscribe = null;

function buildServicePaymentQrUrl(totalAmount, orderRef) {
    const query = new URLSearchParams({
        amount: String(totalAmount || 0),
        addInfo: String(orderRef || ''),
        accountName: SERVICE_MOMO_NAME
    });
    return `https://img.vietqr.io/image/${SERVICE_MOMO_BANK_ID}-${SERVICE_MOMO_PHONE}-compact2.png?${query.toString()}`;
}

function normalizeServiceOcr(text) {
    return String(text || '').toUpperCase().replace(/\s+/g, ' ').trim();
}

function normalizeServiceAscii(text) {
    return String(text || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/\s+/g, ' ')
        .trim();
}

function serviceContainsExpectedAmount(ocrText, expectedAmount) {
    const rawAmount = String(expectedAmount || 0);
    const dotAmount = rawAmount.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const commaAmount = rawAmount.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const compactDigits = String(ocrText || '').replace(/[^\d]/g, '');
    return (
        ocrText.includes(rawAmount) ||
        ocrText.includes(dotAmount) ||
        ocrText.includes(commaAmount) ||
        compactDigits.includes(rawAmount)
    );
}

function prepareServiceFastOcrImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function () {
            const img = new Image();
            img.onload = function () {
                const maxWidth = 1200;
                const scale = Math.min(1, maxWidth / img.width);
                const w = Math.max(1, Math.round(img.width * scale));
                const h = Math.max(1, Math.round(img.height * scale));
                const baseCanvas = document.createElement('canvas');
                baseCanvas.width = w;
                baseCanvas.height = h;
                const baseCtx = baseCanvas.getContext('2d');
                if (!baseCtx) return reject(new Error('canvas_unavailable'));
                baseCtx.drawImage(img, 0, 0, w, h);

                const cropTop = Math.floor(h * 0.42);
                const cropHeight = Math.max(1, h - cropTop);
                const cropCanvas = document.createElement('canvas');
                cropCanvas.width = w;
                cropCanvas.height = cropHeight;
                const cropCtx = cropCanvas.getContext('2d');
                if (!cropCtx) return reject(new Error('canvas_unavailable'));
                cropCtx.drawImage(baseCanvas, 0, cropTop, w, cropHeight, 0, 0, w, cropHeight);
                resolve(cropCanvas.toDataURL('image/jpeg', 0.9));
            };
            img.onerror = function () { reject(new Error('image_decode_failed')); };
            img.src = reader.result;
        };
        reader.onerror = function () { reject(new Error('read_failed')); };
        reader.readAsDataURL(file);
    });
}

function isServiceBillMatch(normalizedText) {
    const normalized = normalizeServiceOcr(normalizedText);
    const normalizedAscii = normalizeServiceAscii(normalized);
    const expectedId = String((currentServicePaymentOrder && currentServicePaymentOrder.id) || '').toUpperCase();
    const expectedTotal = Number((currentServicePaymentOrder && currentServicePaymentOrder.total) || 0);
    const hasAmount = serviceContainsExpectedAmount(normalized, expectedTotal);
    const hasRef = expectedId ? normalized.includes(expectedId) : false;
    const hasPhone = normalized.includes(SERVICE_MOMO_PHONE);
    const hasName = normalizedAscii.includes(normalizeServiceAscii(SERVICE_MOMO_NAME));
    return hasAmount && hasRef && (hasPhone || hasName);
}

function ensureServiceTesseractLoaded() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    if (serviceTesseractLoaderPromise) return serviceTesseractLoaderPromise;
    serviceTesseractLoaderPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/6.0.1/tesseract.min.js';
        script.onload = () => resolve(window.Tesseract);
        script.onerror = () => reject(new Error('tesseract_load_failed'));
        document.head.appendChild(script);
    });
    return serviceTesseractLoaderPromise;
}

window.openProfile = function () {
    let profileModal = document.getElementById('profileModal');
    if (profileModal) profileModal.remove();
    let modalHTML = `
        <div id="profileModal" class="modal" style="display:flex; z-index: 10005;">
            <div class="modal-content" style="width: 450px; max-width: 95%; border-radius: 24px; padding: 30px; text-align: center; position: relative;">
                <span class="close-modal" onclick="closeModal('profileModal')" style="position: absolute; top: 15px; right: 20px; font-size: 28px; cursor: pointer;">&times;</span>
                <div style="margin-bottom: 20px;">
                    <div style="width: 80px; height: 80px; background: #e8f5e9; color: #4CAF50; font-size: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px auto; border: 3px solid #4CAF50; box-shadow: 0 4px 15px rgba(76, 175, 80, 0.2);"><i class="fas fa-user-circle"></i></div>
                    <h2 style="color: #1f2937; font-weight: 900; margin: 0; font-size: 24px;" id="profileName"></h2>
                    <p style="color: #666; margin: 5px 0 0 0; font-size: 14px; font-weight: bold;" id="profilePhone"></p>
                </div>
                <div style="background: #f9f9f9; border-radius: 16px; padding: 20px; text-align: left; border: 1px dashed #ddd; margin-bottom: 20px;">
                    <h4 style="margin: 0 0 15px 0; color: #333; font-size: 16px; border-bottom: 2px solid #eee; padding-bottom: 8px;"><i class="fas fa-history" style="color: #4CAF50;"></i> Lich su giao dich</h4>
                    <div id="orderList" style="max-height: 250px; overflow-y: auto; padding-right: 5px;"></div>
                </div>
                <button type="button" onclick="logout()" style="width: 100%; background: #ff4757; color: white; border: none; padding: 15px; border-radius: 15px; font-weight: 800; font-size: 16px; cursor: pointer; transition: 0.3s; box-shadow: 0 5px 15px rgba(255, 71, 87, 0.3);" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'"><i class="fas fa-sign-out-alt"></i> DANG XUAT TAI KHOAN</button>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('profileName').innerText = currentUser ? currentUser.name : 'Ten Khach Hang';
    document.getElementById('profilePhone').innerText = currentUser ? (currentUser.phone || currentUser.email) : '';
    const list = document.getElementById('orderList');
    list.innerHTML = '<p style="text-align:center; color:#999;">Dang tai du lieu tu may...</p>';

    if (currentUser && db) {
        if (typeof profileOrdersUnsubscribe === 'function') profileOrdersUnsubscribe();
        profileOrdersUnsubscribe = db.collection("orders").where("user", "==", currentUser.phone).onSnapshot((snapshot) => {
            list.innerHTML = '';
            if (snapshot.empty) {
                list.innerHTML = '<p style="text-align:center; color:#999; font-style: italic;">Ban chua co giao dich nao.</p>';
                return;
            }
            let myOrders = [];
            snapshot.forEach(doc => myOrders.push(doc.data()));
            myOrders.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

            myOrders.forEach(o => {
                let st = '';
                let action = '';
                if (o.status === 'pending') {
                    st = '<span style="color:#f39c12; font-weight:bold;">Dang cho duyet</span>';
                } else if (o.status === 'awaiting_payment' || o.status === 'awaiting_payment_review') {
                    st = '<span style="color:#e74c3c; font-weight:bold;">Cho thanh toan</span>';
                    action = `<button onclick="openServicePayment('${o.id}')" style="background:#e91e63; color:white; border:none; padding:8px 15px; border-radius:8px; cursor:pointer; font-size:13px; margin-top:10px; width:100%; font-weight:bold; box-shadow:0 3px 10px rgba(233,30,99,0.3);"><i class="fas fa-credit-card"></i> THANH TOAN NGAY</button>`;
                } else if (o.status === 'confirmed' || o.status === 'done') {
                    st = '<span style="color:#2ecc71;font-weight:bold;">Da thanh toan</span>';
                }

                let typeIcon = o.maidId
                    ? '<i class="fas fa-user-nurse" style="color:#4CAF50"></i>'
                    : '<i class="fas fa-shopping-bag" style="color:#0984e3"></i>';

                list.innerHTML += `<div class="order-row" style="padding:15px; border:1px solid #eee; border-radius:12px; margin-bottom:10px; background:#fff; box-shadow:0 2px 5px rgba(0,0,0,0.02);"><div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px dashed #eee; padding-bottom:8px; align-items:center;"><b style="color:#333; font-size:14px;">${typeIcon} #${o.id}</b> ${st}</div><div style="font-size:13px; color:#555; margin-bottom:8px; line-height: 1.5;">${o.items}</div><div style="font-weight:900; color:#e91e63; text-align:right; font-size:15px;">Tong tien: ${parseInt(o.total || 0).toLocaleString()} d</div>${action}</div>`;
            });
        });
    }
};

window.openServicePayment = function (orderId) {
    if (!db) return;
    db.collection("orders").doc(orderId).get().then(doc => {
        if (!doc.exists) return;
        let order = doc.data();
        let orderTotal = parseInt(order.total || 0);
        let dynamicQrSrc = buildServicePaymentQrUrl(orderTotal, order.id);
        currentServicePaymentOrder = { id: order.id, total: orderTotal };
        serviceBillVerified = false;
        serviceBillOcrText = '';

        let modalHTML = `
            <div id="dynamicPaymentModal" class="modal" style="display:flex; z-index: 10005;">
                <div class="modal-content" style="width:450px; text-align:center; border-radius:20px;">
                    <span class="close-modal" onclick="closeDiag('dynamicPaymentModal')">&times;</span>
                    <h2 style="color:#2e7d32; margin-top:0;"><i class="fas fa-qrcode"></i> Thanh Toan Dich Vu</h2>
                    <p style="color:#666; font-size:14px; margin-bottom:10px;">Ma don: <b style="color:#000;">#${order.id}</b></p>
                    <div style="background:#f8f9fa; padding:20px; border-radius:15px; margin-bottom:15px; border:1px dashed #4CAF50;">
                        <img loading="lazy" src="${dynamicQrSrc}" style="width:180px; height:180px; border-radius:10px; margin-bottom:15px; object-fit:cover; border:2px solid #eee;">
                        <p style="margin:0 0 6px 0; font-size:13px; color:#555;">Vi nhan: <b style="color:#000;">${SERVICE_MOMO_PHONE} - ${SERVICE_MOMO_NAME}</b></p>
                        <h3 style="margin:0; color:#e91e63; font-size:26px;">${orderTotal.toLocaleString()} VND</h3>
                        <p style="margin:5px 0 0; font-size:13px; color:#555;">Noi dung CK: <b style="color:#000;">${order.id}</b></p>
                    </div>
                    <div style="margin-bottom: 20px; text-align: left; border-top: 1px dashed #ccc; padding-top: 15px;">
                        <label style="font-weight:bold; color:#333; display:block; margin-bottom:10px;"><i class="fas fa-file-upload"></i> Tai len anh chup man hinh (Bill):</label>
                        <input type="file" id="serviceBillUpload" accept="image/*" style="display:block; margin:0 auto; font-size: 13px;" onchange="checkServiceBill()">
                        <div id="serviceBillPreview" style="margin-top:10px; color:#4CAF50; font-weight:bold; font-size:13px; display:none; text-align:center;"></div>
                    </div>
                    <button id="btnConfirmServicePayment" disabled style="width:100%; padding:15px; font-size:16px; border-radius:12px; text-transform:uppercase; font-weight:800; background:#cccccc; color:white; border:none; cursor:not-allowed;" onclick="confirmServicePayment('${order.id}')">THANH TOAN HOAN TAT</button>
                </div>
            </div>`;

        let old = document.getElementById('dynamicPaymentModal');
        if (old) old.remove();
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    });
};

window.checkServiceBill = async function () {
    var billInput = document.getElementById('serviceBillUpload');
    var btnXacNhan = document.getElementById('btnConfirmServicePayment');
    var billPreview = document.getElementById('serviceBillPreview');
    serviceBillVerified = false;
    serviceBillOcrText = '';
    if (!billInput || !billInput.files || billInput.files.length === 0) {
        billPreview.style.display = 'none';
        btnXacNhan.style.background = '#cccccc';
        btnXacNhan.style.cursor = 'not-allowed';
        btnXacNhan.disabled = true;
        return;
    }

    const file = billInput.files[0];
    if (file.size > 5 * 1024 * 1024) {
        billPreview.style.display = 'block';
        billPreview.style.color = '#e74c3c';
        billPreview.innerHTML = '<i class="fas fa-times-circle"></i> Anh qua lon (toi da 5MB).';
        btnXacNhan.style.background = '#cccccc';
        btnXacNhan.style.cursor = 'not-allowed';
        btnXacNhan.disabled = true;
        return;
    }

    billPreview.style.display = 'block';
    billPreview.style.color = '#1f2937';
    billPreview.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Dang kiem tra bill...';
    btnXacNhan.style.background = '#cccccc';
    btnXacNhan.style.cursor = 'not-allowed';
    btnXacNhan.disabled = true;

    try {
        const TesseractLib = await ensureServiceTesseractLoaded();
        if (!TesseractLib) throw new Error('ocr_lib_missing');
        const fastOcrImage = await prepareServiceFastOcrImage(file);
        const fastResult = await TesseractLib.recognize(fastOcrImage, 'eng');
        const fastText = normalizeServiceOcr(fastResult && fastResult.data ? fastResult.data.text : '');
        serviceBillOcrText = fastText;
        serviceBillVerified = isServiceBillMatch(fastText);

        if (!serviceBillVerified) {
            const fullResult = await TesseractLib.recognize(file, 'eng');
            const fullText = normalizeServiceOcr(fullResult && fullResult.data ? fullResult.data.text : '');
            serviceBillOcrText = fullText;
            serviceBillVerified = isServiceBillMatch(fullText);
        }

        if (serviceBillVerified) {
            billPreview.style.color = '#4CAF50';
            billPreview.innerHTML = '<i class="fas fa-check-circle"></i> Bill hop le: dung so tien, noi dung CK va nguoi nhan.';
            btnXacNhan.style.background = '#4E9F3D';
            btnXacNhan.style.cursor = 'pointer';
            btnXacNhan.disabled = false;
        } else {
            billPreview.style.color = '#e74c3c';
            billPreview.innerHTML = '<i class="fas fa-times-circle"></i> Bill chua hop le. Vui long thanh toan dung so tien va noi dung CK.';
            btnXacNhan.style.background = '#cccccc';
            btnXacNhan.style.cursor = 'not-allowed';
            btnXacNhan.disabled = true;
        }
    } catch (e) {
        serviceBillVerified = false;
        billPreview.style.color = '#e74c3c';
        billPreview.innerHTML = '<i class="fas fa-times-circle"></i> Khong the doc bill tu dong. Vui long thu anh ro hon.';
        btnXacNhan.style.background = '#cccccc';
        btnXacNhan.style.cursor = 'not-allowed';
        btnXacNhan.disabled = true;
    }
};

window.confirmServicePayment = async function (orderId) {
    if (!serviceBillVerified) {
        showToast("Bill chua duoc xac minh. Vui long tai len dung bill thanh toan.", "error");
        return;
    }
    let btn = document.getElementById('btnConfirmServicePayment');
    if (btn) {
        btn.disabled = true;
        btn.innerText = "DANG GUI YEU CAU XAC NHAN...";
    }
    setTimeout(async () => {
        try {
            const orderRef = db.collection("orders").doc(orderId);
            await db.runTransaction(async (transaction) => {
                const orderDoc = await transaction.get(orderRef);
                if (!orderDoc.exists) throw new Error('ORDER_NOT_FOUND');
                const order = orderDoc.data() || {};

                transaction.update(orderRef, {
                    status: 'confirmed',
                    isPaid: true,
                    paymentProofStatus: 'client_confirmed_paid',
                    paidAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                if (order.maidId && order.workDate && order.workTime && order.workDuration) {
                    const maidRef = db.collection("maids").doc(String(order.maidId));
                    const maidDoc = await transaction.get(maidRef);
                    const maidData = maidDoc.exists ? (maidDoc.data() || {}) : {};
                    const schedules = Array.isArray(maidData.schedules) ? maidData.schedules : [];
                    const duration = String(order.workDuration);
                    const exists = schedules.some(s => s && s.orderId === order.id);
                    if (!exists) {
                        schedules.push({
                            orderId: order.id,
                            date: order.workDate,
                            startTime: order.workTime,
                            duration: duration,
                            status: 'confirmed'
                        });
                    }
                    transaction.set(maidRef, {
                        schedules: schedules,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });

                    const lockRef = db.collection('booking_day_locks').doc(`${order.maidId}_${order.workDate}`);
                    const lockDoc = await transaction.get(lockRef);
                    const lockData = lockDoc.exists ? (lockDoc.data() || {}) : {};
                    const reservations = Array.isArray(lockData.reservations) ? lockData.reservations : [];
                    const toMins = (timeStr) => {
                        if (typeof window.timeToMinutes === 'function') return window.timeToMinutes(timeStr);
                        const parts = String(timeStr || '').split(':');
                        return (parseInt(parts[0] || '0', 10) * 60) + parseInt(parts[1] || '0', 10);
                    };
                    const startMinutes = toMins(order.workTime);
                    const endMinutes = startMinutes + (parseFloat(duration) * 60);
                    let found = false;
                    for (let i = 0; i < reservations.length; i++) {
                        if (reservations[i] && reservations[i].orderId === order.id) {
                            reservations[i].status = 'confirmed';
                            reservations[i].startMinutes = startMinutes;
                            reservations[i].endMinutes = endMinutes;
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        reservations.push({
                            orderId: order.id,
                            startMinutes: startMinutes,
                            endMinutes: endMinutes,
                            status: 'confirmed',
                            createdAtMs: Date.now()
                        });
                    }
                    transaction.set(lockRef, {
                        maidId: String(order.maidId),
                        workDate: order.workDate,
                        reservations: reservations,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                }
            });

            showToast("Thanh toan thanh cong! Lich cua nhan vien da duoc khoa ngay.", "success");
            if (document.getElementById('dynamicPaymentModal')) closeDiag('dynamicPaymentModal');
        } catch (error) {
            showToast("Loi xac nhan giao dich!", "error");
            if (btn) {
                btn.disabled = false;
                btn.innerText = "THU LAI";
            }
        }
    }, 1500);
};
