const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const axios = require('axios');

// Default Gemini client (uses env API key)
const defaultGeminiApiKey = process.env.GEMINI_API_KEY;
const defaultGeminiGenAI = defaultGeminiApiKey ? new GoogleGenerativeAI(defaultGeminiApiKey) : null;

const defaultOpenAIApiKey = process.env.OPENAI_API_KEY;
const defaultClaudeApiKey = process.env.CLAUDE_API_KEY;

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
     * @param {string} userApiKey - Optional user-provided API key.
     * @param {string} agent - AI Agent to use (gemini, openai, claude).
     * @param {string} model - Specific AI model to use.
     * @param {string} endpoint - Custom API endpoint.
     * @param {AbortSignal} signal - Optional abort signal to terminate the request.
     * @returns {String} - The final Markdown report.
     */
    async generateReport(analystOutput, metadata, userApiKey = null, agent = 'gemini', model = null, endpoint = null, signal = null) {
        const prompt = await this.buildPrompt(analystOutput, metadata);

        if (agent === 'gemini') {
            return await this.callGemini(prompt, userApiKey, model, endpoint, signal);
        } else if (agent === 'openai') {
            return await this.callOpenAI(prompt, userApiKey, model, endpoint, signal);
        } else if (agent === 'ollama') {
            return await this.callOllama(prompt, userApiKey, model, endpoint, signal);
        } else if (agent === 'claude') {
            return await this.callClaude(prompt, userApiKey, model, endpoint, signal);
        } else {
            throw new Error(`Unsupported AI Agent: ${agent}`);
        }
    }

    async buildPrompt(analystOutput, metadata) {
        // Build roster list if available
        const roster = metadata.roster || {};
        const rosterList = Object.entries(roster)
            .map(([name, agent]) => `  - ${name}: ${agent}`)
            .join('\n');

        // Construct the user message with explicit roster
        return `
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
    }

    async callGemini(prompt, userApiKey, userModel = null, endpoint = null, signal = null) {
        try {
            const apiKey = userApiKey || defaultGeminiApiKey;
            if (!apiKey) throw new Error('No Gemini API key provided.');

            if (endpoint) {
                // Use custom endpoint via axios for Gemini (Simulating OpenAI-like proxy compatibility)
                const response = await axios.post(`${endpoint.replace(/\/$/, '')}/models/${userModel || "gemini-3-pro-preview" }:generateContent?key=${apiKey}`, {
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                }, { signal });
                return response.data.candidates[0].content.parts[0].text;
            }

            const genAI = userApiKey ? new GoogleGenerativeAI(userApiKey) : defaultGeminiGenAI;
            const model = genAI.getGenerativeModel({ model: userModel || "gemini-3-pro-preview" });

            const systemPrompt = await this.loadPrompt();

            const result = await model.generateContent({
                systemInstruction: systemPrompt,
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
            }, { signal });

            return (await result.response).text();
        } catch (error) {
            console.error("Gemini Writer error:", error.response?.data || error.message);
            return this.generateFallbackReport(null, { targetTeam: 'Unknown' }); // Simplified fallback call
        }
    }

    async callOpenAI(prompt, userApiKey, userModel = null, endpoint = null, signal = null) {
        try {
            const apiKey = userApiKey || defaultOpenAIApiKey;
            if (!apiKey) throw new Error('No OpenAI API key provided.');

            const systemPrompt = await this.loadPrompt();
            const url = endpoint ? `${endpoint.replace(/\/$/, '')}/chat/completions` : 'https://api.openai.com/v1/chat/completions';

            const response = await axios.post(url, {
                model: userModel || "gpt-4o",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: prompt }
                ]
            }, {
                headers: { 
                    'Authorization': `Bearer ${apiKey}`, 
                    'Content-Type': 'application/json' 
                },
                signal
            });

            return response.data.choices[0].message.content;
        } catch (error) {
            console.error("OpenAI Writer error:", error.response?.data || error.message);
            throw new Error(`AI Error: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    async callOllama(prompt, userApiKey, userModel = null, endpoint = null, signal = null) {
        try {
            const apiKey = userApiKey || 'ollama';
            const systemPrompt = await this.loadPrompt();
            
            const url = endpoint ? `${endpoint.replace(/\/$/, '')}/chat/completions` : 'http://localhost:11434/v1/chat/completions';

            const response = await axios.post(url, {
                model: userModel || "llama3",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: prompt }
                ]
            }, {
                headers: { 
                    'Authorization': `Bearer ${apiKey}`, 
                    'Content-Type': 'application/json' 
                },
                signal
            });

            return response.data.choices[0].message.content;
        } catch (error) {
            console.error("Ollama Writer error:", error.response?.data || error.message);
            throw new Error(`Ollama Error: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    async callClaude(prompt, userApiKey, userModel = null, endpoint = null, signal = null) {
        try {
            const apiKey = userApiKey || defaultClaudeApiKey;
            if (!apiKey) throw new Error('No Claude API key provided.');

            const systemPrompt = await this.loadPrompt();
            const url = endpoint ? `${endpoint.replace(/\/$/, '')}/messages` : 'https://api.anthropic.com/v1/messages';

            const response = await axios.post(url, {
                model: userModel || "claude-3-5-sonnet-20240620",
                max_tokens: 4096,
                system: systemPrompt,
                messages: [{ role: "user", content: prompt }]
            }, {
                headers: {
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'Content-Type': 'application/json'
                },
                signal
            });

            return response.data.content[0].text;
        } catch (error) {
            console.error("Claude Writer error:", error.response?.data || error.message);
            throw new Error(`Claude Error: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    /**
     * Simple fallback if the Writer LLM fails.
     * Just dumps the JSON into a readable format.
     */
    generateFallbackReport(json, metadata) {
        if (!json) return `# Scouting Report: ${metadata.targetTeam} (Error)\nAn error occurred while generating the report.`;
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
