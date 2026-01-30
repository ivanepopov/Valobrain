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
  pistolEconomy: string;
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

export interface AIInsightReportState {
  data: ReportSections | null;
  isGenerating: boolean;
  generationStage: GenerationStage;
  generationStatus: string;
  error: string | null;
  selectedSeries: TransformedSeries | null;
  selectedReportMap: string;
  jobId: string | null;
}

export const initialAIInsightReportState: AIInsightReportState = {
  data: null,
  isGenerating: false,
  generationStage: 'idle',
  generationStatus: '',
  error: null,
  selectedSeries: null,
  selectedReportMap: 'all',
  jobId: null
};
