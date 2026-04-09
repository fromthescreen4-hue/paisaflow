/* PaisaFlow Elite: Intel Engine (engine.js) */

class IntelEngine {
    static generateNarrative() {
        const stats = DB.computeSummary('Month');
        const dayStats = DB.computeSummary('Day');
        const insights = [];

        // 1. Comparison Insight (Today vs Yesterday)
        if (dayStats.totalExpense > 0) {
            const diff = dayStats.totalExpense - dayStats.comparison;
            const emoji = diff > 0 ? '📈' : '📉';
            const pct = dayStats.comparison > 0 ? Math.abs((diff / dayStats.comparison) * 100).toFixed(0) : 0;
            
            if (pct > 0) {
                insights.push(`${emoji} Activity: You spent ${pct}% ${diff > 0 ? 'more' : 'less'} than yesterday.`);
            }
            insights.push(`<i class="fa-solid fa-bolt" style="color:var(--accent-color)"></i> Burn Rate: ${DB.data.profile.currency}${stats.burnRate.toFixed(0)}/day`);
        }

        // 2. Prediction Insight
        if (stats.projection < 0) {
            insights.push(`<i class="fa-solid fa-triangle-exclamation" style="color:#f43f5e"></i> Zero-Balance Warning: Projected shortfall by end-of-month.`);
        } else {
            insights.push(`<i class="fa-solid fa-calendar-check" style="color:#10b981"></i> Elite Projection: Positive variance of ${DB.data.profile.currency}${stats.projection.toFixed(0)}.`);
        }

        // 3. Efficiency Insight
        if (stats.savingsRate > 30) {
            insights.push(`<i class="fa-solid fa-crown" style="color:#fbbf24"></i> Efficiency: High-tier savings rate (${stats.savingsRate}%).`);
        }

        return insights;
    }

    static getBudgetStatus() {
        const data = DB.data;
        const stats = DB.computeSummary('Month');
        const budget = data.budgets.month || 0;
        
        if (budget === 0) return null;
        
        const usage = (stats.totalExpense / budget) * 100;
        let msg = `Budget: ${usage.toFixed(1)}% utilized.`;
        let color = '#ffffff';
        
        if (usage >= 100) { color = '#f43f5e'; msg = 'LIMIT REACHED'; }
        else if (usage >= 80) { color = '#fbbf24'; msg = '80% WARNING'; }
        
        return { msg, color, usage };
    }
}
