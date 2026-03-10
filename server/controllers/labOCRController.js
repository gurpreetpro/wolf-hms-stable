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

    try {
        console.log(`[OCR] Processing file: ${req.file.path} (${req.file.mimetype})`);

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
        Extract the test parameters and values from this medical lab report image.
        
        Return ONLY a raw JSON object (no markdown formatting, no backticks).
        The keys should be the parameter names (lowercase, snake_case if needed).
        The values should be numbers where possible, or strings if they are qualitative.

        Example Output:
        { "wbc": 6.15, "rbc": 4.03, "hgb": 11.1, "plt": 457 }
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
