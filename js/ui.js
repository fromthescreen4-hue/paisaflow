/* PaisaFlow Elite: Single-View UI Module (ui.js) - v2.0 Swipe Edition */

class UI {
    constructor() {
        this.container = document.getElementById('swipe-container');
        this.currentPage = 0;
        this.startX = 0;
        this.currentTranslate = 0;
        this.prevTranslate = 0;
        this.isDragging = false;
        this.animationID = 0;
        
        this.initSwipe();
    }

    initSwipe() {
        if (!this.container) return;
        
        // Touch events
        this.container.addEventListener('touchstart', (e) => this.touchStart(e));
        this.container.addEventListener('touchend', () => this.touchEnd());
        this.container.addEventListener('touchmove', (e) => this.touchMove(e));
        
        // Mouse events (for testing)
        this.container.addEventListener('mousedown', (e) => this.touchStart(e));
        this.container.addEventListener('mouseup', () => this.touchEnd());
        this.container.addEventListener('mouseleave', () => this.touchEnd());
        this.container.addEventListener('mousemove', (e) => this.touchMove(e));

        window.addEventListener('resize', () => this.setPositionByIndex());
    }

    touchStart(event) {
        this.isDragging = true;
        this.startX = this.getPositionX(event);
        this.animationID = requestAnimationFrame(() => this.animation());
        this.container.style.cursor = 'grabbing';
    }

    touchEnd() {
        this.isDragging = false;
        cancelAnimationFrame(this.animationID);
        const movedBy = this.currentTranslate - this.prevTranslate;

        if (movedBy < -100 && this.currentPage < 2) this.currentPage += 1;
        if (movedBy > 100 && this.currentPage > 0) this.currentPage -= 1;

        this.setPositionByIndex();
        this.container.style.cursor = 'grab';
    }

    touchMove(event) {
        if (this.isDragging) {
            const currentPosition = this.getPositionX(event);
            this.currentTranslate = this.prevTranslate + currentPosition - this.startX;
        }
    }

    getPositionX(event) {
        return event.type.includes('mouse') ? event.pageX : event.touches[0].clientX;
    }

    animation() {
        this.setSliderPosition();
        if (this.isDragging) requestAnimationFrame(() => this.animation());
    }

    setSliderPosition() {
        this.container.style.transform = `translateX(${this.currentTranslate}px)`;
    }

    setPositionByIndex() {
        this.currentTranslate = this.currentPage * -window.innerWidth;
        this.prevTranslate = this.currentTranslate;
        this.setSliderPosition();
        this.updatePills();
    }

    updatePills() {
        const pills = ['tab-day', 'tab-week', 'tab-month'];
        pills.forEach((id, index) => {
            const el = document.getElementById(id);
            if (el) el.classList.toggle('active', index === this.currentPage);
        });
    }

    static renderAllViews() {
        const cur = localStorage.getItem('userCurrency') || '₹';
        const dayStats = DB.computeSummary('Day');
        const weekStats = DB.computeSummary('Week');
        const monthStats = DB.computeSummary('Month');

        this.renderView('day-view-page', dayStats, cur, 'Day');
        this.renderView('week-view-page', weekStats, cur, 'Week');
        this.renderView('month-view-page', monthStats, cur, 'Month');
        
        this.renderAvatar();
    }

    static renderView(containerId, stats, cur, type) {
        const container = document.getElementById(containerId);
        if (!container) return;

        let content = '';
        if (type === 'Day') {
            const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
            content = `
                <div class="view-header">
                    <span class="view-date">${todayStr}</span>
                    <h2 class="view-title">Today's Pulse</h2>
                </div>
                <div class="stat-card glass highlight" style="margin-bottom:20px;">
                    <span style="font-size:12px; font-weight:700; opacity:0.8;">CURRENT BALANCE</span>
                    <strong style="font-size:32px; font-weight:800; display:block;">${cur}${stats.balance.toLocaleString()}</strong>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                    <div class="stat-card glass" style="padding:20px;">
                        <span style="font-size:10px; font-weight:800; opacity:0.5;">SPENT TODAY</span>
                        <strong style="font-size:18px; display:block;">${cur}${stats.totalExpense.toFixed(0)}</strong>
                    </div>
                    <div class="stat-card glass" style="padding:20px;">
                        <span style="font-size:10px; font-weight:800; opacity:0.5;">AVAILABLE</span>
                        <strong style="font-size:18px; display:block; color:var(--accent-color);">${cur}${(stats.balance > 0 ? stats.balance : 0).toFixed(0)}</strong>
                    </div>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:16px;">
                    <div class="card glass" style="padding:15px; display:flex; align-items:center; gap:10px;">
                        <i class="fa-solid fa-bolt" style="font-size:14px; opacity:0.4;"></i>
                        <div>
                            <p style="margin:0; font-size:9px; opacity:0.5; font-weight:800;">BURN RATE</p>
                            <h4 style="margin:0; font-size:14px;">${cur}${stats.burnRate.toFixed(0)}</h4>
                        </div>
                    </div>
                    <div class="card glass" style="padding:15px; display:flex; align-items:center; gap:10px;">
                        <i class="fa-solid fa-fire-flame-curved" style="font-size:14px; opacity:0.4;"></i>
                        <div>
                            <p style="margin:0; font-size:9px; opacity:0.5; font-weight:800;">TOP CLASS</p>
                            <h4 style="margin:0; font-size:14px;">${this.getTopCategory(stats.categories)}</h4>
                        </div>
                    </div>
                </div>

                <!-- SURFACED FEATURE: RECENT ACTIVITY -->
                <div style="margin-top:24px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                        <h4 style="margin:0; font-size:13px; font-weight:800; opacity:0.6; text-transform:uppercase; letter-spacing:1px;">Recent Entries</h4>
                        <span style="font-size:10px; color:var(--accent-color); font-weight:800; cursor:pointer;" onclick="showView('ledger')">VIEW ALL</span>
                    </div>
                    ${stats.raw.slice(0,5).map(tx => `
                        <div class="card glass" style="padding:12px 16px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02);">
                            <div style="display:flex; align-items:center; gap:12px;">
                                <div style="width:32px; height:32px; border-radius:10px; background:rgba(139,92,246,0.1); display:flex; align-items:center; justify-content:center; font-size:14px;">
                                    ${tx.category.split(' ').pop()}
                                </div>
                                <div>
                                    <p style="margin:0; font-size:13px; font-weight:600;">${tx.category.split(' ')[0]}</p>
                                    <p style="margin:1px 0 0; font-size:9px; opacity:0.4;">${tx.date}</p>
                                </div>
                            </div>
                            <strong style="font-size:14px; color:${tx.type==='Income'?'#10b981':'#fff'}">${tx.type==='Income'?'+':'-'}${cur}${parseFloat(tx.amount).toFixed(0)}</strong>
                        </div>
                    `).join('') || '<p style="text-align:center; font-size:12px; opacity:0.4; padding:20px;">No entries logged today.</p>'}
                </div>
            `;
        } else if (type === 'Week') {
            content = `
                <div class="view-header">
                    <span class="view-date">Active Week</span>
                    <h2 class="view-title">Weekly Flow</h2>
                </div>
                <div class="stat-card glass" style="margin-bottom:20px; border-left:4px solid var(--accent-color);">
                    <span style="font-size:12px; font-weight:700; opacity:0.5;">WEEKLY OUTFLOW</span>
                    <strong style="font-size:32px; font-weight:800; display:block;">${cur}${stats.totalExpense.toLocaleString()}</strong>
                </div>
                <div id="week-chart" style="height:200px; width:100%;"></div>
            `;
        } else {
             const savings = stats.totalIncome - stats.totalExpense;
             const rate = stats.savingsRate;
             content = `
                <div class="view-header">
                    <span class="view-date">Full Cycle</span>
                    <h2 class="view-title">Budget Ledger</h2>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px;">
                    <div class="stat-card glass highlight" style="background:rgba(16,185,129,0.1);">
                        <span style="font-size:10px; font-weight:800; opacity:0.6;">SAVED</span>
                        <strong style="font-size:24px; display:block; color:#10b981;">${cur}${savings.toLocaleString()}</strong>
                    </div>
                    <div class="stat-card glass">
                        <span style="font-size:10px; font-weight:800; opacity:0.6;">RATE</span>
                        <strong style="font-size:24px; display:block;">${rate}%</strong>
                    </div>
                </div>
                <div class="stat-card glass" style="padding:24px; display:flex; justify-content:space-between; align-items:center; border-left:4px solid ${stats.projection < 0 ? '#f43f5e' : '#10b981'}; margin-bottom:20px;">
                    <div>
                        <p style="margin:0; font-size:11px; opacity:0.5; font-weight:800;">ELITE PROJECTION</p>
                        <h3 style="margin:4px 0 0; font-size:20px; color:${stats.projection < 0 ? '#f43f5e' : '#10b981'};">${cur}${stats.projection.toLocaleString()}</h3>
                    </div>
                    <i class="fa-solid ${stats.projection < 0 ? 'fa-triangle-exclamation' : 'fa-chart-line'}" style="font-size:24px; opacity:0.2;"></i>
                </div>

                <!-- SURFACED FEATURE: CATEGORY BREAKDOWN -->
                <div style="margin-top:24px;">
                    <h4 style="margin:0 0 16px; font-size:13px; font-weight:800; opacity:0.6; text-transform:uppercase; letter-spacing:1px;">Category Distribution</h4>
                    <div style="display:flex; flex-direction:column; gap:16px;">
                        ${Object.keys(stats.categories).map(cat => {
                            const amt = stats.categories[cat];
                            const pct = stats.totalExpense > 0 ? (amt / stats.totalExpense * 100).toFixed(0) : 0;
                            return `
                                <div>
                                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                                        <span style="font-size:12px; font-weight:600;">${cat}</span>
                                        <span style="font-size:12px; font-weight:800; opacity:0.7;">${cur}${amt.toLocaleString()}</span>
                                    </div>
                                    <div style="height:6px; width:100%; background:rgba(255,255,255,0.05); border-radius:3px; overflow:hidden;">
                                        <div style="height:100%; width:${pct}%; background:var(--accent-color); opacity:${0.3 + (pct/100)*0.7}; border-radius:3px;"></div>
                                    </div>
                                </div>
                            `;
                        }).join('') || '<p style="text-align:center; font-size:12px; opacity:0.4;">No categories recorded this month.</p>'}
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = content;
        
        container.innerHTML = content;
        if (type === 'Week') setTimeout(() => this.drawBarChart(stats.byDay, 'week-chart'), 100);
    }

    static getTopCategory(categories) {
        let top = 'None'; let max = 0;
        for (const c in categories) { if(categories[c] > max) { max = categories[c]; top = c; } }
        return top;
    }

    static drawBarChart(dataMap, elementId) {
        if (!google.visualization) return;
        const data = new google.visualization.DataTable();
        data.addColumn('string', 'Day');
        data.addColumn('number', 'Spent');
        Object.keys(dataMap).forEach(k => data.addRow([k, dataMap[k]]));

        const elem = document.getElementById(elementId);
        if (elem) {
            new google.visualization.ColumnChart(elem).draw(data, {
                backgroundColor: 'transparent',
                colors: ['#8b5cf6'],
                legend: 'none',
                vAxis: { textStyle: { color: '#ffffff', fontSize: 10 }, gridlines: { color: 'rgba(255,255,255,0.1)' } },
                hAxis: { textStyle: { color: '#ffffff', fontSize: 10 } },
                chartArea: { width: '85%', height: '70%' }
            });
        }
    }

    static renderAvatar() {
        const d = DB.data;
        const profile = d.profile || {};
        const avatar = profile.avatar || '👤';
        const name = profile.name || localStorage.getItem('userName') || 'Elite Member';
        const bio = profile.bio || 'Elite Digital Vault 2.0';

        const container = document.getElementById('profile-container');
        if (container) {
            container.innerHTML = `<div class="avatar-fallback glass" style="background:rgba(139,92,246,0.1); color:var(--accent-color); font-size:24px; display:flex; align-items:center; justify-content:center; width:44px; height:44px; border-radius:50%;">${avatar}</div>`;
        }
        
        const nameEl = document.getElementById('display-name');
        if (nameEl) nameEl.innerText = name;
        
        const bioEl = document.getElementById('display-email');
        if (bioEl) bioEl.innerText = bio;
    }

    static renderLedger() {
        const container = document.getElementById('ledger-content');
        if (!container) return;
        const stats = DB.computeSummary('Month'); // Full history
        const cur = localStorage.getItem('userCurrency') || '₹';
        
        container.innerHTML = '';
        stats.raw.sort((a,b) => new Date(b.date) - new Date(a.date)).forEach(tx => {
            const isInc = tx.type === 'Income';
            const item = document.createElement('div');
            item.className = 'card glass';
            item.style.marginBottom = '12px';
            item.style.padding = '16px';
            item.style.display = 'flex';
            item.style.justifyContent = 'space-between';
            item.style.alignItems = 'center';
            item.innerHTML = `
                <div>
                    <h4 style="margin:0; font-size:15px;">${tx.category}</h4>
                    <span style="font-size:10px; opacity:0.5;">${tx.date}</span>
                </div>
                <strong style="color: ${isInc ? 'var(--accent-color)' : '#fff'}; font-size:16px;">${isInc ? '+' : '-'}${cur}${tx.amount.toFixed(0)}</strong>
            `;
            container.appendChild(item);
        });
    }

    static renderInsights() {
        const container = document.getElementById('balance-content');
        if (!container) return;
        
        const narratives = IntelEngine.generateNarrative();
        let content = `<div style="padding-bottom:20px;">`;
        
        narratives.forEach(n => {
            content += `<div class="card glass" style="padding:20px; margin-bottom:12px; display:flex; align-items:center; gap:16px; border-left:2px solid var(--accent-color);">
                <div style="font-size:14px; line-height:1.4; font-weight:500;">${n}</div>
            </div>`;
        });
        
        const bStatus = IntelEngine.getBudgetStatus();
        if (bStatus) {
            content += `<div class="card glass highlight" style="padding:20px; background:${bStatus.color}22; border-color:${bStatus.color}44;">
                <h4 style="margin:0; color:${bStatus.color}">${bStatus.msg}</h4>
                <div style="height:4px; width:100%; background:rgba(255,255,255,0.1); border-radius:2px; margin-top:12px;">
                    <div style="height:100%; width:${Math.min(bStatus.usage, 100)}%; background:${bStatus.color}; border-radius:2px;"></div>
                </div>
            </div>`;
        }
        
        content += `</div>`;
        container.innerHTML = content;
    }
}
