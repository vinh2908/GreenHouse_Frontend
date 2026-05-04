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
} catch (error) { console.error("Lỗi Firebase:", error); }

const CLOUD_API_URL = "https://greenhouse-backend-2lok.onrender.com/api";
const LOCAL_API_URL = "http://127.0.0.1:5000/api";

function getPreferredApiUrl() {
    const manual = localStorage.getItem('api_url_override');
    if (manual) return manual;
    const isLocalContext = location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    return isLocalContext ? LOCAL_API_URL : CLOUD_API_URL;
}

let API_URL = getPreferredApiUrl();

async function probeApi(baseUrl) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    try {
        const res = await fetch(`${baseUrl}/health`, { method: 'GET', signal: ctrl.signal });
        return res.ok;
    } catch (e) {
        return false;
    } finally {
        clearTimeout(timer);
    }
}

window.syncBackendApi = async function () {
    const manual = localStorage.getItem('api_url_override');
    if (manual) {
        API_URL = manual;
        window.API_URL = API_URL;
        console.log("API URL active (manual):", API_URL);
        return API_URL;
    }
    const localOk = await probeApi(LOCAL_API_URL);
    API_URL = localOk ? LOCAL_API_URL : CLOUD_API_URL;
    window.API_URL = API_URL;
    console.log("API URL active:", API_URL);
    return API_URL;
};

window.API_URL = API_URL;
window.syncBackendApi();

function parseStoredJson(key, fallbackValue) {
    const raw = localStorage.getItem(key);
    if (!raw) return fallbackValue;
    try {
        return JSON.parse(raw);
    } catch (e) {
        localStorage.removeItem(key);
        return fallbackValue;
    }
}

let currentUser = parseStoredJson('currentUser', null);
let cart = parseStoredJson('cart', []);
let currentDiscount = 0;
const MY_BANK_QR = "https://i.pinimg.com/736x/e2/21/02/e22102058f2d0231696cebf979a925ac.jpg";
