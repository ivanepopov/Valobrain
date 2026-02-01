export interface TransformedSeries {
  id: string;
  opponent: string;
  result: 'win' | 'loss';
  score: string;
  date: string;
  dateValue: number;
  maps: string[];
}

export interface ReportSections {
  executiveSummary: string;
  attackProtocols: {
    defaultPhase: string;
    executePhase: string;
    tendencies: string[];
  };
  defenseSetups: {
    standardSetups: string;
    aggressivePlays: string;
    tendencies: string[];
  };
  pistolRounds: string;
  economyIntel: {
    forceBuyTendency: string;
    ecoRoundWinRate: string;
    operatorInvestment: string;
    bonusRoundStyle: string;
    economyExploit: string;
  };
  playerIntel: Array<{
    player: string;
    agent: string;
    insight: string;
  }>;
  counterStrats: Array<{
    priority: number;
    name: string;
    advice: string;
  }>;
  coachNote: string;
}

export type GenerationStage = 'idle' | 'digest' | 'analyst' | 'writer' | 'complete';

export type AIAgent = 'gemini' | 'openai' | 'claude' | 'ollama';

export interface CustomAIModel {
  id: string;
  name: string;
  endpoint: string;
  modelId: string;
  agent: AIAgent;
}

export interface AIInsightReportState {
  data: ReportSections | null;
  isGenerating: boolean;
  generationStage: GenerationStage;
  generationStatus: string;
  error: string | null;
  selectedSeries: TransformedSeries | null;
  selectedReportMap: string;
  jobId: string | null;
  userApiKey: string;
  selectedAgent: AIAgent;
  selectedModel: string;
  customModels: CustomAIModel[];
}

export const initialAIInsightReportState: AIInsightReportState = {
  data: null,
  isGenerating: false,
  generationStage: 'idle',
  generationStatus: '',
  error: null,
  selectedSeries: null,
  selectedReportMap: 'all',
  jobId: null,
  userApiKey: '',
  selectedAgent: 'gemini',
  selectedModel: 'gemini-3-pro-preview',
  customModels: []
};
