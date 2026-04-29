window.checkAdminAccess = async function() {
    let localUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!localUser || !localUser.phone) { window.location.href = 'login.html'; return; }
    try {
        const userDoc = await db.collection('users').doc(localUser.phone).get();
        if (!userDoc.exists || userDoc.data().role !== 'Admin') { showToast("Truy cập bị từ chối! Bạn không phải là Quản trị viên.", "error"); setTimeout(() => { window.location.href = 'index.html'; }, 1500); } 
        else { if(typeof loadAdminData === 'function') loadAdminData(); }
    } catch (error) { console.error("Lỗi xác thực:", error); }
};

function initClient() {
    cart = cart.filter(item => item && item.anh && item.ten && item.gia);
    localStorage.setItem('cart', JSON.stringify(cart));
    if(typeof updateHeaderAuth === 'function') updateHeaderAuth();
    if (currentUser && typeof listenClientChat === 'function') listenClientChat();
    if (typeof checkCompletedJobs === 'function') checkCompletedJobs();

    if (document.getElementById('home-maid-list') && typeof renderHomeMaids === 'function') renderHomeMaids();
    if (document.getElementById('best-seller-grid') && typeof renderHomeProducts === 'function') renderHomeProducts();
    if (document.getElementById('review-list') && typeof renderHomeReviews === 'function') renderHomeReviews(); 
    if (document.getElementById('maid-list-container') && typeof applyTempFilter === 'function') applyTempFilter();
}

document.addEventListener("DOMContentLoaded", function () {
    if (document.getElementById('admin-content')) { checkAdminAccess(); } else { initClient(); }
    if (document.getElementById('maid-list-container') && typeof renderMaidListPro === 'function') window.renderMaidListPro('all', 'all');
    if (document.getElementById('shop-product-grid') && typeof renderAllProducts === 'function') window.renderAllProducts();
    
    const phoneInputs = ['#regPhone', '#bkPhoneReal', '#ckPhone', '#forgotPhone'];
    phoneInputs.forEach(selector => {
        const inputElement = document.querySelector(selector);
        if (inputElement && window.intlTelInput) {
            window.intlTelInput(inputElement, { initialCountry: "vn", preferredCountries: ["vn", "us", "kr", "jp"], utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js" });
        }
    });
});
