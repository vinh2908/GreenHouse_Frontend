window.timeToMinutes = function(timeStr) {
    if (!timeStr) return 0;
    let parts = timeStr.split(':');
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
};
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