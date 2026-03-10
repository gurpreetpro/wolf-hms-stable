class AIService {
    constructor() {
        // Regex patterns for common prescription formats
        // Example: "Paracetamol 500mg 1-0-1 for 3 days"
        this.patterns = [
            {
                // Pattern: Drug Name | Strength | Frequency | Duration
                regex: /([A-Za-z0-9\s]+?)\s+(\d+mg|\d+ml|\d+g)\s+(\d+-\d+-\d+|QD|BID|TID|QID|OD|HS)\s+(?:for\s+)?(\d+\s+days?|\d+\s+weeks?)?/i,
                keys: ['drug_name', 'dosage', 'frequency', 'duration']
            },
            {
                 // Pattern: Drug Name | Frequency | Duration (Strength implied or missing)
                regex: /([A-Za-z0-9\s]+?)\s+(\d+-\d+-\d+)\s+(?:for\s+)?(\d+\s+days?)/i,
                keys: ['drug_name', 'frequency', 'duration']
            }
        ];
    }

    parsePrescriptionText(text) {
        const lines = text.split(/\r\n|\n|\r/);
        const medications = [];

        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return;

            let matchFound = false;
            for (const pattern of this.patterns) {
                const match = trimmedLine.match(pattern.regex);
                if (match) {
                    const med = {};
                    pattern.keys.forEach((key, index) => {
                        med[key] = match[index + 1]?.trim();
                    });
                    
                    // Normalize Frequency to readable format if needed
                    if (med.frequency === '1-0-1') med.frequency_display = 'Morning & Night (BD)';
                    if (med.frequency === '1-1-1') med.frequency_display = 'Morning, Afternoon, Night (TDS)';
                    if (med.frequency === '1-0-0') med.frequency_display = 'Morning (OD)';
                    if (med.frequency === '0-0-1') med.frequency_display = 'Night (HS)';

                    medications.push(med);
                    matchFound = true;
                    break;
                }
            }
            
            // If no regex match, maybe just try to guess the drug name (first word)
            if (!matchFound && trimmedLine.length > 3) {
                 // Fallback: heuristic
                 // medications.push({ drug_name: trimmedLine, note: 'Parssing uncertain' });
            }
        });

        return {
            valid: medications.length > 0,
            medications: medications
        };
    }
}

const aiService = new AIService();
module.exports = aiService;
