const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");
const ResponseHandler = require("../utils/responseHandler");
const { asyncHandler } = require("../middleware/errorHandler");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Parses a lab report image/PDF using Gemini Vision
 * @route POST /api/lab/parse-result
 */
const parseLabReport = asyncHandler(async (req, res) => {
    if (!req.file) {
        return ResponseHandler.error(res, "No file uploaded", 400);
    }

    const targetPatientName = req.body.patient_name || req.query.patient_name || "";

    try {
        console.log(`[OCR] Processing file: ${req.file.path} (${req.file.mimetype}). Target Patient: ${targetPatientName}`);

        // Create debug log
        const debugPath = path.join(__dirname, '../logs/ocr_debug.log');
        
        // Convert file to base64 for Gemini
        const fileBuffer = fs.readFileSync(req.file.path);
        const base64Data = fileBuffer.toString("base64");

        // Prepare the prompt
        // SDK updated to latest
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 
        
        const prompt = `
        You are an expert Laboratory Information System (LIS) parser.
        Extract the test parameters, values, reference ranges, abnormality flags, and verify the patient name.
        
        Return ONLY a raw JSON object (no markdown formatting, no backticks).
        
        The JSON object must have keys for each parameter at the root level, containing their numeric or qualitative values.
        It must also contain a special key "_metadata" with:
        1. "reference_ranges": mapping parameter keys to their printed biological reference interval strings (e.g. "4.0 - 11.0").
        2. "flags": mapping parameter keys to their clinical flags ("High", "Low", "Normal").
        3. "patient_verification": an object with:
           - "patient_name_on_report": name of the patient printed on the report sheet.
           - "target_patient_name": "${targetPatientName}"
           - "name_match_status": Compare patient_name_on_report with target_patient_name. Set this to "Match" if they are the same or highly similar (e.g. including middle initials or spelling variations), "Mismatch" if they are completely different names, or "Missing" if no patient name is printed on the sheet.

        Example Output:
        {
          "wbc": 6.15,
          "rbc": 4.03,
          "hgb": 11.1,
          "plt": 457,
          "_metadata": {
            "reference_ranges": {
              "wbc": "4.0 - 11.0",
              "rbc": "4.5 - 5.9",
              "hgb": "12.0 - 16.0",
              "plt": "150 - 450"
            },
            "flags": {
              "wbc": "Normal",
              "rbc": "Normal",
              "hgb": "Low",
              "plt": "High"
            },
            "patient_verification": {
              "patient_name_on_report": "John Doe",
              "target_patient_name": "${targetPatientName}",
              "name_match_status": "Match"
            }
          }
        }
        `;

        const imagePart = {
            inlineData: {
                data: base64Data,
                mimeType: req.file.mimetype,
            },
        };

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        let text = response.text();

        console.log("[OCR] Raw AI Response:", text);

        // Clean up markdown if present
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();

        let parsedData;
        try {
            parsedData = JSON.parse(text);
        } catch (e) {
            console.error("[OCR] JSON Parse Error:", e);
            // Fallback: try to extract just the json part using regex
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsedData = JSON.parse(jsonMatch[0]);
            } else {
                return ResponseHandler.error(res, "Failed to parse AI response as JSON", 500);
            }
        }

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        ResponseHandler.success(res, parsedData);

    } catch (error) {
        console.error("[OCR] Processing Error:", error);
        
        // Log to file
        const debugPath = path.join(__dirname, '../logs/ocr_debug.log');
        if (!fs.existsSync(path.dirname(debugPath))) fs.mkdirSync(path.dirname(debugPath), { recursive: true });
        fs.appendFileSync(debugPath, `[${new Date().toISOString()}] Error: ${error.message}\nStack: ${error.stack}\n---\n`);

        // Clean up file if error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        ResponseHandler.error(res, "Failed to process document: " + error.message, 500, error);
    }
});

module.exports = {
    parseLabReport
};
