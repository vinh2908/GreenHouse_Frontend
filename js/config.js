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

const API_URL = "https://greenhouse-backend-2lok.onrender.com/api";

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
