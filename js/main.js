window.goToBooking = function() { let skill = document.getElementById('homeSkill').value; localStorage.setItem('tempFilter', skill); window.location.href = 'booking.html'; };
window.quickFilter = function(skillName) { localStorage.setItem('tempFilter', skillName); window.location.href = 'booking.html'; };
window.datLamVuon = function () { localStorage.setItem('tempFilter', 'Làm vườn'); window.location.href = 'booking.html'; };
window.renderHomeMaids = function() {
    const container = document.getElementById('home-maid-list'); if (!container || !db) return;
    db.collection("maids").limit(4).onSnapshot((snapshot) => {
        container.innerHTML = '';
        if (snapshot.empty) { container.innerHTML = '<p style="text-align:center; grid-column:1/-1;">Chưa có nhân viên nào.</p>'; return; }
        snapshot.forEach(doc => {
            let m = doc.data(); let queQuan = m.Home || m.hometown || 'Chưa cập nhật'; let skillsArray = m.Skills || m.skills || []; if(typeof skillsArray === 'string') skillsArray = skillsArray.split(','); let skillsHtml = skillsArray.map(s => `<span class="elite-tag">${s.trim()}</span>`).join(''); 
            container.innerHTML += `<div class="elite-card" onclick="window.location.href='booking.html'"><img loading="lazy" src="${m.ImageUrl || m.img}" class="elite-avatar"><div class="elite-overlay"><h3 class="elite-name">${m.Name || m.name}</h3><p class="elite-info"><i class="fas fa-map-marker-alt"></i> ${m.Age || m.age} tuổi • ${queQuan}</p><div class="elite-rating">★ ${m.rating || '5.0'} <span style="color:#999; font-size:12px; font-weight:normal;">(${m.reviewCount || 0} đánh giá)</span></div><div class="elite-tags">${skillsHtml}</div></div></div>`; 
        });
    });
};
window.renderHomeProducts = function() {
    const grid = document.getElementById('best-seller-grid'); if (!grid || !db) return;
    db.collection("products").limit(3).onSnapshot((snapshot) => {
        grid.innerHTML = '';
        if (snapshot.empty) { grid.innerHTML = '<p style="text-align:center; grid-column:1/-1;">Chưa có sản phẩm nào.</p>'; return; }
        snapshot.forEach(doc => {
            let sp = doc.data();
            grid.innerHTML += `<div class="card shop-card" onclick="showProductDetail('${sp.id}')"><img loading="lazy" src="${sp.anh}" class="card-img"><div class="card-content"><h4 style="margin:0 0 10px; font-size:18px; color:#333;">${sp.ten}</h4><div style="font-weight:bold; color:#e91e63; margin-bottom:15px; font-size:18px;">${parseInt(sp.gia).toLocaleString()} đ</div><button type="button" class="btn-primary" style="width:100%; padding:12px 0;" onclick="event.stopPropagation(); buyNow('${sp.ten}', ${sp.gia}, '${sp.anh}', '${sp.id}')">MUA NGAY</button></div></div>`;
        });
    });
};
window.guiDanhGia = async function () {
    if (!currentUser) { showToast("Vui lòng đăng nhập để gửi đánh giá!", "error"); return; }
    let nameInput = document.getElementById('rvName').value.trim(); let name = nameInput || (currentUser && currentUser.name ? currentUser.name : "Khách ẩn danh"); let content = document.getElementById('rvContent').value.trim(); let star = document.getElementById('rvStar').value;
    if (!content) return showToast("Vui lòng nhập nội dung đánh giá!", "error");
    let btnSubmit = document.querySelector('button[onclick="guiDanhGia()"]'); if (btnSubmit) { btnSubmit.disabled = true; btnSubmit.innerText = "ĐANG GỬI..."; }
    try {
        const response = await fetch(`${API_URL}/reviews`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name, userPhone: currentUser.phone || "unknown", content: content, star: parseInt(star) || 5, date: new Date().toLocaleDateString('vi-VN') }) });
        if (!response.ok) throw new Error("Máy chủ Backend từ chối nhận đánh giá");
        showToast("Cảm ơn bạn đã đánh giá dịch vụ!", "success"); document.getElementById('rvName').value = ''; document.getElementById('rvContent').value = ''; if (typeof window.chonSao === 'function') window.chonSao(5); 
        if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.innerText = "GỬI ĐÁNH GIÁ"; }
    } catch (error) { showToast("Lỗi hệ thống khi gửi đánh giá!", "error"); if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.innerText = "GỬI ĐÁNH GIÁ"; } }
};
window.renderHomeReviews = function() {
    const container = document.getElementById('review-list'); if (!container || !db) return;
    db.collection("reviews").orderBy("timestamp", "desc").limit(3).onSnapshot((snapshot) => {
        container.innerHTML = '';
        if (snapshot.empty) { container.innerHTML = '<p style="text-align:center; grid-column:1/-1; color:#999;">Chưa có đánh giá nào.</p>'; return; }
        snapshot.forEach(doc => {
            let r = doc.data(); let starCount = parseInt(r.star) || 5; let starsHtml = '★'.repeat(starCount) + '☆'.repeat(5 - starCount); let content = r.content || "Tuyệt vời, dịch vụ rất tốt!"; let name = r.name || "Khách hàng ẩn danh"; let date = r.date || "Khách hàng thân thiết";
            container.innerHTML += `<div class="review-card"><div class="star-rating" style="color:#f1c40f; margin-bottom:10px;">${starsHtml}</div><p style="font-style:italic; color:#555;">"${content}"</p><h4 style="margin:10px 0 5px; color:var(--primary);">${name}</h4><small style="color:#999;">${date}</small></div>`;
        });
    });
};
window.chonSao = function (star) {
    document.getElementById('rvStar').value = star; let stars = document.querySelectorAll('.rating-stars .star');
    stars.forEach((s, idx) => { if (idx < star) { s.classList.add('active'); s.style.color = '#f1c40f'; } else { s.classList.remove('active'); s.style.color = '#ddd'; } });
}

/* Chat Client & Admin Logic */
let clientChatListener = null; let currentMsgCount = 0; let adminChatListener = null; window.activeChatUser = null;
window.toggleChat = function () {
    if (!currentUser) return showToast("Vui lòng đăng nhập để chat!", "error");
    const w = document.getElementById('chatWindow');
    if (w) { w.style.display = (w.style.display === 'flex') ? 'none' : 'flex'; if (w.style.display === 'flex') listenClientChat(); }
}
window.listenClientChat = function () {
    if (!db || !currentUser) return;
    const userId = currentUser.phone; if (clientChatListener) clientChatListener(); 
    clientChatListener = db.collection("chats").doc(userId).onSnapshot((doc) => {
        const body = document.getElementById('chatBody'); if (!body) return;
        if (!doc.exists || !doc.data().messages || doc.data().messages.length === 0) { body.innerHTML = '<p style="text-align:center;color:#999;margin-top:20px">Chào bạn, GREEN HOUSE có thể giúp gì?</p>'; currentMsgCount = 0; return; } 
        let msgs = doc.data().messages;
        if (currentMsgCount === 0 || msgs.length < currentMsgCount) { body.innerHTML = ''; currentMsgCount = 0; }
        if (msgs.length > currentMsgCount) {
            let newMsgs = msgs.slice(currentMsgCount);
            newMsgs.forEach(m => {
                const isMe = (m.sender === 'user');
                body.innerHTML += `<div class="msg ${isMe ? 'msg-me' : 'msg-ad'}" style="margin-bottom: 10px; display: flex; flex-direction: column; align-items: ${isMe ? 'flex-end' : 'flex-start'};"><div style="background: ${isMe ? '#4CAF50' : '#eee'}; color: ${isMe ? 'white' : 'black'}; padding: 8px 12px; border-radius: 15px; max-width: 80%; word-wrap: break-word;">${m.text}</div><small style="font-size: 10px; color: #999; margin-top: 2px;">${m.time}</small></div>`;
            });
            currentMsgCount = msgs.length; body.scrollTop = body.scrollHeight; 
        }
    });
}
window.sendChat = async function () {
    const input = document.getElementById('chatInput'); const text = input.value.trim(); if (!text || !currentUser || !db) return;
    const userId = currentUser.phone; const chatRef = db.collection("chats").doc(userId); const newMessage = { sender: 'user', text: text, time: new Date().toLocaleTimeString() };
    try {
        const doc = await chatRef.get();
        if (doc.exists) { await chatRef.update({ messages: firebase.firestore.FieldValue.arrayUnion(newMessage), lastUpdated: firebase.firestore.FieldValue.serverTimestamp() }); } 
        else { await chatRef.set({ userName: currentUser.name, phone: currentUser.phone, messages: [newMessage], lastUpdated: firebase.firestore.FieldValue.serverTimestamp() }); }
        input.value = '';
    } catch (e) { showToast("Lỗi gửi tin nhắn", "error"); }
}
window.handleChat = function (e) { if (e.key === 'Enter') sendChat(); }
window.tuVanDecor = function () { if (!currentUser) return showToast("Đăng nhập để chat!", "error"); const w = document.getElementById('chatWindow'); if (w) { w.style.display = 'flex'; const input = document.getElementById('chatInput'); if (input) { input.value = "Tôi cần tư vấn Decor nội thất."; sendChat(); } } };
window.tuVanChung = function () { showToast("Vui lòng gọi đến tổng đài: 1900 xxxx", "success"); };
window.toggleChatUI = function (e) { const w = document.getElementById('chatWidget'); if (e.target.closest('.chat-layout')) return; w.classList.toggle('expanded'); if (w.classList.contains('expanded')) loadChatUsers(); }
window.closeChatUI = function (e) { e.stopPropagation(); document.getElementById('chatWidget').classList.remove('expanded'); }
window.loadChatUsers = function () {
    const list = document.getElementById('userList'); if (!list || !db) return;
    db.collection("chats").orderBy("lastUpdated", "desc").onSnapshot(snapshot => {
        list.innerHTML = '';
        if (snapshot.empty) { list.innerHTML = '<p style="padding:15px; color:#888; text-align:center;">Chưa có tin nhắn</p>'; return; }
        snapshot.forEach(doc => { let chatData = doc.data(); let phone = doc.id; let name = chatData.userName || phone; list.innerHTML += `<div class="chat-user-item ${window.activeChatUser === phone ? 'active' : ''}" onclick="selectChatUser('${phone}', '${name}')"><div style="font-weight:bold;">👤 ${name}</div><div style="font-size:12px; color:#666;">${phone}</div></div>`; });
    });
}
window.selectChatUser = function (phone, name) {
    window.activeChatUser = phone; document.getElementById('chatWithUser').innerText = "Chat với: " + name; loadChatUsers(); 
    if (adminChatListener) adminChatListener();
    adminChatListener = db.collection("chats").doc(phone).onSnapshot(doc => {
        const body = document.getElementById('chatMsgs'); body.innerHTML = '';
        if (doc.exists && doc.data().messages) {
            let msgs = doc.data().messages;
            msgs.forEach(m => { let isAd = m.sender === 'admin'; body.innerHTML += `<div class="msg ${isAd ? 'msg-admin' : 'msg-user'}" style="padding:10px 15px; border-radius:15px; max-width:70%; margin-bottom:10px; background:${isAd ? '#0984e3' : '#f1f2f6'}; color:${isAd ? 'white' : '#333'}; align-self:${isAd ? 'flex-end' : 'flex-start'}; margin-left:${isAd ? 'auto' : '0'};">${m.text}</div>`; });
            body.scrollTop = body.scrollHeight;
        }
    });
}
window.sendAdminMsg = async function () {
    if (!window.activeChatUser) return showToast("Hãy chọn một khách hàng để chat!", "warning");
    const txt = document.getElementById('adminInput').value.trim(); if (!txt || !db) return;
    const chatRef = db.collection("chats").doc(window.activeChatUser); const newMessage = { sender: 'admin', text: txt, time: new Date().toLocaleTimeString() };
    try { await chatRef.update({ messages: firebase.firestore.FieldValue.arrayUnion(newMessage), lastUpdated: firebase.firestore.FieldValue.serverTimestamp() }); document.getElementById('adminInput').value = ''; } catch (e) { showToast("Lỗi gửi tin nhắn", "error"); }
}