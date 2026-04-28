window.updateHeaderAuth = function() {
    const badge = document.getElementById('cartCount');
    if (badge) badge.innerText = cart.length;
    const authSec = document.getElementById('header-auth-section');
    if (authSec) {
        authSec.style.display = 'flex'; authSec.style.alignItems = 'center'; authSec.style.height = '100%';
        if (currentUser) {
            let adminBtn = currentUser.role === 'Admin'
                ? `<div onclick="window.location.href='admin.html'" style="cursor:pointer; display:flex; align-items:center; gap:8px;"><i class="fas fa-user-shield" style="color: #4E9F3D; font-size: 18px;"></i> <span style="color: #4E9F3D; font-weight:800; font-size: 15px;">Admin ${currentUser.name}</span></div>`
                : `<div onclick="openProfile()" style="cursor:pointer; display:flex; align-items:center; gap:8px;"><i class="fas fa-user-circle" style="font-size: 20px; color: #4E9F3D;"></i> <span style="font-weight:800; color: #000 ; font-size: 15px;">${currentUser.name}</span></div>`;
            authSec.innerHTML = `<div style="display: flex; align-items: center; background: #ffffff; border: 2px solid #e8f5e9; padding: 6px 16px; border-radius: 50px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); gap: 15px; transition: 0.3s;" onmouseover="this.style.borderColor='#4E9F3D'" onmouseout="this.style.borderColor='#e8f5e9'">${adminBtn} <div style="height: 20px; width: 2px; background-color: #eee; border-radius: 2px;"></div><a href="#" onclick="logout()" title="Đăng xuất" style="color: #e74c3c; font-size: 18px; display: flex; align-items: center; transition: 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"><i class="fas fa-sign-out-alt"></i></a></div>`;
        } else {
            authSec.innerHTML = `<a href="login.html" class="btn-primary" style="padding:10px 24px; border-radius:50px; text-decoration:none; font-weight: 800; display: flex; align-items: center; gap: 8px; font-size: 14px; box-shadow: 0 4px 15px rgba(78, 159, 61, 0.2);"><i class="fas fa-sign-in-alt"></i> Đăng Nhập</a>`;
        }
    }
}
window.logout = function () { localStorage.removeItem('currentUser'); location.reload(); }
window.switchAuth = function (type) {
    let err = document.getElementById('error-msg');
    if (err) err.style.display = 'none';
    document.querySelectorAll('.auth-box').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
    if (type === 'login') { document.getElementById('box-login').classList.add('active'); document.getElementById('tab-login').classList.add('active'); } 
    else if (type === 'register') { document.getElementById('box-register').classList.add('active'); document.getElementById('tab-register').classList.add('active'); } 
    else if (type === 'forgot') { document.getElementById('box-forgot').classList.add('active'); }
}
window.xuLyDangNhap = async function (e) {
    if (e) e.preventDefault();
    let accountInput = document.getElementById('username').value.trim();
    let pass = document.getElementById('password').value;
    let err = document.getElementById('error-msg');
    let btnSubmit = document.querySelector('#box-login .btn-submit');
    if (err) err.style.display = 'none';
    btnSubmit.disabled = true; btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ĐANG KIỂM TRA...';
    try {
        const response = await fetch(`${API_URL}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: accountInput, password: pass }) });
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('currentUser', JSON.stringify(data.user)); localStorage.setItem('token', data.token);
            showToast('Đăng nhập thành công!', 'success');
            setTimeout(() => { if (data.user.role === 'Admin') window.location.href = 'admin.html'; else window.location.href = 'index.html'; }, 1000);
        } else {
            if (err) { err.style.display = 'block'; err.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${data.message || 'Sai thông tin!'}`; }
        }
    } catch (error) { showToast('Lỗi kết nối máy chủ Backend!', 'error'); } 
    finally { btnSubmit.disabled = false; btnSubmit.innerHTML = '<i class="fas fa-sign-in-alt"></i> ĐĂNG NHẬP'; }
};
window.xuLyGuiOTPEmail = async function (e) {
    if (e) e.preventDefault();
    let name = document.getElementById('regName').value.trim(); let phone = document.getElementById('regPhone').value.trim().replace(/\s+/g, ''); let email = document.getElementById('regEmail').value.trim(); let pass = document.getElementById('regPass').value; let passConfirm = document.getElementById('regPassConfirm').value; let err = document.getElementById('error-msg');
    if (err) err.style.display = 'none';
    const phoneRegex = /^[0-9]{9,11}$/;
    if (!phoneRegex.test(phone)) { if (err) { err.style.display = 'block'; err.innerHTML = '<i class="fas fa-exclamation-circle"></i> SĐT sai định dạng!'; } return; }
    if (pass !== passConfirm) { if (err) { err.style.display = 'block'; err.innerHTML = '<i class="fas fa-exclamation-circle"></i> Mật khẩu không khớp!'; } return; }
    try {
        const phoneSnap = await db.collection('users').doc(phone).get();
        if (phoneSnap.exists) { if (err) { err.style.display = 'block'; err.innerHTML = '<i class="fas fa-exclamation-circle"></i> Số điện thoại đã tồn tại!'; } return; }
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        sessionStorage.setItem('temp_otp', otpCode); sessionStorage.setItem('temp_user', JSON.stringify({ phone, email, password: pass, name, role: 'User' }));
        let btnSend = document.getElementById('btnSendOTPEmail'); btnSend.disabled = true; btnSend.innerText = "ĐANG GỬI MAIL...";
        emailjs.send("service_2985", "template_2985", { to_name: name, to_email: email, otp_code: otpCode, reply_to: "vvinhdzs1tg@gmail.com" }).then(function() {
            document.getElementById('registerForm').style.display = 'none'; document.getElementById('otpSection').style.display = 'block'; showToast('Mã OTP đã được gửi!', 'success');
        }).catch(function() { showToast('Lỗi hệ thống gửi Mail!', 'error'); btnSend.disabled = false; btnSend.innerHTML = '<i class="fas fa-envelope"></i> GỬI LẠI MÃ OTP'; });
    } catch (error) { showToast('Lỗi máy chủ!', 'error'); }
};
window.xacNhanOTPEmail = async function () {
    const inputCode = document.getElementById('otpCode').value.trim(); const savedOTP = sessionStorage.getItem('temp_otp'); const userData = JSON.parse(sessionStorage.getItem('temp_user')); let btnSubmit = document.querySelector('#otpSection .btn-submit');
    if (inputCode !== savedOTP) return showToast("Mã OTP không chính xác!", "error");
    btnSubmit.disabled = true; btnSubmit.innerText = "ĐANG TẠO TÀI KHOẢN...";
    try {
        const response = await fetch(`${API_URL}/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userData) });
        const data = await response.json();
        if (response.ok) { showToast('Tạo tài khoản thành công!', 'success'); setTimeout(() => { window.location.reload(); }, 1500); } 
        else { showToast(data.message || "Lỗi khi tạo tài khoản!", "error"); btnSubmit.disabled = false; }
    } catch (error) { showToast("Lỗi khi gọi API Đăng ký!", "error"); btnSubmit.disabled = false; btnSubmit.innerText = "XÁC NHẬN & TẠO TÀI KHOẢN"; }
};
let generatedOTP_Forgot = ""; let userPhone_Forgot = "";
window.xuLyGuiOTPForgotEmail = async function (e) {
    if (e) e.preventDefault();
    let emailInput = document.getElementById('forgotEmail').value.trim(); let err = document.getElementById('error-msg'); if (err) err.style.display = 'none';
    try {
        const qSnap = await db.collection('users').where("email", "==", emailInput).get();
        if (qSnap.empty) { if (err) { err.style.display = 'block'; err.innerHTML = '<i class="fas fa-exclamation-circle"></i> Email chưa đăng ký!'; } return; }
        userPhone_Forgot = qSnap.docs[0].id; generatedOTP_Forgot = Math.floor(100000 + Math.random() * 900000).toString();
        let btnSend = document.getElementById('btnSendOTPForgot'); btnSend.disabled = true; btnSend.innerText = "ĐANG GỬI MAIL...";
        emailjs.send("service_2985", "template_2985", { to_email: emailInput, to_name: qSnap.docs[0].data().name, otp_code: generatedOTP_Forgot }).then(function() {
            document.getElementById('forgotForm').style.display = 'none'; document.getElementById('forgotOtpSection').style.display = 'block'; showToast('Đã gửi mã khôi phục!', 'success');
        }).catch(function() { showToast('Lỗi gửi Email!', 'error'); btnSend.disabled = false; btnSend.innerText = "GỬI LẠI MÃ OTP"; });
    } catch (error) { showToast('Lỗi máy chủ!', 'error'); }
};
window.xacNhanOTPForgotEmail = async function () {
    const code = document.getElementById('forgotOtpCode').value.trim(); const newPass = document.getElementById('forgotNewPass').value; const btnSubmit = document.querySelector('#forgotOtpSection .btn-submit');
    if (code !== generatedOTP_Forgot) return showToast("Mã OTP không đúng!", "error");
    if (newPass.length < 6) return showToast("Mật khẩu mới ít nhất 6 ký tự!", "error");
    btnSubmit.disabled = true; btnSubmit.innerText = "ĐANG XỬ LÝ...";
    try {
        const response = await fetch(`${API_URL}/forgot-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: userPhone_Forgot, newPassword: newPass }) });
        if (response.ok) { showToast('Đổi mật khẩu thành công!', 'success'); setTimeout(() => { location.reload(); }, 1500); } 
        else { const data = await response.json(); showToast(data.message || "Lỗi khi cập nhật mật khẩu!", "error"); btnSubmit.disabled = false; btnSubmit.innerHTML = '<i class="fas fa-key"></i> ĐỔI MẬT KHẨU MỚI'; }
    } catch (error) { showToast("Lỗi kết nối đến máy chủ!", "error"); btnSubmit.disabled = false; btnSubmit.innerHTML = '<i class="fas fa-key"></i> ĐỔI MẬT KHẨU MỚI'; }
};