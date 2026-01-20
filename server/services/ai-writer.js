/**
 * AI Writer Service
 * 
 * Uses Gemini 3 Flash Preview to convert structured claims into coaching language.
 * The LLM is a WRITER, not an analyst. It only outputs what the evidence supports.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini
const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

// Model configuration
const MODEL_NAME = 'gemini-2.0-flash';

// System prompt that enforces writer role
const SYSTEM_PROMPT = `You are a professional Valorant scouting report writer. You receive VERIFIED pattern claims with full evidence.

RULES (CRITICAL - VIOLATIONS ARE UNACCEPTABLE):
1. ONLY write about patterns explicitly provided in the claims
2. NEVER invent intent, motivations, or VOD-dependent observations
3. ALWAYS reference the evidence: round numbers, percentages, timestamps
4. NEVER make claims without explicit supporting data
5. Use the exact format specified below

OUTPUT FORMAT:
For each claim, output:

**[Pattern Name]** (Confidence: [X]%)
- Evidence: [count]/[denominator] rounds ([percentage]%)
- Rounds: [list]
- Zones: [list if applicable]
**Recommendation**: If [condition] → Expect [behavior] → Do [counter]

SECTION ORDER:
## ATTACK TENDENCIES
[attack_macro claims]

## DEFENSE TENDENCIES  
[defense_macro claims]

## CONDITIONING PATTERNS
[conditioning claims]

## PLAYER TENDENCIES
[player_tendency claims]

## RECOMMENDED COUNTER-STRATEGIES
[counter_strat claims]

If a section has no claims, write: "Insufficient data for this category."

PROHIBITED OUTPUTS:
- "They likely do X because..."
- "Based on their playstyle..."
- "This suggests they prefer..."
- "It appears that..."
- Any speculation beyond the evidence provided`;

/**
 * Format claims bundle into prompt for LLM
 * @param {Object} bundles - Claim bundles from pattern detector
 * @param {string} teamName - Team being scouted
 * @returns {string} Formatted prompt
 */
function formatClaimsForPrompt(bundles, teamName) {
  let prompt = `Generate a scouting report for team "${teamName}" based on the following verified claims.\n\n`;
  
  prompt += `=== VERIFIED CLAIMS ===\n\n`;
  
  for (const [category, claims] of Object.entries(bundles)) {
    if (claims.length === 0) continue;
    
    prompt += `### ${category.toUpperCase().replace('_', ' ')}\n\n`;
    
    for (const claim of claims) {
      prompt += `Pattern: ${claim.pattern}\n`;
      prompt += `Confidence: ${Math.round(claim.confidence * 100)}%\n`;
      prompt += `Description: ${claim.description}\n`;
      prompt += `Evidence:\n`;
      prompt += `  - Rounds: ${claim.evidence.rounds.join(', ') || 'N/A'}\n`;
      prompt += `  - Count: ${claim.evidence.count}/${claim.evidence.denominator} (${claim.evidence.percentage}%)\n`;
      
      if (claim.evidence.zones?.length > 0) {
        prompt += `  - Zones: ${claim.evidence.zones.join(', ')}\n`;
      }
      
      if (claim.evidence.timestamps?.length > 0) {
        prompt += `  - Timestamps: ${claim.evidence.timestamps.slice(0, 3).map(t => 
          `R${t.round}: ${t.time}s`
        ).join(', ')}\n`;
      }
      
      if (claim.evidence.exampleEvents?.length > 0) {
        prompt += `  - Examples: ${claim.evidence.exampleEvents.map(e => 
          `R${e.round}: ${e.description}`
        ).join('; ')}\n`;
      }
      
      prompt += `Recommendation: ${claim.recommendation}\n\n`;
    }
  }
  
  prompt += `=== END CLAIMS ===\n\n`;
  prompt += `Now generate the scouting report following the exact format specified. Do not add any information not present in the claims above.`;
  
  return prompt;
}

/**
 * Generate scouting report from claim bundles
 * @param {Object} bundles - Claim bundles from pattern detector
 * @param {string} teamName - Team being scouted
 * @returns {Promise<Object>} Generated report and metadata
 */
async function generateReport(bundles, teamName) {
  try {
    const model = genAI.getGenerativeModel({ 
      model: MODEL_NAME,
      systemInstruction: SYSTEM_PROMPT
    });
    
    const prompt = formatClaimsForPrompt(bundles, teamName);
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Count claims for metadata
    const totalClaims = Object.values(bundles).reduce((sum, arr) => sum + arr.length, 0);
    const highConfidenceClaims = Object.values(bundles)
      .flat()
      .filter(c => c.confidence >= 0.8).length;
    
    return {
      success: true,
      report: text,
      metadata: {
        team: teamName,
        generatedAt: new Date().toISOString(),
        model: MODEL_NAME,
        totalClaims,
        highConfidenceClaims,
        categories: Object.keys(bundles).filter(k => bundles[k].length > 0)
      },
      claims: bundles // Include raw claims for transparency
    };
    
  } catch (error) {
    console.error('AI Writer Error:', error);
    
    return {
      success: false,
      error: error.message,
      fallback: generateFallbackReport(bundles, teamName)
    };
  }
}

/**
 * Generate a simple fallback report without LLM
 * Used when Gemini API fails
 */
function generateFallbackReport(bundles, teamName) {
  let report = `# Scouting Report: ${teamName}\n\n`;
  report += `*Generated from structured claims (LLM unavailable)*\n\n`;
  
  const categoryTitles = {
    attack_macro: '## ATTACK TENDENCIES',
    defense_macro: '## DEFENSE TENDENCIES',
    conditioning: '## CONDITIONING PATTERNS',
    player_tendency: '## PLAYER TENDENCIES',
    counter_strat: '## RECOMMENDED COUNTER-STRATEGIES'
  };
  
  for (const [category, title] of Object.entries(categoryTitles)) {
    const claims = bundles[category] || [];
    
    report += `${title}\n\n`;
    
    if (claims.length === 0) {
      report += `Insufficient data for this category.\n\n`;
      continue;
    }
    
    for (const claim of claims) {
      report += `**${claim.pattern.replace(/_/g, ' ').toUpperCase()}** (Confidence: ${Math.round(claim.confidence * 100)}%)\n`;
      report += `- Evidence: ${claim.evidence.count}/${claim.evidence.denominator} rounds (${claim.evidence.percentage}%)\n`;
      
      if (claim.evidence.rounds?.length > 0) {
        report += `- Rounds: ${claim.evidence.rounds.join(', ')}\n`;
      }
      
      report += `**Recommendation**: ${claim.recommendation}\n\n`;
    }
  }
  
  return report;
}

/**
 * Validate that a report only contains claims from the evidence
 * @param {string} report - Generated report text
 * @param {Object} bundles - Original claim bundles
 * @returns {Object} Validation result
 */
function validateReport(report, bundles) {
  const issues = [];
  
  // Check for prohibited phrases
  const prohibitedPhrases = [
    'likely', 'probably', 'suggests', 'appears', 'seems',
    'might', 'could be', 'presumably', 'it is assumed'
  ];
  
  for (const phrase of prohibitedPhrases) {
    if (report.toLowerCase().includes(phrase)) {
      issues.push(`Contains speculative language: "${phrase}"`);
    }
  }
  
  // Check that all mentioned percentages exist in claims
  const reportPercentages = report.match(/\d+%/g) || [];
  const claimPercentages = Object.values(bundles)
    .flat()
    .map(c => `${c.evidence.percentage}%`)
    .concat(Object.values(bundles)
      .flat()
      .map(c => `${Math.round(c.confidence * 100)}%`)
    );
  
  for (const pct of reportPercentages) {
    if (!claimPercentages.includes(pct)) {
      // Allow some flexibility for rounding
      const num = parseInt(pct);
      const hasClose = claimPercentages.some(cp => {
        const cpNum = parseInt(cp);
        return Math.abs(cpNum - num) <= 2;
      });
      
      if (!hasClose) {
        issues.push(`Percentage ${pct} not found in claims`);
      }
    }
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}

// ================== EXPORTS ==================

module.exports = {
  generateReport,
  generateFallbackReport,
  validateReport,
  formatClaimsForPrompt,
  SYSTEM_PROMPT
};
