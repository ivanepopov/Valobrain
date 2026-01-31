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
     * @param {string} userApiKey - Optional user-provided API key.
     * @param {string} agent - AI Agent to use (gemini, openai, claude).
     * @param {string} model - AI Model to use.
     * @param {string} endpoint - Custom API endpoint.
     * @param {AbortSignal} signal - Optional abort signal to terminate the request.
     * @returns {Object} - The structured JSON analysis from the LLM.
     */
    async analyzeMatch(matchDigest, userApiKey = null, agent = 'gemini', model = null, endpoint = null, signal = null) {
        const prompt = await this.buildPrompt(matchDigest);

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

    async buildPrompt(matchDigest) {
        const systemPrompt = await this.loadPrompt();

        // Build explicit roster list to prevent AI hallucination
        const targetTeam = matchDigest.meta?.targetTeam || 'Unknown Team';
        const roster = matchDigest.meta?.roster || {};
        const rosterList = Object.entries(roster)
            .map(([name, agent]) => `  - ${name}: ${agent}`)
            .join('\n');

        // Construct the final prompt with explicit roster enforcement
        return `
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
    }

    async callGemini(prompt, userApiKey, userModel = null, endpoint = null, signal = null) {
        try {
            const apiKey = userApiKey || defaultGeminiApiKey;
            if (!apiKey) throw new Error('No Gemini API key provided.');

            if (endpoint) {
                // Use custom endpoint via axios for Gemini (Simulating OpenAI-like proxy compatibility)
                const response = await axios.post(`${endpoint.replace(/\/$/, '')}/models/${userModel || "gemini-3-pro-preview"}:generateContent?key=${apiKey}`, {
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: "application/json" }
                }, { signal });
                const text = response.data.candidates[0].content.parts[0].text;
                return this.parseJsonResponse(text);
            }

            const genAI = userApiKey ? new GoogleGenerativeAI(userApiKey) : defaultGeminiGenAI;
            const model = genAI.getGenerativeModel({ model: userModel || "gemini-3-pro-preview" });

            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            }, { signal });

            const text = (await result.response).text();
            return this.parseJsonResponse(text);
        } catch (error) {
            console.error("Gemini Analysis error:", error.response?.data || error);
            throw error;
        }
    }

    async callOpenAI(prompt, userApiKey, userModel = null, endpoint = null, signal = null) {
        try {
            const apiKey = userApiKey || defaultOpenAIApiKey;
            if (!apiKey) throw new Error('No OpenAI API key provided.');

            const url = endpoint ? `${endpoint.replace(/\/$/, '')}/chat/completions` : 'https://api.openai.com/v1/chat/completions';

            const response = await axios.post(url, {
                model: userModel || "gpt-4o",
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" }
            }, {
                headers: { 
                    'Authorization': `Bearer ${apiKey}`, 
                    'Content-Type': 'application/json' 
                },
                signal
            });

            const content = response.data.choices[0].message.content;
            return this.parseJsonResponse(content);
        } catch (error) {
            console.error("OpenAI Analysis error:", error.response?.data || error.message);
            throw new Error(`AI Error: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    async callOllama(prompt, userApiKey, userModel = null, endpoint = null, signal = null) {
        try {
            // Ollama typically doesn't need a key, but we allow one if provided via userApiKey or fallback
            const apiKey = userApiKey || 'ollama';

            const url = endpoint ? `${endpoint.replace(/\/$/, '')}/chat/completions` : 'http://localhost:11434/v1/chat/completions';

            const response = await axios.post(url, {
                model: userModel || "llama3",
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" }
            }, {
                headers: { 
                    'Authorization': `Bearer ${apiKey}`, 
                    'Content-Type': 'application/json' 
                },
                signal
            });

            const content = response.data.choices[0].message.content;
            return this.parseJsonResponse(content);
        } catch (error) {
            console.error("Ollama Analysis error:", error.response?.data || error.message);
            throw new Error(`Ollama Error: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    async callClaude(prompt, userApiKey, userModel = null, endpoint = null, signal = null) {
        try {
            const apiKey = userApiKey || defaultClaudeApiKey;
            if (!apiKey) throw new Error('No Claude API key provided.');

            const url = endpoint ? `${endpoint.replace(/\/$/, '')}/messages` : 'https://api.anthropic.com/v1/messages';

            const response = await axios.post(url, {
                model: userModel || "claude-3-5-sonnet-20240620",
                max_tokens: 4096,
                messages: [{ role: "user", content: prompt + "\n\nIMPORTANT: Respond with ONLY a valid JSON object." }]
            }, {
                headers: {
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'Content-Type': 'application/json'
                },
                signal
            });

            return this.parseJsonResponse(response.data.content[0].text);
        } catch (error) {
            console.error("Claude Analysis error:", error.response?.data || error.message);
            throw new Error(`Claude Error: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    parseJsonResponse(text) {
        try {
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanText);
        } catch (e) {
            console.error("Failed to parse AI output as JSON:", text);
            throw new Error("AI produced invalid JSON.");
        }
    }
}

module.exports = new AiAnalystService();
