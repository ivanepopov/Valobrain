const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Default Gemini client (uses env API key)
const defaultApiKey = process.env.GEMINI_API_KEY;
const defaultGenAI = defaultApiKey ? new GoogleGenerativeAI(defaultApiKey) : null;

if (!defaultApiKey) {
  console.warn("WARNING: GEMINI_API_KEY is not set. AI writing features will require user-provided API key.");
}

/**
 * Service to run the "Pass 2" Writing.
 * Takes the Structured JSON from the Analyst and generates a Markdown report.
 */
class AiWriterService {
    constructor() {
        this.promptPath = path.join(__dirname, '../prompts/writerPrompt.txt');
        this.systemPrompt = null;
    }

    /**
     * Loads the writer prompt template from disk.
     */
    async loadPrompt() {
        if (!this.systemPrompt) {
            try {
                this.systemPrompt = await fs.promises.readFile(this.promptPath, 'utf-8');
            } catch (error) {
                console.error("Error loading writer prompt:", error);
                throw new Error("Failed to load Writer Prompt template.");
            }
        }
        return this.systemPrompt;
    }

    /**
     * generateReport
     * @param {Object} analystOutput - The structured JSON from the AiAnalystService.
     * @param {Object} metadata - Extra info (team names, map, date, roster) to fill in headers.
     * @param {string} userApiKey - Optional user-provided API key (overrides env key).
     * @returns {String} - The final Markdown report.
     */
    async generateReport(analystOutput, metadata, userApiKey = null) {
        try {
            // Use user's API key if provided, otherwise fall back to env
            const apiKey = userApiKey || defaultApiKey;
            if (!apiKey) {
                throw new Error('No Gemini API key provided. Please enter your API key.');
            }

            // Create client with the appropriate key
            const genAI = userApiKey ? new GoogleGenerativeAI(userApiKey) : defaultGenAI;
            const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

            const systemPrompt = await this.loadPrompt();

            // Build roster list if available
            const roster = metadata.roster || {};
            const rosterList = Object.entries(roster)
                .map(([name, agent]) => `  - ${name}: ${agent}`)
                .join('\n');

            // Construct the user message with explicit roster
            const prompt = `
Generate a scouting report for team "${metadata.targetTeam}".
Tournament: ${metadata.tournament || 'Unknown Tournament'}
Map: ${metadata.map}
Date: ${metadata.date}
Round Score: ${metadata.roundScore || 'Unknown'}

---
## CRITICAL: ROUND SCORE
The correct round score for this map is: ${metadata.roundScore || 'Unknown'}
If you mention any score in the report, you MUST use EXACTLY "${metadata.roundScore || 'Unknown'}".
DO NOT invent, calculate, or guess any other score. NEVER write scores like "0-14" or "0-21".
---

## CRITICAL: PLAYER ROSTER FOR ${metadata.targetTeam}
Use ONLY these EXACT player-agent mappings for the Player Intel table:
${rosterList || '(No roster data available)'}

DO NOT use any other player names or agents. Use EXACTLY what is listed above.
---

ANALYST REPORT (JSON):
${JSON.stringify(analystOutput, null, 2)}
---
`;

            const result = await model.generateContent({
                systemInstruction: systemPrompt,
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
            });

            const response = await result.response;
            return response.text();

        } catch (error) {
            console.error("AiWriterService error:", error);
            // Fallback if LLM fails
            return this.generateFallbackReport(analystOutput, metadata);
        }
    }

    /**
     * Simple fallback if the Writer LLM fails.
     * Just dumps the JSON into a readable format.
     */
    generateFallbackReport(json, metadata) {
        return `# Scouting Report: ${metadata.targetTeam} (Fallback)
        
**Note:** The AI Writer service encountered an error. Below is the raw analytical data.

## Narrative
${json.narrative_summary}

## Patterns
${json.tactical_patterns.map(p => `- **${p.phase}**: ${p.observation} (${p.evidence})`).join('\n')}

## Weaknesses
${json.weaknesses_and_counters.map(w => `- **Weakness**: ${w.weakness}\n  - **Counter**: ${w.exploitation}`).join('\n')}
`;
    }
}

module.exports = new AiWriterService();
