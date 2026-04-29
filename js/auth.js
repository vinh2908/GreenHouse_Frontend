window.updateHeaderAuth = function () {
    const badge = document.getElementById('cartCount');
    if (badge) badge.innerText = cart.length;
    const authSec = document.getElementById('header-auth-section');
    if (authSec) {
        authSec.style.display = 'flex';
        authSec.style.alignItems = 'center';
        authSec.style.height = '100%';
        if (currentUser) {
            const adminBtn = currentUser.role === 'Admin'
                ? `<div onclick="window.location.href='admin.html'" style="cursor:pointer; display:flex; align-items:center; gap:8px;"><i class="fas fa-user-shield" style="color: #4E9F3D; font-size: 18px;"></i> <span style="color: #4E9F3D; font-weight:800; font-size: 15px;">Admin ${currentUser.name}</span></div>`
                : `<div onclick="openProfile()" style="cursor:pointer; display:flex; align-items:center; gap:8px;"><i class="fas fa-user-circle" style="font-size: 20px; color: #4E9F3D;"></i> <span style="font-weight:800; color: #000 ; font-size: 15px;">${currentUser.name}</span></div>`;
            authSec.innerHTML = `<div style="display: flex; align-items: center; background: #ffffff; border: 2px solid #e8f5e9; padding: 6px 16px; border-radius: 50px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); gap: 15px; transition: 0.3s;" onmouseover="this.style.borderColor='#4E9F3D'" onmouseout="this.style.borderColor='#e8f5e9'">${adminBtn} <div style="height: 20px; width: 2px; background-color: #eee; border-radius: 2px;"></div><a href="#" onclick="logout()" title="Dang xuat" style="color: #e74c3c; font-size: 18px; display: flex; align-items: center; transition: 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"><i class="fas fa-sign-out-alt"></i></a></div>`;
        } else {
            authSec.innerHTML = `<a href="login.html" class="btn-primary" style="padding:10px 24px; border-radius:50px; text-decoration:none; font-weight: 800; display: flex; align-items: center; gap: 8px; font-size: 14px; box-shadow: 0 4px 15px rgba(78, 159, 61, 0.2);"><i class="fas fa-sign-in-alt"></i> Dang Nhap</a>`;
        }
    }
};

window.logout = function () {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    sessionStorage.removeItem('temp_otp');
    sessionStorage.removeItem('temp_user');
    location.reload();
};

window.switchAuth = function (type) {
    const err = document.getElementById('error-msg');
    if (err) err.style.display = 'none';
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
};

function getNormalizedPhone(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return '';
    let raw = (input.value || '').trim();
    try {
        if (window.intlTelInputGlobals && typeof window.intlTelInputGlobals.getInstance === 'function') {
            const iti = window.intlTelInputGlobals.getInstance(input);
            if (iti && typeof iti.getNumber === 'function') raw = iti.getNumber() || raw;
        }
    } catch (e) {}
    return String(raw).replace(/[^\d]/g, '');
}

let registerOtpCountdownInterval = null;
let registerOtpSecondsLeft = 0;

function stopRegisterOtpCountdown() {
    if (registerOtpCountdownInterval) {
        clearInterval(registerOtpCountdownInterval);
        registerOtpCountdownInterval = null;
    }
}

function updateRegisterOtpCountdownUI() {
    const textEl = document.getElementById('otpCountdownText');
    const resendBtn = document.getElementById('btnResendOTP');
    if (!textEl || !resendBtn) return;
    if (registerOtpSecondsLeft > 0) {
        textEl.innerText = `Ban co the gui lai OTP sau ${registerOtpSecondsLeft} giay.`;
        resendBtn.disabled = true;
        resendBtn.style.background = '#bdbdbd';
    } else {
        textEl.innerText = 'Khong nhan duoc OTP? Ban co the gui lai ngay.';
        resendBtn.disabled = false;
        resendBtn.style.background = '#4E9F3D';
    }
}

function startRegisterOtpCountdown(seconds) {
    stopRegisterOtpCountdown();
    registerOtpSecondsLeft = seconds;
    updateRegisterOtpCountdownUI();
    registerOtpCountdownInterval = setInterval(() => {
        registerOtpSecondsLeft -= 1;
        if (registerOtpSecondsLeft <= 0) {
            registerOtpSecondsLeft = 0;
            stopRegisterOtpCountdown();
        }
        updateRegisterOtpCountdownUI();
    }, 1000);
}

function generateOtpCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendRegisterOtpEmail(name, email, otpCode) {
    return emailjs.send("service_2985", "template_2985", {
        to_name: name,
        to_email: email,
        otp_code: otpCode,
        reply_to: "vvinhdzs1tg@gmail.com"
    });
}

function looksLikeEmail(value) {
    return String(value || '').includes('@');
}

function normalizeLoginInput(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (looksLikeEmail(raw)) return raw.toLowerCase();
    if (/^\+?[\d\s().-]+$/.test(raw)) return raw.replace(/[^\d]/g, '');
    return raw;
}

async function callLoginApi(username, password) {
    const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    let data = {};
    try { data = await response.json(); } catch (e) {}
    return { response, data };
}

async function getPhonesByEmail(email) {
    if (!db || !email) return [];
    const exact = String(email).trim();
    const lower = exact.toLowerCase();
    const phones = [];
    const pushPhone = (phone) => {
        const p = String(phone || '').trim();
        if (p && !phones.includes(p)) phones.push(p);
    };
    const snapLower = await db.collection('users').where('email', '==', lower).get();
    snapLower.forEach(doc => pushPhone(doc.id));
    if (exact !== lower) {
        const snapExact = await db.collection('users').where('email', '==', exact).get();
        snapExact.forEach(doc => pushPhone(doc.id));
    }
    return phones;
}

window.xuLyDangNhap = async function (e) {
    if (e) e.preventDefault();
    const accountInput = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value;
    const err = document.getElementById('error-msg');
    const btnSubmit = document.querySelector('#box-login .btn-submit');
    if (err) err.style.display = 'none';
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> DANG KIEM TRA...';
    try {
        const normalized = normalizeLoginInput(accountInput);
        if (!normalized) {
            if (err) {
                err.style.display = 'block';
                err.innerHTML = '<i class="fas fa-exclamation-circle"></i> Vui long nhap tai khoan!';
            }
            return;
        }
        let candidates = [normalized];
        if (looksLikeEmail(normalized)) {
            const phones = await getPhonesByEmail(normalized);
            if (phones.length > 0) candidates = phones;
        }
        let lastMessage = 'Sai thong tin!';
        for (const candidate of candidates) {
            const { response, data } = await callLoginApi(candidate, pass);
            if (response.ok) {
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                localStorage.setItem('token', data.token);
                showToast('Dang nhap thanh cong!', 'success');
                setTimeout(() => {
                    if (data.user.role === 'Admin') window.location.href = 'admin.html';
                    else window.location.href = 'index.html';
                }, 1000);
                return;
            }
            lastMessage = data.message || lastMessage;
        }
        if (err) {
            err.style.display = 'block';
            err.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${lastMessage}`;
        }
    } catch (error) {
        showToast('Loi ket noi may chu Backend!', 'error');
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="fas fa-sign-in-alt"></i> DANG NHAP';
    }
};

window.xuLyGuiOTPEmail = async function (e) {
    if (e) e.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const phone = getNormalizedPhone('regPhone');
    const email = document.getElementById('regEmail').value.trim().toLowerCase();
    const pass = document.getElementById('regPass').value;
    const passConfirm = document.getElementById('regPassConfirm').value;
    const err = document.getElementById('error-msg');
    if (err) err.style.display = 'none';

    const phoneRegex = /^\d{8,15}$/;
    if (!phoneRegex.test(phone)) {
        if (err) {
            err.style.display = 'block';
            err.innerHTML = '<i class="fas fa-exclamation-circle"></i> So dien thoai khong hop le!';
        }
        showToast('So dien thoai khong hop le. Vui long nhap tu 8-15 so.', 'error');
        return;
    }
    if (pass !== passConfirm) {
        if (err) {
            err.style.display = 'block';
            err.innerHTML = '<i class="fas fa-exclamation-circle"></i> Mat khau xac nhan khong khop!';
        }
        showToast('Mat khau xac nhan khong khop!', 'error');
        return;
    }

    try {
        if (db) {
            const phoneSnap = await db.collection('users').doc(phone).get();
            if (phoneSnap.exists) {
                if (err) {
                    err.style.display = 'block';
                    err.innerHTML = '<i class="fas fa-exclamation-circle"></i> So dien thoai da ton tai!';
                }
                return;
            }
            const emailSnap = await db.collection('users').where('email', '==', email).get();
            if (!emailSnap.empty) {
                if (err) {
                    err.style.display = 'block';
                    err.innerHTML = '<i class="fas fa-exclamation-circle"></i> Email da ton tai!';
                }
                return;
            }
        }

        const otpCode = generateOtpCode();
        sessionStorage.setItem('temp_otp', otpCode);
        sessionStorage.setItem('temp_user', JSON.stringify({ phone, email, password: pass, name, role: 'User' }));
        const btnSend = document.getElementById('btnSendOTPEmail');
        btnSend.disabled = true;
        btnSend.innerText = 'DANG GUI MAIL...';

        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('otpSection').style.display = 'block';
        startRegisterOtpCountdown(60);
        showToast('Da mo man hinh OTP. Vui long kiem tra email.', 'success');
        try {
            await sendRegisterOtpEmail(name, email, otpCode);
            showToast('Ma OTP da duoc gui!', 'success');
        } catch (mailError) {
            showToast('Khong gui duoc email OTP. Vui long bam GUI LAI MA OTP.', 'error');
            startRegisterOtpCountdown(0);
        }
        btnSend.disabled = false;
        btnSend.innerHTML = '<i class="fas fa-envelope"></i> GUI LAI MA OTP';
    } catch (error) {
        showToast('Loi may chu!', 'error');
    }
};

window.guiLaiOTPEmail = async function () {
    const tempUser = JSON.parse(sessionStorage.getItem('temp_user') || 'null');
    const btnResend = document.getElementById('btnResendOTP');
    if (!tempUser || !tempUser.email) return showToast('Khong tim thay du lieu dang ky tam.', 'error');
    if (registerOtpSecondsLeft > 0) return showToast(`Vui long cho ${registerOtpSecondsLeft} giay de gui lai OTP.`, 'error');
    try {
        btnResend.disabled = true;
        btnResend.innerHTML = '<i class="fas fa-spinner fa-spin"></i> DANG GUI LAI...';
        const otpCode = generateOtpCode();
        sessionStorage.setItem('temp_otp', otpCode);
        await sendRegisterOtpEmail(tempUser.name || 'User', tempUser.email, otpCode);
        startRegisterOtpCountdown(60);
        showToast('Da gui lai ma OTP!', 'success');
    } catch (error) {
        showToast('Gui lai OTP that bai. Vui long thu lai.', 'error');
        startRegisterOtpCountdown(0);
    } finally {
        btnResend.innerHTML = '<i class="fas fa-redo-alt"></i> GUI LAI MA OTP';
        updateRegisterOtpCountdownUI();
    }
};

window.xacNhanOTPEmail = async function () {
    const inputCode = document.getElementById('otpCode').value.replace(/[^\d]/g, '').trim();
    const savedOTP = sessionStorage.getItem('temp_otp');
    const userData = JSON.parse(sessionStorage.getItem('temp_user') || 'null');
    const btnSubmit = document.querySelector('#otpSection .btn-submit');
    if (!userData) return showToast('Khong tim thay du lieu dang ky tam.', 'error');
    if (!/^\d{6}$/.test(inputCode)) return showToast('Vui long nhap dung 6 so OTP!', 'error');
    if (inputCode !== savedOTP) return showToast('Ma OTP khong chinh xac!', 'error');
    btnSubmit.disabled = true;
    btnSubmit.innerText = 'DANG TAO TAI KHOAN...';
    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        const data = await response.json();
        if (response.ok) {
            stopRegisterOtpCountdown();
            sessionStorage.removeItem('temp_otp');
            sessionStorage.removeItem('temp_user');
            showToast('Tao tai khoan thanh cong!', 'success');
            setTimeout(() => { window.location.reload(); }, 1200);
        } else {
            showToast(data.message || 'Loi khi tao tai khoan!', 'error');
            btnSubmit.disabled = false;
            btnSubmit.innerText = 'XAC NHAN & TAO TAI KHOAN';
        }
    } catch (error) {
        showToast('Loi ket noi may chu dang ky!', 'error');
        btnSubmit.disabled = false;
        btnSubmit.innerText = 'XAC NHAN & TAO TAI KHOAN';
    }
};

let generatedOTP_Forgot = '';
let userPhone_Forgot = '';
let forgotEmail_Forgot = '';
let forgotName_Forgot = '';
let forgotOtpCountdownInterval = null;
let forgotOtpSecondsLeft = 0;

function stopForgotOtpCountdown() {
    if (forgotOtpCountdownInterval) {
        clearInterval(forgotOtpCountdownInterval);
        forgotOtpCountdownInterval = null;
    }
}

function updateForgotOtpCountdownUI() {
    const textEl = document.getElementById('forgotOtpCountdownText');
    const resendBtn = document.getElementById('btnResendForgotOTP');
    if (!textEl || !resendBtn) return;
    if (forgotOtpSecondsLeft > 0) {
        textEl.innerText = `Ban co the gui lai OTP sau ${forgotOtpSecondsLeft} giay.`;
        resendBtn.disabled = true;
        resendBtn.style.background = '#bdbdbd';
    } else {
        textEl.innerText = 'Khong nhan duoc OTP? Ban co the gui lai ngay.';
        resendBtn.disabled = false;
        resendBtn.style.background = '#4E9F3D';
    }
}

function startForgotOtpCountdown(seconds) {
    stopForgotOtpCountdown();
    forgotOtpSecondsLeft = seconds;
    updateForgotOtpCountdownUI();
    forgotOtpCountdownInterval = setInterval(() => {
        forgotOtpSecondsLeft -= 1;
        if (forgotOtpSecondsLeft <= 0) {
            forgotOtpSecondsLeft = 0;
            stopForgotOtpCountdown();
        }
        updateForgotOtpCountdownUI();
    }, 1000);
}

async function sendForgotOtpEmail(email, name, otpCode) {
    return emailjs.send("service_2985", "template_2985", {
        to_email: email,
        to_name: name,
        otp_code: otpCode
    });
}

window.xuLyGuiOTPForgotEmail = async function (e) {
    if (e) e.preventDefault();
    const emailInputRaw = document.getElementById('forgotEmail').value.trim();
    const emailInput = emailInputRaw.toLowerCase();
    const err = document.getElementById('error-msg');
    if (err) err.style.display = 'none';
    try {
        let qSnap = await db.collection('users').where('email', '==', emailInput).get();
        if (qSnap.empty && emailInputRaw !== emailInput) {
            qSnap = await db.collection('users').where('email', '==', emailInputRaw).get();
        }
        if (qSnap.empty) {
            if (err) {
                err.style.display = 'block';
                err.innerHTML = '<i class="fas fa-exclamation-circle"></i> Email chua dang ky!';
            }
            return;
        }
        userPhone_Forgot = qSnap.docs[0].id;
        forgotEmail_Forgot = emailInput;
        forgotName_Forgot = qSnap.docs[0].data().name || 'User';
        generatedOTP_Forgot = generateOtpCode();
        const btnSend = document.getElementById('btnSendOTPForgot');
        btnSend.disabled = true;
        btnSend.innerText = 'DANG GUI MAIL...';
        document.getElementById('forgotForm').style.display = 'none';
        document.getElementById('forgotOtpSection').style.display = 'block';
        startForgotOtpCountdown(60);
        try {
            await sendForgotOtpEmail(forgotEmail_Forgot, forgotName_Forgot, generatedOTP_Forgot);
            showToast('Da gui ma khoi phuc!', 'success');
        } catch (mailError) {
            showToast('Khong gui duoc email OTP. Vui long bam GUI LAI MA OTP.', 'error');
            startForgotOtpCountdown(0);
        }
        btnSend.disabled = false;
        btnSend.innerHTML = '<i class="fas fa-envelope"></i> GUI LAI MA OTP';
    } catch (error) {
        showToast('Loi may chu!', 'error');
    }
};

window.guiLaiOTPForgotEmail = async function () {
    const btnResend = document.getElementById('btnResendForgotOTP');
    if (!forgotEmail_Forgot || !userPhone_Forgot) return showToast('Khong tim thay du lieu khoi phuc.', 'error');
    if (forgotOtpSecondsLeft > 0) return showToast(`Vui long cho ${forgotOtpSecondsLeft} giay de gui lai OTP.`, 'error');
    try {
        btnResend.disabled = true;
        btnResend.innerHTML = '<i class="fas fa-spinner fa-spin"></i> DANG GUI LAI...';
        generatedOTP_Forgot = generateOtpCode();
        await sendForgotOtpEmail(forgotEmail_Forgot, forgotName_Forgot, generatedOTP_Forgot);
        startForgotOtpCountdown(60);
        showToast('Da gui lai ma OTP!', 'success');
    } catch (error) {
        showToast('Gui lai OTP that bai. Vui long thu lai.', 'error');
        startForgotOtpCountdown(0);
    } finally {
        btnResend.innerHTML = '<i class="fas fa-redo-alt"></i> GUI LAI MA OTP';
        updateForgotOtpCountdownUI();
    }
};

window.xacNhanOTPForgotEmail = async function () {
    const code = document.getElementById('forgotOtpCode').value.replace(/[^\d]/g, '').trim();
    const newPass = document.getElementById('forgotNewPass').value;
    const btnSubmit = document.querySelector('#forgotOtpSection .btn-submit');
    if (!/^\d{6}$/.test(code)) return showToast('Vui long nhap dung 6 so OTP!', 'error');
    if (code !== generatedOTP_Forgot) return showToast('Ma OTP khong dung!', 'error');
    if (newPass.length < 6) return showToast('Mat khau moi it nhat 6 ky tu!', 'error');
    btnSubmit.disabled = true;
    btnSubmit.innerText = 'DANG XU LY...';
    try {
        const response = await fetch(`${API_URL}/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: userPhone_Forgot, newPassword: newPass })
        });
        if (response.ok) {
            stopForgotOtpCountdown();
            generatedOTP_Forgot = '';
            userPhone_Forgot = '';
            forgotEmail_Forgot = '';
            forgotName_Forgot = '';
            showToast('Doi mat khau thanh cong!', 'success');
            setTimeout(() => { location.reload(); }, 1200);
        } else {
            const data = await response.json();
            showToast(data.message || 'Loi khi cap nhat mat khau!', 'error');
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="fas fa-key"></i> DOI MAT KHAU MOI';
        }
    } catch (error) {
        showToast('Loi ket noi den may chu!', 'error');
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="fas fa-key"></i> DOI MAT KHAU MOI';
    }
};
