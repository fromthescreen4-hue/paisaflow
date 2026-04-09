/* PaisaFlow Elite: Main Orchestrator (app.js) - v2.0 Production */

let uiInstance;

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    const email = localStorage.getItem('userEmail');
    if (!email) {
        window.location.href = 'index.html';
        return;
    }

    // Initialize UI class (Swipe logic)
    uiInstance = new UI();

    // Load Google Charts
    if (typeof google !== 'undefined') {
        google.charts.load('current', {'packages':['corechart', 'bar']});
        google.charts.setOnLoadCallback(() => refreshUI());
    } else {
        refreshUI();
    }

    // Set default date for form
    const dateInp = document.getElementById('tx-date');
    if (dateInp) dateInp.valueAsDate = new Date();

    syncFromCloud().then(() => {
        DB.processRecurring(); // Audit recurring cycles
        refreshUI();
    });
}

async function syncFromCloud() {
    const email = localStorage.getItem('userEmail');
    if (!email) return;
    
    try {
        const res = await serverCall('getVault', email);
        if (res && res.blob) {
            localStorage.setItem('v3_vault_blob_' + email, res.blob);
            console.log("Cloud Vault Restored Successfully.");
        }
    } catch(e) {
        console.warn("Cloud Fetch Failed. Using Virtual DB (local).");
    }
}

function refreshUI() {
    if (typeof UI !== 'undefined' && typeof DB !== 'undefined') {
        UI.renderAllViews();
        UI.renderLedger();
        UI.renderInsights(); // Build Intelligent Narratives
    }
}

function jumpToPage(index) {
    if (uiInstance) {
        uiInstance.currentPage = index;
        uiInstance.setPositionByIndex();
        if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(10);
    }
}

/* SEAMLESS NAVIGATION ENGINE */
function showView(target) {
    const overlays = ['ledger-overlay', 'balance-overlay', 'profile-overlay'];
    const navItems = {
        'home': 'nav-home',
        'ledger': 'nav-ledger',
        'balance': 'nav-events',
        'profile': 'nav-elite'
    };

    // 1. Hide all overlays
    overlays.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    // 2. Reset nav active states
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

    // 3. Activate target
    if (target === 'home') {
        document.getElementById('nav-home').classList.add('active');
    } else {
        const overlayId = target === 'ledger' ? 'ledger-overlay' : 
                          target === 'balance' ? 'balance-overlay' : 'profile-overlay';
        const modal = document.getElementById(overlayId);
        if (modal) modal.style.display = 'flex';
        
        const navId = navItems[target];
        if (navId) document.getElementById(navId).classList.add('active');
        
        // Render specific content
        if (target === 'ledger') UI.renderLedger();
        if (target === 'profile') UI.renderAvatar(); // Re-renders profile info into overlay
        if (target === 'balance') console.log("Balance Analytics triggered...");
    }

    // Haptic confirmation
    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(12);
}

function openAddModal() { document.getElementById('add-modal').style.display = 'flex'; }
function closeAddModal() { document.getElementById('add-modal').style.display = 'none'; }

/* TRANSACTION LOGIC */
async function submitTransaction(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    // Smart Calculator Integration
    try {
        let amountRaw = data.amount.replace(/[^0-9\.\+\-\*\/\(\)]/g, '');
        const calcValue = Function('"use strict";return (' + amountRaw + ')')();
        data.amount = parseFloat(calcValue) || 0;
    } catch(err) {
        alert("Invalid calculation. Please check your math.");
        return;
    }

    if (typeof DB !== 'undefined') {
        DB.addTransaction(data);
        e.target.reset();
        const dateInp = document.getElementById('tx-date');
        if (dateInp) dateInp.valueAsDate = new Date();
        closeAddModal();
        refreshUI();
        if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
        try { await serverCall('syncTransactions', DB.data.transactions); } catch(e) {}
    }
}

function syncToSheets() {
    const btn = event.currentTarget;
    btn.classList.add('rotating');
    serverCall('syncAllData', DB.data)
        .then(() => alert("Cloud Synced Successfully."))
        .catch(err => alert("Sync Failed: " + err.message))
        .finally(() => btn.classList.remove('rotating'));
}

function logout() {
    if (confirm("Sign out of the Elite Vault?")) {
        const overlay = document.getElementById('logout-overlay');
        if (overlay) overlay.style.display = 'flex';
        localStorage.clear();
        setTimeout(() => window.location.href = '../index.html', 2500);
    }
}

// Add CSS for rotation
const style = document.createElement('style');
style.innerHTML = `
@keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.rotating span { animation: rotate 1s linear infinite; }
`;
document.head.appendChild(style);
