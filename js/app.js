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

    refreshUI();
}

function refreshUI() {
    if (typeof UI !== 'undefined' && typeof DB !== 'undefined') {
        UI.renderAllViews();
        UI.renderLedger();
    }
}

function jumpToPage(index) {
    if (uiInstance) {
        uiInstance.currentPage = index;
        uiInstance.setPositionByIndex();
        if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(10);
    }
}

/* OVERLAY MANAGEMENT */
function openLedger() {
    document.getElementById('ledger-overlay').style.display = 'flex';
    document.getElementById('nav-ledger').classList.add('active');
    document.getElementById('nav-home').classList.remove('active');
    UI.renderLedger();
}

function closeLedger() {
    document.getElementById('ledger-overlay').style.display = 'none';
    document.getElementById('nav-ledger').classList.remove('active');
    document.getElementById('nav-home').classList.add('active');
}

function closeAllOverlays() {
    closeLedger();
    document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
}

function openAddModal() { document.getElementById('add-modal').style.display = 'flex'; }
function closeAddModal() { document.getElementById('add-modal').style.display = 'none'; }

/* TRANSACTION LOGIC */
async function submitTransaction(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    
    if (typeof DB !== 'undefined') {
        DB.addTransaction(data);
        e.target.reset();
        document.getElementById('tx-date').valueAsDate = new Date();
        closeAddModal();
        refreshUI();
        
        // Haptic feedback
        if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
        
        // Final background sync (silent)
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
    if (confirm("Sign out of the Elite Vault? Your local data will remain encrypted.")) {
        localStorage.clear();
        window.location.href = 'index.html';
    }
}

// Add CSS for rotation
const style = document.createElement('style');
style.innerHTML = `
@keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.rotating span { animation: rotate 1s linear infinite; }
`;
document.head.appendChild(style);
