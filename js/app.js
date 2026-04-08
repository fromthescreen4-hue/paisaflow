// js/app.js

let currentUserEmail = localStorage.getItem('userEmail');
let currentUserName = localStorage.getItem('userName');
let dashboardData = {};
let selectedTxIdForEdit = null;

const MOTIVATIONAL_QUOTES = [
  "Clarity brings control.",
  "Wealth begins with awareness.",
  "Financial freedom starts with tracking.",
  "Master your money habits.",
  "Turn spending into strategy."
];

if (typeof google !== 'undefined') {
    google.charts.load('current', {'packages':['corechart']});
}

document.addEventListener('DOMContentLoaded', () => {
    if (!currentUserEmail) {
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('display-email').innerText = currentUserEmail;
    document.getElementById('display-name').innerText = currentUserName;

    updateGreeting();
    initDashboardGestures();

    if(currentUserEmail === 'richbabets1@gmail.com') {
        const adminTab = document.getElementById('admin-tab');
        if (adminTab) adminTab.style.display = 'block';
    }

    const quoteElem = document.getElementById('daily-quote');
    if (quoteElem) {
        quoteElem.innerText = `"${MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]}"`;
    }

    // Set default date
    const dateInput = document.getElementById('tx-date');
    if (dateInput) dateInput.valueAsDate = new Date();

    fetchInitialDataAndRefresh();
});

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

function switchTab(tabId, elem = null) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    
    if (elem) {
        document.querySelectorAll('.bottom-nav .nav-item').forEach(n => n.classList.remove('active'));
        elem.classList.add('active');
    }
    if(tabId === 'dashboard') drawCharts();
}

function openAddModal() {
    document.getElementById('add-modal').style.display = 'flex';
}
function closeAddModal() {
    document.getElementById('add-modal').style.display = 'none';
}

class LocalDB {
    static getDbName() { return 'v3_finance_' + currentUserEmail; }
    
    static get data() {
      if (!currentUserEmail) return { transactions: [], events: [], deletedTxIds: [] };
      let obj = localStorage.getItem(this.getDbName());
      if (!obj) {
         const initData = { transactions: [], events: [], deletedTxIds: [] };
         this.save(initData); return initData;
      }
      return JSON.parse(obj);
    }

    static save(d) { localStorage.setItem(this.getDbName(), JSON.stringify(d)); }

    static mergeInitialData(sheetData) {
      let d = this.data;
      if(sheetData.events) {
        sheetData.events.forEach(ev => { if(!d.events.find(e => e.name === ev.name)) d.events.push(ev); });
      }
      if(sheetData.transactions) {
        sheetData.transactions.forEach(tx => {
           if(!d.transactions.find(t => t.id === tx.id) && !d.deletedTxIds.includes(tx.id)) {
              d.transactions.push(tx);
           }
        });
      }
      this.save(d);
    }

    static saveTransaction(tx) {
      let d = this.data;
      tx.synced = false;
      
      // Encrypt sensitive fields before saving
      tx.amount = encryptData(tx.amount);
      tx.category = encryptData(tx.category);
      tx.notes = encryptData(tx.notes);
      tx.method = encryptData(tx.method);
      tx.eventName = encryptData(tx.eventName);

      if (tx.id) {
         let idx = d.transactions.findIndex(t => t.id === tx.id);
         if (idx > -1) d.transactions[idx] = tx;
         else d.transactions.push(tx);
      } else {
         tx.id = 'loc_' + Date.now() + Math.random().toString(36).substr(2);
         d.transactions.push(tx);
      }
      this.save(d);
    }

    static deleteTransaction(txId) {
      let d = this.data;
      d.transactions = d.transactions.filter(t => t.id !== txId);
      if(!String(txId).startsWith('loc_')) {
          d.deletedTxIds.push(txId); 
      }
      this.save(d);
    }

    static addEvent(ev) {
      let d = this.data;
      let existing = d.events.find(e => e.name === ev.name);
      if (existing) {
         existing.budget = Number(ev.budget); existing.totalAmountWeHave = Number(ev.totalAmountWeHave); existing.synced = false;
      } else {
         ev.synced = false; d.events.push(ev);
      }
      this.save(d);
    }

    static getUnsynced() {
      let d = this.data;
      return {
         transactions: d.transactions.filter(t => !t.synced),
         events: d.events.filter(e => !e.synced),
         deletedTxIds: d.deletedTxIds || []
      };
    }

    static markSynced(txIds, eventNames) {
      let d = this.data;
      d.transactions.forEach(t => { if(txIds.includes(t.id)) t.synced = true; });
      d.events.forEach(e => { if(eventNames.includes(e.name)) e.synced = true; });
      d.deletedTxIds = []; 
      this.save(d);
    }

    static computeDashboardData() {
      let d = this.data;
      const now = new Date(); const currentMonth = now.getMonth(); const currentYear = now.getFullYear();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const isToday = (date) => date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      
      let weeklyTotal = 0; let monthlyTotal = 0; let todayTotal = 0; let totalBalance = 0;
      const categoryTotals = {}; const eventsMap = {}; const monthlyTrendsMap = {};
      const definedEvents = [];
      
      d.events.forEach(ev => {
          definedEvents.push({ name: ev.name, budget: Number(ev.budget)||0, totalAmount: Number(ev.totalAmountWeHave)||0, cost: 0, expenses: [] });
          eventsMap[ev.name] = {cost: 0, expenses: []};
      });

      let txs = [...d.transactions].sort((a,b) => new Date(b.date) - new Date(a.date));

      txs.forEach(row => {
        // Decrypt sensitive fields for calculations
        const amount = Number(decryptData(row.amount)) || 0;
        const category = decryptData(row.category) || "Other";
        const rowDate = new Date(row.date);
        const rowNotes = decryptData(row.notes);
        const eventName = decryptData(row.eventName);
        
        if (row.type === 'Income') {
            totalBalance += amount;
        } else if (row.type === 'Expense') {
            totalBalance -= amount;
            if (isToday(rowDate)) todayTotal += amount;
            if (rowDate.getMonth() === currentMonth && rowDate.getFullYear() === currentYear) monthlyTotal += amount;
            if (rowDate >= oneWeekAgo) weeklyTotal += amount;
            categoryTotals[category] = (categoryTotals[category] || 0) + amount;
          
            const monthKey = `${rowDate.getFullYear()}-${String(rowDate.getMonth() + 1).padStart(2, '0')}`;
            monthlyTrendsMap[monthKey] = (monthlyTrendsMap[monthKey] || 0) + amount;
          
            if (eventName && eventsMap[eventName]) {
               eventsMap[eventName].cost += amount;
               eventsMap[eventName].expenses.push({date: rowDate.toLocaleDateString(), category, amount, notes: rowNotes || ''});
            }
        }
      });

      definedEvents.forEach(ev => { ev.cost = eventsMap[ev.name].cost; ev.expenses = eventsMap[ev.name].expenses; });

      return {
        rawTransactions: txs,
        todayTotal, weeklyTotal, monthlyTotal, totalBalance,
        categories: Object.keys(categoryTotals).map(k => [k, categoryTotals[k]]),
        events: definedEvents,
        monthlyTrends: Object.keys(monthlyTrendsMap).sort().map(k => [k, monthlyTrendsMap[k]])
      };
    }
}

async function fetchInitialDataAndRefresh() {
    dashboardData = LocalDB.computeDashboardData(); updateUI();
    try {
       const data = await serverCall('pullInitialData', currentUserEmail);
       LocalDB.mergeInitialData(data);
       dashboardData = LocalDB.computeDashboardData();
       updateUI();
    } catch(e) { console.error("Sync pull error:", e); }
}

async function syncToSheets() {
    const unsynced = LocalDB.getUnsynced();
    if(unsynced.transactions.length===0 && unsynced.events.length===0 && unsynced.deletedTxIds.length===0) {
       showMsg('global-msg', "Everything is already synced!"); return;
    }

    const btn = document.getElementById('sync-btn') || { innerHTML: '', disabled: false };
    if(btn.innerHTML) btn.innerHTML = `Syncing...`; 
    btn.disabled = true;
    unsynced.userEmail = currentUserEmail;
    unsynced.location = userLocData; // Pass IP/Location for security logging

    try {
       const res = await serverCall('syncData', unsynced);
       LocalDB.markSynced(res.syncedTxIds || [], res.syncedEvNames || []);
       btn.disabled = false; btn.innerHTML = `Sync (0)`;
       showMsg('global-msg', "Sync Complete!"); updateUI();
    } catch (err) {
       btn.disabled = false; btn.innerHTML = `Sync Failed`;
       showMsg('global-msg', "Sync Failed: " + err.message, true);
    }
}

function submitTransaction(e) {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.target).entries());
    let txIdInput = document.getElementById('tx-id-input').value;
    if(txIdInput) payload.id = txIdInput;

    LocalDB.saveTransaction(payload);
    document.getElementById('tx-id-input').value = ""; 
    e.target.reset(); document.getElementById('tx-date').valueAsDate = new Date();
    document.getElementById('tx-btn').innerText = "Save to Ledger";
    
    dashboardData = LocalDB.computeDashboardData(); updateUI();
    showMsg('global-msg', "Transaction Added!"); 
    closeAddModal();
}

function submitEvent(e) {
    e.preventDefault();
    const payload = {
       userEmail: currentUserEmail, name: document.getElementById('ev-name').value,
       totalAmountWeHave: document.getElementById('ev-total').value, budget: document.getElementById('ev-budget').value
    };
    LocalDB.addEvent(payload);
    dashboardData = LocalDB.computeDashboardData(); updateUI();
    document.getElementById('event-form-area').style.display='none';
}

function updateUI() {
    if(!dashboardData) return;
    
    // Header - Show full name as requested
    const nm = currentUserName || "User";
    document.getElementById('display-name').innerText = nm;
    const initial = nm.charAt(0) ? nm.charAt(0).toUpperCase() : 'U';
    document.getElementById('profile-letter').innerText = initial;

    // Pulse notification dot if unsynced items
    const unsynced = LocalDB.getUnsynced();
    const pending = unsynced.transactions.length + unsynced.events.length + unsynced.deletedTxIds.length;
    const dot = document.getElementById('sync-dot');
    if (dot) dot.style.display = pending > 0 ? 'block' : 'none';
    
    // Totals Grid
    document.getElementById('cc-total-balance').innerText = '₹' + dashboardData.totalBalance.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    document.getElementById('mini-today').innerText = '₹' + dashboardData.todayTotal.toFixed(2);
    document.getElementById('mini-week').innerText = '₹' + dashboardData.weeklyTotal.toFixed(2);
    document.getElementById('mini-month').innerText = '₹' + dashboardData.monthlyTotal.toFixed(2);
    document.getElementById('mini-avail').innerText = '₹' + (dashboardData.totalBalance > 0 ? dashboardData.totalBalance.toFixed(2) : '0.00');
    
    // Recent Tx Logic (Dash)
    const recContainer = document.getElementById('recent-transaction-list');
    recContainer.innerHTML = '';
    const recentLimit = dashboardData.rawTransactions.slice(0, 5);
    if(recentLimit.length === 0) recContainer.innerHTML = '<p style="text-align:center; color:var(--text-secondary); padding:20px;">No transactions yet.</p>';
    recentLimit.forEach((tx) => {
       const d = document.createElement('div');
       d.className = 'data-item'; d.style.cursor = 'pointer';
       d.onclick = () => openEditModal(tx.id);
       const isInc = tx.type === 'Income';
       d.innerHTML = `
         <div class="item-left" style="display:flex; flex-direction:column;">
            <span class="item-title" style="font-weight:600; color:var(--text-primary);">${decryptData(tx.category)} ${decryptData(tx.eventName) ? `(${decryptData(tx.eventName)})` : ''}</span>
            <span class="item-sub" style="font-size:12px; color:var(--text-secondary); font-weight:500;">${isInc ? 'Money In' : 'Money Out'} | ${new Date(tx.date).toLocaleDateString()}</span>
         </div>
         <span style="font-weight:700; color:${isInc ? 'var(--success-color)' : 'var(--text-primary)'}">${isInc ? '+' : '-'}₹${decryptData(tx.amount)}</span>
       `;
       recContainer.appendChild(d);
    });

    // Full History Tab (Grouped)
    renderHistory();

    // Events Array
    const sel = document.getElementById('tx-event-selector');
    if (sel) {
        sel.innerHTML = '<option value="">-- No Event --</option>';
        if (dashboardData.events) dashboardData.events.forEach(ev => sel.append(new Option(ev.name, ev.name)));
    }
    
    const evContainer = document.getElementById('event-list-container');
    if (evContainer) {
        evContainer.innerHTML = '';
        if(dashboardData.events) {
           dashboardData.events.forEach(ev => {
              const card = document.createElement('div'); card.className = 'card';
              card.innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-bottom:12px; align-items:center;">
                  <h3 style="margin:0;">${ev.name}</h3>
                  <button class="outline" style="padding:4px 8px; width:auto;" onclick="editEvent('${ev.name}', ${ev.totalAmount}, ${ev.budget})">Edit</button>
                </div>
                <div><span>Available vs Budget:</span> <strong>₹${ev.totalAmount - ev.cost} / ₹${ev.budget}</strong></div>
              `;
              evContainer.appendChild(card);
           });
        }
    }
    drawCharts();
}

function updateGreeting() {
    const hour = new Date().getHours();
    let text = "Good Morning";
    if (hour >= 12 && hour < 17) text = "Good Afternoon";
    else if (hour >= 17 && hour < 21) text = "Good Evening";
    else if (hour >= 21 || hour < 5) text = "Good Night";
    
    const el = document.getElementById('greeting-text');
    if (el) el.innerText = text + ",";
}

function initDashboardGestures() {
    const dash = document.getElementById('dashboard');
    if (!dash) return;

    let touchStartX = 0;
    // Note: The UI pills are Day, Week, Month. 'All' is the first. 
    // We'll target the existing .pill buttons.
    
    dash.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    dash.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].screenX;
        const diff = touchStartX - touchEndX;

        if (Math.abs(diff) > 80) { 
            const pills = document.querySelectorAll('.time-pills .pill');
            let currentIdx = Array.from(pills).findIndex(p => p.classList.contains('active'));
            
            if (diff > 0) { // Swipe Left -> Next timeframe
                currentIdx = (currentIdx + 1) % pills.length;
            } else { // Swipe Right -> Prev timeframe
                currentIdx = (currentIdx - 1 + pills.length) % pills.length;
            }
            
            const targetPill = pills[currentIdx];
            if (targetPill) targetPill.click();
        }
    }, { passive: true });
}

function renderHistory() {
    const histContainer = document.getElementById('transaction-list');
    if (!histContainer) return;
    
    histContainer.innerHTML = '';
    const txs = [...dashboardData.rawTransactions].sort((a,b) => new Date(b.date) - new Date(a.date));

    if (txs.length === 0) {
        // Empty State CTA
        histContainer.innerHTML = `
            <div style="text-align:center; padding:60px 20px; animation: fadeUp 0.6s ease;">
                <div style="font-size:64px; margin-bottom:20px;">🪙</div>
                <h2 style="font-weight:800; color:var(--text-primary); margin-bottom:12px;">No transactions yet</h2>
                <p style="color:var(--text-secondary); max-width:280px; margin:0 auto 30px; line-height:1.6;">Start managing your money by adding your first expense or income.</p>
                <button class="outline" onclick="openAddModal()" style="width:auto; padding:12px 32px; border-radius:30px; margin: 0 auto; display:block;">Get Started</button>
            </div>
        `;
    } else {
        const grouped = groupTransactionsByDate(txs);
        Object.keys(grouped).forEach(dateLabel => {
            const header = document.createElement('div');
            header.style = "padding:20px 0 10px 0; font-size:13px; font-weight:700; color:var(--primary-color); text-transform:uppercase; letter-spacing:1.5px;";
            header.innerText = dateLabel;
            histContainer.appendChild(header);

            grouped[dateLabel].forEach(tx => {
                const d = document.createElement('div');
                d.className = 'data-item'; d.style.cursor = 'pointer';
                d.onclick = () => openEditModal(tx.id);
                const isInc = tx.type === 'Income';
                const amt = decryptData(tx.amount);
                const cat = decryptData(tx.category);
                const evNm = decryptData(tx.eventName);
                const note = decryptData(tx.notes);

                d.innerHTML = `
                    <div class="item-left" style="display:flex; flex-direction:column;">
                        <span class="item-title" style="font-weight:600; color:var(--text-primary);">${cat} ${evNm ? `(${evNm})` : ''}</span>
                        <span class="item-sub" style="font-size:12px; color:var(--text-secondary); font-weight:500;">${isInc ? 'Money In' : 'Money Out'} ${note ? `| ${note}` : ''}</span>
                    </div>
                    <span style="font-weight:700; color:${isInc ? 'var(--success-color)' : 'var(--text-primary)'}">${isInc ? '+' : '-'}₹${amt}</span>
                `;
                histContainer.appendChild(d);
            });
        });

        const footer = document.createElement('p');
        footer.style = "text-align:center; color:var(--text-secondary); font-size:12px; margin-top:40px; padding-bottom:40px;";
        footer.innerText = "End of history • Showing all updates for " + new Date().toLocaleDateString('en-US', {month:'long'});
        histContainer.appendChild(footer);
    }
}


function openEditModal(txId) {
    selectedTxIdForEdit = txId;
    const mod = document.getElementById('edit-modal');
    mod.style.display = 'flex';
    mod.style.animation = 'fadeIn 0.3s ease forwards';
}
function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
}
function deleteSelectedTx() {
    if(!selectedTxIdForEdit) return;
    LocalDB.deleteTransaction(selectedTxIdForEdit);
    closeEditModal();
    dashboardData = LocalDB.computeDashboardData(); updateUI();
    showMsg('global-msg', "Deleted entirely.", false);
}
function editSelectedTx() {
    if(!selectedTxIdForEdit) return;
    const tx = LocalDB.data.transactions.find(t => t.id === selectedTxIdForEdit);
    if(tx) {
       document.getElementById('tx-id-input').value = tx.id;
       document.getElementById('tx-type').value = tx.type;
       document.getElementById('tx-amount').value = tx.amount;
       document.getElementById('tx-date').value = tx.date;
       document.getElementById('tx-category').value = tx.category;
       document.getElementById('tx-method').value = tx.method || 'Cash';
       document.getElementById('tx-event-selector').value = tx.eventName || '';
       document.getElementById('tx-notes').value = tx.notes || '';
       document.getElementById('tx-btn').innerText = "Update Ledger Entry";
       closeEditModal();
       openAddModal();
    }
}
function editEvent(name, total, budget) {
    document.getElementById('event-form-area').style.display = 'block';
    document.getElementById('ev-name').value = name; document.getElementById('ev-name').readOnly = true; 
    document.getElementById('ev-total').value = total; document.getElementById('ev-budget').value = budget;
}

/* Admin Route */
async function loadAdminDashboard() {
    const btn = document.getElementById('load-admin-btn');
    const pass = document.getElementById('admin-passcode').value;
    btn.innerText = "Connecting..."; btn.disabled = true;
    try {
       const [tel, usr] = await Promise.all([
          serverCall('adminGetTelemetry', currentUserEmail, pass),
          serverCall('adminGetUsers', currentUserEmail, pass)
       ]);
       
       document.getElementById('admin-telemetry-grid').style.display = 'flex';
       document.getElementById('admin-user-list-container').style.display = 'block';

       document.getElementById('admin-tel-users').innerText = tel.totalUsers;
       document.getElementById('admin-tel-pending').innerText = tel.totalPending;
       document.getElementById('admin-tel-tx').innerText = tel.totalTx;
       document.getElementById('admin-tel-ev').innerText = tel.totalEvents;

       const cont = document.getElementById('admin-user-list');
       cont.innerHTML = '';
       usr.users.forEach((u, idx) => {
          const joinedDate = u.joined ? new Date(u.joined).toLocaleDateString() : 'Unknown';
          const row = document.createElement('div');
          row.className = 'data-item'; row.style.cursor = 'default'; row.style.marginBottom = '10px';
          row.style.animation = 'fadeUp 0.4s ease forwards'; row.style.animationDelay = `${Math.min(idx * 0.05, 0.4)}s`;
          row.style.opacity = '0';
          row.innerHTML = `
            <div style="display:flex; flex-direction:column;">
               <strong style="color:var(--text-primary); font-size:15px;">${u.email}</strong>
               <span style="color:var(--text-secondary); font-size:13px;">${u.name} | Deployed: ${joinedDate}</span>
            </div>
            <button class="danger" style="width:auto; padding: 6px 14px; font-size:12px;" onclick="adminDeleteUser('${u.email}')">Terminate</button>
          `;
          cont.appendChild(row);
       });
       if(usr.users.length===0) cont.innerHTML = '<p style="text-align:center;">No users online.</p>';
    } catch(e) { 
       alert("Security Exception: " + e.message); 
       document.getElementById('admin-telemetry-grid').style.display = 'none';
       document.getElementById('admin-user-list-container').style.display = 'none';
    } finally { 
       btn.innerText = "Connect"; btn.disabled = false; 
    }
}

async function adminAddUser() {
    const pass = document.getElementById('admin-passcode').value;
    const em = document.getElementById('admin-new-email').value;
    const nm = document.getElementById('admin-new-name').value;
    try {
       await serverCall('adminAddUser', currentUserEmail, pass, em, nm);
       alert("Added!"); fetchAdminUsers(); 
    } catch(e) { alert(e.message); }
}

async function adminDeleteUser(targetEmail) {
    if(!confirm(`PERMANENTLY BAN ${targetEmail}?`)) return;
    const pass = document.getElementById('admin-passcode').value;
    try { serverCall('adminDeleteUser', currentUserEmail, pass, targetEmail).then(() => { alert("Instance Terminated."); loadAdminDashboard(); }); } catch(e) { alert(e.message); }
}

function groupTransactionsByDate(txs) {
    const groups = {};
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

    const isSameDate = (d1, d2) => d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();

    txs.forEach(tx => {
        const d = new Date(tx.date);
        let label;
        if (isSameDate(d, today)) label = "Today";
        else if (isSameDate(d, yesterday)) label = "Yesterday";
        else label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        if (!groups[label]) groups[label] = [];
        groups[label].push(tx);
    });
    return groups;
}

function drawCharts() {
   if (!google.visualization || !dashboardData || !dashboardData.categories || dashboardData.categories.length === 0) return;
   const pD = new google.visualization.DataTable(); pD.addColumn('string','Cat'); pD.addColumn('number','Amt'); pD.addRows(dashboardData.categories);
   const pieElem = document.getElementById('piechart');
   if(pieElem) {
       new google.visualization.PieChart(pieElem).draw(pD, {
         backgroundColor: 'transparent', legend: {textStyle: {color: '#64748b'}}, pieSliceBorderColor: 'transparent', pieHole: 0.5,
         slices: {0: {color: '#7c3aed'}, 1: {color: '#2dd4bf'}, 2: {color: '#f43f5e'}, 3: {color: '#10b981'}, 4: {color: '#f59e0b'}}
       });
   }
}
