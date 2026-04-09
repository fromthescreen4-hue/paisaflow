/* Paisa Flow: Database Module (db.js) */

class DB {
    static getDbName() { 
        return 'v3_finance_' + localStorage.getItem('userEmail'); 
    }

    static get data() {
        const email = localStorage.getItem('userEmail');
        if (!email) return { transactions: [], events: [], deletedTxIds: [] };
        let obj = localStorage.getItem(this.getDbName());
        if (!obj) {
            const initData = { transactions: [], events: [], deletedTxIds: [] };
            this.save(initData);
            return initData;
        }
        return JSON.parse(obj);
    }

    static save(d) {
        localStorage.setItem(this.getDbName(), JSON.stringify(d));
    }

    static addTransaction(tx) {
        let d = this.data;
        tx.synced = false;
        tx.id = tx.id || 'loc_' + Date.now() + Math.random().toString(36).substr(2);
        
        // Encryption Layer
        tx.amount = encryptData(tx.amount);
        tx.category = encryptData(tx.category);
        tx.notes = encryptData(tx.notes);
        tx.method = encryptData(tx.method);
        tx.eventName = encryptData(tx.eventName);

        let idx = d.transactions.findIndex(t => t.id === tx.id);
        if (idx > -1) d.transactions[idx] = tx;
        else d.transactions.push(tx);
        
        this.save(d);
        return tx;
    }

    static getTransactions() {
        return this.data.transactions.map(tx => ({
            ...tx,
            amount: Number(decryptData(tx.amount)),
            category: decryptData(tx.category),
            notes: decryptData(tx.notes),
            method: decryptData(tx.method),
            eventName: decryptData(tx.eventName)
        }));
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
