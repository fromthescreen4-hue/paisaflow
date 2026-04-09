// js/api.js

window.APP_NAME = "PaisaFlow";
window.APP_VERSION = "2.0 Production";

document.addEventListener('DOMContentLoaded', () => {
    // Dynamically inject text everywhere to sync versions perfectly
    document.title = `${window.APP_NAME} - ${window.APP_VERSION}`;
    document.querySelectorAll('.app-name-display').forEach(el => el.innerText = window.APP_NAME);
    document.querySelectorAll('.app-version-display').forEach(el => el.innerText = window.APP_VERSION);
});

window.WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxkxqPR0DWoZHl1znC2Vin2BsC-oyArrIjWNIQItd6wXiENps7OkeHuWwWdEbSvZeXe/exec";

async function serverCall(methodName, ...args) {
    if (!window.WEB_APP_URL) throw new Error("Missing WEB_APP_URL.");
    try {
       const response = await fetch(window.WEB_APP_URL, {
          method: 'POST',
          body: JSON.stringify({ action: methodName, args: args })
       });
       const data = await response.json();
       if (data.error) throw new Error(data.error);
       return data.result;
    } catch(err) { throw new Error(err.message || "Network Communication Error."); }
}

async function getUserLocation() {
    try {
       const response = await fetch("https://ipapi.co/json/");
       const data = await response.json();
       if (data && data.city && data.country_name) {
           return `${data.city}, ${data.country_name} (IP: ${data.ip})`;
       }
       return "Unknown Location";
    } catch(e) {
       return "Location Fetch Failed";
    }
}

/* =======================================
   END-TO-END ENCRYPTION (AES-256)
   ======================================= */
function getVaultKey() {
    const key = sessionStorage.getItem('vaultKey');
    if (!key) {
        console.error("Encryption Key Missing. Data remains locked.");
        return null; // Return null if not logged in yet
    }
    return key;
}

function encryptData(text) {
    if(!text) return "";
    const key = getVaultKey();
    if (!key) return text; // Passthrough if key not ready (e.g. initial login)
    return CryptoJS.AES.encrypt(String(text), key).toString();
}

function hashPassword(pass) {
    if(!pass) return "";
    return CryptoJS.SHA256(pass).toString();
}

function decryptData(cipher) {
    if(!cipher) return "";
    const key = getVaultKey();
    if (!key) return cipher;
    try {
        const bytes = CryptoJS.AES.decrypt(cipher, key);
        const originalText = bytes.toString(CryptoJS.enc.Utf8);
        return originalText || cipher; 
    } catch(e) {
        return cipher;
    }
}

function showMsg(elementId, msg, isError=false) {
    const m = document.getElementById(elementId);
    if(!m) return;
    m.className = 'message-box ' + (isError ? 'msg-error' : 'msg-success');
    m.innerText = msg;
    m.style.display = 'block';
    setTimeout(() => { if(m) m.style.display = 'none'; }, 5000);
}
