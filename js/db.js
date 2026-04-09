/* Paisa Flow: Database Module (db.js) */

class DB {
    static getDbName() { 
        return 'v3_vault_blob_' + localStorage.getItem('userEmail'); 
    }

    static get data() {
        const email = localStorage.getItem('userEmail');
        if (!email) return { transactions: [], events: [], deletedTxIds: [] };
        
        let blob = localStorage.getItem(this.getDbName());
        if (!blob) {
            return { transactions: [], events: [], deletedTxIds: [] };
        }

        try {
            const dec = decryptData(blob);
            return JSON.parse(dec);
        } catch(e) {
            console.error("Vault Decryption Failed", e);
            return { transactions: [], events: [], deletedTxIds: [] };
        }
    }

    static save(d) {
        if (!d || !localStorage.getItem('userEmail')) return;
        const blob = encryptData(JSON.stringify(d));
        localStorage.setItem(this.getDbName(), blob);
        
        // Silent background sync
        if (typeof serverCall !== 'undefined') {
            serverCall('saveVault', localStorage.getItem('userEmail'), blob).catch(e => {
                console.warn("Cloud Sync Failed. Saving to Virtual DB (local).");
            });
        }
    }

    static addTransaction(tx) {
        let d = this.data;
        tx.id = tx.id || 'loc_' + Date.now() + Math.random().toString(36).substr(2);
        
        // We no longer encrypt fields individually because the WHOLE BLOB is encrypted on save
        let idx = d.transactions.findIndex(t => t.id === tx.id);
        if (idx > -1) d.transactions[idx] = tx;
        else d.transactions.push(tx);
        
        this.save(d);
        return tx;
    }

    static getTransactions() {
        // Return clear-text for the UI to render
        return this.data.transactions;
    }

    static computeSummary(timeFrame = 'Day') {
        const txs = this.getTransactions().filter(t => t.type === 'Expense');
        const incomeTxs = this.getTransactions().filter(t => t.type === 'Income');
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        let filtered = [];
        let comparisonData = 0; // Yesterday, Last Week, etc.

        if (timeFrame === 'Day') {
            filtered = txs.filter(t => new Date(t.date).toDateString() === today.toDateString());
            const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
            comparisonData = txs.filter(t => new Date(t.date).toDateString() === yesterday.toDateString()).reduce((sum, t) => sum + t.amount, 0);
        } else if (timeFrame === 'Week') {
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            filtered = txs.filter(t => new Date(t.date) >= sevenDaysAgo);
        } else if (timeFrame === 'Month') {
            filtered = txs.filter(t => new Date(t.date).getMonth() === now.getMonth() && new Date(t.date).getFullYear() === now.getFullYear());
        }

        const stats = {
            totalIncome: incomeTxs.filter(t => {
                const d = new Date(t.date);
                if (timeFrame === 'Day') return d.toDateString() === today.toDateString();
                if (timeFrame === 'Week') return d >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).reduce((sum, t) => sum + t.amount, 0),
            totalExpense: filtered.reduce((sum, t) => sum + t.amount, 0),
            balance: 0,
            comparison: comparisonData,
            categories: {},
            dailyBreakdown: {},
            highestSpendDay: { date: '', amount: 0 },
            raw: filtered
        };

        // Recalculate Global Balance
        const allTx = this.getTransactions();
        allTx.forEach(t => stats.balance += (t.type === 'Income' ? t.amount : -t.amount));

        filtered.forEach(t => {
            stats.categories[t.category] = (stats.categories[t.category] || 0) + t.amount;
            const dKey = new Date(t.date).toDateString();
            stats.dailyBreakdown[dKey] = (stats.dailyBreakdown[dKey] || 0) + t.amount;
            if (stats.dailyBreakdown[dKey] > stats.highestSpendDay.amount) {
                stats.highestSpendDay = { date: dKey, amount: stats.dailyBreakdown[dKey] };
            }
        });

        return stats;
    }

    static addEvent(ev) {
        let d = this.data;
        let existingIdx = d.events.findIndex(e => e.name === ev.name);
        ev.synced = false;
        if (existingIdx > -1) d.events[existingIdx] = ev;
        else d.events.push(ev);
        this.save(d);
    }
}
