/**
 * WolfVoiceService.js
 * "The Voice of the System"
 * 
 * Purpose: Analyzes natural language commands and extracts intent + entities.
 * Current Implementation: Regex-based pattern matching (Foundation).
 * Future Upgrade: NLP model (TensorFlow.js or Python microservice).
 */

class WolfVoiceService {
    constructor() {
        this.intents = [
            {
                type: 'DISPATCH',
                patterns: [
                    /dispatch patrol to (.+)/i,
                    /send guard to (.+)/i,
                    /security to (.+)/i
                ]
            },
            {
                type: 'LOCKDOWN',
                patterns: [
                    /lockdown (.+)/i,
                    /close gate (.+)/i,
                    /lock (.+)/i
                ]
            },
            {
                type: 'UNLOCK',
                patterns: [
                    /open gate (.+)/i,
                    /unlock (.+)/i,
                    /release (.+)/i
                ]
            },
            {
                type: 'STATUS',
                patterns: [
                    /status of (.+)/i,
                    /check (.+)/i,
                    /report on (.+)/i
                ]
            }
        ];
    }

    /**
     * Analyzes text and returns a structured command object.
     * @param {string} text - Spoken text input
     * @returns {Object} { intent: string, entity: string, confidence: number, original: string }
     */
    processCommand(text) {
        if (!text) return { intent: 'UNKNOWN', confidence: 0 };

        const normalizedText = text.trim();

        for (const intentObj of this.intents) {
            for (const pattern of intentObj.patterns) {
                const match = normalizedText.match(pattern);
                if (match) {
                    return {
                        intent: intentObj.type,
                        entity: match[1].trim(), // The capture group (e.g., "Main Gate")
                        confidence: 1.0, // Regex match is definite
                        original: normalizedText
                    };
                }
            }
        }

        return { 
            intent: 'UNKNOWN', 
            confidence: 0, 
            original: normalizedText,
            message: "I didn't quite catch that. Try 'Dispatch to [Location]' or 'Lockdown [Gate]'"
        };
    }
}

module.exports = new WolfVoiceService();
