const { GoogleGenerativeAI } = require('@google/generative-ai');
const pool = require('../config/db');
const { getHospitalId } = require('../utils/tenantHelper');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

const DB_SCHEMA_SUMMARY = `
- users (id, username, email, role, is_active, hospital_id)
- patients (id, name, age, gender, contact, address, medical_history, hospital_id)
- admissions (id, patient_id, bed_number, admission_date, discharge_date, status, diagnosis, hospital_id)
- opd_visits (id, patient_id, doctor_id, visit_date, symptoms, diagnosis, prescription, hospital_id)
- inventory_items (id, name, category, stock_quantity, unit, reorder_level, expiry_date, hospital_id)
- invoices (id, patient_id, total_amount, status, generated_at, hospital_id)
- emergency_logs (id, code, location, status, created_at, hospital_id)
`;

const handleChat = asyncHandler(async (req, res) => {
    const { question } = req.body;
    const userRole = req.user.role;
    const hospitalId = getHospitalId(req);

    const safetyPrompt = `
    You are a Hospital DB Assistant. 
    Current User Role: ${userRole}.
    Current Hospital ID: ${hospitalId}.
    
    Rules:
    1. If the user asks for sensitive data they shouldn't see (e.g., Facilities asking for patient records), return "ACCESS_DENIED".
    2. Only answer questions related to hospital data.
    3. Convert the user's question into a READ-ONLY PostgreSQL query.
    4. ALWAYS filter by hospital_id = ${hospitalId} OR hospital_id IS NULL
    5. Database Schema: ${DB_SCHEMA_SUMMARY}
    6. Return ONLY the SQL query. No markdown, no explanation.
    7. Do NOT use DELETE, DROP, UPDATE, INSERT.
    
    Question: "${question}"
    `;

    const result = await model.generateContent(safetyPrompt);
    const response = await result.response;
    let sqlQuery = response.text().trim();
    sqlQuery = sqlQuery.replace(/```sql/g, '').replace(/```/g, '').trim();

    if (sqlQuery === 'ACCESS_DENIED') {
        return ResponseHandler.success(res, { answer: "I cannot answer that question based on your current role permissions." });
    }

    const forbiddenKeywords = ['DELETE', 'DROP', 'UPDATE', 'INSERT', 'ALTER', 'TRUNCATE', 'GRANT', 'REVOKE'];
    if (forbiddenKeywords.some(keyword => sqlQuery.toUpperCase().includes(keyword))) {
        return ResponseHandler.success(res, { answer: "I can only perform read-only operations for safety reasons." });
    }

    const dbResult = await pool.query(sqlQuery);

    const summaryPrompt = `
    User Question: "${question}"
    SQL Result: ${JSON.stringify(dbResult.rows)}
    
    Summarize this data into a friendly, human-readable sentence. 
    If the result is empty, say "I couldn't find any matching records."
    Keep it concise.
    `;

    const summaryResult = await model.generateContent(summaryPrompt);
    const summaryResponse = await summaryResult.response;
    const finalAnswer = summaryResponse.text();

    ResponseHandler.success(res, { answer: finalAnswer, sql: sqlQuery });
});

module.exports = { handleChat };
