const MOMO_ACCOUNT_PHONE = '0563730648';
const MOMO_ACCOUNT_NAME = 'DAO PHUOC LONG';
const MOMO_BANK_ID = 'momo';

let paymentReferenceCode = '';
let paymentProofVerified = false;
let paymentProofOcrText = '';
let paymentProofImageData = '';
let tesseractLoaderPromise = null;

async function saveOrderWithBackendFallback(order) {
    let apiBase = window.API_URL || (typeof API_URL !== 'undefined' ? API_URL : '');
    if (typeof window.syncBackendApi === 'function') {
        apiBase = await window.syncBackendApi();
    }

    try {
        const response = await fetch(`${apiBase}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(order)
        });
        if (!response.ok) throw new Error(`BACKEND_REJECTED_${response.status}`);
        return;
    } catch (error) {
        console.warn('Backend order save failed, falling back to Firestore:', error);
        if (!db) throw error;
        await db.collection("orders").doc(order.id).set({
            ...order,
            backendSyncStatus: 'pending',
            backendSyncError: String(error && error.message ? error.message : error),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }
}

window.openCart = function () {
    if (!currentUser) return showToast("Vui long dang nhap!", "error");
    document.getElementById('cartModal').style.display = 'flex';
    renderCart();
};

function renderCart() {
    const listArea = document.getElementById('cartList');
    if (!listArea) return;
    listArea.innerHTML = '';
    let totalThanhToan = 0;

    if (cart.length === 0) {
        listArea.innerHTML = '<p style="text-align:center; padding:20px; color:#999;">Gio hang trong.</p>';
        document.getElementById('cartTotal').innerText = '0 VNĐ';
        return;
    }

    listArea.innerHTML = '<div style="display: flex; font-weight: bold; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 10px; align-items:center;"><div style="width: 30px;"><input type="checkbox" onclick="toggleSelectAll(this.checked)" checked></div><div style="width: 60px;">Anh</div><div style="flex: 1;">San pham</div><div style="width: 100px; text-align:center;">So luong</div><div style="width: 100px; text-align:right;">Gia</div><div style="width: 40px;"></div></div>';

    cart.forEach((item, index) => {
        if (item.selected === undefined) item.selected = true;
        const thanhTien = item.gia * (item.sl || 1);
        if (item.selected) totalThanhToan += thanhTien;

        listArea.innerHTML += `<div style="display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #f5f5f5;"><div style="width: 30px;"><input type="checkbox" ${item.selected ? 'checked' : ''} onclick="toggleCartItem(${index})" style="width:16px;height:16px;"></div><div style="width: 60px;"><img loading="lazy" src="${item.anh}" style="width:45px; height:45px; object-fit:cover; border-radius:5px;"></div><div style="flex: 1; font-weight:bold; font-size:14px; color:#333;">${item.ten}<br><small style="color:#e91e63">${item.gia.toLocaleString()} đ</small></div><div style="width: 100px; display: flex; align-items: center; justify-content:center; background:#f5f5f5; border-radius:20px; padding:2px;"><button type="button" onclick="updateCartQty(${index}, -1)" style="border:none; background:none; cursor:pointer; font-weight:bold; padding:2px 10px;">-</button><span style="min-width:25px; text-align:center; font-weight:bold;">${item.sl || 1}</span><button type="button" onclick="updateCartQty(${index}, 1)" style="border:none; background:none; cursor:pointer; font-weight:bold; padding:2px 10px;">+</button></div><div style="width: 100px; text-align: right; color:#e91e63; font-weight:bold;">${thanhTien.toLocaleString()} đ</div><div style="width: 40px; text-align:center;"><button type="button" onclick="removeFromCart(${index})" style="color:#ff4d4d; border:none; background:none; cursor:pointer; font-size:18px;"><i class="fas fa-trash"></i></button></div></div>`;
    });

    const finalTotal = totalThanhToan - currentDiscount;
    const finalSafe = finalTotal > 0 ? finalTotal : 0;
    if (document.getElementById('cartTotal')) document.getElementById('cartTotal').innerText = finalSafe.toLocaleString() + " VNĐ";
}

window.renderCart = renderCart;

window.updateCartQty = function (index, change) {
    if (cart[index].sl + change > 0) {
        cart[index].sl += change;
        localStorage.setItem('cart', JSON.stringify(cart));
        renderCart();
        updateHeaderAuth();
    }
};

window.toggleCartItem = function (index) {
    cart[index].selected = !cart[index].selected;
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
};

window.toggleSelectAll = function (checked) {
    cart.forEach(item => item.selected = checked);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
};

window.removeFromCart = function (index) {
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
    updateHeaderAuth();
};

window.applyVoucher = function () {
    const code = document.getElementById('voucherCode').value.trim();
    if (!code) return showToast("Nhap ma!", "error");
    if (code === "CLEAR10") {
        currentDiscount = 10000;
        showToast("Thanh cong!");
        renderCart();
    } else {
        showToast("Ma khong hop le!", "error");
    }
};

window.updateCheckoutQty = function (id, change) {
    const item = cart.find(x => x.id === id);
    if (item && item.sl + change > 0) {
        item.sl += change;
        localStorage.setItem('cart', JSON.stringify(cart));
        renderCheckoutItems();
        updateHeaderAuth();
    }
};

window.renderCheckoutItems = function () {
    const selectedItems = cart.filter(x => x.selected);
    const container = document.getElementById('checkoutItemsContainer');
    if (!container) return;

    let subTotal = 0;
    let html = '';

    selectedItems.forEach(item => {
        const itemTotal = item.gia * (item.sl || 1);
        subTotal += itemTotal;
        html += `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding-bottom:8px; border-bottom:1px dashed #ddd;"><div style="display:flex; align-items:center; gap:10px;"><img loading="lazy" src="${item.anh}" style="width:40px; height:40px; border-radius:5px; object-fit:cover;"><div><div style="font-weight:bold; font-size:14px;">${item.ten}</div><div style="color:#e91e63; font-size:13px;">${item.gia.toLocaleString()} đ</div></div></div><div style="display:flex; align-items:center; background:#fff; border:1px solid #ddd; border-radius:20px; padding:2px 5px;"><button type="button" onclick="updateCheckoutQty('${item.id}', -1)" style="border:none; background:none; cursor:pointer; font-weight:bold; padding:2px 8px;">-</button><span style="font-weight:bold; min-width:20px; text-align:center;">${item.sl || 1}</span><button type="button" onclick="updateCheckoutQty('${item.id}', 1)" style="border:none; background:none; cursor:pointer; font-weight:bold; padding:2px 8px;">+</button></div></div>`;
    });

    container.innerHTML = html;
    let finalTotal = subTotal - currentDiscount;
    if (finalTotal < 0) finalTotal = 0;
    const ckTotalText = document.getElementById('ckTotalText');
    if (ckTotalText) {
        ckTotalText.innerText = finalTotal.toLocaleString() + " VNĐ";
        ckTotalText.dataset.val = finalTotal;
    }

    if (document.getElementById('ckMethod') && document.getElementById('ckMethod').value === 'BANK') {
        updateDynamicPaymentQr();
    }
};

function ensurePaymentReferenceCode() {
    if (!paymentReferenceCode) paymentReferenceCode = 'DH' + Date.now().toString().slice(-8);
    return paymentReferenceCode;
}

function getCheckoutTotalValue() {
    const ckTotalText = document.getElementById('ckTotalText');
    if (!ckTotalText) return 0;
    const raw = Number(ckTotalText.dataset.val || 0);
    return Number.isFinite(raw) ? raw : 0;
}

function setConfirmButtonForBank(enabled) {
    const btnXacNhan = document.getElementById('btnXacNhan');
    if (!btnXacNhan) return;
    btnXacNhan.disabled = !enabled;
    btnXacNhan.style.backgroundColor = enabled ? '#4CAF50' : '#cccccc';
    btnXacNhan.style.pointerEvents = enabled ? 'auto' : 'none';
}

function updateDynamicPaymentQr() {
    const total = getCheckoutTotalValue();
    const refCode = ensurePaymentReferenceCode();
    const qrImg = document.getElementById('paymentQrImage');
    const qrAmountText = document.getElementById('qrAmountText');
    const qrRefText = document.getElementById('qrRefText');
    const query = new URLSearchParams({
        amount: String(total),
        addInfo: refCode,
        accountName: MOMO_ACCOUNT_NAME
    });
    const dynamicQrUrl = `https://img.vietqr.io/image/${MOMO_BANK_ID}-${MOMO_ACCOUNT_PHONE}-compact2.png?${query.toString()}`;
    if (qrImg) qrImg.src = dynamicQrUrl;
    if (qrAmountText) qrAmountText.innerText = total.toLocaleString() + ' VNĐ';
    if (qrRefText) qrRefText.innerText = refCode;
}

function resetPaymentProofUI() {
    paymentProofVerified = false;
    paymentProofOcrText = '';
    paymentProofImageData = '';
    const billInput = document.getElementById('billUpload');
    const billPreview = document.getElementById('billPreview');
    if (billInput) billInput.value = '';
    if (billPreview) {
        billPreview.style.display = 'none';
        billPreview.innerHTML = '';
    }
}

function normalizeOcrTextForCheck(text) {
    return String(text || '').toUpperCase().replace(/\s+/g, ' ').trim();
}

function normalizeForCompare(text) {
    return String(text || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/\s+/g, ' ')
        .trim();
}

function containsExpectedAmount(ocrText, expectedAmount) {
    const rawAmount = String(expectedAmount);
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

function readBillFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result || '');
        reader.onerror = () => reject(new Error('read_failed'));
        reader.readAsDataURL(file);
    });
}

function ensureTesseractLoaded() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    if (tesseractLoaderPromise) return tesseractLoaderPromise;
    tesseractLoaderPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/6.0.1/tesseract.min.js';
        script.onload = () => resolve(window.Tesseract);
        script.onerror = () => reject(new Error('tesseract_load_failed'));
        document.head.appendChild(script);
    });
    return tesseractLoaderPromise;
}

window.moFormThanhToan = function () {
    const selectedItems = cart.filter(x => x.selected);
    if (selectedItems.length === 0) return showToast("Chon it nhat 1 SP!", "error");
    closeModal('cartModal');
    renderCheckoutItems();

    paymentReferenceCode = '';
    paymentProofVerified = false;
    paymentProofOcrText = '';
    paymentProofImageData = '';

    if (currentUser) {
        const ckName = document.getElementById('ckName');
        const ckPhone = document.getElementById('ckPhone');
        if (ckName) ckName.value = currentUser.name || '';
        if (ckPhone) ckPhone.value = currentUser.phone || '';
    }

    setTimeout(function () {
        const ckModal = document.getElementById('checkoutModal');
        if (!ckModal) return;
        ckModal.style.display = 'flex';
        const method = document.getElementById('ckMethod');
        if (method) method.value = 'COD';
        resetPaymentProofUI();
        toggleQR();
    }, 150);
};

window.toggleQR = function () {
    const method = document.getElementById('ckMethod');
    const qrBox = document.getElementById('qrBox');
    if (!method || !qrBox) return;

    if (method.value === 'BANK') {
        qrBox.style.display = 'block';
        ensurePaymentReferenceCode();
        updateDynamicPaymentQr();
        setConfirmButtonForBank(paymentProofVerified);
    } else {
        qrBox.style.display = 'none';
        setConfirmButtonForBank(true);
    }
};

window.kiemTraBill = async function () {
    const method = document.getElementById('ckMethod');
    const billInput = document.getElementById('billUpload');
    const billPreview = document.getElementById('billPreview');
    if (!method || method.value !== 'BANK') return;

    if (!billInput || !billInput.files || billInput.files.length === 0) {
        paymentProofVerified = false;
        paymentProofImageData = '';
        if (billPreview) {
            billPreview.style.display = 'none';
            billPreview.innerHTML = '';
        }
        setConfirmButtonForBank(false);
        return;
    }

    const file = billInput.files[0];
    if (file.size > 5 * 1024 * 1024) {
        paymentProofVerified = false;
        if (billPreview) {
            billPreview.style.display = 'block';
            billPreview.style.color = '#e74c3c';
            billPreview.innerHTML = '<i class="fas fa-times-circle"></i> Anh qua lon (toi da 5MB).';
        }
        setConfirmButtonForBank(false);
        return;
    }

    if (billPreview) {
        billPreview.style.display = 'block';
        billPreview.style.color = '#1f2937';
        billPreview.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Dang kiem tra hoa don...';
    }
    setConfirmButtonForBank(false);

    try {
        paymentProofImageData = await readBillFileAsDataUrl(file);

        const TesseractLib = await ensureTesseractLoaded();
        if (!TesseractLib) throw new Error('ocr_lib_missing');
        const ocrResult = await TesseractLib.recognize(file, 'eng');
        const normalizedText = normalizeOcrTextForCheck(ocrResult && ocrResult.data ? ocrResult.data.text : '');
        paymentProofOcrText = normalizedText;

        const expectedAmount = getCheckoutTotalValue();
        const expectedRef = ensurePaymentReferenceCode().toUpperCase();
        const hasAmount = containsExpectedAmount(normalizedText, expectedAmount);
        const hasRef = normalizedText.includes(expectedRef);
        const normalizedAscii = normalizeForCompare(normalizedText);
        const hasPhone = normalizedText.includes(MOMO_ACCOUNT_PHONE);
        const hasName = normalizedAscii.includes(normalizeForCompare(MOMO_ACCOUNT_NAME));

        paymentProofVerified = hasAmount && hasRef && (hasPhone || hasName);
        if (paymentProofVerified) {
            if (billPreview) {
                billPreview.style.color = '#4CAF50';
                billPreview.innerHTML = '<i class="fas fa-check-circle"></i> Bill hop le: dung so tien, ma noi dung va so MoMo.';
            }
            setConfirmButtonForBank(true);
        } else {
            if (billPreview) {
                billPreview.style.color = '#e74c3c';
                billPreview.innerHTML = '<i class="fas fa-times-circle"></i> Bill chua hop le. Vui long thanh toan dung so tien va noi dung CK.';
            }
            setConfirmButtonForBank(false);
        }
    } catch (error) {
        paymentProofVerified = false;
        if (billPreview) {
            billPreview.style.color = '#e74c3c';
            billPreview.innerHTML = '<i class="fas fa-times-circle"></i> Khong the doc bill tu dong. Vui long thu lai anh ro hon.';
        }
        setConfirmButtonForBank(false);
    }
};

window.xacNhanDonHang = async function () {
    if (!db) return showToast('Loi ket noi Firebase!', 'error');
    const name = document.getElementById('ckName').value.trim();
    const phone = document.getElementById('ckPhone').value.trim();
    const addr = document.getElementById('ckAddress').value.trim();
    const method = document.getElementById('ckMethod').value;

    if (!name || !phone || !addr) return showToast("Vui long dien du thong tin nhan hang!", "error");
    const selectedItems = cart.filter(x => x.selected);
    if (selectedItems.length === 0) return showToast("Khong co san pham nao duoc chon!", "warning");

    const isBank = method === 'BANK';
    if (isBank && !paymentProofVerified) {
        return showToast("Vui long tai len bill hop le truoc khi hoan tat.", "error");
    }

    const btnXacNhan = document.getElementById('btnXacNhan');
    if (btnXacNhan) {
        btnXacNhan.disabled = true;
        btnXacNhan.innerText = "DANG XU LY...";
    }

    try {
        let realTotal = 0;
        let realItemsDisplay = [];
        for (const item of selectedItems) {
            const productDoc = await db.collection("products").doc(item.id).get();
            if (productDoc.exists) {
                const realPrice = productDoc.data().gia;
                realTotal += realPrice * item.sl;
                realItemsDisplay.push(`${item.ten} (x${item.sl})`);
            }
        }

        realTotal = realTotal - currentDiscount;
        if (realTotal < 0) realTotal = 0;

        const transferRef = isBank ? ensurePaymentReferenceCode() : '';
        const newOrder = {
            id: 'DH' + Date.now() + Math.floor(Math.random() * 1000000),
            user: currentUser ? currentUser.phone : phone,
            customerInfo: { name: name, phone: phone, address: addr },
            items: realItemsDisplay.join(', '),
            total: realTotal,
            status: isBank ? 'awaiting_payment_review' : 'pending',
            date: new Date().toLocaleString() + ' ' + (isBank ? '(MoMo QR)' : '(COD)'),
            method: method,
            isPaid: false,
            paymentProofStatus: isBank ? 'ocr_verified_pending_admin' : 'not_required',
            paymentReference: transferRef,
            paymentTarget: isBank ? { provider: 'MOMO', phone: MOMO_ACCOUNT_PHONE, name: MOMO_ACCOUNT_NAME } : null,
            paymentProof: isBank ? {
                autoVerified: paymentProofVerified,
                ocrExtract: paymentProofOcrText ? paymentProofOcrText.slice(0, 1000) : '',
                imageData: paymentProofImageData || '',
                uploadedAt: new Date().toISOString()
            } : null
        };

        await saveOrderWithBackendFallback(newOrder);

        cart = cart.filter(x => !x.selected);
        localStorage.setItem('cart', JSON.stringify(cart));
        currentDiscount = 0;
        renderCart();
        updateHeaderAuth();
        closeModal('checkoutModal');
        showToast("Dat hang thanh cong!", "success");
    } catch (error) {
        console.error('Order confirmation failed:', error);
        showToast("Loi luu don hang. Vui long thu lai!", "error");
    } finally {
        if (btnXacNhan) {
            btnXacNhan.disabled = false;
            btnXacNhan.innerText = "HOAN TAT DON HANG";
            if (isBank) setConfirmButtonForBank(paymentProofVerified); else setConfirmButtonForBank(true);
        }
    }
};
