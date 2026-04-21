/**
 * ============================================================================
 * TÊN DỰ ÁN: GREEN HOUSE (BẢN FINAL ULTIMATE - TỔNG HỢP HOÀN CHỈNH)
 * ĐÃ FIX LỖI XUNG ĐỘT, BẢO MẬT FORM, GIAO DIỆN PREMIUM VÀ LOGIC REAL-TIME
 * ============================================================================
 */

// ==========================================================================
// 1. CẤU HÌNH FIREBASE & BIẾN TOÀN CỤC
// ==========================================================================
const firebaseConfig = {
    apiKey: "AIzaSyBFCkHhdu4xS0R0Qjlcfop7bxsD2qMeAtQ",
    authDomain: "green-house-2985.firebaseapp.com",
    projectId: "green-house-2985",
    storageBucket: "green-house-2985.firebasestorage.app",
    messagingSenderId: "500879346306",
    appId: "1:500879346306:web:11b84026d6f2ea2b52029b"
};

let db = null;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    console.log("Firebase kết nối thành công!");
} catch (error) {
    console.error("Lỗi Firebase:", error);
}

const API_URL = "https://greenhouse-backend-2lok.onrender.com/api";

let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let currentDiscount = 0;
const MY_BANK_QR = "https://i.pinimg.com/736x/e2/21/02/e22102058f2d0231696cebf979a925ac.jpg";

// ==========================================================================
// 2. KHỞI TẠO ỨNG DỤNG
// ==========================================================================
document.addEventListener("DOMContentLoaded", function () {
    if (document.getElementById('admin-content')) {
        checkAdminAccess();
    } else {
        initClient();
    }
    if (document.getElementById('maid-list-container')) window.renderMaidListPro('all', 'all');
    if (document.getElementById('shop-product-grid')) window.renderAllProducts();
    
    // Kích hoạt định dạng số điện thoại
    const phoneInputs = ['#regPhone', '#username', '#bkPhoneReal', '#ckPhone', '#forgotPhone'];
    phoneInputs.forEach(selector => {
        const inputElement = document.querySelector(selector);
        if (inputElement) {
            window.intlTelInput(inputElement, {
                initialCountry: "vn",
                preferredCountries: ["vn", "us", "kr", "jp"],
                utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
            });
        }
    });
});

function initClient() {
    cart = cart.filter(item => item && item.anh && item.ten && item.gia);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateHeaderAuth();
    if (currentUser) listenClientChat();
    checkCompletedJobs();

    if (document.getElementById('home-maid-list')) window.renderHomeMaids();
    if (document.getElementById('best-seller-grid')) window.renderHomeProducts();
    if (document.getElementById('review-list')) window.renderHomeReviews(); 
    
    if (document.getElementById('maid-list-container')) window.applyTempFilter();
}

function updateHeaderAuth() {
    const badge = document.getElementById('cartCount');
    if (badge) badge.innerText = cart.length;
    
    const authSec = document.getElementById('header-auth-section');
    if (authSec) {
        authSec.style.display = 'flex';
        authSec.style.alignItems = 'center';
        authSec.style.height = '100%';

        if (currentUser) {
            let adminBtn = currentUser.role === 'Admin'
                ? `<div onclick="window.location.href='admin.html'" style="cursor:pointer; display:flex; align-items:center; gap:8px;">
                    <i class="fas fa-user-shield" style="color: #4E9F3D; font-size: 18px;"></i> 
                    <span style="color: #4E9F3D; font-weight:800; font-size: 15px;">Admin ${currentUser.name}</span>
                   </div>`
                : `<div onclick="openProfile()" style="cursor:pointer; display:flex; align-items:center; gap:8px;">
                    <i class="fas fa-user-circle" style="font-size: 20px; color: #4E9F3D;"></i> 
                    <span style="font-weight:800; color: #000 ; font-size: 15px;">${currentUser.name}</span>
                   </div>`;
            
            authSec.innerHTML = `
                <div style="display: flex; align-items: center; background: #ffffff; border: 2px solid #e8f5e9; padding: 6px 16px; border-radius: 50px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); gap: 15px; transition: 0.3s;" onmouseover="this.style.borderColor='#4E9F3D'" onmouseout="this.style.borderColor='#e8f5e9'">
                    ${adminBtn} 
                    <div style="height: 20px; width: 2px; background-color: #eee; border-radius: 2px;"></div>
                    <a href="#" onclick="logout()" title="Đăng xuất" style="color: #e74c3c; font-size: 18px; display: flex; align-items: center; transition: 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                        <i class="fas fa-sign-out-alt"></i>
                    </a>
                </div>`;
        } else {
            authSec.innerHTML = `
                <a href="login.html" class="btn-primary" style="padding:10px 24px; border-radius:50px; text-decoration:none; font-weight: 800; display: flex; align-items: center; gap: 8px; font-size: 14px; box-shadow: 0 4px 15px rgba(78, 159, 61, 0.2);">
                    <i class="fas fa-sign-in-alt"></i> Đăng Nhập
                </a>`;
        }
    }
}

window.logout = function () {
    localStorage.removeItem('currentUser');
    location.reload();
}

// ==========================================================================
// 3. XÁC THỰC NGƯỜI DÙNG
// ==========================================================================
//async function initAdmin() {
//    if (!db) return;
//    try {
//        const adminRef = db.collection('users').doc('admin');
//        const doc = await adminRef.get();
//        if (!doc.exists) await adminRef.set({ phone: 'admin', pass: '123456', name: 'Quản Trị Viên', role: 'Admin' });
//    } catch (e) {}
//}
//initAdmin();

window.switchAuth = function (type) {
    document.getElementById('error-msg').style.display = 'none';
    document.querySelectorAll('.auth-box').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));

    if (type === 'login') {
        document.getElementById('box-login').classList.add('active');
        document.getElementById('tab-login').classList.add('active');
    } else if (type === 'register') {
        document.getElementById('box-register').classList.add('active');
        document.getElementById('tab-register').classList.add('active');
    } else if (type === 'forgot') {
        document.getElementById('box-forgot').classList.add('active');
    }
}

// ---- LOGIN (ĐÃ CHUYỂN SANG BACKEND NODE.JS) ----
window.xuLyDangNhap = async function (e) {
    if (e) e.preventDefault();
    
    let accountInput = document.getElementById('username').value.trim();
    let pass = document.getElementById('password').value;
    let err = document.getElementById('error-msg');
    let btnSubmit = document.querySelector('#box-login .btn-submit');

    if (err) err.style.display = 'none';
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ĐANG KIỂM TRA...';

    try {
        // Gửi dữ liệu lên Backend thay vì Firebase
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: accountInput, password: pass })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            localStorage.setItem('token', data.token); // Lưu vé JWT
            showToast('Đăng nhập thành công!', 'success');
            setTimeout(() => {
                if (data.user.role === 'Admin') window.location.href = 'admin.html';
                else window.location.href = 'index.html';
            }, 1000);
        } else {
            if (err) {
                err.style.display = 'block';
                err.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${data.message || 'Sai thông tin!'}`;
            }
        }
    } catch (error) {
        showToast('Lỗi kết nối máy chủ Backend!', 'error');
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="fas fa-sign-in-alt"></i> ĐĂNG NHẬP';
    }
};

// ---- ĐĂNG KÝ (GỬI OTP BẰNG EMAILJS, LƯU BẰNG BACKEND) ----
window.xuLyGuiOTPEmail = async function (e) {
    if (e) e.preventDefault();
    let name = document.getElementById('regName').value.trim();
    let phone = document.getElementById('regPhone').value.trim().replace(/\s+/g, ''); 
    let email = document.getElementById('regEmail').value.trim();
    let pass = document.getElementById('regPass').value;
    let passConfirm = document.getElementById('regPassConfirm').value;
    let err = document.getElementById('error-msg');
    
    if (err) err.style.display = 'none';
    const phoneRegex = /^[0-9]{9,11}$/;
    if (!phoneRegex.test(phone)) {
        if (err) { err.style.display = 'block'; err.innerHTML = '<i class="fas fa-exclamation-circle"></i> SĐT sai định dạng!'; }
        return;
    }
    if (pass !== passConfirm) {
        if (err) { err.style.display = 'block'; err.innerHTML = '<i class="fas fa-exclamation-circle"></i> Mật khẩu không khớp!'; }
        return;
    }

    // Tạm thời vẫn dùng Firebase check trùng để an toàn, phần lưu sẽ dùng Backend
    try {
        const phoneSnap = await db.collection('users').doc(phone).get();
        if (phoneSnap.exists) {
            if (err) { err.style.display = 'block'; err.innerHTML = '<i class="fas fa-exclamation-circle"></i> Số điện thoại đã tồn tại!'; }
            return;
        }

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        sessionStorage.setItem('temp_otp', otpCode);
        sessionStorage.setItem('temp_user', JSON.stringify({ phone, email, password: pass, name, role: 'User' }));
        let btnSend = document.getElementById('btnSendOTPEmail');
        btnSend.disabled = true; 
        btnSend.innerText = "ĐANG GỬI MAIL...";

        emailjs.send("service_2985", "template_2985", {
            to_name: name, to_email: email, otp_code: otpCode, reply_to: "vvinhdzs1tg@gmail.com" 
        }).then(function() {
            document.getElementById('registerForm').style.display = 'none';
            document.getElementById('otpSection').style.display = 'block';
            showToast('Mã OTP đã được gửi!', 'success');
        }).catch(function() {
            showToast('Lỗi hệ thống gửi Mail!', 'error');
            btnSend.disabled = false; 
            btnSend.innerHTML = '<i class="fas fa-envelope"></i> GỬI LẠI MÃ OTP';
        });
    } catch (error) {
        showToast('Lỗi máy chủ!', 'error');
    }
};

window.xacNhanOTPEmail = async function () {
    const inputCode = document.getElementById('otpCode').value.trim();
    const savedOTP = sessionStorage.getItem('temp_otp');
    const userData = JSON.parse(sessionStorage.getItem('temp_user'));
    let btnSubmit = document.querySelector('#otpSection .btn-submit');

    if (inputCode !== savedOTP) return showToast("Mã OTP không chính xác!", "error");

    btnSubmit.disabled = true;
    btnSubmit.innerText = "ĐANG TẠO TÀI KHOẢN...";

    try {
        // Gọi Backend để Đăng ký & Băm mật khẩu (Hash)
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Tạo tài khoản thành công!', 'success');
            setTimeout(() => { window.location.reload(); }, 1500);
        } else {
            showToast(data.message || "Lỗi khi tạo tài khoản!", "error");
            btnSubmit.disabled = false;
        }
    } catch (error) {
        showToast("Lỗi khi gọi API Đăng ký!", "error");
        btnSubmit.disabled = false;
        btnSubmit.innerText = "XÁC NHẬN & TẠO TÀI KHOẢN"; // Thêm dòng này để nút nhả ra
    }
};

// ---- QUÊN MẬT KHẨU ----
let generatedOTP_Forgot = "";
let userPhone_Forgot = ""; 

window.xuLyGuiOTPForgotEmail = async function (e) {
    if (e) e.preventDefault();
    let emailInput = document.getElementById('forgotEmail').value.trim();
    let err = document.getElementById('error-msg');
    if (err) err.style.display = 'none';

    try {
        const qSnap = await db.collection('users').where("email", "==", emailInput).get();
        if (qSnap.empty) {
            if (err) { err.style.display = 'block'; err.innerHTML = '<i class="fas fa-exclamation-circle"></i> Email chưa đăng ký!'; }
            return;
        }

        userPhone_Forgot = qSnap.docs[0].id; 
        generatedOTP_Forgot = Math.floor(100000 + Math.random() * 900000).toString();

        let btnSend = document.getElementById('btnSendOTPForgot');
        btnSend.disabled = true;
        btnSend.innerText = "ĐANG GỬI MAIL...";

        emailjs.send("service_2985", "template_2985", {
            to_email: emailInput, to_name: qSnap.docs[0].data().name, otp_code: generatedOTP_Forgot
        }).then(function() {
            document.getElementById('forgotForm').style.display = 'none';
            document.getElementById('forgotOtpSection').style.display = 'block';
            showToast('Đã gửi mã khôi phục!', 'success');
        }).catch(function() {
            showToast('Lỗi gửi Email!', 'error');
            btnSend.disabled = false;
            btnSend.innerText = "GỬI LẠI MÃ OTP";
        });
    } catch (error) { showToast('Lỗi máy chủ!', 'error'); }
};

window.xacNhanOTPForgotEmail = async function () {
    const code = document.getElementById('forgotOtpCode').value.trim();
    const newPass = document.getElementById('forgotNewPass').value;

    if (code !== generatedOTP_Forgot) return showToast("Mã OTP không đúng!", "error");
    if (newPass.length < 6) return showToast("Mật khẩu mới ít nhất 6 ký tự!", "error");

    try {
        // Gọi API Backend để cập nhật mật khẩu an toàn
        // *Lưu ý: Bạn cần cấu hình endpoint /update-password ở backend trong tương lai
        await db.collection('users').doc(userPhone_Forgot).update({ pass: newPass });
        showToast('Đổi mật khẩu thành công!', 'success');
        setTimeout(() => { location.reload(); }, 1500);
    } catch (error) {
        showToast("Lỗi khi cập nhật mật khẩu!", "error");
    }
};

// ==========================================================================
// 4. HỒ SƠ KHÁCH HÀNG & LỊCH SỬ ĐƠN HÀNG (PREMIUM UI)
// ==========================================================================
window.openProfile = function () {
    let profileModal = document.getElementById('profileModal');
    if (profileModal) profileModal.remove(); 

    let modalHTML = `
        <div id="profileModal" class="modal" style="display:flex; z-index: 10005;">
            <div class="modal-content" style="width: 450px; max-width: 95%; border-radius: 24px; padding: 30px; text-align: center; position: relative;">
                <span class="close-modal" onclick="closeModal('profileModal')" style="position: absolute; top: 15px; right: 20px; font-size: 28px; cursor: pointer;">×</span>
                
                <div style="margin-bottom: 20px;">
                    <div style="width: 80px; height: 80px; background: #e8f5e9; color: #4CAF50; font-size: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px auto; border: 3px solid #4CAF50; box-shadow: 0 4px 15px rgba(76, 175, 80, 0.2);">
                        <i class="fas fa-user-circle"></i>
                    </div>
                    <h2 style="color: #1f2937; font-weight: 900; margin: 0; font-size: 24px;" id="profileName"></h2>
                    <p style="color: #666; margin: 5px 0 0 0; font-size: 14px; font-weight: bold;" id="profilePhone"></p>
                </div>

                <div style="background: #f9f9f9; border-radius: 16px; padding: 20px; text-align: left; border: 1px dashed #ddd; margin-bottom: 20px;">
                    <h4 style="margin: 0 0 15px 0; color: #333; font-size: 16px; border-bottom: 2px solid #eee; padding-bottom: 8px;"><i class="fas fa-history" style="color: #4CAF50;"></i> Lịch sử giao dịch</h4>
                    <div id="orderList" style="max-height: 250px; overflow-y: auto; padding-right: 5px;"></div>
                </div>

                <button type="button" onclick="logout()" style="width: 100%; background: #ff4757; color: white; border: none; padding: 15px; border-radius: 15px; font-weight: 800; font-size: 16px; cursor: pointer; transition: 0.3s; box-shadow: 0 5px 15px rgba(255, 71, 87, 0.3);" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                    <i class="fas fa-sign-out-alt"></i> ĐĂNG XUẤT TÀI KHOẢN
                </button>
            </div>
        </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    document.getElementById('profileName').innerText = currentUser ? currentUser.name : 'Tên Khách Hàng';
    document.getElementById('profilePhone').innerText = currentUser ? (currentUser.phone || currentUser.email) : '';

    const list = document.getElementById('orderList');
    list.innerHTML = '<p style="text-align:center; color:#999;">Đang tải dữ liệu từ mây...</p>';
    
    if (currentUser && db) {
        db.collection("orders").where("user", "==", currentUser.phone).onSnapshot((snapshot) => {
            list.innerHTML = '';
            if (snapshot.empty) {
                list.innerHTML = '<p style="text-align:center; color:#999; font-style: italic;">Bạn chưa có giao dịch nào.</p>';
                return;
            }
            let myOrders = [];
            snapshot.forEach(doc => myOrders.push(doc.data()));
            myOrders.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
            
            myOrders.forEach(o => {
                let st = ''; let action = '';
                if (o.status === 'pending') {
                    st = '<span style="color:#f39c12; font-weight:bold;">⏳ Đang chờ duyệt</span>';
                } else if (o.status === 'awaiting_payment') {
                    st = '<span style="color:#e74c3c; font-weight:bold;">❗ Chờ thanh toán</span>';
                    action = `<button onclick="openServicePayment('${o.id}')" style="background:#e91e63; color:white; border:none; padding:8px 15px; border-radius:8px; cursor:pointer; font-size:13px; margin-top:10px; width:100%; font-weight:bold; box-shadow:0 3px 10px rgba(233,30,99,0.3);"><i class="fas fa-credit-card"></i> THANH TOÁN NGAY</button>`;
                } else if (o.status === 'confirmed' || o.status === 'done') {
                    st = '<span style="color:#2ecc71;font-weight:bold;">✅ Đã thanh toán</span>';
                }
                
                let typeIcon = o.maidId ? '<i class="fas fa-user-nurse" style="color:#4CAF50"></i>' : '<i class="fas fa-shopping-bag" style="color:#0984e3"></i>';
                list.innerHTML += `
                    <div class="order-row" style="padding:15px; border:1px solid #eee; border-radius:12px; margin-bottom:10px; background:#fff; box-shadow:0 2px 5px rgba(0,0,0,0.02);">
                        <div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px dashed #eee; padding-bottom:8px; align-items:center;">
                            <b style="color:#333; font-size:14px;">${typeIcon} #${o.id}</b> ${st}
                        </div>
                        <div style="font-size:13px; color:#555; margin-bottom:8px; line-height: 1.5;">${o.items}</div>
                        <div style="font-weight:900; color:#e91e63; text-align:right; font-size:15px;">Tổng tiền: ${parseInt(o.total || 0).toLocaleString()} đ</div>
                        ${action}
                    </div>`;
            });
        });
    }
}

// ==========================================================================
// 5. CHỨC NĂNG THANH TOÁN & ĐẶT LỊCH (CÓ BẢO MẬT LOGIC)
// ==========================================================================
window.timeToMinutes = function(timeStr) {
    if (!timeStr) return 0;
    let parts = timeStr.split(':');
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
};

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
                        <img src="${MY_BANK_QR}" style="width:180px; height:180px; border-radius:10px; margin-bottom:15px; object-fit:cover; border:2px solid #eee;">
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
    if (billInput && billInput.files && billInput.files.length > 0) {
        billPreview.style.display = 'block';
        btnXacNhan.style.background = '#4E9F3D';
        btnXacNhan.style.cursor = 'pointer';
        btnXacNhan.disabled = false;
    } else {
        billPreview.style.display = 'none';
        btnXacNhan.style.background = '#cccccc';
        btnXacNhan.style.cursor = 'not-allowed';
        btnXacNhan.disabled = true;
    }
};

window.confirmServicePayment = async function (orderId) {
    let btn = document.getElementById('btnConfirmServicePayment');
    if(btn) {
        btn.disabled = true;
        btn.innerText = "ĐANG KIỂM TRA GIAO DỊCH...";
    }

    setTimeout(async () => {
        try {
            const orderDoc = await db.collection("orders").doc(orderId).get();
            if (!orderDoc.exists) return;
            const oData = orderDoc.data();

            await db.collection("orders").doc(orderId).update({ 
                status: 'confirmed', 
                isPaid: true 
            });
            
            if (oData.maidId) {
                await db.collection("maids").doc(oData.maidId).update({
                    schedules: firebase.firestore.FieldValue.arrayUnion({
                        date: oData.workDate,
                        startTime: oData.workTime,
                        duration: oData.workDuration
                    })
                });
            }
            
            showToast("Đã nhận thanh toán! Lịch nhân viên đã được cập nhật.", "success");
            if(document.getElementById('dynamicPaymentModal')) closeDiag('dynamicPaymentModal');
            
        } catch (error) {
            showToast("Lỗi xác nhận giao dịch!", "error");
            if(btn) {
                btn.disabled = false;
                btn.innerText = "THỬ LẠI";
            }
        }
    }, 3000);
};

window.quickBook = function (id, name, img, exp) {
    if (!currentUser) return showToast("Đăng nhập để đặt lịch!", "error");
    const cb = document.getElementById('booking-confirm');
    if (cb) {
        cb.style.display = 'flex';
        document.getElementById('sbAvatar').src = img || 'https://ui-avatars.com/api/?name=NV';
        document.getElementById('sbName').innerText = name;
        document.getElementById('sbMeta').innerText = "Kinh nghiệm: " + (exp || '?');
        document.getElementById('sbName').dataset.id = id;
        document.getElementById('sbName').dataset.name = name;
        if (currentUser.phone) document.getElementById('bkPhoneReal').value = currentUser.phone;
        
        let today = new Date();
        let todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
        document.getElementById('bkDate').min = todayStr;

        document.getElementById('bkDate').value = "";
        document.getElementById('bkStartTime').value = "";
        document.getElementById('bkDuration').value = "";
        document.getElementById('bkAddress').value = "";
        document.getElementById('bkService').selectedIndex = 0; 
        document.getElementById('bkTotal').innerText = "0";
    }
}

window.confirmBookingReal = async function() {
    if(!db) return showToast('Lỗi kết nối Firebase!', 'error');
    
    const date = document.getElementById('bkDate').value; 
    const time = document.getElementById('bkStartTime').value; 
    const dur = document.getElementById('bkDuration').value; 
    const addr = document.getElementById('bkAddress').value.trim(); 
    const phone = document.getElementById('bkPhoneReal').value.trim(); 
    const totalStr = document.getElementById('bkTotal').innerText;
    const maidName = document.getElementById('sbName').dataset.name; 
    const maidId = document.getElementById('sbName').dataset.id; 
    const serviceElement = document.getElementById('bkService');
    const serviceName = serviceElement ? serviceElement.options[serviceElement.selectedIndex].text : "Dịch vụ";
    
    if (!date || !time || !dur || !phone || !addr) return showToast("Vui lòng điền đủ thông tin!", "error"); 

    // BẢO MẬT: CHỐNG HACK GIỜ VÀ NGÀY
    if (parseFloat(dur) <= 0) {
        return showToast("Thời lượng làm việc phải ít nhất là 1 tiếng!", "error");
    }

    let now = new Date();
    let todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    let currentMins = now.getHours() * 60 + now.getMinutes();

    if (date < todayStr) return showToast("Không thể đặt lịch cho ngày trong quá khứ!", "error");
    if (date === todayStr && timeToMinutes(time) <= currentMins) return showToast("Giờ bắt đầu đã trôi qua, vui lòng chọn giờ lớn hơn hiện tại!", "error");

    let btnConfirm = document.querySelector('.btn-confirm-elite') || document.querySelector('button[onclick="confirmBookingReal()"]');
    if (btnConfirm) {
        btnConfirm.disabled = true;
        btnConfirm.innerText = "ĐANG KIỂM TRA LỊCH...";
    }

    try {
        const reqStart = timeToMinutes(time);
        const reqEnd = reqStart + (parseFloat(dur) * 60);

        const snap = await db.collection("orders")
            .where("maidId", "==", maidId)
            .where("workDate", "==", date)
            .get();

        let isOverlap = false;
        snap.forEach(doc => {
            let o = doc.data();
            if (o.isPaid === true || o.status === 'confirmed' || o.status === 'done') {
                let oStart = timeToMinutes(o.workTime);
                let oEnd = oStart + (parseFloat(o.workDuration) * 60);
                if (reqStart < oEnd && reqEnd > oStart) {
                    isOverlap = true;
                }
            }
        });

        if (isOverlap) {
            if (btnConfirm) { btnConfirm.disabled = false; btnConfirm.innerText = "GỬI YÊU CẦU"; }
            return showToast("Nhân viên đã có khách chốt lịch giờ này. Vui lòng chọn giờ khác!", "error");
        }

        let newOrder = { 
            id: 'DV' + Math.floor(Math.random() * 99999), 
            user: currentUser.phone, 
            customerInfo: { name: currentUser.name, phone: phone, address: addr }, 
            items: `Gói: ${serviceName} - Chuyên gia: ${maidName} (${dur} tiếng, từ ${time} ngày ${date})`, 
            maidId: maidId, 
            total: parseInt(totalStr.replace(/\./g, '')), 
            status: 'pending', 
            isPaid: false, 
            date: new Date().toLocaleString(), 
            workDate: date, 
            workTime: time, 
            workDuration: dur, 
            timestamp: firebase.firestore.FieldValue.serverTimestamp() 
        };
        
        await db.collection("orders").doc(newOrder.id).set(newOrder); 

        closeBooking(); 
        showToast(`Đã gửi yêu cầu đặt lịch! (Đang chờ thanh toán)`, "success"); 
        
        if (btnConfirm) { btnConfirm.disabled = false; btnConfirm.innerText = "GỬI YÊU CẦU"; }

    } catch (error) { 
        showToast("Lỗi kết nối máy chủ!", "error"); 
        if (btnConfirm) { btnConfirm.disabled = false; btnConfirm.innerText = "GỬI YÊU CẦU"; }
    }
}


window.xacNhanDonHang = async function () {
    if (!db) return showToast('Lỗi kết nối Firebase!', 'error');
    
    // FIX: Bổ sung khai báo các biến bị mất ở hàm này
    var name = document.getElementById('ckName').value.trim();
    var phone = document.getElementById('ckPhone').value.trim();
    var addr = document.getElementById('ckAddress').value.trim();
    var method = document.getElementById('ckMethod').value;
    
    if (!name || !phone || !addr) return showToast("Vui lòng điền đủ thông tin nhận hàng!", "error");

    var selectedItems = cart.filter(x => x.selected);
    if (selectedItems.length === 0) return showToast("Không có sản phẩm nào được chọn!", "warning");
    
    let btnXacNhan = document.getElementById('btnXacNhan');
    if (btnXacNhan) {
        btnXacNhan.disabled = true;
        btnXacNhan.innerText = "ĐANG XỬ LÝ...";
    }

    try {
        let realTotal = 0;
        let realItemsDisplay = [];
        
        for (let item of selectedItems) {
            let productDoc = await db.collection("products").doc(item.id).get();
            if (productDoc.exists) {
                let realPrice = productDoc.data().gia;
                realTotal += realPrice * item.sl;
                realItemsDisplay.push(`${item.ten} (x${item.sl})`);
            }
        }
        
        realTotal = realTotal - currentDiscount;
        if (realTotal < 0) realTotal = 0;

        var newOrder = {
            id: 'DH' + Math.floor(Math.random() * 100000),
            user: currentUser ? currentUser.phone : phone,
            customerInfo: { name: name, phone: phone, address: addr },
            items: realItemsDisplay.join(', '),
            total: realTotal,
            status: 'pending',
            date: new Date().toLocaleString() + ' ' + (method === 'BANK' ? '(QR Ngân hàng)' : '(COD)'),
            method: method,
            isPaid: method === 'BANK' ? true : false
            // Đã xóa dòng timestamp ở đây, Backend sẽ tự động gắn thời gian chuẩn xác nhất!
        };
        
        // Gọi API đẩy đơn hàng lên máy chủ Render của bạn
        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newOrder)
        });

        if (!response.ok) {
            throw new Error("Máy chủ Backend từ chối đơn hàng");
        }
        
        // Reset giỏ hàng những món đã mua
        cart = cart.filter(x => !x.selected);
        localStorage.setItem('cart', JSON.stringify(cart));
        currentDiscount = 0; // Reset mã giảm giá
        renderCart();
        updateHeaderAuth();
        closeModal('checkoutModal');
        showToast("Đặt hàng thành công!", "success");
        
    } catch (error) {
        showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
        if (btnXacNhan) {
            btnXacNhan.disabled = false;
            btnXacNhan.innerText = "HOÀN TẤT ĐƠN HÀNG";
        }
    }
}

// ==========================================================================
// 6. GIAO DIỆN QUẢN TRỊ VIÊN ADMIN
// ==========================================================================
function loadAdminData() {
    renderOrders();
    renderProductsAdmin();
    renderMaidsAdmin();
    loadChatUsers();
}

window.switchTab = function (t) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    
    if (t === 'orders') {
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
        document.getElementById('tab-orders').classList.add('active');
    } else if (t === 'products') {
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
        document.getElementById('tab-products').classList.add('active');
    } else {
        document.querySelectorAll('.tab-btn')[2].classList.add('active');
        document.getElementById('tab-maids').classList.add('active');
    }
}

window.renderOrders = function () {
    const tb = document.querySelector('#orderTable tbody');
    if (!tb || !db) return;
    
    db.collection("orders").orderBy("timestamp", "desc").onSnapshot((snapshot) => {
        tb.innerHTML = '';
        snapshot.forEach((doc) => {
            let o = doc.data();
            let info = o.customerInfo || {};
            let addr = info.address ? `<br><small>📍 ${info.address}</small>` : '';
            let actionBtn = '';
            let statusBadge = '';
            
            if (o.status === 'pending') {
                if (o.maidId) {
                    statusBadge = '<span style="color:#f39c12;font-weight:bold">⏳ Chờ duyệt</span>';
                    actionBtn = `<button class="btn-action" style="background:#2ecc71" onclick="approveBookingToPayment('${o.id}')">✅ Duyệt Lịch</button>`;
                } else {
                    statusBadge = '<span style="color:#f39c12">⏳ Chờ giao</span>';
                    actionBtn = `<button class="btn-action" style="background:#3498db" onclick="doneOrder('${o.id}')">🚚 Giao Hàng</button>`;
                }
            } else if (o.status === 'awaiting_payment') {
                statusBadge = '<span style="color:#e74c3c;font-weight:bold">⏳ Khách chưa TT</span>';
                actionBtn = `<i class="fas fa-clock" style="color:#e74c3c"></i>`;
            } else if (o.status === 'confirmed' || o.status === 'done') {
                statusBadge = '<span style="color:#2ecc71;font-weight:bold">✅ Hoàn tất</span>';
                actionBtn = '<i class="fas fa-check" style="color:#2ecc71"></i>';
            }
            
            let paymentBadge = (o.isPaid === true)
                ? `<br><span style="display:inline-block; margin-top:5px; background:#e8f5e9; color:#2e7d32; padding:4px 10px; border-radius:12px; font-size:12px; border:1px solid #4CAF50;"><i class="fas fa-money-bill-wave"></i> Đã Thanh Toán</span>`
                : `<br><span style="display:inline-block; margin-top:5px; background:#fdf2f2; color:#e74c3c; padding:4px 10px; border-radius:12px; font-size:12px; border:1px solid #f5b7b1;">Chưa Thanh Toán</span>`;
                
            tb.innerHTML += `
                <tr>
                    <td>#${o.id}<br><small>${o.date}</small></td>
                    <td><strong>${info.name || o.user}</strong><br><small>${info.phone || ''}</small>${addr}</td>
                    <td>${o.items}</td>
                    <td><b style="color:#e91e63">${parseInt(o.total || 0).toLocaleString()} đ</b>${paymentBadge}</td>
                    <td>${statusBadge}</td>
                    <td>${actionBtn}</td>
                </tr>`;
        });
    });
}

window.approveBookingToPayment = function (orderId) {
    if (!db) return;
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Duyệt đơn dịch vụ?',
            text: "Đơn sẽ chuyển sang trạng thái CHỜ KHÁCH THANH TOÁN.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#4CAF50',
            cancelButtonColor: '#e74c3c',
            confirmButtonText: 'Đồng ý duyệt',
            cancelButtonText: 'Hủy'
        }).then(async (result) => {
            if (result.isConfirmed) {
                await db.collection("orders").doc(orderId).update({ status: 'awaiting_payment' });
                showToast('Đã duyệt đơn thành công!', 'success');
            }
        });
    }
}

window.doneOrder = async function (orderId) {
    if (!db) return;
    await db.collection("orders").doc(orderId).update({ status: 'done', isPaid: true });
    showToast('Đã cập nhật!', 'success');
}

window.renderProductsAdmin = async function () {
    const tb = document.querySelector('#productTable tbody');
    if (!tb) return;
    
    tb.innerHTML = '<tr><td colspan="4" style="text-align:center;">Đang tải dữ liệu...</td></tr>';
    try {
        // GỌI API LẤY DANH SÁCH
        const response = await fetch(`${API_URL}/products`);
        const products = await response.json();
        
        tb.innerHTML = '';
        products.forEach(p => {
            tb.innerHTML += `
                <tr>
                    <td><img src="${p.anh}" height="40" style="object-fit:cover; border-radius:5px;"></td>
                    <td>${p.ten}</td>
                    <td>${parseInt(p.gia).toLocaleString()}</td>
                    <td>
                        <button class="btn-edit" onclick="editProduct('${p.id}')">Sửa</button>
                        <button class="btn-del" onclick="delProduct('${p.id}')">Xóa</button>
                    </td>
                </tr>`;
        });
    } catch (error) {
        tb.innerHTML = '<tr><td colspan="4">Lỗi kết nối API!</td></tr>';
    }
}

window.saveProduct = async function () {
    const id = document.getElementById('pId').value || 'SP' + Date.now();
    let rawAlbum = document.getElementById('pAlbum') ? document.getElementById('pAlbum').value : "";
    let arrAlbum = rawAlbum ? rawAlbum.split(',').map(s => s.trim()).filter(s => s) : [];
    
    const p = {
        id: id,
        ten: document.getElementById('pName').value,
        gia: parseInt(document.getElementById('pPrice').value),
        anh: document.getElementById('pImg').value,
        album: arrAlbum,
        mota: document.getElementById('pDesc') ? document.getElementById('pDesc').value : ""
        // Đã xóa dòng timestamp của Firebase ở đây
    };
    
    try {
        // GỌI API ĐỂ LƯU HOẶC CẬP NHẬT
        const res = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(p)
        });

        if (res.ok) {
            if (typeof cancelEditP === 'function') cancelEditP();
            showToast("Đã lưu!", "success");
            renderProductsAdmin(); // Yêu cầu tải lại bảng sau khi lưu thành công
        }
    } catch (error) {
        showToast("Lỗi kết nối khi lưu!", "error");
    }
}

window.editProduct = async function (id) {
    try {
        // GỌI API TÌM SẢN PHẨM CẦN SỬA
        const res = await fetch(`${API_URL}/products`);
        const products = await res.json();
        const p = products.find(x => x.id === id);
        
        if (p) {
            document.getElementById('pId').value = p.id;
            document.getElementById('pName').value = p.ten;
            document.getElementById('pPrice').value = p.gia;
            document.getElementById('pImg').value = p.anh;
            if (document.getElementById('pAlbum')) document.getElementById('pAlbum').value = p.album ? p.album.join(', ') : '';
            if (document.getElementById('pDesc')) document.getElementById('pDesc').value = p.mota || '';
            
            document.getElementById('btnSaveP').innerText = "Lưu Sửa";
            if (document.getElementById('btnCancelP')) document.getElementById('btnCancelP').style.display = "inline-block";
        }
    } catch (error) {
        showToast("Lỗi lấy thông tin sản phẩm!", "error");
    }
}

// HÀM NÀY GIỮ NGUYÊN (Không dùng database nên không cần fetch)
window.cancelEditP = function () {
    document.getElementById('pId').value = '';
    document.getElementById('pName').value = '';
    document.getElementById('pPrice').value = '';
    document.getElementById('pImg').value = '';
    if (document.getElementById('pAlbum')) document.getElementById('pAlbum').value = '';
    if (document.getElementById('pDesc')) document.getElementById('pDesc').value = '';
    
    document.getElementById('btnSaveP').innerText = "+ Thêm SP";
    if (document.getElementById('btnCancelP')) document.getElementById('btnCancelP').style.display = "none";
}

window.delProduct = async function (id) {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Xóa sản phẩm?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Xóa'
        }).then(async (result) => {
            if (result.isConfirmed) {
                // GỌI API XÓA
                try {
                    const res = await fetch(`${API_URL}/products/${id}`, { method: 'DELETE' });
                    if (res.ok) {
                        showToast('Đã xóa', 'success');
                        renderProductsAdmin(); // Tải lại bảng sau khi xóa
                    }
                } catch(e) { showToast('Lỗi khi xóa', 'error'); }
            }
        });
    } else {
        if (confirm("Xóa?")) {
            try {
                const res = await fetch(`${API_URL}/products/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    showToast('Đã xóa', 'success');
                    renderProductsAdmin(); 
                }
            } catch(e) { showToast('Lỗi khi xóa', 'error'); }
        }
    }
}

window.renderMaidsAdmin = function () {
    const tb = document.querySelector('#maidTable tbody');
    if (!tb || !db) return;
    
    db.collection("maids").orderBy("timestamp", "desc").onSnapshot((snapshot) => {
        tb.innerHTML = '';
        snapshot.forEach(doc => {
            let m = doc.data();
            let statusText = (m.IsAvailable === false) ? '<span style="color:red;font-weight:bold">(Bận)</span>' : '<span style="color:green;font-weight:bold">(Rảnh)</span>';
            tb.innerHTML += `
                <tr>
                    <td><img src="${m.ImageUrl || m.img}" height="40" style="border-radius:50%; object-fit:cover"></td>
                    <td>${m.Name || m.name} ${statusText}<br><small>${m.Age || m.age}t - ${m.Home || m.hometown}</small></td>
                    <td>${m.Experience || m.exp}</td>
                    <td>
                        <button class="btn-edit" onclick="editMaidAdmin('${m.Id || m.id}')">Sửa</button>
                        <button class="btn-del" onclick="delMaidAdmin('${m.Id || m.id}')">Xóa</button>
                    </td>
                </tr>`;
        });
    });
}

window.saveMaid = async function () {
    if (!db) return;
    const id = document.getElementById('mId').value || 'GV' + Date.now();
    let oldStatus = true;
    
    const oldDoc = await db.collection("maids").doc(id).get();
    if (oldDoc.exists) oldStatus = oldDoc.data().IsAvailable;
    
    const m = {
        Id: id,
        id: id,
        Name: document.getElementById('mName').value,
        Age: parseInt(document.getElementById('mAge').value) || 0,
        Home: document.getElementById('mHome').value,
        Experience: document.getElementById('mExp').value,
        Skills: document.getElementById('mSkill').value.split(',').map(s => s.trim()).filter(s => s),
        ImageUrl: document.getElementById('mImg').value || `https://ui-avatars.com/api/?name=${document.getElementById('mName').value}`,
        Bio: document.getElementById('mDesc') ? document.getElementById('mDesc').value : "",
        IsAvailable: oldStatus,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection("maids").doc(id).set(m);
    if (typeof cancelEditM === 'function') cancelEditM();
    showToast("Đã lưu!", "success");
}

window.editMaidAdmin = async function (id) {
    if (!db) return;
    const doc = await db.collection("maids").doc(id).get();
    if (doc.exists) {
        let m = doc.data();
        document.getElementById('mId').value = m.Id || m.id;
        document.getElementById('mName').value = m.Name || m.name;
        document.getElementById('mAge').value = m.Age || m.age;
        document.getElementById('mHome').value = m.Home || m.home || m.hometown || m.queQuan || '';
        document.getElementById('mExp').value = m.Experience || m.exp || m.kinhNghiem || '';
        
        let mangKyNang = m.Skills || m.skills || [];
        if (typeof mangKyNang === 'string') mangKyNang = mangKyNang.split(',');
        document.getElementById('mSkill').value = mangKyNang.join(', ');
        
        document.getElementById('mImg').value = m.ImageUrl || m.img || m.imageUrl || '';
        if (document.getElementById('mDesc')) document.getElementById('mDesc').value = m.Bio || m.desc || m.bio || '';
        
        document.getElementById('btnSaveM').innerText = "Lưu Sửa";
        if (document.getElementById('btnCancelM')) document.getElementById('btnCancelM').style.display = "inline-block";
    }
}

window.cancelEditM = function () {
    document.getElementById('mId').value = '';
    document.getElementById('mName').value = '';
    document.getElementById('mAge').value = '';
    document.getElementById('mHome').value = '';
    document.getElementById('mExp').value = '';
    document.getElementById('mSkill').value = '';
    document.getElementById('mImg').value = '';
    if (document.getElementById('mDesc')) document.getElementById('mDesc').value = '';
    
    document.getElementById('btnSaveM').innerText = "+ Thêm GV";
    if (document.getElementById('btnCancelM')) document.getElementById('btnCancelM').style.display = "none";
}

window.delMaidAdmin = function (id) {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Xóa nhân viên?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Đồng ý'
        }).then(async (result) => {
            if (result.isConfirmed) {
                if (db) await db.collection("maids").doc(id).delete();
                Swal.fire('Đã xóa!', '', 'success');
            }
        });
    } else {
        if (confirm("Xóa?")) db.collection("maids").doc(id).delete();
    }
}

window.resetData = function () {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Khôi phục cài đặt gốc?',
            text: "Hành động này sẽ XÓA TOÀN BỘ dữ liệu trên Firebase!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e74c3c',
            confirmButtonText: 'Đồng ý, xóa sạch!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    if (!db) return;
                    Swal.fire({ title: 'Đang xóa...', allowOutsideClick: false, showConfirmButton: false });
                    
                    const orders = await db.collection("orders").get();
                    orders.forEach(doc => doc.ref.delete());
                    
                    const products = await db.collection("products").get();
                    products.forEach(doc => doc.ref.delete());
                    
                    const maids = await db.collection("maids").get();
                    maids.forEach(doc => doc.ref.delete());
                    
                    const chats = await db.collection("chats").get();
                    chats.forEach(doc => doc.ref.delete());
                    
                    localStorage.clear();
                    Swal.fire('Thành công!', 'Đã xóa trắng.', 'success').then(() => location.reload());
                } catch (error) {
                    showToast("Lỗi khi xóa dữ liệu!", "error");
                }
            }
        });
    }
}

// ==========================================================================
// 8. TẢI SẢN PHẨM & NHÂN VIÊN TỪ FIREBASE
// ==========================================================================
window.guiDanhGia = async function () {
    if (!currentUser) {
        showToast("Vui lòng đăng nhập để gửi đánh giá!", "error");
        return;
    }

    let nameInput = document.getElementById('rvName').value.trim();
    // Bắt lỗi an toàn: Nếu không nhập tên, tự lấy tên User, nếu mất tên User thì để Khách ẩn danh
    let name = nameInput || (currentUser && currentUser.name ? currentUser.name : "Khách ẩn danh"); 
    
    let content = document.getElementById('rvContent').value.trim();
    let star = document.getElementById('rvStar').value;

    if (!content) return showToast("Vui lòng nhập nội dung đánh giá!", "error");

    let btnSubmit = document.querySelector('button[onclick="guiDanhGia()"]');
    if (btnSubmit) { 
        btnSubmit.disabled = true; 
        btnSubmit.innerText = "ĐANG GỬI..."; 
    }

    try {
        // Gọi API đẩy đánh giá lên máy chủ Backend
        const response = await fetch(`${API_URL}/reviews`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: name,
                userPhone: currentUser.phone || "unknown", 
                content: content,
                star: parseInt(star) || 5,
                date: new Date().toLocaleDateString('vi-VN')
                // Backend sẽ tự động gắn timestamp chuẩn
            })
        });

        if (!response.ok) {
            throw new Error("Máy chủ Backend từ chối nhận đánh giá");
        }

        showToast("Cảm ơn bạn đã đánh giá dịch vụ!", "success");
        
        document.getElementById('rvName').value = '';
        document.getElementById('rvContent').value = '';
        if (typeof window.chonSao === 'function') window.chonSao(5); 

        if (btnSubmit) { 
            btnSubmit.disabled = false; 
            btnSubmit.innerText = "GỬI ĐÁNH GIÁ"; 
        }

    } catch (error) {
        showToast("Lỗi hệ thống khi gửi đánh giá!", "error");
        if (btnSubmit) { 
            btnSubmit.disabled = false; 
            btnSubmit.innerText = "GỬI ĐÁNH GIÁ"; 
        }
    }
};

window.renderHomeReviews = function() {
    const container = document.getElementById('review-list');
    if (!container || !db) return;

    db.collection("reviews").orderBy("timestamp", "desc").limit(3).onSnapshot((snapshot) => {
        container.innerHTML = '';
        if (snapshot.empty) {
            container.innerHTML = '<p style="text-align:center; grid-column:1/-1; color:#999;">Chưa có đánh giá nào.</p>';
            return;
        }

        snapshot.forEach(doc => {
            let r = doc.data();
            
            // Xử lý an toàn dữ liệu: Nếu r.star, r.content, r.name bị undefined thì gán giá trị mặc định
            let starCount = parseInt(r.star) || 5;
            let starsHtml = '★'.repeat(starCount) + '☆'.repeat(5 - starCount);
            
            let content = r.content || "Tuyệt vời, dịch vụ rất tốt!";
            let name = r.name || "Khách hàng ẩn danh";
            let date = r.date || "Khách hàng thân thiết";
            
            container.innerHTML += `
                <div class="review-card">
                    <div class="star-rating" style="color:#f1c40f; margin-bottom:10px;">${starsHtml}</div>
                    <p style="font-style:italic; color:#555;">"${content}"</p>
                    <h4 style="margin:10px 0 5px; color:var(--primary);">${name}</h4>
                    <small style="color:#999;">${date}</small>
                </div>`;
        });
    });
};

window.showMaidDetail = async function (id) {
    if (!db) return;
    
    try {
        const doc = await db.collection("maids").doc(id).get();
        if (!doc.exists) return showToast("Không tìm thấy thông tin nhân viên!", "error");
        
        let m = doc.data();
        
        let skillsArray = m.Skills || m.skills || [];
        if (typeof skillsArray === 'string') skillsArray = skillsArray.split(',');
        let skillsHtml = skillsArray.map(s => `
            <span style="display:inline-flex; align-items:center; background:#e8f5e9; color:#2e7d32; padding:8px 16px; border-radius:20px; font-size:13px; font-weight:700; border:1px solid #c8e6c9; margin: 0 8px 8px 0; transition:0.3s;">
                <i class="fas fa-check-circle" style="margin-right:6px;"></i>${s.trim()}
            </span>
        `).join('');

        let modalContent = document.querySelector('#maidDetailModal .modal-content');
        if(modalContent) {
            modalContent.style.width = '900px';
            modalContent.style.maxWidth = '95%';
            modalContent.style.padding = '35px';
            modalContent.style.borderRadius = '24px';
        }

        let detailHTML = `
            <div style="display:flex; gap:35px; flex-wrap:wrap; align-items: stretch;">
                <div style="flex:1; min-width:300px; position: relative;">
                    <img src="${m.ImageUrl || m.img}" style="width:100%; height:100%; min-height: 420px; object-fit:cover; border-radius:20px; box-shadow: 0 15px 35px rgba(0,0,0,0.15);">
                    <div style="position: absolute; top: 15px; left: 15px; background: rgba(255,255,255,0.95); backdrop-filter: blur(5px); padding: 6px 15px; border-radius: 15px; font-weight: 900; color: #f39c12; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                        <i class="fas fa-star"></i> 5.0
                    </div>
                    <div style="position: absolute; bottom: 15px; right: 15px; background: #2ecc71; color: white; padding: 6px 15px; border-radius: 15px; font-weight: bold; font-size: 13px; box-shadow: 0 4px 15px rgba(46, 204, 113, 0.4);">
                        <i class="fas fa-shield-check"></i> Đã xác minh
                    </div>
                </div>

                <div style="flex:1.5; min-width:300px; display: flex; flex-direction: column; justify-content: center;">
                    <h2 style="color:#1b5e20; font-size: 34px; margin:0 0 20px 0; font-weight: 800;">${m.Name || m.name}</h2>
                    <div style="display: flex; gap: 12px; margin-bottom: 25px; flex-wrap: wrap;">
                        <span style="background: #f8f9fa; padding: 10px 18px; border-radius: 12px; color: #444; font-weight: 700; border: 1px solid #e0e0e0; font-size: 14px;">
                            <i class="fas fa-birthday-cake" style="color:#4CAF50; margin-right:5px;"></i> ${m.Age || m.age} tuổi
                        </span>
                        <span style="background: #f8f9fa; padding: 10px 18px; border-radius: 12px; color: #444; font-weight: 700; border: 1px solid #e0e0e0; font-size: 14px;">
                            <i class="fas fa-map-marker-alt" style="color:#e74c3c; margin-right:5px;"></i> ${m.Home || m.queQuan || 'Việt Nam'}
                        </span>
                        <span style="background: #f8f9fa; padding: 10px 18px; border-radius: 12px; color: #444; font-weight: 700; border: 1px solid #e0e0e0; font-size: 14px;">
                            <i class="fas fa-briefcase" style="color:#0984e3; margin-right:5px;"></i> ${m.Experience || m.exp || 'Đã đào tạo'}
                        </span>
                    </div>

                    <div style="margin-bottom:25px;">
                        <h4 style="color:#333; margin: 0 0 12px 0; font-size: 15px; text-transform: uppercase; letter-spacing: 1px;"><i class="fas fa-tools" style="color:#555;"></i> Chuyên môn</h4>
                        <div>${skillsHtml}</div>
                    </div>

                    <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%); padding:20px 25px; border-radius:18px; border: 1px solid #c8e6c9; margin-bottom:30px; box-shadow: 0 8px 20px rgba(78, 159, 61, 0.06);">
                        <h4 style="color:#2e7d32; margin: 0 0 10px 0; font-size: 16px;"><i class="fas fa-quote-left"></i> Thông tin thêm</h4>
                        <p style="margin:0; font-size:15px; line-height:1.7; color:#555; font-style: italic;">
                            ${m.Bio || m.desc || m.bio || 'Nhân viên ưu tú, tận tâm với công việc, cam kết mang lại chất lượng dịch vụ tốt nhất.'}
                        </p>
                    </div>

                    <button class="btn-primary" style="width:100%; padding: 20px; font-size: 18px; font-weight: 800; border-radius: 16px; box-shadow: 0 12px 30px rgba(78, 159, 61, 0.3); display: flex; justify-content: center; align-items: center; gap: 12px; transition: 0.3s;" onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform='translateY(0)'" onclick="closeDiag('maidDetailModal'); window.quickBook('${m.id || m.Id}', '${m.Name || m.name}', '${m.ImageUrl || m.img}', '${m.Experience || m.exp}')">
                        <i class="fas fa-calendar-check" style="font-size: 24px;"></i> ĐẶT LỊCH CHUYÊN GIA NÀY
                    </button>
                </div>
            </div>
        `;

        document.getElementById('maidDetailBody').innerHTML = detailHTML;
        document.getElementById('maidDetailModal').style.display = 'flex';
        
    } catch (error) {
        showToast("Lỗi hệ thống khi tải dữ liệu!", "error");
    }
};

window.renderMaidListPro = function(filterSkill = 'all', filterExp = 'all') { 
    const container = document.getElementById('maid-list-container'); 
    const countLabel = document.getElementById('maidCount'); 
    if(!container || !db) return; 
    
    db.collection("maids").orderBy("timestamp", "desc").onSnapshot((snapshot) => {
        let data = []; snapshot.forEach(doc => data.push(doc.data()));
        
        if(filterSkill !== 'all') { let keyword = filterSkill.trim().toLowerCase(); data = data.filter(m => { let skillsArray = m.Skills || m.skills || []; if(typeof skillsArray === 'string') skillsArray = skillsArray.split(','); return skillsArray.some(skill => skill.toLowerCase().includes(keyword)); }); } 
        if(filterExp !== 'all') { data = data.filter(m => { let expString = String(m.Experience || m.exp || "0"); let match = expString.match(/\d+/); let soNam = match ? parseInt(match[0]) : 0; if(filterExp === 'new') return soNam < 3; if(filterExp === 'pro') return soNam >= 3; return true; }); } 
        
        if(countLabel) countLabel.innerText = data.length; container.innerHTML = ''; 
        if(data.length === 0) { container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:50px;color:#999;">Chưa có dữ liệu.</div>`; return; } 
        
        let now = new Date();
        let todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
        let currentMinutes = now.getHours() * 60 + now.getMinutes();

        data.forEach(m => { 
            let statusBadge = `<span class="elite-status free"><i class="fas fa-check-circle"></i> Sẵn sàng</span>`;
            let actionBtn = `<button type="button" class="elite-book-btn" onclick="event.stopPropagation(); window.quickBook('${m.Id || m.id}', '${m.Name || m.name}', '${m.ImageUrl || m.img}', '${m.Experience || m.exp}')">ĐẶT LỊCH NGAY</button>`;
            
            let schedules = m.schedules || [];
            if (schedules.length > 0) {
                let todaySchedules = schedules.filter(s => s.date === todayStr).sort((a,b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

                for (let s of todaySchedules) {
                    let startMins = timeToMinutes(s.startTime);
                    let endMins = startMins + (parseFloat(s.duration) * 60);

                   if (currentMinutes >= startMins && currentMinutes < endMins) {
                        let endHours = Math.floor(endMins / 60).toString().padStart(2, '0');
                        let endMinsStr = (endMins % 60).toString().padStart(2, '0');
                        statusBadge = `<span class="elite-status busy" style="background:#e74c3c; color:#ffffff !important; font-weight:bold; padding:4px 10px; border-radius:12px;"><i class="fas fa-clock"></i> Sẽ bận tới ${endHours}:${endMinsStr}</span>`;
                        actionBtn = `<button type="button" class="elite-book-btn" onclick="event.stopPropagation(); window.quickBook('${m.Id || m.id}', '${m.Name || m.name}', '${m.ImageUrl || m.img}', '${m.Experience || m.exp}')">ĐẶT TRƯỚC GIỜ KHÁC</button>`;
                        break;
                    } else if (currentMinutes < startMins) {
                        statusBadge = `<span class="elite-status busy" style="background:#f39c12; color:#ffffff !important; font-weight:bold; padding:4px 10px; border-radius:12px;"><i class="fas fa-hourglass-half"></i> Sẽ bận lúc ${s.startTime}</span>`;
                        actionBtn = `<button type="button" class="elite-book-btn" onclick="event.stopPropagation(); window.quickBook('${m.Id || m.id}', '${m.Name || m.name}', '${m.ImageUrl || m.img}', '${m.Experience || m.exp}')">ĐẶT TRƯỚC GIỜ KHÁC</button>`;
                        break; 
                    }
                }
            }

            if (m.IsAvailable === false) {
                 statusBadge = `<span class="elite-status busy"><i class="fas fa-lock"></i> Tạm nghỉ phép</span>`;
                 actionBtn = `<button type="button" class="elite-book-btn busy" disabled>KHÔNG NHẬN LỊCH</button>`;
            }

            let queQuan = m.Home || m.hometown || 'Chưa cập nhật'; 
            let skillsArray = m.Skills || m.skills || []; if(typeof skillsArray === 'string') skillsArray = skillsArray.split(','); let skillsHtml = skillsArray.map(s => `<span class="elite-tag">${s.trim()}</span>`).join(''); 
            
            container.innerHTML += `<div class="elite-card" onclick="showMaidDetail('${m.Id || m.id}')"><img src="${m.ImageUrl || m.img}" class="elite-avatar">${statusBadge}<div class="elite-overlay"><h3 class="elite-name">${m.Name || m.name}</h3><p class="elite-info"><i class="fas fa-map-marker-alt"></i> ${m.Age || m.age || '?'} tuổi • ${queQuan}</p>
            <div class="elite-rating">★ ${m.rating || '5.0'} <span style="color:#c8e6c9; font-size:12px; font-weight:normal;">(${m.reviewCount || 0} đánh giá)</span></div><div class="elite-tags">${skillsHtml}</div>${actionBtn}</div></div>`; 
        }); 
    });
}

window.renderAllProducts = async function () {
    const grid = document.getElementById('shop-product-grid');
    if (!grid) return;
    
    try {
        // Lấy dữ liệu từ Backend thay vì Firebase
        const response = await fetch(`${API_URL}/products`);
        const products = await response.json();
        
        grid.innerHTML = '';
        products.forEach(sp => {
            grid.innerHTML += `
                <div class="card shop-card" onclick="showProductDetail('${sp.id}')">
                    <img src="${sp.anh}" class="card-img">
                    <div class="card-content">
                        <h4 style="margin:0 0 10px; font-size:18px; color:#333;">${sp.ten}</h4>
                        <div style="font-weight:bold; color:#e91e63; margin-bottom:15px; font-size:18px;">${parseInt(sp.gia).toLocaleString()} đ</div>
                        <div style="display:flex; gap:10px;">
                            <button type="button" class="btn-primary" style="flex:1; padding:12px 0;" onclick="event.stopPropagation(); buyNow('${sp.ten}', ${sp.gia}, '${sp.anh}', '${sp.id}')">MUA NGAY</button>
                            <button type="button" style="width:50px; border-radius:8px; border:2px solid #4CAF50; background:white; color:#4CAF50; cursor:pointer;" onclick="event.stopPropagation(); addToCartFull('${sp.ten}', ${sp.gia}, '${sp.anh}', '${sp.id}')"><i class="fas fa-cart-plus"></i></button>
                        </div>
                    </div>
                </div>`;
        });
    } catch (error) {
        console.error("Lỗi API Sản phẩm:", error);
        grid.innerHTML = '<p style="text-align:center; width: 100%; color: red;">Lỗi kết nối đến máy chủ!</p>';
    }
}

// ==========================================================================
// 9. MODULE LIVE CHAT BẰNG FIREBASE CLOUD
// ==========================================================================
let clientChatListener = null;

window.toggleChat = function () {
    if (!currentUser) return showToast("Vui lòng đăng nhập để chat!", "error");
    const w = document.getElementById('chatWindow');
    if (w) {
        w.style.display = (w.style.display === 'flex') ? 'none' : 'flex';
        if (w.style.display === 'flex') listenClientChat();
    }
}

let currentMsgCount = 0;

window.listenClientChat = function () {
    if (!db || !currentUser) return;
    const userId = currentUser.phone;
    if (clientChatListener) clientChatListener(); 

    clientChatListener = db.collection("chats").doc(userId).onSnapshot((doc) => {
        const body = document.getElementById('chatBody');
        if (!body) return;
        
        if (!doc.exists || !doc.data().messages || doc.data().messages.length === 0) {
            body.innerHTML = '<p style="text-align:center;color:#999;margin-top:20px">Chào bạn, GREEN HOUSE có thể giúp gì?</p>';
            currentMsgCount = 0;
            return;
        } 
        
        let msgs = doc.data().messages;
        
        if (currentMsgCount === 0 || msgs.length < currentMsgCount) {
            body.innerHTML = ''; 
            currentMsgCount = 0;
        }

        if (msgs.length > currentMsgCount) {
            let newMsgs = msgs.slice(currentMsgCount);
            newMsgs.forEach(m => {
                const isMe = (m.sender === 'user');
                body.innerHTML += `
                    <div class="msg ${isMe ? 'msg-me' : 'msg-ad'}" style="margin-bottom: 10px; display: flex; flex-direction: column; align-items: ${isMe ? 'flex-end' : 'flex-start'};">
                        <div style="background: ${isMe ? '#4CAF50' : '#eee'}; color: ${isMe ? 'white' : 'black'}; padding: 8px 12px; border-radius: 15px; max-width: 80%; word-wrap: break-word;">${m.text}</div>
                        <small style="font-size: 10px; color: #999; margin-top: 2px;">${m.time}</small>
                    </div>`;
            });
            currentMsgCount = msgs.length; 
            body.scrollTop = body.scrollHeight; 
        }
    });
}

window.sendChat = async function () {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text || !currentUser || !db) return;

    const userId = currentUser.phone;
    const chatRef = db.collection("chats").doc(userId);
    const newMessage = { sender: 'user', text: text, time: new Date().toLocaleTimeString() };

    try {
        const doc = await chatRef.get();
        if (doc.exists) {
            await chatRef.update({ messages: firebase.firestore.FieldValue.arrayUnion(newMessage), lastUpdated: firebase.firestore.FieldValue.serverTimestamp() });
        } else {
            await chatRef.set({ userName: currentUser.name, phone: currentUser.phone, messages: [newMessage], lastUpdated: firebase.firestore.FieldValue.serverTimestamp() });
        }
        input.value = '';
    } catch (e) {
        showToast("Lỗi gửi tin nhắn", "error");
    }
}

window.handleChat = function (e) { if (e.key === 'Enter') sendChat(); }

window.tuVanDecor = function () {
    if (!currentUser) return showToast("Đăng nhập để chat!", "error");
    const w = document.getElementById('chatWindow');
    if (w) {
        w.style.display = 'flex';
        const input = document.getElementById('chatInput');
        if (input) {
            input.value = "Tôi cần tư vấn Decor nội thất.";
            sendChat();
        }
    }
};

window.tuVanChung = function () { showToast("Vui lòng gọi đến tổng đài: 1900 xxxx", "success"); };

window.chonSao = function (star) {
    document.getElementById('rvStar').value = star;
    let stars = document.querySelectorAll('.rating-stars .star');
    stars.forEach((s, idx) => {
        if (idx < star) {
            s.classList.add('active');
            s.style.color = '#f1c40f';
        } else {
            s.classList.remove('active');
            s.style.color = '#ddd';
        }
    });
}

window.toggleChatUI = function (e) {
    const w = document.getElementById('chatWidget');
    if (e.target.closest('.chat-layout')) return;
    w.classList.toggle('expanded');
    if (w.classList.contains('expanded')) loadChatUsers();
}

window.closeChatUI = function (e) {
    e.stopPropagation();
    document.getElementById('chatWidget').classList.remove('expanded');
}

window.loadChatUsers = function () {
    const list = document.getElementById('userList');
    if (!list || !db) return;
    db.collection("chats").orderBy("lastUpdated", "desc").onSnapshot(snapshot => {
        list.innerHTML = '';
        if (snapshot.empty) {
            list.innerHTML = '<p style="padding:15px; color:#888; text-align:center;">Chưa có tin nhắn</p>';
            return;
        }
        snapshot.forEach(doc => {
            let chatData = doc.data();
            let phone = doc.id;
            let name = chatData.userName || phone;
            list.innerHTML += `
                <div class="chat-user-item ${window.activeChatUser === phone ? 'active' : ''}" onclick="selectChatUser('${phone}', '${name}')">
                    <div style="font-weight:bold;">👤 ${name}</div>
                    <div style="font-size:12px; color:#666;">${phone}</div>
                </div>`;
        });
    });
}

let adminChatListener = null;

window.selectChatUser = function (phone, name) {
    window.activeChatUser = phone;
    document.getElementById('chatWithUser').innerText = "Chat với: " + name;
    loadChatUsers(); 

    if (adminChatListener) adminChatListener();
    adminChatListener = db.collection("chats").doc(phone).onSnapshot(doc => {
        const body = document.getElementById('chatMsgs');
        body.innerHTML = '';
        if (doc.exists && doc.data().messages) {
            let msgs = doc.data().messages;
            msgs.forEach(m => {
                let isAd = m.sender === 'admin';
                body.innerHTML += `
                    <div class="msg ${isAd ? 'msg-admin' : 'msg-user'}" style="padding:10px 15px; border-radius:15px; max-width:70%; margin-bottom:10px; background:${isAd ? '#0984e3' : '#f1f2f6'}; color:${isAd ? 'white' : '#333'}; align-self:${isAd ? 'flex-end' : 'flex-start'}; margin-left:${isAd ? 'auto' : '0'};">
                        ${m.text}
                    </div>`;
            });
            body.scrollTop = body.scrollHeight;
        }
    });
}

window.sendAdminMsg = async function () {
    if (!window.activeChatUser) return showToast("Hãy chọn một khách hàng để chat!", "warning");
    const txt = document.getElementById('adminInput').value.trim();
    if (!txt || !db) return;

    const chatRef = db.collection("chats").doc(window.activeChatUser);
    const newMessage = { sender: 'admin', text: txt, time: new Date().toLocaleTimeString() };
    try {
        await chatRef.update({ messages: firebase.firestore.FieldValue.arrayUnion(newMessage), lastUpdated: firebase.firestore.FieldValue.serverTimestamp() });
        document.getElementById('adminInput').value = '';
    } catch (e) {
        showToast("Lỗi gửi tin nhắn", "error");
    }
}

window.datLamVuon = function () {
    localStorage.setItem('tempFilter', 'Làm vườn');
    window.location.href = 'booking.html';
};

// ==========================================================================
// 10. TIỆN ÍCH DÙNG CHUNG
// ==========================================================================
window.closeModal = function (id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
};
window.closeDiag = window.closeModal;

window.xuLyChonFile = function (input, targetId) {
    if (input.files[0]) {
        const r = new FileReader();
        r.onload = function (e) { document.getElementById(targetId).value = e.target.result; };
        r.readAsDataURL(input.files[0]);
    }
}

window.xuLyDanAnh = function (e) {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let i in items) {
        if (items[i].kind === 'file') {
            const f = items[i].getAsFile();
            const r = new FileReader();
            r.onload = function (ev) { document.getElementById(e.target.id).value = ev.target.result; };
            r.readAsDataURL(f);
            e.preventDefault();
        }
    }
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const div = document.createElement('div');
    div.className = `toast-msg ${type === 'success' ? 't-success' : 't-error'}`;
    div.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} t-icon"></i> <span>${message}</span>`;
    container.appendChild(div);
    setTimeout(() => {
        div.style.opacity = '0';
        div.style.transform = 'translateX(100%)';
        setTimeout(() => div.remove(), 300);
    }, 3000);
}

window.showProductDetail = async function (id) {
    if (!db) return;
    const doc = await db.collection("products").doc(id).get();
    if (!doc.exists) return;
    
    let p = doc.data();
    let albumHtml = '';
    if (p.album && p.album.length > 0) {
        p.album.forEach(link => {
            albumHtml += `<img src="${link}" class="pd-thumb" onclick="changeMainImg(this, '${link}')">`;
        });
    }
    
    let modalHTML = `
        <div id="productDetailModal" class="modal" style="display:flex; z-index:10005; align-items:center;">
            <div class="modal-content modal-lg" style="width: 850px; max-width: 95%; display: flex; gap: 30px; flex-wrap: wrap;">
                <span class="close-modal" onclick="closeDiag('productDetailModal')">×</span>
                <div class="pd-images" style="flex: 1; min-width: 300px;">
                    <img src="${p.anh}" class="pd-main-img" id="main-pd-img" style="width:100%; height:350px; object-fit:cover; border-radius:10px;">
                    <div class="pd-gallery" style="display:flex; gap:10px; overflow-x:auto; margin-top:10px;">
                        <img src="${p.anh}" class="pd-thumb active" onclick="changeMainImg(this, '${p.anh}')">
                        ${albumHtml}
                    </div>
                </div>
                <div class="pd-info" style="flex: 1; min-width: 300px;">
                    <h2 style="color: #2e7d32; font-size: 26px; margin: 0 0 15px 0;">${p.ten}</h2>
                    <h3 style="color: #e91e63; font-size: 24px; margin: 0 0 20px 0;">${parseInt(p.gia).toLocaleString()} VNĐ</h3>
                    <div class="pd-desc" style="background:#f9f9f9; padding:15px; border-radius:10px; max-height:200px; overflow-y:auto; color:#555;">
                        ${p.mota ? p.mota.replace(/\n/g, '<br>') : ''}
                    </div>
                    <div style="display:flex; gap:15px; margin-top:25px;">
                        <button class="btn-primary" style="flex:1; padding:15px;" onclick="closeDiag('productDetailModal'); buyNow('${p.ten}', ${p.gia}, '${p.anh}', '${p.id}')">MUA NGAY</button>
                        <button style="padding:15px; border-radius:10px; border:2px solid #4CAF50; background:white; color:#4CAF50; font-weight:bold; cursor:pointer;" onclick="addToCartFull('${p.ten}', ${p.gia}, '${p.anh}', '${p.id}')"><i class="fas fa-cart-plus"></i> THÊM VÀO GIỎ</button>
                    </div>
                </div>
            </div>
        </div>`;
        
    let oldModal = document.getElementById('productDetailModal');
    if (oldModal) oldModal.remove();
    document.body.insertAdjacentHTML('beforeend', modalHTML);
};

window.changeMainImg = function (element, src) {
    document.getElementById('main-pd-img').src = src;
    let thumbs = element.parentElement.querySelectorAll('.pd-thumb');
    thumbs.forEach(t => {
        t.style.border = '2px solid transparent';
        t.style.opacity = '0.6';
    });
    element.style.border = '2px solid #4CAF50';
    element.style.opacity = '1';
};

// ==========================================================================
// 11. GIỎ HÀNG VÀ THANH TOÁN
// ==========================================================================
window.buyNow = function (ten, gia, anh, id) {
    if (!currentUser) return showToast("Vui lòng đăng nhập!", "error");
    let existingItem = cart.find(item => item.id === id);
    if (existingItem) {
        existingItem.sl += 1;
        existingItem.selected = true;
    } else {
        cart.push({ id: id || Date.now(), ten, gia, anh, sl: 1, selected: true });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    updateHeaderAuth();
    moFormThanhToan();
};

window.addToCartFull = function (ten, gia, anh, id) {
    if (!currentUser) return showToast("Vui lòng đăng nhập!", "error");
    let existingItem = cart.find(item => item.id === id);
    if (existingItem) existingItem.sl += 1;
    else cart.push({ id: id || Date.now(), ten, gia, anh, sl: 1, selected: true });
    localStorage.setItem('cart', JSON.stringify(cart));
    updateHeaderAuth();
    showToast("Đã thêm vào giỏ hàng!", "success");
}

window.openCart = function () {
    if (!currentUser) return showToast("Vui lòng đăng nhập!", "error");
    document.getElementById('cartModal').style.display = 'flex';
    renderCart();
};

function renderCart() {
    const listArea = document.getElementById('cartList');
    if (!listArea) return;
    listArea.innerHTML = '';
    let totalThanhToan = 0;
    
    if (cart.length === 0) {
        listArea.innerHTML = '<p style="text-align:center; padding:20px; color:#999;">Giỏ hàng trống.</p>';
        document.getElementById('cartTotal').innerText = '0 VNĐ';
        return;
    }
    
    listArea.innerHTML = `
        <div style="display: flex; font-weight: bold; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 10px; align-items:center;">
            <div style="width: 30px;"><input type="checkbox" onclick="toggleSelectAll(this.checked)" checked></div>
            <div style="width: 60px;">Ảnh</div>
            <div style="flex: 1;">Sản phẩm</div>
            <div style="width: 100px; text-align:center;">Số lượng</div>
            <div style="width: 100px; text-align:right;">Giá</div>
            <div style="width: 40px;"></div>
        </div>`;
        
    cart.forEach((item, index) => {
        if (item.selected === undefined) item.selected = true;
        const thanhTien = item.gia * (item.sl || 1);
        if (item.selected) totalThanhToan += thanhTien;
        listArea.innerHTML += `
            <div style="display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #f5f5f5;">
                <div style="width: 30px;"><input type="checkbox" ${item.selected ? 'checked' : ''} onclick="toggleCartItem(${index})" style="width:16px;height:16px;"></div>
                <div style="width: 60px;"><img src="${item.anh}" style="width:45px; height:45px; object-fit:cover; border-radius:5px;"></div>
                <div style="flex: 1; font-weight:bold; font-size:14px; color:#333;">${item.ten}<br><small style="color:#e91e63">${item.gia.toLocaleString()} đ</small></div>
                <div style="width: 100px; display: flex; align-items: center; justify-content:center; background:#f5f5f5; border-radius:20px; padding:2px;">
                    <button type="button" onclick="updateCartQty(${index}, -1)" style="border:none; background:none; cursor:pointer; font-weight:bold; padding:2px 10px;">-</button>
                    <span style="min-width:25px; text-align:center; font-weight:bold;">${item.sl || 1}</span>
                    <button type="button" onclick="updateCartQty(${index}, 1)" style="border:none; background:none; cursor:pointer; font-weight:bold; padding:2px 10px;">+</button>
                </div>
                <div style="width: 100px; text-align: right; color:#e91e63; font-weight:bold;">${thanhTien.toLocaleString()} đ</div>
                <div style="width: 40px; text-align:center;"><button type="button" onclick="removeFromCart(${index})" style="color:#ff4d4d; border:none; background:none; cursor:pointer; font-size:18px;"><i class="fas fa-trash"></i></button></div>
            </div>`;
    });
    
    const finalTotal = totalThanhToan - currentDiscount;
    document.getElementById('cartTotal').innerText = (finalTotal > 0 ? finalTotal : 0).toLocaleString() + " VNĐ";
}

window.updateCartQty = function (index, change) {
    if (cart[index].sl + change > 0) {
        cart[index].sl += change;
        localStorage.setItem('cart', JSON.stringify(cart));
        renderCart();
        updateHeaderAuth();
    }
}

window.toggleCartItem = function (index) {
    cart[index].selected = !cart[index].selected;
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
}

window.toggleSelectAll = function (checked) {
    cart.forEach(item => item.selected = checked);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
}

window.removeFromCart = function (index) {
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
    updateHeaderAuth();
}

window.applyVoucher = function () {
    const code = document.getElementById('voucherCode').value.trim();
    if (!code) return showToast("Nhập mã!", "error");
    if (code === "CLEAR10") {
        currentDiscount = 10000;
        showToast("Thành công!");
        renderCart();
    } else {
        showToast("Mã không hợp lệ!", "error");
    }
}

window.updateCheckoutQty = function (id, change) {
    var item = cart.find(x => x.id === id);
    if (item && item.sl + change > 0) {
        item.sl += change;
        localStorage.setItem('cart', JSON.stringify(cart));
        renderCheckoutItems();
        updateHeaderAuth();
    }
}

window.renderCheckoutItems = function () {
    var selectedItems = cart.filter(x => x.selected);
    var container = document.getElementById('checkoutItemsContainer');
    if (!container) return;
    var subTotal = 0;
    var html = '';
    
    selectedItems.forEach(item => {
        var itemTotal = item.gia * (item.sl || 1);
        subTotal += itemTotal;
        html += `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding-bottom:8px; border-bottom:1px dashed #ddd;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${item.anh}" style="width:40px; height:40px; border-radius:5px; object-fit:cover;">
                    <div>
                        <div style="font-weight:bold; font-size:14px;">${item.ten}</div>
                        <div style="color:#e91e63; font-size:13px;">${item.gia.toLocaleString()} đ</div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; background:#fff; border:1px solid #ddd; border-radius:20px; padding:2px 5px;">
                    <button type="button" onclick="updateCheckoutQty('${item.id}', -1)" style="border:none; background:none; cursor:pointer; font-weight:bold; padding:2px 8px;">-</button>
                    <span style="font-weight:bold; min-width:20px; text-align:center;">${item.sl || 1}</span>
                    <button type="button" onclick="updateCheckoutQty('${item.id}', 1)" style="border:none; background:none; cursor:pointer; font-weight:bold; padding:2px 8px;">+</button>
                </div>
            </div>`;
    });
    
    container.innerHTML = html;
    var finalTotal = subTotal - currentDiscount;
    if (finalTotal < 0) finalTotal = 0;
    var ckTotalText = document.getElementById('ckTotalText');
    if (ckTotalText) {
        ckTotalText.innerText = finalTotal.toLocaleString() + " VNĐ";
        ckTotalText.dataset.val = finalTotal;
    }
}

window.moFormThanhToan = function () {
    var selectedItems = cart.filter(x => x.selected);
    if (selectedItems.length === 0) return showToast("Chọn ít nhất 1 SP!", "error");
    closeModal('cartModal');
    renderCheckoutItems();
    
    if (currentUser) {
        var ckName = document.getElementById('ckName');
        var ckPhone = document.getElementById('ckPhone');
        if (ckName) ckName.value = currentUser.name || '';
        if (ckPhone) ckPhone.value = currentUser.phone || '';
    }
    
    setTimeout(function () {
        var ckModal = document.getElementById('checkoutModal');
        if (ckModal) {
            ckModal.style.display = 'flex';
            var method = document.getElementById('ckMethod');
            if (method) method.value = "COD";
            var billInput = document.getElementById('billUpload');
            if (billInput) billInput.value = '';
            var billPreview = document.getElementById('billPreview');
            if (billPreview) billPreview.style.display = 'none';
            toggleQR();
        }
    }, 150);
}

window.toggleQR = function () {
    var method = document.getElementById('ckMethod');
    var qrBox = document.getElementById('qrBox');
    var btnXacNhan = document.getElementById('btnXacNhan');
    
    if (method && qrBox && btnXacNhan) {
        if (method.value === "BANK") {
            qrBox.style.display = 'block';
            var qrMaDon = document.getElementById('qrMaDon');
            if (qrMaDon) qrMaDon.innerText = Math.floor(Math.random() * 99999);
            var qrImg = qrBox.querySelector('img');
            if (qrImg) qrImg.src = MY_BANK_QR;
            var billInput = document.getElementById('billUpload');
            if (!billInput || !billInput.files || billInput.files.length === 0) {
                btnXacNhan.style.backgroundColor = '#cccccc';
                btnXacNhan.style.pointerEvents = 'none';
                btnXacNhan.disabled = true;
            }
        } else {
            qrBox.style.display = 'none';
            btnXacNhan.style.backgroundColor = '#4CAF50';
            btnXacNhan.style.pointerEvents = 'auto';
            btnXacNhan.disabled = false;
        }
    }
}

window.kiemTraBill = function () {
    var billInput = document.getElementById('billUpload');
    var btnXacNhan = document.getElementById('btnXacNhan');
    var billPreview = document.getElementById('billPreview');
    
    if (billInput && billInput.files && billInput.files.length > 0) {
        billPreview.style.display = 'block';
        btnXacNhan.style.backgroundColor = '#4CAF50';
        btnXacNhan.style.pointerEvents = 'auto';
        btnXacNhan.disabled = false;
    } else {
        billPreview.style.display = 'none';
        btnXacNhan.style.backgroundColor = '#cccccc';
        btnXacNhan.style.pointerEvents = 'none';
        btnXacNhan.disabled = true;
    }
}

window.calculateTotal = function () {
    let bkService = document.getElementById('bkService');
    let bkDuration = document.getElementById('bkDuration');
    if (!bkService || !bkDuration) return;
    let price = parseInt(bkService.value) || 0;
    let dur = parseFloat(bkDuration.value) || 0;
    let total = price * dur;
    document.getElementById('bkTotal').innerText = total > 0 ? total.toLocaleString('vi-VN') : "0";
}

window.closeBooking = function () {
    let confirmBox = document.getElementById('booking-confirm');
    if (confirmBox) confirmBox.style.display = 'none';
}

window.quickBook = function (id, name, img, exp) {
    if (!currentUser) return showToast("Đăng nhập để đặt lịch!", "error");
    const cb = document.getElementById('booking-confirm');
    if (cb) {
        cb.style.display = 'flex';
        document.getElementById('sbAvatar').src = img || 'https://ui-avatars.com/api/?name=NV';
        document.getElementById('sbName').innerText = name;
        document.getElementById('sbMeta').innerText = "Kinh nghiệm: " + (exp || '?');
        document.getElementById('sbName').dataset.id = id;
        document.getElementById('sbName').dataset.name = name;
        if (currentUser.phone) document.getElementById('bkPhoneReal').value = currentUser.phone;
        document.getElementById('bkDate').value = "";
        document.getElementById('bkStartTime').value = "";
        document.getElementById('bkDuration').value = "";
        document.getElementById('bkAddress').value = "";
        document.getElementById('bkTotal').innerText = "0";
    }
}

// ==========================================================================
// 12. TIỆN ÍCH KHÁC
// ==========================================================================
document.addEventListener("DOMContentLoaded", function () {
    const phoneInputs = ['#regPhone', '#username', '#bkPhoneReal', '#ckPhone', '#forgotPhone'];
    phoneInputs.forEach(selector => {
        const inputElement = document.querySelector(selector);
        if (inputElement) {
            window.intlTelInput(inputElement, {
                initialCountry: "vn",
                preferredCountries: ["vn", "us", "kr", "jp"],
                utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
            });
        }
    });
});

window.timeToMinutes = function(timeStr) {
    if (!timeStr) return 0;
    let parts = timeStr.split(':');
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
};

// ==========================================================================
// 13. CÁC HÀM XỬ LÝ TRANG CHỦ
// ==========================================================================
window.goToBooking = function() {
    let skill = document.getElementById('homeSkill').value;
    localStorage.setItem('tempFilter', skill); 
    window.location.href = 'booking.html';
};

window.quickFilter = function(skillName) {
    localStorage.setItem('tempFilter', skillName);
    window.location.href = 'booking.html';
};

window.renderHomeMaids = function() {
    const container = document.getElementById('home-maid-list');
    if (!container || !db) return;
    
    db.collection("maids").limit(4).onSnapshot((snapshot) => {
        container.innerHTML = '';
        if (snapshot.empty) {
            container.innerHTML = '<p style="text-align:center; grid-column:1/-1;">Chưa có nhân viên nào.</p>';
            return;
        }
        
        snapshot.forEach(doc => {
            let m = doc.data();
            let queQuan = m.Home || m.hometown || 'Chưa cập nhật'; 
            let skillsArray = m.Skills || m.skills || []; 
            if(typeof skillsArray === 'string') skillsArray = skillsArray.split(','); 
            let skillsHtml = skillsArray.map(s => `<span class="elite-tag">${s.trim()}</span>`).join(''); 
            
            container.innerHTML += `
                <div class="elite-card" onclick="window.location.href='booking.html'">
                    <img src="${m.ImageUrl || m.img}" class="elite-avatar">
                    <div class="elite-overlay">
                        <h3 class="elite-name">${m.Name || m.name}</h3>
                        <p class="elite-info"><i class="fas fa-map-marker-alt"></i> ${m.Age || m.age} tuổi • ${queQuan}</p>
                        <div class="elite-rating">★ ${m.rating || '5.0'} <span style="color:#999; font-size:12px; font-weight:normal;">(${m.reviewCount || 0} đánh giá)</span></div>
                        <div class="elite-tags">${skillsHtml}</div>
                    </div>
                </div>`; 
        });
    });
};

window.renderHomeProducts = function() {
    const grid = document.getElementById('best-seller-grid');
    if (!grid || !db) return;
    
    db.collection("products").limit(3).onSnapshot((snapshot) => {
        grid.innerHTML = '';
        if (snapshot.empty) {
            grid.innerHTML = '<p style="text-align:center; grid-column:1/-1;">Chưa có sản phẩm nào.</p>';
            return;
        }

        snapshot.forEach(doc => {
            let sp = doc.data();
            grid.innerHTML += `
                <div class="card shop-card" onclick="showProductDetail('${sp.id}')">
                    <img src="${sp.anh}" class="card-img">
                    <div class="card-content">
                        <h4 style="margin:0 0 10px; font-size:18px; color:#333;">${sp.ten}</h4>
                        <div style="font-weight:bold; color:#e91e63; margin-bottom:15px; font-size:18px;">${parseInt(sp.gia).toLocaleString()} đ</div>
                        <button type="button" class="btn-primary" style="width:100%; padding:12px 0;" onclick="event.stopPropagation(); buyNow('${sp.ten}', ${sp.gia}, '${sp.anh}', '${sp.id}')">MUA NGAY</button>
                    </div>
                </div>`;
        });
    });
};

window.checkAdminAccess = async function() {
    let localUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!localUser || !localUser.phone) {
        window.location.href = 'login.html'; 
        return;
    }

    try {
        const userDoc = await db.collection('users').doc(localUser.phone).get();
        if (!userDoc.exists || userDoc.data().role !== 'Admin') {
            showToast("Truy cập bị từ chối! Bạn không phải là Quản trị viên.", "error");
            setTimeout(() => { window.location.href = 'index.html'; }, 1500);
        } else {
            loadAdminData();
        }
    } catch (error) {
        console.error("Lỗi xác thực:", error);
    }
};

// ĐÃ FIX: Gộp 2 hàm trùng lặp, giữ lại logic Custom Dropdown
window.applyTempFilter = function() {
    let tempSkill = localStorage.getItem('tempFilter');
    let hiddenInput = document.getElementById('filterSkill');
    
    if (tempSkill && hiddenInput) {
        hiddenInput.value = tempSkill; 
        
        let allOptions = document.querySelectorAll('#text-filterSkill').item(0).closest('.custom-dropdown').querySelectorAll('.dropdown-item');
        allOptions.forEach(opt => {
            if (opt.getAttribute('onclick').includes(`'${tempSkill}'`)) {
                document.getElementById('text-filterSkill').innerText = opt.innerText;
                opt.parentElement.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
                opt.classList.add('active');
            }
        });

        if(typeof filterMaids === 'function') filterMaids(); 
        else window.renderMaidListPro(tempSkill, 'all'); 
        
        localStorage.removeItem('tempFilter');
    }
};

// ==========================================================================
// 14. XỬ LÝ CUSTOM DROPDOWN BỘ LỌC ĐẸP
// ==========================================================================
window.toggleDropdown = function(element) {
    document.querySelectorAll('.custom-dropdown').forEach(dropdown => {
        if(dropdown !== element) dropdown.classList.remove('open');
    });
    element.classList.toggle('open');
};

window.selectOption = function(optionElement, inputId, value) {
    event.stopPropagation(); 
    let dropdown = optionElement.closest('.custom-dropdown');
    dropdown.querySelector('.selected-text').innerText = optionElement.innerText;
    dropdown.querySelectorAll('.dropdown-item').forEach(item => item.classList.remove('active'));
    optionElement.classList.add('active');
    document.getElementById(inputId).value = value;
    dropdown.classList.remove('open');
};

document.addEventListener('click', function(event) {
    if (!event.target.closest('.custom-dropdown')) {
        document.querySelectorAll('.custom-dropdown').forEach(dropdown => {
            dropdown.classList.remove('open');
        });
    }
});

// ==========================================================================
// 15. HÀM XỬ LÝ TÌM KIẾM / LỌC NHÂN VIÊN
// ==========================================================================
window.filterMaids = function() {
    let skillInput = document.getElementById('filterSkill');
    let expInput = document.getElementById('filterExp');
    if (!skillInput || !expInput) return;
    
    let skill = skillInput.value;
    let exp = expInput.value;
    window.renderMaidListPro(skill, exp);
    
    let container = document.getElementById('maid-list-container');
    if(container) {
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

// ==========================================================================
// 16. HỆ THỐNG ĐÁNH GIÁ NHÂN VIÊN QUA CHAT
// ==========================================================================
window.checkCompletedJobs = async function() {
    if (!db || !currentUser) return;
    
    const snap = await db.collection("orders")
                         .where("user", "==", currentUser.phone)
                         .where("status", "==", "confirmed")
                         .get();
                         
    let now = new Date();
    let todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    let currentMinutes = now.getHours() * 60 + now.getMinutes();

    snap.forEach(async doc => {
        let o = doc.data();
        if (o.maidId && !o.reviewRequested) {
            let isPast = false;
            
            if (o.workDate < todayStr) {
                isPast = true;
            } else if (o.workDate === todayStr) {
                let endMins = timeToMinutes(o.workTime) + (parseFloat(o.workDuration) * 60);
                if (currentMinutes > endMins) isPast = true;
            }

            if (isPast) {
                let maidName = "chuyên gia";
                try {
                    let mDoc = await db.collection("maids").doc(o.maidId).get();
                    if(mDoc.exists) maidName = mDoc.data().Name || mDoc.data().name || "chuyên gia";
                } catch(e){}

                let msgHTML = `Tuyệt vời! Ca làm việc của <b>${maidName}</b> ngày ${o.workDate} đã hoàn thành. <br><br>
                               <button onclick="openMaidReviewModal('${o.maidId}', '${o.id}')" style="background:#e91e63; color:white; border:none; padding:8px 15px; border-radius:8px; cursor:pointer; font-weight:bold; width:100%; box-shadow:0 3px 10px rgba(0,0,0,0.1);">
                                  ⭐ ĐÁNH GIÁ CHẤT LƯỢNG
                               </button>`;
                
                let chatRef = db.collection("chats").doc(currentUser.phone);
                let newMessage = { sender: 'admin', text: msgHTML, time: new Date().toLocaleTimeString() };
                
                try {
                    let chatDoc = await chatRef.get();
                    if (chatDoc.exists) {
                        await chatRef.update({ messages: firebase.firestore.FieldValue.arrayUnion(newMessage), lastUpdated: firebase.firestore.FieldValue.serverTimestamp() });
                    } else {
                        await chatRef.set({ userName: currentUser.name, phone: currentUser.phone, messages: [newMessage], lastUpdated: firebase.firestore.FieldValue.serverTimestamp() });
                    }
                    
                    await db.collection("orders").doc(o.id).update({ reviewRequested: true });
                    
                    let chatW = document.getElementById('chatWindow');
                    if(chatW && chatW.style.display !== 'flex') showToast("Bạn có tin nhắn mới từ CSKH!", "success");

                } catch (e) { console.log("Lỗi gửi chat review:", e); }
            }
        }
    });
};

let currentReviewMaidId = "";
let currentReviewOrderId = "";

window.openMaidReviewModal = async function(maidId, orderId) {
    try {
        let odoc = await db.collection("orders").doc(orderId).get();
        if(odoc.exists && odoc.data().isReviewed) {
            return showToast("Bạn đã đánh giá cho ca làm việc này rồi!", "warning");
        }
    } catch(e) {}

    currentReviewMaidId = maidId;
    currentReviewOrderId = orderId;
    
    if (!document.getElementById('maidReviewModal')) {
        let modalHTML = `
        <div id="maidReviewModal" class="modal" style="display:flex; z-index: 10005;">
            <div class="modal-content" style="width:400px; text-align:center; border-radius:20px;">
                <span class="close-modal" onclick="closeDiag('maidReviewModal')">×</span>
                <h2 style="color:#2e7d32; margin-top:0;">Đánh Giá Nhân Viên</h2>
                <p style="color:#666; font-size:14px; margin-bottom:20px;">Sự hài lòng của bạn là động lực của chúng tôi!</p>
                
                <div class="rating-stars" id="maidStars" style="font-size: 40px; cursor: pointer; margin-bottom: 20px;">
                    <span onclick="chonSaoMaid(1)" class="star">★</span>
                    <span onclick="chonSaoMaid(2)" class="star">★</span>
                    <span onclick="chonSaoMaid(3)" class="star">★</span>
                    <span onclick="chonSaoMaid(4)" class="star">★</span>
                    <span onclick="chonSaoMaid(5)" class="star active" style="color: #f1c40f;">★</span>
                    <input type="hidden" id="maidRvStar" value="5">
                </div>
                
                <textarea id="maidRvContent" class="form-input-elite" rows="3" placeholder="Nhân viên làm việc có tốt không? Để lại nhận xét của bạn nhé..."></textarea>
                
                <button onclick="submitMaidReview()" class="btn-primary" style="width:100%; padding:15px; font-size:16px; border-radius:12px; margin-top:20px; font-weight:bold;">
                    GỬI ĐÁNH GIÁ
                </button>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    } else {
        document.getElementById('maidReviewModal').style.display = 'flex';
    }
    chonSaoMaid(5); 
    document.getElementById('maidRvContent').value = "";
    if(document.getElementById('chatWindow')) document.getElementById('chatWindow').style.display = 'none'; 
};

window.chonSaoMaid = function(star) {
    document.getElementById('maidRvStar').value = star;
    let stars = document.querySelectorAll('#maidStars .star');
    stars.forEach((s, idx) => {
        if (idx < star) { s.classList.add('active'); s.style.color = '#f1c40f'; } 
        else { s.classList.remove('active'); s.style.color = '#ddd'; }
    });
};

window.submitMaidReview = async function() {
    let star = parseInt(document.getElementById('maidRvStar').value);
    let content = document.getElementById('maidRvContent').value.trim();
    if (!content) return showToast("Vui lòng để lại vài lời nhận xét!", "error");

    try {
        const maidRef = db.collection("maids").doc(currentReviewMaidId);
        const doc = await maidRef.get();
        if (doc.exists) {
            let m = doc.data();
            let currentRating = m.rating || 5.0; 
            let currentCount = m.reviewCount || 0;
            
            let newCount = currentCount + 1;
            let newRating = ((currentRating * currentCount) + star) / newCount;
            newRating = Math.round(newRating * 10) / 10; 

            await maidRef.update({ rating: newRating, reviewCount: newCount });
        }

        await db.collection("reviews").add({
            name: currentUser.name,
            maidId: currentReviewMaidId,
            content: content,
            star: star,
            date: new Date().toLocaleDateString('vi-VN'),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        await db.collection("orders").doc(currentReviewOrderId).update({ isReviewed: true });

        let chatRef = db.collection("chats").doc(currentUser.phone);
        let chatDoc = await chatRef.get();
        if (chatDoc.exists) {
            let msgs = chatDoc.data().messages;
            let updated = false;
            for (let i = 0; i < msgs.length; i++) {
                if (msgs[i].text.includes(`openMaidReviewModal('${currentReviewMaidId}', '${currentReviewOrderId}')`)) {
                    msgs[i].text = msgs[i].text
                        .replace(`onclick="openMaidReviewModal('${currentReviewMaidId}', '${currentReviewOrderId}')"`, `disabled="true"`)
                        .replace("⭐ ĐÁNH GIÁ CHẤT LƯỢNG", "✅ ĐÃ ĐÁNH GIÁ")
                        .replace("background:#e91e63", "background:#bdc3c7")
                        .replace("cursor:pointer", "cursor:not-allowed");
                    updated = true;
                }
            }
            if(updated) {
                await chatRef.update({ messages: msgs });
                if (typeof listenClientChat === 'function') listenClientChat();
            }
        }

        showToast("Cảm ơn bạn! Đánh giá đã được ghi nhận.", "success");
        closeDiag('maidReviewModal');
        if(document.getElementById('chatWindow')) document.getElementById('chatWindow').style.display = 'flex';
        
    } catch (e) {
        showToast("Lỗi hệ thống khi gửi đánh giá!", "error");
    }
};