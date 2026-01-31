const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Default Gemini client (uses env API key)
const defaultApiKey = process.env.GEMINI_API_KEY;
const defaultGenAI = defaultApiKey ? new GoogleGenerativeAI(defaultApiKey) : null;

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
     * @param {string} userApiKey - Optional user-provided API key (overrides env key).
     * @returns {Object} - The structured JSON analysis from the LLM.
     */
    async analyzeMatch(matchDigest, userApiKey = null) {
        try {
            // Use user's API key if provided, otherwise fall back to env
            const apiKey = userApiKey || defaultApiKey;
            if (!apiKey) {
                throw new Error('No Gemini API key provided. Please enter your API key.');
            }

            // Create client with the appropriate key
            const genAI = userApiKey ? new GoogleGenerativeAI(userApiKey) : defaultGenAI;
            const model = genAI.getGenerativeModel({ model: "gemini-3-pro-preview" });

            const systemPrompt = await this.loadPrompt();

            // Build explicit roster list to prevent AI hallucination
            const targetTeam = matchDigest.meta?.targetTeam || 'Unknown Team';
            const roster = matchDigest.meta?.roster || {};
            const rosterList = Object.entries(roster)
                .map(([name, agent]) => `  - ${name}: ${agent}`)
                .join('\n');

            // Replace placeholder in system prompt with actual team name
            const processedSystemPrompt = systemPrompt.replace(/\{\{TARGET_TEAM\}\}/g, targetTeam);

            // Construct the final prompt with explicit roster enforcement
            const prompt = `
${processedSystemPrompt}

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
