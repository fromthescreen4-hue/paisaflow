class DB {
    static getDbName() { 
        return 'v3_vault_blob_' + localStorage.getItem('userEmail'); 
    }

    static get data() {
        const email = localStorage.getItem('userEmail');
        if (!email) return { transactions: [], events: [], budgets: { month:0, categories:{} }, recurring: [], auditLog: [] };
        
        let blob = localStorage.getItem(this.getDbName());
        if (!blob) {
            return { 
               transactions: [], 
               events: [], 
               deletedTxIds: [],
               budgets: { month:0, categories:{} },
               recurring: [],
               auditLog: [],
               profile: {
                   name: localStorage.getItem('userName') || 'Elite Member',
                   avatar: localStorage.getItem('userAvatar') || '👤',
                   currency: localStorage.getItem('userCurrency') || '₹'
               }
            };
        }

        try {
            const dec = decryptData(blob);
            return JSON.parse(dec);
        } catch(e) {
            return { transactions: [], events: [], budgets: { month:0, categories:{} }, recurring: [] };
        }
    }

    static save(d) {
        if (!d || !localStorage.getItem('userEmail')) return;
        const blob = encryptData(JSON.stringify(d));
        localStorage.setItem(this.getDbName(), blob);
        if (typeof serverCall !== 'undefined') {
            serverCall('saveVault', localStorage.getItem('userEmail'), blob).catch(e => console.warn("Sync Failed"));
        }
    }

    static addTransaction(tx) {
        let d = this.data;
        tx.id = tx.id || 'loc_' + Date.now() + Math.random().toString(36).substr(2);
        tx.classification = tx.classification || 'Daily'; // Daily, Fixed, Variable
        tx.timestamp = Date.now();
        
        let idx = d.transactions.findIndex(t => t.id === tx.id);
        if (idx > -1) d.transactions[idx] = tx;
        else d.transactions.push(tx);
        
        this.save(d);
        return tx;
    }

    static computeSummary(timeFrame = 'Day') {
        const allTxs = this.data.transactions;
        const expenses = allTxs.filter(t => t.type === 'Expense');
        const income = allTxs.filter(t => t.type === 'Income');
        const now = new Date();
        const todayStr = now.toDateString();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        let filtered = [];
        let previousPeriodSpend = 0;

        if (timeFrame === 'Day') {
            filtered = expenses.filter(t => new Date(t.date).toDateString() === todayStr);
            const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
            previousPeriodSpend = expenses.filter(t => new Date(t.date).toDateString() === yesterday.toDateString()).reduce((s,t) => s + t.amount, 0);
        } else if (timeFrame === 'Week') {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            filtered = expenses.filter(t => new Date(t.date) >= weekAgo);
        } else {
            filtered = expenses.filter(t => new Date(t.date).getMonth() === now.getMonth() && new Date(t.date).getFullYear() === now.getFullYear());
        }

        const totalIncome = income.filter(t => new Date(t.date) >= startOfMonth).reduce((s,t) => s + parseFloat(t.amount || 0), 0);
        const totalExpense = filtered.reduce((s,t) => s + parseFloat(t.amount || 0), 0);
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const daysPassed = now.getDate();
        
        const stats = {
            totalIncome,
            totalExpense,
            balance: allTxs.reduce((s,t) => s + (t.type === 'Income' ? parseFloat(t.amount || 0) : -parseFloat(t.amount || 0)), 0),
            burnRate: totalExpense / (daysPassed || 1),
            savingsRate: totalIncome > 0 ? Math.floor(((totalIncome - totalExpense) / totalIncome) * 100) : 0,
            projection: 0,
            comparison: previousPeriodSpend,
            categories: {},
            byDay: {},
            highestSpendDay: { date: '', amount: 0 },
            raw: filtered
        };

        stats.projection = stats.balance - (stats.burnRate * (daysInMonth - daysPassed));
        
        filtered.forEach(t => {
            const amt = parseFloat(t.amount || 0);
            stats.categories[t.category] = (stats.categories[t.category] || 0) + amt;
            const dKey = new Date(t.date).toDateString();
            stats.byDay[dKey] = (stats.byDay[dKey] || 0) + amt;
            if (stats.byDay[dKey] > stats.highestSpendDay.amount) {
                stats.highestSpendDay = { date: dKey, amount: stats.byDay[dKey] };
            }
        });

        return stats;
    }

    static setBudget(category, amount) {
        let d = this.data;
        if (category === 'Month') d.budgets.month = amount;
        else d.budgets.categories[category] = amount;
        this.save(d);
    }

    static processRecurring() {
        let d = this.data;
        let changed = false;
        const today = new Date();
        
        d.recurring?.forEach(rec => {
            const lastAdd = new Date(rec.lastProcessed || 0);
            if (today.getMonth() !== lastAdd.getMonth() || today.getFullYear() !== lastAdd.getFullYear()) {
                this.addTransaction({
                    amount: rec.amount,
                    type: rec.type,
                    category: rec.category,
                    date: today.toISOString().split('T')[0],
                    classification: 'Fixed'
                });
                rec.lastProcessed = today.getTime();
                changed = true;
            }
        });
        
        if (changed) this.save(d);
    }
}
