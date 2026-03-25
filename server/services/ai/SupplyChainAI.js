/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Wolf HMS — Phase 8, Pillar 2
 * DYNAMIC SUPPLY CHAIN & PREDICTIVE PROCUREMENT
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Sub-modules:
 *  1. Surgical Demand Forecaster — predicts supply needs from OT schedule
 *  2. Epidemiological Stocking — detects disease spikes and auto-adjusts thresholds
 *  3. Smart PO Negotiation — analyzes vendor pricing and generates optimal POs
 *  4. Expiry Risk Scanner — flags near-expiry inventory
 */

const pool = require('../../config/db');

class SupplyChainAI {

    // ════════════════════════════════════════════════════════
    // 1. SURGICAL DEMAND FORECASTER
    // ════════════════════════════════════════════════════════

    /**
     * Analyze OT schedule for the next 14 days and predict
     * exact surgical kits, implants, and blood units needed.
     * 
     * @param {number} hospitalId
     * @returns {Object} { surgeries[], demandForecast[], alerts[] }
     */
    static async forecastSurgicalDemand(hospitalId) {
        // Get upcoming OT schedule (next 14 days)
        const otRes = await pool.query(`
            SELECT os.*, u.name as surgeon_name
            FROM ot_schedules os
            LEFT JOIN users u ON os.surgeon_id = u.id
            WHERE os.hospital_id = $1 
              AND os.scheduled_date >= CURRENT_DATE 
              AND os.scheduled_date <= CURRENT_DATE + INTERVAL '14 days'
              AND os.status != 'Cancelled'
            ORDER BY os.scheduled_date ASC
        `, [hospitalId]);

        const surgeries = otRes.rows;

        // Surgical Kit Mapping (procedure → required supplies)
        const SURGICAL_KITS = {
            'knee replacement': { 'Knee Implant (TKR)': 1, 'Bone Cement': 2, 'Surgical Drainage Kit': 1, 'Crepe Bandage': 4, 'Blood Units (PRBC)': 2 },
            'hip replacement': { 'Hip Implant': 1, 'Bone Cement': 2, 'Surgical Drainage Kit': 1, 'Blood Units (PRBC)': 2 },
            'cabg': { 'Bypass Graft Set': 1, 'Cardioplegia Solution': 2, 'Blood Units (PRBC)': 4, 'FFP Units': 2, 'Platelets': 2 },
            'ptca': { 'DES Stent': 1, 'Guide Wire': 2, 'Balloon Catheter': 1, 'Cath Lab Kit': 1 },
            'appendectomy': { 'Laparoscopic Trocar Set': 1, 'Endoloop': 2, 'Surgical Dressing Kit': 2 },
            'c-section': { 'Caesarean Surgical Kit': 1, 'Suture Set (Vicryl)': 3, 'Blood Units (PRBC)': 1, 'Neonatal Kit': 1 },
            'caesarean': { 'Caesarean Surgical Kit': 1, 'Suture Set (Vicryl)': 3, 'Blood Units (PRBC)': 1, 'Neonatal Kit': 1 },
            'cataract': { 'IOL Lens': 1, 'Viscoelastic': 1, 'BSS Solution': 1 },
            'hernia': { 'Mesh (Prolene)': 1, 'Laparoscopic Trocar Set': 1, 'Suture Set': 2 },
        };

        // Aggregate demand
        const demandMap = {};
        const alerts = [];

        for (const surgery of surgeries) {
            const procName = (surgery.procedure_name || '').toLowerCase();
            
            for (const [keyword, kit] of Object.entries(SURGICAL_KITS)) {
                if (procName.includes(keyword)) {
                    for (const [item, qty] of Object.entries(kit)) {
                        demandMap[item] = (demandMap[item] || 0) + qty;
                    }
                    break;
                }
            }
        }

        // Check current stock against demand
        const demandForecast = [];
        for (const [item, requiredQty] of Object.entries(demandMap)) {
            const stockRes = await pool.query(`
                SELECT COALESCE(SUM(quantity), 0) as current_stock
                FROM inventory_items
                WHERE hospital_id = $1 AND name ILIKE $2 AND quantity > 0
            `, [hospitalId, `%${item}%`]);

            const currentStock = Number(stockRes.rows[0]?.current_stock || 0);
            const deficit = requiredQty - currentStock;

            demandForecast.push({
                item,
                required: requiredQty,
                currentStock,
                deficit: Math.max(deficit, 0),
                status: deficit > 0 ? '🔴 SHORTAGE' : currentStock < requiredQty * 1.5 ? '🟡 LOW' : '🟢 OK'
            });

            if (deficit > 0) {
                alerts.push({
                    severity: 'CRITICAL',
                    message: `⚠️ ${item}: Need ${requiredQty} for upcoming surgeries but only ${currentStock} in stock. Deficit: ${deficit} units.`,
                    action: `Urgent PO required for ${deficit}+ units of ${item}`
                });
            }
        }

        return {
            period: '14-day forecast',
            totalSurgeries: surgeries.length,
            surgeries: surgeries.map(s => ({
                date: s.scheduled_date,
                procedure: s.procedure_name,
                surgeon: s.surgeon_name,
                status: s.status
            })),
            demandForecast: demandForecast.sort((a, b) => b.deficit - a.deficit),
            alerts,
            generatedAt: new Date().toISOString()
        };
    }

    // ════════════════════════════════════════════════════════
    // 2. EPIDEMIOLOGICAL STOCKING
    // ════════════════════════════════════════════════════════

    /**
     * Detect disease spikes from ER/OPD admissions and
     * auto-adjust reorder thresholds.
     * 
     * @param {number} hospitalId
     * @returns {Object} { spikes[], recommendations[] }
     */
    static async detectDiseaseSpikes(hospitalId) {
        // Compare this week vs last 4-week average for key diagnoses
        const thisWeek = await pool.query(`
            SELECT LOWER(diagnosis) as diagnosis, COUNT(*) as count
            FROM admissions
            WHERE hospital_id = $1 
              AND admitted_at >= CURRENT_DATE - INTERVAL '7 days'
              AND diagnosis IS NOT NULL
            GROUP BY LOWER(diagnosis)
            ORDER BY count DESC
            LIMIT 20
        `, [hospitalId]);

        const avgWeek = await pool.query(`
            SELECT LOWER(diagnosis) as diagnosis, COUNT(*)::float / 4 as avg_count
            FROM admissions
            WHERE hospital_id = $1 
              AND admitted_at >= CURRENT_DATE - INTERVAL '35 days'
              AND admitted_at < CURRENT_DATE - INTERVAL '7 days'
              AND diagnosis IS NOT NULL
            GROUP BY LOWER(diagnosis)
        `, [hospitalId]);

        const avgMap = {};
        avgWeek.rows.forEach(r => { avgMap[r.diagnosis] = Number(r.avg_count); });

        // Disease → Medicines mapping
        const DISEASE_MEDICINES = {
            'dengue': ['IV Fluid (NS)', 'Paracetamol IV', 'Platelet Kit', 'ORS Sachets'],
            'malaria': ['Artesunate', 'Chloroquine', 'IV Fluid (NS)', 'Paracetamol'],
            'typhoid': ['Azithromycin', 'Ceftriaxone', 'IV Fluid', 'ORS'],
            'pneumonia': ['Ceftriaxone', 'Azithromycin', 'O2 Cylinder', 'Nebulizer Kit'],
            'covid': ['Remdesivir', 'Dexamethasone', 'O2 Cylinder', 'PPE Kit', 'N95 Masks'],
            'gastroenteritis': ['ORS Sachets', 'IV Fluid (RL)', 'Ondansetron', 'Metronidazole'],
            'asthma': ['Salbutamol Nebulizer', 'Ipratropium', 'Prednisolone', 'O2 Cylinder'],
        };

        const spikes = [];
        const recommendations = [];

        for (const row of thisWeek.rows) {
            const avg = avgMap[row.diagnosis] || 0;
            const current = Number(row.count);
            
            if (avg > 0 && current > avg * 1.4) { // 40% spike threshold
                const spikePercent = Math.round(((current - avg) / avg) * 100);
                spikes.push({
                    disease: row.diagnosis,
                    thisWeek: current,
                    weeklyAverage: Math.round(avg * 10) / 10,
                    spikePercent,
                    severity: spikePercent > 100 ? 'CRITICAL' : spikePercent > 50 ? 'HIGH' : 'MODERATE'
                });

                // Find matching medicine recommendations
                for (const [disease, meds] of Object.entries(DISEASE_MEDICINES)) {
                    if (row.diagnosis.includes(disease)) {
                        recommendations.push({
                            disease: row.diagnosis,
                            spikePercent,
                            action: `Raise reorder threshold by ${Math.min(spikePercent, 300)}% for: ${meds.join(', ')}`,
                            medicines: meds
                        });
                        break;
                    }
                }
            }
        }

        return {
            hospitalId,
            analysisWindow: '7 days vs 4-week average',
            spikes: spikes.sort((a, b) => b.spikePercent - a.spikePercent),
            recommendations,
            message: spikes.length > 0 
                ? `🚨 ${spikes.length} disease spike(s) detected! Adjust inventory thresholds.`
                : '✅ No significant disease spikes detected.',
            analyzedAt: new Date().toISOString()
        };
    }

    // ════════════════════════════════════════════════════════
    // 3. SMART PO NEGOTIATION DRAFTER
    // ════════════════════════════════════════════════════════

    /**
     * Analyze vendor pricing history and recommend optimal PO.
     * 
     * @param {string} itemName - medicine/supply name
     * @param {number} quantity - required quantity
     * @param {number} hospitalId
     * @returns {Object} { vendorComparison[], recommendation, draftPO }
     */
    static async smartPORecommendation(itemName, quantity, hospitalId) {
        // Get vendor pricing history for this item
        const vendorRes = await pool.query(`
            SELECT s.name as vendor_name, s.id as vendor_id,
                   poi.unit_price, poi.quantity, po.created_at as order_date,
                   po.delivery_date,
                   EXTRACT(DAY FROM (po.delivery_date - po.created_at)) as delivery_days
            FROM po_items poi
            JOIN purchase_orders po ON poi.purchase_order_id = po.id
            JOIN suppliers s ON po.supplier_id = s.id
            WHERE poi.item_name ILIKE $1 AND po.hospital_id = $2
            ORDER BY po.created_at DESC
            LIMIT 20
        `, [`%${itemName}%`, hospitalId]);

        // Aggregate vendor stats
        const vendorStats = {};
        for (const row of vendorRes.rows) {
            const key = row.vendor_name;
            if (!vendorStats[key]) {
                vendorStats[key] = { 
                    vendorId: row.vendor_id, name: key, 
                    prices: [], deliveryDays: [], orderCount: 0 
                };
            }
            vendorStats[key].prices.push(Number(row.unit_price));
            if (row.delivery_days) vendorStats[key].deliveryDays.push(Number(row.delivery_days));
            vendorStats[key].orderCount++;
        }

        const comparison = Object.values(vendorStats).map(v => {
            const avgPrice = v.prices.reduce((s, p) => s + p, 0) / v.prices.length;
            const avgDelivery = v.deliveryDays.length > 0 
                ? v.deliveryDays.reduce((s, d) => s + d, 0) / v.deliveryDays.length 
                : null;
            return {
                vendor: v.name,
                vendorId: v.vendorId,
                avgUnitPrice: Math.round(avgPrice * 100) / 100,
                avgDeliveryDays: avgDelivery ? Math.round(avgDelivery) : 'Unknown',
                totalCost: Math.round(avgPrice * quantity * 100) / 100,
                reliability: v.orderCount >= 3 ? 'HIGH' : v.orderCount >= 2 ? 'MEDIUM' : 'LOW',
                orderHistory: v.orderCount
            };
        }).sort((a, b) => a.avgUnitPrice - b.avgUnitPrice);

        // Generate recommendation
        const cheapest = comparison[0];
        const fastest = comparison.sort((a, b) => (a.avgDeliveryDays || 99) - (b.avgDeliveryDays || 99))[0];

        return {
            item: itemName,
            requestedQuantity: quantity,
            vendorComparison: comparison.sort((a, b) => a.totalCost - b.totalCost),
            recommendation: cheapest && fastest && cheapest.vendor !== fastest.vendor
                ? `💡 ${cheapest.vendor} is cheapest (₹${cheapest.avgUnitPrice}/unit) but ${fastest.vendor} delivers faster (${fastest.avgDeliveryDays} days). Choose based on urgency.`
                : cheapest 
                    ? `✅ Recommend ${cheapest.vendor} — Best price ₹${cheapest.avgUnitPrice}/unit with ${cheapest.reliability} reliability.`
                    : '⚠️ No vendor history found. Manual PO required.',
            analyzedAt: new Date().toISOString()
        };
    }

    // ════════════════════════════════════════════════════════
    // 4. EXPIRY RISK SCANNER
    // ════════════════════════════════════════════════════════

    /**
     * Scan inventory for near-expiry items and calculate financial risk.
     * 
     * @param {number} hospitalId
     * @param {number} daysThreshold - days until expiry (default 90)
     * @returns {Object} { atRiskItems[], totalFinancialRisk }
     */
    static async scanExpiryRisk(hospitalId, daysThreshold = 90) {
        const res = await pool.query(`
            SELECT name, batch_number, quantity, unit_price, expiry_date,
                   (expiry_date - CURRENT_DATE) as days_until_expiry,
                   (quantity * unit_price) as total_value
            FROM inventory_items
            WHERE hospital_id = $1 
              AND expiry_date IS NOT NULL
              AND expiry_date <= CURRENT_DATE + $2 * INTERVAL '1 day'
              AND quantity > 0
            ORDER BY expiry_date ASC
        `, [hospitalId, daysThreshold]);

        const items = res.rows.map(r => ({
            name: r.name,
            batch: r.batch_number,
            quantity: r.quantity,
            unitPrice: Number(r.unit_price),
            expiryDate: r.expiry_date,
            daysLeft: Number(r.days_until_expiry),
            totalValue: Number(r.total_value),
            urgency: Number(r.days_until_expiry) <= 30 ? '🔴 CRITICAL' 
                   : Number(r.days_until_expiry) <= 60 ? '🟡 WARNING' 
                   : '🟠 MONITOR'
        }));

        const totalRisk = items.reduce((s, i) => s + i.totalValue, 0);
        const criticalCount = items.filter(i => i.daysLeft <= 30).length;

        return {
            hospitalId,
            threshold: `${daysThreshold} days`,
            atRiskItems: items,
            totalFinancialRisk: totalRisk,
            criticalCount,
            summary: items.length > 0
                ? `⚠️ ${items.length} items (₹${totalRisk.toLocaleString()}) at expiry risk. ${criticalCount} critical (<30 days).`
                : '✅ No near-expiry inventory items.',
            recommendations: criticalCount > 0  
                ? ['Transfer critical items to high-usage wards', 'Contact manufacturer for return/exchange', 'Offer discounted dispensing for near-expiry OTC items']
                : [],
            scannedAt: new Date().toISOString()
        };
    }
}

module.exports = SupplyChainAI;
