const { pool } = require('../db');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

class SmartInventory {
    
    /**
     * Get Smart Inventory Alerts
     * Combines Mathematical Burn Rate with AI Seasonality
     */
    async getInventoryAlerts() {
        try {
            // 1. Fetch Inventory with Usage Data
            // We join with care_tasks to calculate burn rate dynamically
            // For performance, we take last 30 days usage
            const query = `
                WITH UsageStats AS (
                    SELECT 
                        split_part(description, ' - ', 1) as item_name,
                        COUNT(*) as units_sold_30d
                    FROM care_tasks 
                    WHERE type = 'Medication' 
                      AND status = 'Completed' 
                      AND description IS NOT NULL
                      AND created_at >= NOW() - INTERVAL '30 days'
                    GROUP BY item_name
                )
                SELECT 
                    i.id,
                    i.name,
                    i.category,
                    i.stock_quantity,
                    i.expiry_date,
                    i.price_per_unit,
                    COALESCE(u.units_sold_30d, 0) as sales_last_30d
                FROM inventory_items i
                LEFT JOIN UsageStats u ON i.name = u.item_name
                WHERE i.expiry_date IS NOT NULL 
                  AND i.stock_quantity > 0
            `;
            
            const { rows: items } = await pool.query(query);
            
            const alerts = [];
            const aiBatch = [];

            for (const item of items) {
                try {
                    // MATH LAYER
                    const burnRate = Number(item.sales_last_30d) / 30; // Units per day
                    const stock = Number(item.stock_quantity);
                    const daysToSellOut = burnRate > 0 ? (stock / burnRate) : 9999;
                    
                    let expiry;
                    if (!item.expiry_date) {
                         expiry = new Date();
                         expiry.setFullYear(expiry.getFullYear() + 5);
                    } else {
                         expiry = new Date(item.expiry_date);
                    }

                    if (isNaN(expiry.getTime())) {
                        expiry = new Date();
                        expiry.setFullYear(expiry.getFullYear() + 5);
                    }

                const now = new Date();
                const daysToExpiry = (expiry - now) / (1000 * 60 * 60 * 24);

                let riskScore = 0;
                let riskReason = [];

                if (daysToExpiry < 0) {
                    riskScore = 100;
                    riskReason.push('Expired');
                } else if (daysToSellOut > daysToExpiry && burnRate > 0) { // Only if moving
                    // Won't sell out before expiry
                    riskScore = 80;
                    riskReason.push(`Slow Moving (Needs ${daysToSellOut.toFixed(0)} days to sell, expires in ${daysToExpiry.toFixed(0)})`);
                } else if (daysToExpiry < 60) {
                    riskScore = 40;
                    riskReason.push('Expiring Soon');
                }

                // AI LAYER PREP (Only for "At Risk" items to save tokens)
                if (riskScore >= 40 && riskScore < 100) {
                    aiBatch.push({
                        item: item.name,
                        category: item.category,
                        stock: item.stock_quantity,
                        daysToExpiry: Math.round(daysToExpiry)
                    });
                }

                if (riskScore > 0) {
                    alerts.push({
                        ...item,
                        burnRate: burnRate.toFixed(2),
                        daysToExpiry: Math.round(daysToExpiry),
                        riskScore,
                        riskReason: riskReason.join(', ')
                    });
                }
                } catch (err) {
                    console.error(`[SmartInventory] Error processing item ${item.name}:`, err.message);
                }
            }

            // AI SEASONALITY CHECK (Batched)
            if (aiBatch.length > 0) {
               const aiInsights = await this.checkSeasonality(aiBatch);
               // Merge AI insights back into alerts
               aiInsights.forEach(insight => {
                   const target = alerts.find(a => a.name === insight.item);
                   if (target) {
                       if (insight.demand_forecast === 'HIGH') {
                           target.riskScore -= 20; // Lower risk because sales might spike
                           target.aiNote = `📉 Risk Lowered: High Seasonal Demand Expected (${insight.reason})`;
                       } else if (insight.demand_forecast === 'LOW') {
                           target.riskScore += 10; // Higher risk
                           target.aiNote = `📈 Risk Increased: Low Seasonal Demand (${insight.reason})`;
                       }
                   }
               });
            }

            return alerts.sort((a, b) => b.riskScore - a.riskScore);

        } catch (error) {
            console.error('[SmartInventory] Error:', error);
            throw error;
        }
    }

    /**
     * Ask Gemini about seasonality
     */
    async checkSeasonality(items) {
        try {
            const currentMonth = new Date().toLocaleString('default', { month: 'long' });
            
            const prompt = `
                Act as a Pharmacy Inventory Analyst.
                Current Month: ${currentMonth} (India Context).
                
                Analyze these items for Seasonal Demand Spikes:
                ${JSON.stringify(items)}

                For each item, predict if demand represents a HIGH seasonal spike (e.g. Anti-fungal in Monsoon) or LOW/NORMAL.

                Output JSON Array ONLY:
                [
                    { "item": "Drug Name", "demand_forecast": "HIGH/LOW/NORMAL", "reason": "Short reason" }
                ]
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
            
            return JSON.parse(text);

        } catch (error) {
            console.warn('[SmartInventory] AI Seasonality Check Failed:', error.message);
            return []; // Fail gracefully
        }
    }
}

module.exports = new SmartInventory();
