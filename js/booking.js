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
        let today = new Date(); let todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
        if(document.getElementById('bkDate')) document.getElementById('bkDate').min = todayStr;
        document.getElementById('bkDate').value = ""; document.getElementById('bkStartTime').value = ""; document.getElementById('bkDuration').value = ""; document.getElementById('bkAddress').value = "";
        if(document.getElementById('bkService')) document.getElementById('bkService').selectedIndex = 0; 
        document.getElementById('bkTotal').innerText = "0";
    }
}

function generateBookingPaymentReference() {
    const ts = Date.now().toString().slice(-6);
    const rand = Math.floor(Math.random() * 900 + 100).toString();
    return `DV${ts}${rand}`;
}

window.confirmBookingReal = async function() {
    if(!db) return showToast('Loi ket noi Firebase!', 'error');
    const date = document.getElementById('bkDate').value;
    const time = document.getElementById('bkStartTime').value;
    const dur = document.getElementById('bkDuration').value;
    const addr = document.getElementById('bkAddress').value.trim();
    const phone = document.getElementById('bkPhoneReal').value.trim();
    const totalStr = document.getElementById('bkTotal').innerText;
    const maidName = document.getElementById('sbName').dataset.name;
    const maidId = document.getElementById('sbName').dataset.id;
    const serviceElement = document.getElementById('bkService');
    const serviceName = serviceElement ? serviceElement.options[serviceElement.selectedIndex].text : 'Dich vu';

    if (!date || !time || !dur || !phone || !addr) return showToast('Vui long dien du thong tin!', 'error');
    if (parseFloat(dur) <= 0) return showToast('Thoi luong lam viec phai toi thieu 1 gio!', 'error');

    let now = new Date();
    let todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    let currentMins = now.getHours() * 60 + now.getMinutes();
    if (date < todayStr) return showToast('Khong the dat lich cho ngay trong qua khu!', 'error');
    if (date === todayStr && timeToMinutes(time) <= currentMins) return showToast('Gio bat dau da troi qua, vui long chon gio muon hon.', 'error');

    let btnConfirm = document.querySelector('.btn-confirm-elite') || document.querySelector('button[onclick="confirmBookingReal()"]');
    if (btnConfirm) { btnConfirm.disabled = true; btnConfirm.innerText = 'DANG KIEM TRA LICH...'; }

    try {
        const reqStart = timeToMinutes(time);
        const reqEnd = reqStart + (parseFloat(dur) * 60);

        const snap = await db.collection('orders').where('maidId', '==', maidId).where('workDate', '==', date).get();
        let isOverlap = false;
        snap.forEach(doc => {
            let o = doc.data();
            if (o.status !== 'cancelled') {
                let oStart = timeToMinutes(o.workTime);
                let oEnd = oStart + (parseFloat(o.workDuration) * 60);
                if (reqStart < oEnd && reqEnd > oStart) isOverlap = true;
            }
        });
        if (isOverlap) throw new Error('SLOT_CONFLICT');

        const orderId = 'DV' + Date.now() + Math.floor(Math.random() * 1000000);
        const orderRef = db.collection('orders').doc(orderId);
        const lockRef = db.collection('booking_day_locks').doc(`${maidId}_${date}`);

        const newOrder = {
            id: orderId,
            paymentReference: generateBookingPaymentReference(),
            user: currentUser.phone,
            customerInfo: { name: currentUser.name, phone: phone, address: addr },
            items: `Goi: ${serviceName} - Chuyen gia: ${maidName} (${dur} gio, tu ${time} ngay ${date})`,
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

        await db.runTransaction(async (transaction) => {
            const lockDoc = await transaction.get(lockRef);
            const lockData = lockDoc.exists ? lockDoc.data() : {};
            const reservations = Array.isArray(lockData.reservations) ? lockData.reservations : [];

            const conflict = reservations.some(r => {
                if (!r || r.status === 'cancelled') return false;
                const start = Number(r.startMinutes || 0);
                const end = Number(r.endMinutes || 0);
                return reqStart < end && reqEnd > start;
            });
            if (conflict) throw new Error('SLOT_CONFLICT');

            reservations.push({
                orderId: orderId,
                startMinutes: reqStart,
                endMinutes: reqEnd,
                status: 'pending',
                createdAtMs: Date.now()
            });

            transaction.set(lockRef, {
                maidId: maidId,
                workDate: date,
                reservations: reservations,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            transaction.set(orderRef, newOrder);
        });

        closeBooking();
        showToast('Da gui yeu cau dat lich! (Dang cho thanh toan)', 'success');
    } catch (error) {
        if (error && error.message === 'SLOT_CONFLICT') {
            showToast('Nhan vien da co lich trung gio nay. Vui long chon gio khac!', 'error');
        } else {
            showToast('Loi ket noi may chu!', 'error');
        }
    } finally {
        if (btnConfirm) { btnConfirm.disabled = false; btnConfirm.innerText = 'GUI YEU CAU'; }
    }
}
window.calculateTotal = function () {
    let bkService = document.getElementById('bkService'); let bkDuration = document.getElementById('bkDuration');
    if (!bkService || !bkDuration) return;
    let price = parseInt(bkService.value) || 0; let dur = parseFloat(bkDuration.value) || 0; let total = price * dur;
    document.getElementById('bkTotal').innerText = total > 0 ? total.toLocaleString('vi-VN') : "0";
}
window.closeBooking = function () { let confirmBox = document.getElementById('booking-confirm'); if (confirmBox) confirmBox.style.display = 'none'; }
window.showMaidDetail = async function (id) {
    if (!db) return;
    try {
        const doc = await db.collection("maids").doc(id).get();
        if (!doc.exists) return showToast("Không tìm thấy thông tin nhân viên!", "error");
        let m = doc.data(); let skillsArray = m.Skills || m.skills || []; if (typeof skillsArray === 'string') skillsArray = skillsArray.split(',');
        let skillsHtml = skillsArray.map(s => `<span style="display:inline-flex; align-items:center; background:#e8f5e9; color:#2e7d32; padding:8px 16px; border-radius:20px; font-size:13px; font-weight:700; border:1px solid #c8e6c9; margin: 0 8px 8px 0; transition:0.3s;"><i class="fas fa-check-circle" style="margin-right:6px;"></i>${s.trim()}</span>`).join('');
        let modalContent = document.querySelector('#maidDetailModal .modal-content');
        if(modalContent) { modalContent.style.width = '900px'; modalContent.style.maxWidth = '95%'; modalContent.style.padding = '35px'; modalContent.style.borderRadius = '24px'; }
        let detailHTML = `<div style="display:flex; gap:35px; flex-wrap:wrap; align-items: stretch;"><div style="flex:1; min-width:300px; position: relative;"><img loading="lazy" src="${m.ImageUrl || m.img}" style="width:100%; height:100%; min-height: 420px; object-fit:cover; border-radius:20px; box-shadow: 0 15px 35px rgba(0,0,0,0.15);"><div style="position: absolute; top: 15px; left: 15px; background: rgba(255,255,255,0.95); backdrop-filter: blur(5px); padding: 6px 15px; border-radius: 15px; font-weight: 900; color: #f39c12; box-shadow: 0 4px 15px rgba(0,0,0,0.1);"><i class="fas fa-star"></i> 5.0</div><div style="position: absolute; bottom: 15px; right: 15px; background: #2ecc71; color: white; padding: 6px 15px; border-radius: 15px; font-weight: bold; font-size: 13px; box-shadow: 0 4px 15px rgba(46, 204, 113, 0.4);"><i class="fas fa-shield-check"></i> Đã xác minh</div></div><div style="flex:1.5; min-width:300px; display: flex; flex-direction: column; justify-content: center;"><h2 style="color:#1b5e20; font-size: 34px; margin:0 0 20px 0; font-weight: 800;">${m.Name || m.name}</h2><div style="display: flex; gap: 12px; margin-bottom: 25px; flex-wrap: wrap;"><span style="background: #f8f9fa; padding: 10px 18px; border-radius: 12px; color: #444; font-weight: 700; border: 1px solid #e0e0e0; font-size: 14px;"><i class="fas fa-birthday-cake" style="color:#4CAF50; margin-right:5px;"></i> ${m.Age || m.age} tuổi</span><span style="background: #f8f9fa; padding: 10px 18px; border-radius: 12px; color: #444; font-weight: 700; border: 1px solid #e0e0e0; font-size: 14px;"><i class="fas fa-map-marker-alt" style="color:#e74c3c; margin-right:5px;"></i> ${m.Home || m.queQuan || 'Việt Nam'}</span><span style="background: #f8f9fa; padding: 10px 18px; border-radius: 12px; color: #444; font-weight: 700; border: 1px solid #e0e0e0; font-size: 14px;"><i class="fas fa-briefcase" style="color:#0984e3; margin-right:5px;"></i> ${m.Experience || m.exp || 'Đã đào tạo'}</span></div><div style="margin-bottom:25px;"><h4 style="color:#333; margin: 0 0 12px 0; font-size: 15px; text-transform: uppercase; letter-spacing: 1px;"><i class="fas fa-tools" style="color:#555;"></i> Chuyên môn</h4><div>${skillsHtml}</div></div><div style="background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%); padding:20px 25px; border-radius:18px; border: 1px solid #c8e6c9; margin-bottom:30px; box-shadow: 0 8px 20px rgba(78, 159, 61, 0.06);"><h4 style="color:#2e7d32; margin: 0 0 10px 0; font-size: 16px;"><i class="fas fa-quote-left"></i> Thông tin thêm</h4><p style="margin:0; font-size:15px; line-height:1.7; color:#555; font-style: italic;">${m.Bio || m.desc || m.bio || 'Nhân viên ưu tú, tận tâm với công việc, cam kết mang lại chất lượng dịch vụ tốt nhất.'}</p></div><button class="btn-primary" style="width:100%; padding: 20px; font-size: 18px; font-weight: 800; border-radius: 16px; box-shadow: 0 12px 30px rgba(78, 159, 61, 0.3); display: flex; justify-content: center; align-items: center; gap: 12px; transition: 0.3s;" onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform='translateY(0)'" onclick="closeDiag('maidDetailModal'); window.quickBook('${m.id || m.Id}', '${m.Name || m.name}', '${m.ImageUrl || m.img}', '${m.Experience || m.exp}')"><i class="fas fa-calendar-check" style="font-size: 24px;"></i> ĐẶT LỊCH CHUYÊN GIA NÀY</button></div></div>`;
        document.getElementById('maidDetailBody').innerHTML = detailHTML; document.getElementById('maidDetailModal').style.display = 'flex';
    } catch (error) { showToast("Lỗi hệ thống khi tải dữ liệu!", "error"); }
};
window.renderMaidListPro = function(filterSkill = 'all', filterExp = 'all') { 
    const container = document.getElementById('maid-list-container'); const countLabel = document.getElementById('maidCount'); if(!container || !db) return; 
    db.collection("maids").orderBy("timestamp", "desc").onSnapshot((snapshot) => {
        let data = []; snapshot.forEach(doc => data.push(doc.data()));
        if(filterSkill !== 'all') { let keyword = filterSkill.trim().toLowerCase(); data = data.filter(m => { let skillsArray = m.Skills || m.skills || []; if(typeof skillsArray === 'string') skillsArray = skillsArray.split(','); return skillsArray.some(skill => skill.toLowerCase().includes(keyword)); }); } 
        if(filterExp !== 'all') { data = data.filter(m => { let expString = String(m.Experience || m.exp || "0"); let match = expString.match(/\d+/); let soNam = match ? parseInt(match[0]) : 0; if(filterExp === 'new') return soNam < 3; if(filterExp === 'pro') return soNam >= 3; return true; }); } 
        if(countLabel) countLabel.innerText = data.length; container.innerHTML = ''; 
        if(data.length === 0) { container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:50px;color:#999;">Chưa có dữ liệu.</div>`; return; } 
        let now = new Date(); let todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0'); let currentMinutes = now.getHours() * 60 + now.getMinutes();
        data.forEach(m => { 
            let statusBadge = `<span class="elite-status free"><i class="fas fa-check-circle"></i> Sẵn sàng</span>`; let actionBtn = `<button type="button" class="elite-book-btn" onclick="event.stopPropagation(); window.quickBook('${m.Id || m.id}', '${m.Name || m.name}', '${m.ImageUrl || m.img}', '${m.Experience || m.exp}')">ĐẶT LỊCH NGAY</button>`;
            let schedules = m.schedules || [];
            if (schedules.length > 0) {
                let todaySchedules = schedules.filter(s => s.date === todayStr).sort((a,b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
                for (let s of todaySchedules) {
                    let startMins = timeToMinutes(s.startTime); let endMins = startMins + (parseFloat(s.duration) * 60);
                   if (currentMinutes >= startMins && currentMinutes < endMins) {
                        let endHours = Math.floor(endMins / 60).toString().padStart(2, '0'); let endMinsStr = (endMins % 60).toString().padStart(2, '0');
                        statusBadge = `<span class="elite-status busy" style="background:#e74c3c; color:#ffffff !important; font-weight:bold; padding:4px 10px; border-radius:12px;"><i class="fas fa-clock"></i> Sẽ bận tới ${endHours}:${endMinsStr}</span>`; actionBtn = `<button type="button" class="elite-book-btn" onclick="event.stopPropagation(); window.quickBook('${m.Id || m.id}', '${m.Name || m.name}', '${m.ImageUrl || m.img}', '${m.Experience || m.exp}')">ĐẶT TRƯỚC GIỜ KHÁC</button>`; break;
                    } else if (currentMinutes < startMins) {
                        statusBadge = `<span class="elite-status busy" style="background:#f39c12; color:#ffffff !important; font-weight:bold; padding:4px 10px; border-radius:12px;"><i class="fas fa-hourglass-half"></i> Sẽ bận lúc ${s.startTime}</span>`; actionBtn = `<button type="button" class="elite-book-btn" onclick="event.stopPropagation(); window.quickBook('${m.Id || m.id}', '${m.Name || m.name}', '${m.ImageUrl || m.img}', '${m.Experience || m.exp}')">ĐẶT TRƯỚC GIỜ KHÁC</button>`; break; 
                    }
                }
            }
            if (m.IsAvailable === false) { statusBadge = `<span class="elite-status busy"><i class="fas fa-lock"></i> Tạm nghỉ phép</span>`; actionBtn = `<button type="button" class="elite-book-btn busy" disabled>KHÔNG NHẬN LỊCH</button>`; }
            let queQuan = m.Home || m.hometown || 'Chưa cập nhật'; let skillsArray = m.Skills || m.skills || []; if(typeof skillsArray === 'string') skillsArray = skillsArray.split(','); let skillsHtml = skillsArray.map(s => `<span class="elite-tag">${s.trim()}</span>`).join(''); 
            container.innerHTML += `<div class="elite-card" onclick="showMaidDetail('${m.Id || m.id}')"><img loading="lazy" src="${m.ImageUrl || m.img}" class="elite-avatar">${statusBadge}<div class="elite-overlay"><h3 class="elite-name">${m.Name || m.name}</h3><p class="elite-info"><i class="fas fa-map-marker-alt"></i> ${m.Age || m.age || '?'} tuổi • ${queQuan}</p><div class="elite-rating">★ ${m.rating || '5.0'} <span style="color:#c8e6c9; font-size:12px; font-weight:normal;">(${m.reviewCount || 0} đánh giá)</span></div><div class="elite-tags">${skillsHtml}</div>${actionBtn}</div></div>`; 
        }); 
    });
}
window.applyTempFilter = function() {
    let tempSkill = localStorage.getItem('tempFilter'); let hiddenInput = document.getElementById('filterSkill');
    if (tempSkill && hiddenInput) {
        hiddenInput.value = tempSkill; 
        let textNode = document.getElementById('text-filterSkill');
        if(textNode) {
            let allOptions = textNode.closest('.custom-dropdown').querySelectorAll('.dropdown-item');
            allOptions.forEach(opt => {
                if (opt.getAttribute('onclick').includes(`'${tempSkill}'`)) {
                    textNode.innerText = opt.innerText;
                    opt.parentElement.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
                    opt.classList.add('active');
                }
            });
        }
        if(typeof filterMaids === 'function') filterMaids(); else window.renderMaidListPro(tempSkill, 'all'); 
        localStorage.removeItem('tempFilter');
    }
};
window.toggleDropdown = function(element) {
    document.querySelectorAll('.custom-dropdown').forEach(dropdown => { if(dropdown !== element) dropdown.classList.remove('open'); }); element.classList.toggle('open');
};
window.selectOption = function(optionElement, inputId, value) {
    if(event) event.stopPropagation(); 
    let dropdown = optionElement.closest('.custom-dropdown'); dropdown.querySelector('.selected-text').innerText = optionElement.innerText; dropdown.querySelectorAll('.dropdown-item').forEach(item => item.classList.remove('active')); optionElement.classList.add('active'); document.getElementById(inputId).value = value; dropdown.classList.remove('open');
};
document.addEventListener('click', function(event) { if (!event.target.closest('.custom-dropdown')) { document.querySelectorAll('.custom-dropdown').forEach(dropdown => { dropdown.classList.remove('open'); }); } });
window.filterMaids = function() {
    let skillInput = document.getElementById('filterSkill'); let expInput = document.getElementById('filterExp');
    if (!skillInput || !expInput) return;
    let skill = skillInput.value; let exp = expInput.value; window.renderMaidListPro(skill, exp);
    let container = document.getElementById('maid-list-container'); if(container) { container.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
};
window.checkCompletedJobs = async function() {
    if (!db || !currentUser) return;
    const snap = await db.collection("orders").where("user", "==", currentUser.phone).where("status", "==", "confirmed").get();
    let now = new Date(); let todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0'); let currentMinutes = now.getHours() * 60 + now.getMinutes();
    snap.forEach(async doc => {
        let o = doc.data();
        if (o.maidId && !o.reviewRequested) {
            let isPast = false;
            if (o.workDate < todayStr) { isPast = true; } 
            else if (o.workDate === todayStr) { let endMins = timeToMinutes(o.workTime) + (parseFloat(o.workDuration) * 60); if (currentMinutes > endMins) isPast = true; }
            if (isPast) {
                let maidName = "chuyên gia"; try { let mDoc = await db.collection("maids").doc(o.maidId).get(); if(mDoc.exists) maidName = mDoc.data().Name || mDoc.data().name || "chuyên gia"; } catch(e){}
                let chatRef = db.collection("chats").doc(currentUser.phone); let newMessage = { sender: 'admin', type: 'review_prompt', maidId: o.maidId, orderId: o.id, maidName: maidName, workDate: o.workDate, time: new Date().toLocaleTimeString() };
                try {
                    let chatDoc = await chatRef.get();
                    if (chatDoc.exists) { await chatRef.update({ messages: firebase.firestore.FieldValue.arrayUnion(newMessage), lastUpdated: firebase.firestore.FieldValue.serverTimestamp() }); } 
                    else { await chatRef.set({ userName: currentUser.name, phone: currentUser.phone, messages: [newMessage], lastUpdated: firebase.firestore.FieldValue.serverTimestamp() }); }
                    await db.collection("orders").doc(o.id).update({ reviewRequested: true });
                    let chatW = document.getElementById('chatWindow'); if(chatW && chatW.style.display !== 'flex') showToast("Bạn có tin nhắn mới từ CSKH!", "success");
                } catch (e) { console.log("Lỗi gửi chat review:", e); }
            }
        }
    });
};
let currentReviewMaidId = ""; let currentReviewOrderId = "";
window.openMaidReviewModal = async function(maidId, orderId) {
    try { let odoc = await db.collection("orders").doc(orderId).get(); if(odoc.exists && odoc.data().isReviewed) { return showToast("Bạn đã đánh giá cho ca làm việc này rồi!", "warning"); } } catch(e) {}
    currentReviewMaidId = maidId; currentReviewOrderId = orderId;
    if (!document.getElementById('maidReviewModal')) {
        let modalHTML = `<div id="maidReviewModal" class="modal" style="display:flex; z-index: 10005;"><div class="modal-content" style="width:400px; text-align:center; border-radius:20px;"><span class="close-modal" onclick="closeDiag('maidReviewModal')">×</span><h2 style="color:#2e7d32; margin-top:0;">Đánh Giá Nhân Viên</h2><p style="color:#666; font-size:14px; margin-bottom:20px;">Sự hài lòng của bạn là động lực của chúng tôi!</p><div class="rating-stars" id="maidStars" style="font-size: 40px; cursor: pointer; margin-bottom: 20px;"><span onclick="chonSaoMaid(1)" class="star">★</span><span onclick="chonSaoMaid(2)" class="star">★</span><span onclick="chonSaoMaid(3)" class="star">★</span><span onclick="chonSaoMaid(4)" class="star">★</span><span onclick="chonSaoMaid(5)" class="star active" style="color: #f1c40f;">★</span><input type="hidden" id="maidRvStar" value="5"></div><textarea id="maidRvContent" class="form-input-elite" rows="3" placeholder="Nhân viên làm việc có tốt không? Để lại nhận xét của bạn nhé..."></textarea><button onclick="submitMaidReview()" class="btn-primary" style="width:100%; padding:15px; font-size:16px; border-radius:12px; margin-top:20px; font-weight:bold;">GỬI ĐÁNH GIÁ</button></div></div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    } else { document.getElementById('maidReviewModal').style.display = 'flex'; }
    chonSaoMaid(5); document.getElementById('maidRvContent').value = "";
    if(document.getElementById('chatWindow')) document.getElementById('chatWindow').style.display = 'none'; 
};
window.chonSaoMaid = function(star) {
    document.getElementById('maidRvStar').value = star;
    let stars = document.querySelectorAll('#maidStars .star');
    stars.forEach((s, idx) => { if (idx < star) { s.classList.add('active'); s.style.color = '#f1c40f'; } else { s.classList.remove('active'); s.style.color = '#ddd'; } });
};
window.submitMaidReview = async function() {
    let star = parseInt(document.getElementById('maidRvStar').value); let content = document.getElementById('maidRvContent').value.trim();
    if (!content) return showToast("Vui lòng để lại vài lời nhận xét!", "error");
    try {
        const maidRef = db.collection("maids").doc(currentReviewMaidId); const doc = await maidRef.get();
        if (doc.exists) {
            let m = doc.data(); let currentRating = m.rating || 5.0; let currentCount = m.reviewCount || 0;
            let newCount = currentCount + 1; let newRating = ((currentRating * currentCount) + star) / newCount; newRating = Math.round(newRating * 10) / 10; 
            await maidRef.update({ rating: newRating, reviewCount: newCount });
        }
        await db.collection("reviews").add({ name: currentUser.name, maidId: currentReviewMaidId, content: content, star: star, date: new Date().toLocaleDateString('vi-VN'), timestamp: firebase.firestore.FieldValue.serverTimestamp() });
        await db.collection("orders").doc(currentReviewOrderId).update({ isReviewed: true });
        let chatRef = db.collection("chats").doc(currentUser.phone); let chatDoc = await chatRef.get();
        if (chatDoc.exists) {
            let msgs = chatDoc.data().messages; let updated = false;
            for (let i = 0; i < msgs.length; i++) {
                if (msgs[i].type === 'review_prompt' && msgs[i].maidId === currentReviewMaidId && msgs[i].orderId === currentReviewOrderId) {
                    msgs[i].type = 'review_prompt_done';
                    msgs[i].text = 'Ban da danh gia chat luong cho ca lam viec nay.';
                    updated = true;
                }
            }
            if(updated) { await chatRef.update({ messages: msgs }); if (typeof listenClientChat === 'function') listenClientChat(); }
        }
        showToast("Cảm ơn bạn! Đánh giá đã được ghi nhận.", "success"); closeDiag('maidReviewModal');
        if(document.getElementById('chatWindow')) document.getElementById('chatWindow').style.display = 'flex';
    } catch (e) { showToast("Lỗi hệ thống khi gửi đánh giá!", "error"); }
};
