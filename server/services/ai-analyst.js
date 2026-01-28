const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3-pro-preview" });

/**
 * Service to run the "Pass 1" Analysis.
 * Takes a deterministic Match Digest and produces structured Tactical Insights via LLM.
 */
class AiAnalystService {
    constructor() {
        this.promptPath = path.join(__dirname, '../prompts/analystPrompt.txt');
        this.promptTemplate = null;
    }

    /**
     * Loads the analyst prompt template from disk.
     */
    async loadPrompt() {
        if (!this.promptTemplate) {
            try {
                this.promptTemplate = await fs.promises.readFile(this.promptPath, 'utf-8');
            } catch (error) {
                console.error("Error loading analyst prompt:", error);
                throw new Error("Failed to load Analyst Prompt template.");
            }
        }
        return this.promptTemplate;
    }

    /**
     * analyzeMatch
     * @param {Object} matchDigest - The structured JSON output from DigestBuilder.
     * @returns {Object} - The structured JSON analysis from the LLM.
     */
    async analyzeMatch(matchDigest) {
        try {
            const systemPrompt = await this.loadPrompt();

            // Build explicit roster list to prevent AI hallucination
            const targetTeam = matchDigest.meta?.targetTeam || 'Unknown Team';
            const roster = matchDigest.meta?.roster || {};
            const rosterList = Object.entries(roster)
                .map(([name, agent]) => `  - ${name}: ${agent}`)
                .join('\n');

            // Construct the final prompt with explicit roster enforcement
            const prompt = `
${systemPrompt}

---
## CRITICAL: PLAYER ROSTER FOR ${targetTeam}
The following is the EXACT player-agent mapping for this match. You MUST use these EXACT names and agents.
DO NOT guess, infer, or hallucinate different agents. Use ONLY these mappings:

${rosterList || '  (No roster data available)'}

When generating player_analysis, use ONLY the players and agents listed above.
---

MATCH DIGEST DATA:
${JSON.stringify(matchDigest, null, 2)}
---
`;

            // Call Gemini
            // Set response MimeType to JSON if supported or instruct via prompt (done in prompt).
            // Gemini 1.5/2.0 supports response_mime_type: "application/json"
            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: "application/json"
                }
            });

            const response = await result.response;
            const text = response.text();

            // Parse JSON safely
            let analysisJson;
            try {
                // Remove potential markdown code blocks if the model adds them despite MIME type
                const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
                analysisJson = JSON.parse(cleanText);
            } catch (e) {
                console.error("Failed to parse AI Analyst output as JSON:", text);
                throw new Error("AI Analyst produced invalid JSON.");
            }

            return analysisJson;

        } catch (error) {
            console.error("AiAnalystService error:", error);
            throw error;
        }
    }
}

module.exports = new AiAnalystService();
