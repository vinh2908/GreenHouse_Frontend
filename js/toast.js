function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const div = document.createElement('div');
    div.className = `toast-msg ${type === 'success' ? 't-success' : 't-error'}`;
    const safeMessage = (typeof escapeHtml === 'function') ? escapeHtml(message) : String(message);
    div.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} t-icon"></i> <span>${safeMessage}</span>`;
    container.appendChild(div);
    setTimeout(() => {
        div.style.opacity = '0';
        div.style.transform = 'translateX(100%)';
        setTimeout(() => div.remove(), 300);
    }, 3000);
}
window.showToast = showToast;
