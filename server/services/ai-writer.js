const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini API
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.warn("WARNING: GEMINI_API_KEY is not set. AI writing features will fail.");
}
const genAI = new GoogleGenerativeAI(API_KEY || 'dummy');
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

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
     * @param {Object} metadata - Extra info (team names, map, date) to fill in headers.
     * @returns {String} - The final Markdown report.
     */
    async generateReport(analystOutput, metadata) {
        try {
            const systemPrompt = await this.loadPrompt();
            
            // Construct the user message
            const prompt = `
Generate a scouting report for team "${metadata.targetTeam}".
Map: ${metadata.map}
Date: ${metadata.date}

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
