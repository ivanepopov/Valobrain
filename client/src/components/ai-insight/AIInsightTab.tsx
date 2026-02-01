import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield, Crosshair, Brain, Target, AlertCircle,
  FileText, Loader2, DollarSign, Users, MessageSquare, ChevronDown, ChevronUp, Key, Eye, EyeOff
} from 'lucide-react';
import axios from 'axios';
import { GlassBox } from '../ui/GlassBox';
import type { SeriesStats } from '../../types/SeriesStats';
import { capitalize } from '../../utils/formatters';
import type {
  TransformedSeries,
  ReportSections,
  AIInsightReportState,
  GenerationStage
} from '../../types/AIInsight';
import SeriesFilters from "../ui/SeriesFilters.tsx";

interface AIInsightTabProps {
  teamName: string;
  seriesData: SeriesStats[];
  seriesIds: string[];
  reportState: AIInsightReportState;
  setReportState: React.Dispatch<React.SetStateAction<AIInsightReportState>>;
}

export function AIInsightTab({ teamName, seriesData, seriesIds, reportState, setReportState }: AIInsightTabProps) {
  // Local UI state (not persisted across tab switches)
  const [selectedMap, setSelectedMap] = useState<string>('All');
  const [isSeriesCollapsed, setIsSeriesCollapsed] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Destructure persisted state from props
  const {
    data: reportData,
    isGenerating,
    generationStage,
    generationStatus,
    error,
    selectedSeries,
    selectedReportMap,
    jobId,
    userApiKey
  } = reportState;

  // Local state for showing/hiding API key
  const [showApiKey, setShowApiKey] = useState(false);

  // Helper to check if report has been generated
  const reportGenerated = reportData !== null;

  // Helper functions to update persisted state
  const setSelectedSeries = (series: TransformedSeries | null) => {
    setReportState(prev => ({ ...prev, selectedSeries: series }));
  };

  const setSelectedReportMap = (map: string) => {
    setReportState(prev => ({ ...prev, selectedReportMap: map }));
  };

  const setIsGenerating = (generating: boolean) => {
    setReportState(prev => ({ ...prev, isGenerating: generating }));
  };

  const setReportData = (data: ReportSections | null) => {
    setReportState(prev => ({ ...prev, data }));
  };

  const setError = (err: string | null) => {
    setReportState(prev => ({ ...prev, error: err }));
  };

  const setGenerationStatus = (status: string) => {
    setReportState(prev => ({ ...prev, generationStatus: status }));
  };

  const setGenerationStage = (stage: GenerationStage) => {
    setReportState(prev => ({ ...prev, generationStage: stage }));
  };

  const setJobId = (id: string | null) => {
    setReportState(prev => ({ ...prev, jobId: id }));
  };

  const setUserApiKey = (key: string) => {
    setReportState(prev => ({ ...prev, userApiKey: key }));
  };

  // Track which series have available match data
  const [availableSeries, setAvailableSeries] = useState<Record<string, boolean>>({});
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(true);

  // Track actual maps from JSONL files (not Statistics API)
  const [actualSeriesMaps, setActualSeriesMaps] = useState<Record<string, string[]>>({});
  const [isLoadingMaps, setIsLoadingMaps] = useState(false);

  // Check which series have downloadable match data
  useEffect(() => {
    const checkAvailability = async () => {
      if (seriesIds.length === 0) {
        setIsCheckingAvailability(false);
        return;
      }

      try {
        const response = await axios.post('/api/advanced-stats/check-availability', {
          seriesIds
        });
        setAvailableSeries(response.data.availability || {});
      } catch (err) {
        console.error('Failed to check series availability:', err);
        // On error, assume all are available to not block the UI
        const fallback: Record<string, boolean> = {};
        seriesIds.forEach(id => { fallback[id] = true; });
        setAvailableSeries(fallback);
      } finally {
        setIsCheckingAvailability(false);
      }
    };

    setIsCheckingAvailability(true);
    checkAvailability();
  }, [seriesIds]);

  // Transform SeriesStats[] to internal format
  const transformedSeries = useMemo((): TransformedSeries[] => {
    return seriesData.map((series, index) => {
      const state = series.seriesState;
      const ourTeam = state.teams.find(t => t.name === teamName);
      const opponent = state.teams.find(t => t.name !== teamName);

      // Calculate score
      const ourWins = state.games.filter(g =>
        g.teams.find(t => t.name === teamName)?.won
      ).length;
      const oppWins = state.games.length - ourWins;

      // Calculate days ago
      const startDate = new Date(state.startedAt);
      const now = new Date();
      const daysAgo = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      const seriesId = seriesIds[index] || state.games[0]?.id?.split('-')[0] || String(index);
      console.log(`[AI Insight] Series ${index}: ID=${seriesId}, opponent=${opponent?.name}, date=${startDate.toLocaleDateString()}`);

      return {
        id: seriesId,
        opponent: opponent?.name || 'Unknown',
        result: ourTeam?.won ? 'win' : 'loss',
        score: `${ourWins}-${oppWins}`,
        date: startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        dateValue: daysAgo,
        maps: state.games.map(g => g.map?.name || 'Unknown'),
      };
    });
  }, [seriesData, seriesIds, teamName]);

  const filteredSeries = useMemo(() => {
    let filtered = transformedSeries.filter(s => availableSeries[s.id] === true);
    if (selectedMap !== 'All') {
      filtered = filtered.filter(s => 
        s.maps.some(map => map.toLowerCase() === selectedMap.toLowerCase())
      );
    }

    return filtered;
  }, [transformedSeries, selectedMap, availableSeries]);

  // Helper to strip markdown formatting from text
  const stripMarkdown = (text: string): string => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')  // Bold **text**
      .replace(/\*(.*?)\*/g, '$1')       // Italic *text*
      .replace(/`(.*?)`/g, '$1')         // Code `text`
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Links [text](url)
      .trim();
  };

  // Parse markdown report into sections
  const parseMarkdownReport = (markdown: string): ReportSections => {
    const sections: ReportSections = {
      executiveSummary: '',
      attackProtocols: { defaultPhase: '', executePhase: '', tendencies: [] },
      defenseSetups: { standardSetups: '', aggressivePlays: '', tendencies: [] },
      pistolRounds: '',
      economyIntel: {
        forceBuyTendency: '',
        ecoRoundWinRate: '',
        operatorInvestment: '',
        bonusRoundStyle: '',
        economyExploit: '',
      },
      playerIntel: [],
      counterStrats: [],
      coachNote: '',
    };

    // Extract Executive Summary
    // Use \n---\n to match horizontal rules only, not table separators like | :--- |
    const execMatch = markdown.match(/## 📋 Executive Summary\s*([\s\S]*?)(?=\n---\n|\n---$|$)/);
    if (execMatch) sections.executiveSummary = stripMarkdown(execMatch[1].trim());

    // Extract Attack Protocols
    const attackMatch = markdown.match(/## ⚔️ Attack Protocols\s*([\s\S]*?)(?=## 🛡️|\n---\n|\n---$|$)/);
    if (attackMatch) {
      const attackSection = attackMatch[1];
      const defaultMatch = attackSection.match(/\*\*Default Phase.*?\*\*:?\s*([\s\S]*?)(?=\*\*Execute|Key Tendencies|\*\*Key|$)/i);
      const executeMatch = attackSection.match(/\*\*Execute Phase.*?\*\*:?\s*([\s\S]*?)(?=\*\*Key|Key Tendencies|$)/i);
      const tendenciesMatch = attackSection.match(/\*\*Key Tendencies:?\*\*:?\s*([\s\S]*?)$/i) ||
                              attackSection.match(/Key Tendencies:?\s*([\s\S]*?)$/i);

      if (defaultMatch) sections.attackProtocols.defaultPhase = stripMarkdown(defaultMatch[1].trim());
      if (executeMatch) sections.attackProtocols.executePhase = stripMarkdown(executeMatch[1].trim());
      if (tendenciesMatch) {
        sections.attackProtocols.tendencies = tendenciesMatch[1]
          .split('\n')
          .filter(line => line.trim().startsWith('-'))
          .map(line => stripMarkdown(line.replace(/^-\s*/, '').trim()))
          .filter(Boolean);
      }
    }

    // Extract Defense Setups
    const defenseMatch = markdown.match(/## 🛡️ Defense Setups\s*([\s\S]*?)(?=## 🔫|\n---\n|\n---$|$)/);
    if (defenseMatch) {
      const defenseSection = defenseMatch[1];
      // Match Standard Setups section - can be followed by bullet points
      const setupsMatch = defenseSection.match(/\*\*Standard Setups:?\*\*:?\s*([\s\S]*?)(?=\*\*Aggressive|Key Tendencies|\*\*Key|$)/i);
      const aggroMatch = defenseSection.match(/\*\*Aggressive.*?\*\*:?\s*([\s\S]*?)(?=\*\*Key|Key Tendencies|$)/i);
      const tendenciesMatch = defenseSection.match(/\*\*Key Tendencies:?\*\*:?\s*([\s\S]*?)$/i) ||
                              defenseSection.match(/Key Tendencies:?\s*([\s\S]*?)$/i);

      if (setupsMatch) {
        // Standard setups might be bullet points or paragraph
        const setupText = setupsMatch[1].trim();
        const bullets = setupText.split('\n').filter(line => line.trim().startsWith('-'));
        if (bullets.length > 0) {
          sections.defenseSetups.standardSetups = bullets
            .map(line => stripMarkdown(line.replace(/^-\s*/, '').trim()))
            .join('\n');
        } else {
          sections.defenseSetups.standardSetups = stripMarkdown(setupText);
        }
      }
      if (aggroMatch) sections.defenseSetups.aggressivePlays = stripMarkdown(aggroMatch[1].trim());
      if (tendenciesMatch) {
        sections.defenseSetups.tendencies = tendenciesMatch[1]
          .split('\n')
          .filter(line => line.trim().startsWith('-'))
          .map(line => stripMarkdown(line.replace(/^-\s*/, '').trim()))
          .filter(Boolean);
      }
    }

    // Extract Pistol Round Analysis
    const pistolMatch = markdown.match(/## 🔫 Pistol (?:Round Analysis|& Economy Analysis)\s*([\s\S]*?)(?=## 💰|## 🎯|\n---\n|\n---$|$)/);
    if (pistolMatch) sections.pistolRounds = stripMarkdown(pistolMatch[1].trim());

    // Extract Economy Intel
    const economyMatch = markdown.match(/## 💰 Economy Intel\s*([\s\S]*?)(?=## 🎯|\n---\n|\n---$|$)/);
    if (economyMatch) {
      const economySection = economyMatch[1];
      const forceMatch = economySection.match(/\*\*Force Buy Tendency:\*\*\s*(.+)/i);
      const ecoMatch = economySection.match(/\*\*Eco Round Win Rate:\*\*\s*(.+)/i);
      const opMatch = economySection.match(/\*\*Operator Investment:\*\*\s*(.+)/i);
      const bonusMatch = economySection.match(/\*\*Bonus Round Style:\*\*\s*(.+)/i);
      const exploitMatch = economySection.match(/\*\*Economy Exploit:\*\*\s*([\s\S]*?)(?=\n---\n|\n---$|$)/i);

      if (forceMatch) sections.economyIntel.forceBuyTendency = stripMarkdown(forceMatch[1].trim());
      if (ecoMatch) sections.economyIntel.ecoRoundWinRate = stripMarkdown(ecoMatch[1].trim());
      if (opMatch) sections.economyIntel.operatorInvestment = stripMarkdown(opMatch[1].trim());
      if (bonusMatch) sections.economyIntel.bonusRoundStyle = stripMarkdown(bonusMatch[1].trim());
      if (exploitMatch) sections.economyIntel.economyExploit = stripMarkdown(exploitMatch[1].trim());
    }

    // Extract Player Intel (table)
    // Use \n---\n to match horizontal rules only, not table separators like | :--- |
    const playerMatch = markdown.match(/## 🎯 Player Intel\s*([\s\S]*?)(?=## 🧠|\n---\n|\n---$|$)/);
    if (playerMatch) {
      const tableLines = playerMatch[1]
        .split('\n')
        .filter(line => {
          const trimmed = line.trim();
          // Must have pipes, must not be separator row, must not be header row
          return trimmed.includes('|') &&
                 !trimmed.includes(':---') &&
                 !trimmed.includes('---:') &&
                 !trimmed.match(/^\|\s*Player\s*\|/i) &&
                 trimmed.length > 3;
        });

      sections.playerIntel = tableLines.map(line => {
        const cols = line.split('|').map(c => c.trim()).filter(Boolean);
        return {
          player: stripMarkdown(cols[0] || ''),
          agent: stripMarkdown(cols[1] || ''),
          insight: stripMarkdown(cols[2] || ''),
        };
      }).filter(p => p.player && p.player.length > 0);
    }

    // Extract Counter-Strats
    const counterMatch = markdown.match(/## 🧠 Counter-Strat Playbook(?:.*)\s*([\s\S]*?)(?=## 📝|\n---\n|\n---$|$)/);
    if (counterMatch) {
      // Match each TIP block
      const tipBlocks = counterMatch[1].split(/>\s*\[!TIP\]/).filter(Boolean);
      sections.counterStrats = tipBlocks.map(block => {
        const priorityMatch = block.match(/>\s*\*\*Priority\s*(\d+):?\s*(.*?)\*\*/);
        const adviceLines = block.split('\n')
          .filter(line => line.startsWith('>') && !line.includes('Priority') && !line.includes('[!TIP]'))
          .map(line => line.replace(/^>\s*/, '').trim())
          .filter(Boolean);

        return {
          priority: parseInt(priorityMatch?.[1] || '0'),
          name: stripMarkdown(priorityMatch?.[2]?.trim() || ''),
          advice: stripMarkdown(adviceLines.join(' ')),
        };
      }).filter(s => s.priority > 0);
    }

    // Extract Coach's Note
    const coachMatch = markdown.match(/## 📝 Coach's Final Note\s*([\s\S]*?)(?=\n---\n|\n---$|$)/);
    if (coachMatch) sections.coachNote = stripMarkdown(coachMatch[1].trim());

    return sections;
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedSeries) {
      setActualSeriesMaps(prev => {
        const newMaps = { ...prev };
        delete newMaps[selectedSeries.id];
        return newMaps;
      });
      // Will be set to first map when maps are loaded
    }
  }, [selectedSeries?.id]);

  useEffect(() => {
    const fetchActualMaps = async () => {
      if (!selectedSeries) return;
      if (actualSeriesMaps[selectedSeries.id]) return;

      setIsLoadingMaps(true);
      try {
        console.log('[AI Insight] Fetching maps for series:', selectedSeries.id);
        const response = await axios.get(`/api/advanced-stats/${selectedSeries.id}/available-maps`);
        const maps = response.data.maps || [];
        console.log('[AI Insight] API returned maps:', maps);

        setActualSeriesMaps(prev => ({
          ...prev,
          [selectedSeries.id]: maps
        }));
        // Auto-select first map
        if (maps.length > 0) {
          setSelectedReportMap(maps[0]);
        }
      } catch (err) {
        console.error('[AI Insight] Failed to fetch actual maps:', err);
        setActualSeriesMaps(prev => ({
          ...prev,
          [selectedSeries.id]: selectedSeries.maps
        }));
        // Auto-select first map from fallback
        if (selectedSeries.maps.length > 0) {
          setSelectedReportMap(selectedSeries.maps[0]);
        }
      } finally {
        setIsLoadingMaps(false);
      }
    };

    fetchActualMaps();
  }, [selectedSeries, actualSeriesMaps]);

  const getSeriesMaps = (): string[] => {
    if (!selectedSeries) return [];
    return actualSeriesMaps[selectedSeries.id] || selectedSeries.maps;
  };

  // Start polling for a given job ID
  const startPolling = (pollJobId: string) => {
    // Clear any existing polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    // Timeout after 3 minutes
    const timeoutId = setTimeout(() => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      setError('Report generation timed out. Please try again.');
      setIsGenerating(false);
      setGenerationStatus('');
      setJobId(null);
    }, 180000);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const statusRes = await axios.get(`/api/scouting/jobs/${pollJobId}`);
        const job = statusRes.data;
        console.log('[AI Insight] Job status:', job.status, 'stages:', job.stages);

        // Update status message based on job stages
        if (job.stages?.writer === 'processing' || job.stages?.writer === 'completed') {
          setGenerationStage('writer');
          setGenerationStatus('Generating scouting report...');
        } else if (job.stages?.analyst === 'processing' || job.stages?.analyst === 'completed') {
          setGenerationStage('analyst');
          setGenerationStatus('AI analyzing tactical patterns...');
        } else if (job.stages?.digest === 'processing' || job.stages?.digest === 'completed') {
          setGenerationStage('digest');
          setGenerationStatus('Building match digest...');
        }

        if (job.status === 'completed') {
          clearTimeout(timeoutId);
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

          setGenerationStage('complete');

          // Parse the markdown report
          const markdown = job.result?.reportMarkdown || '';
          const parsed = parseMarkdownReport(markdown);
          setReportData(parsed);
          setIsGenerating(false);
          setGenerationStatus('');
          setGenerationStage('idle');
          setJobId(null);
        } else if (job.status === 'failed') {
          clearTimeout(timeoutId);
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setError(job.error || 'Report generation failed');
          setIsGenerating(false);
          setGenerationStatus('');
          setGenerationStage('idle');
          setJobId(null);
        }
      } catch (pollError) {
        console.error('[AI Insight] Polling error:', pollError);
      }
    }, 2000);
  };

  // Resume polling if we have an active job when component mounts
  useEffect(() => {
    if (isGenerating && jobId) {
      console.log('[AI Insight] Resuming polling for job:', jobId);
      startPolling(jobId);
    }
  });

  useEffect(() => {
      setSelectedSeries(null);
      setReportData(null);
      setError(null);
  }, [selectedMap]);

  const handleGenerateReport = async () => {
    if (!selectedSeries) return;

    setIsGenerating(true);
    setError(null);
    setGenerationStatus('Initiating report generation...');
    setGenerationStage('idle');

    try {
      // 1. Start report generation
      const mapParam = selectedReportMap !== 'all' ? `&map=${encodeURIComponent(selectedReportMap)}` : '';
      console.log('[AI Insight] Starting report for series:', selectedSeries.id, 'team:', teamName, 'map:', selectedReportMap);

      // Build headers with optional API key
      const headers: Record<string, string> = {};
      if (userApiKey) {
        headers['X-Gemini-API-Key'] = userApiKey;
      }

      const response = await axios.post(
        `/api/scouting/${selectedSeries.id}/report?team=${encodeURIComponent(teamName)}${mapParam}`,
        null,
        { headers }
      );
      const { jobId: newJobId } = response.data;
      console.log('[AI Insight] Job created:', newJobId);

      // Store jobId so polling can resume if user navigates away
      setJobId(newJobId);
      setGenerationStatus('Processing match data...');

      // 2. Start polling for completion
      startPolling(newJobId);

    } catch (err: any) {
      console.error('[AI Insight] Failed to start:', err);
      setError(err.response?.data?.error || 'Failed to start report generation');
      setIsGenerating(false);
      setGenerationStatus('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <SeriesFilters
          setSelectedMap={setSelectedMap}
          selectedMap={selectedMap}
      />

      {/* API Key Input Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05 }}
      >
        <GlassBox>
          <div className="flex items-center gap-3 mb-3">
            <Key className="w-5 h-5" style={{ color: '#7f5af0' }} />
            <span className="text-sm font-semibold" style={{ color: '#fffffe' }}>Gemini API Key</span>
            {userApiKey && (
              <span className="text-green-400 text-xs bg-green-400/10 px-2 py-0.5 rounded-full">
                Key provided
              </span>
            )}
          </div>
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={userApiKey}
              onChange={(e) => setUserApiKey(e.target.value)}
              placeholder="Enter your Gemini API key..."
              className="w-full px-4 py-2.5 pr-12 rounded-lg bg-white/5 border border-white/10 text-white transition-colors"
              style={{
                borderColor: 'rgba(255, 255, 255, 0.1)',
              }}
              onFocus={(e) => e.target.style.borderColor = 'rgba(127, 90, 240, 0.5)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors"
              style={{ color: '#7f5af0' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#9d7ff5'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#7f5af0'}
            >
              {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-xs mt-2" style={{ color: 'rgba(127, 90, 240, 0.6)' }}>
            Get a free API key from{' '}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="underline transition-colors"
              style={{ color: '#7f5af0' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#9d7ff5'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#7f5af0'}
            >
              Google AI Studio
            </a>
            . Your key is stored locally in your browser.
          </p>
        </GlassBox>
      </motion.div>

      {/* Recent/Filtered Series Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">
            {selectedMap === 'All'
              ? 'Available Series'
              : 'Filtered Series'}
          </h2>
          <button
            onClick={() => setIsSeriesCollapsed(!isSeriesCollapsed)}
            className="text-white/70 hover:text-white transition-colors"
            aria-label={isSeriesCollapsed ? "Expand series list" : "Collapse series list"}
          >
            {isSeriesCollapsed ? <ChevronDown className="w-6 h-6" /> : <ChevronUp className="w-6 h-6" />}
          </button>
        </div>
        
        {!isSeriesCollapsed && (
          <GlassBox>
            <div className="flex justify-start mb-3">
              <span className="text-sm" style={{ color: '#ffffff' }}>
                {isCheckingAvailability ? 'Checking...' : `${filteredSeries.length} series with match data`}
              </span>
            </div>
            {isCheckingAvailability ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mb-3" style={{ color: '#7f5af0' }} />
              <p style={{ color: '#fffffe' }}>Checking match data availability...</p>
            </div>
          ) : filteredSeries.length > 0 ? (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {filteredSeries.map((series) => (
                <button
                  key={series.id}
                  onClick={() => {
                    setSelectedSeries(series);
                    // Map selection will be set when maps are loaded
                    setReportData(null);
                    setError(null);
                  }}
                  className="w-full text-left p-4 rounded-lg border-2 transition-all duration-300"
                  style={{
                    borderColor: selectedSeries?.id === series.id ? '#7f5af0' : (series.result === 'win' ? 'rgba(74, 222, 128, 0.3)' : 'rgba(248, 113, 113, 0.3)'),
                    backgroundColor: selectedSeries?.id === series.id ? 'rgba(127, 90, 240, 0.1)' : (series.result === 'win' ? 'rgba(74, 222, 128, 0.05)' : 'rgba(248, 113, 113, 0.05)')
                  }}
                  onMouseEnter={(e) => {
                    if (selectedSeries?.id !== series.id) {
                      e.currentTarget.style.borderColor = series.result === 'win' ? 'rgba(74, 222, 128, 0.5)' : 'rgba(248, 113, 113, 0.5)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedSeries?.id !== series.id) {
                      e.currentTarget.style.borderColor = series.result === 'win' ? 'rgba(74, 222, 128, 0.3)' : 'rgba(248, 113, 113, 0.3)';
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-white font-bold">{teamName} vs {series.opponent}</span>
                      <span className={`
                        px-3 py-1 rounded-full text-sm font-bold
                        ${series.result === 'win'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                        }
                      `}>
                        {series.score}
                      </span>
                    </div>
                    <span className="text-sm" style={{ color: '#ffffff' }}>{series.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm" style={{ color: '#fffffe' }}>Maps:</span>
                    <div className="flex gap-2 flex-wrap">
                      {series.maps.map((map, i) => (
                        <span
                          key={i}
                          className="text-sm px-2 py-1 rounded"
                          style={{
                            backgroundColor: selectedMap === map ? 'rgba(127, 90, 240, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                            color: selectedMap === map ? '#fffffe' : '#BEABF7',
                            fontWeight: selectedMap === map ? '600' : '400'
                          }}
                        >
                          {capitalize(map)}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 mx-auto mb-3" style={{ color: 'rgba(127, 90, 240, 0.3)' }} />
              <p style={{ color: '#fffffe' }}>No series with downloadable match data</p>
              <p className="text-sm mt-2" style={{ color: '#7f5af0' }}>
                {transformedSeries.length > 0
                  ? 'Recent matches may not have public data available yet'
                  : 'No matches found for this team'}
              </p>
            </div>
          )}
        </GlassBox>
        )}
      </motion.div>

      {/* Generate Report Button */}
      {selectedSeries && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <GlassBox>
            <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">
                  Selected Series: vs {selectedSeries.opponent}
                </h3>
                <p className="text-sm" style={{ color: '#fffffe' }}>
                  {selectedSeries.date} • {selectedSeries.score}
                </p>
              </div>
              <div className="flex items-center gap-4">
                {error && (
                  <span className="text-red-400 text-sm">{error}</span>
                )}
                <button
                  onClick={handleGenerateReport}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300"
                  style={{
                    backgroundColor: isGenerating ? 'rgba(127, 90, 240, 0.3)' : '#7f5af0',
                    color: isGenerating ? 'rgba(255, 255, 255, 0.5)' : '#ffffff',
                    cursor: isGenerating ? 'not-allowed' : 'pointer'
                  }}
                  onMouseEnter={(e) => !isGenerating && (e.currentTarget.style.transform = 'scale(1.05)')}
                  onMouseLeave={(e) => !isGenerating && (e.currentTarget.style.transform = 'scale(1)')}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="w-5 h-5" />
                      Generate AI Report
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Map Selection */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-white text-sm">Generate report for:</span>
              {isLoadingMaps ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#7f5af0' }} />
                  <span className="text-sm" style={{ color: '#fffffe' }}>Loading maps...</span>
                </div>
              ) : (
                <div className="flex gap-2 flex-wrap">
                  {getSeriesMaps().map((map, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedReportMap(map)}
                      disabled={isGenerating}
                      className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-300"
                      style={{
                        backgroundColor: selectedReportMap === map ? '#7f5af0' : 'rgba(255, 255, 255, 0.05)',
                        color: '#ffffff',
                        opacity: isGenerating ? 0.5 : 1,
                        cursor: isGenerating ? 'not-allowed' : 'pointer'
                      }}
                      onMouseEnter={(e) => !isGenerating && selectedReportMap !== map && (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)')}
                      onMouseLeave={(e) => !isGenerating && selectedReportMap !== map && (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)')}
                    >
                      Map {i + 1}: {map}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6"
              >
                {/* Stage Labels */}
                <div className="flex justify-between mb-2">
                  {[
                    { key: 'digest', label: 'Building Digest' },
                    { key: 'analyst', label: 'AI Analysis' },
                    { key: 'writer', label: 'Writing Report' },
                  ].map((stage, index) => {
                    const stageOrder = ['digest', 'analyst', 'writer'];
                    const currentIndex = stageOrder.indexOf(generationStage);
                    const thisIndex = stageOrder.indexOf(stage.key);
                    const isActive = stage.key === generationStage;
                    const isComplete = currentIndex > thisIndex;

                    return (
                      <div key={stage.key} className="flex flex-col items-center flex-1">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center mb-2 transition-all duration-300"
                          style={{
                            backgroundColor: isComplete ? '#10b981' : isActive ? '#7f5af0' : 'rgba(255, 255, 255, 0.1)',
                            color: '#ffffff'
                          }}
                        >
                          {isComplete ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : isActive ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <span className="text-sm font-bold">{index + 1}</span>
                          )}
                        </div>
                        <span
                          className="text-xs font-medium transition-colors duration-300"
                          style={{
                            color: isActive ? '#7f5af0' : isComplete ? '#10b981' : 'rgba(127, 90, 240, 0.5)'
                          }}
                        >
                          {stage.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Progress Bar Track */}
                <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="absolute left-0 top-0 h-full rounded-full"
                    style={{ backgroundColor: '#7f5af0' }}
                    initial={{ width: '0%' }}
                    animate={{
                      width: generationStage === 'digest' ? '33%'
                        : generationStage === 'analyst' ? '66%'
                        : generationStage === 'writer' ? '90%'
                        : generationStage === 'complete' ? '100%'
                        : '5%'
                    }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>

                {/* Current Status */}
                <p className="text-center text-sm mt-3" style={{ color: '#fffffe' }}>
                  {generationStatus || 'Initializing...'}
                </p>
              </motion.div>
            )}
          </GlassBox>
        </motion.div>
      )}

      {/* Prompt to Select Series */}
      {!selectedSeries && filteredSeries.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <GlassBox>
            <div className="flex items-center gap-4 py-2">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(127, 90, 240, 0.1)' }}>
                <Brain className="w-6 h-6" style={{ color: '#7f5af0' }} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">
                  Select a Series to Generate AI Insight
                </h3>
                <p className="text-sm" style={{ color: '#fffffe' }}>
                  Click on any series above to select it, then generate a detailed AI-powered scouting report
                </p>
              </div>
            </div>
          </GlassBox>
        </motion.div>
      )}

      {/* Report Content - Only show after generation */}
      <AnimatePresence>
        {reportGenerated && selectedSeries && reportData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 1. Executive Summary - Full Width */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="lg:col-span-3"
              >
                <GlassBox>
                  <div className="flex items-center gap-3 mb-4">
                    <Brain className="w-6 h-6" style={{ color: '#7f5af0' }} />
                    <h2 className="text-2xl font-bold text-white">Executive Summary</h2>
                    <span className="text-sm px-3 py-1 rounded-full" style={{ color: '#fffffe', backgroundColor: 'rgba(127, 90, 240, 0.2)' }}>
                      vs {selectedSeries.opponent} • {selectedSeries.date}
                    </span>
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap" style={{ color: '#fffffe' }}>
                    {reportData.executiveSummary || 'No executive summary available.'}
                  </p>
                </GlassBox>
              </motion.div>

              {/* 2. Attack Protocols - 2 Columns */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="lg:col-span-2"
              >
                <GlassBox className="h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <Crosshair className="w-6 h-6 text-red-400" />
                    <h2 className="text-2xl font-bold text-white">Attack Protocols</h2>
                  </div>
                  <div className="space-y-4">
                    {reportData.attackProtocols.defaultPhase && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">Default Phase</h3>
                        <p style={{ color: '#fffffe' }}>{reportData.attackProtocols.defaultPhase}</p>
                      </div>
                    )}
                    {reportData.attackProtocols.executePhase && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">Execute Phase</h3>
                        <p style={{ color: '#fffffe' }}>{reportData.attackProtocols.executePhase}</p>
                      </div>
                    )}
                    {reportData.attackProtocols.tendencies.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">Key Tendencies</h3>
                        <ul className="space-y-2">
                          {reportData.attackProtocols.tendencies.map((tendency, i) => (
                            <li key={i} className="flex items-start gap-3">
                              <div className="mt-1 w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                              <p style={{ color: '#fffffe' }}>{tendency}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </GlassBox>
              </motion.div>

              {/* 3. Defense Setups - 1 Column */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="lg:col-span-1"
              >
                <GlassBox className="h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <Shield className="w-6 h-6 text-blue-400" />
                    <h2 className="text-2xl font-bold text-white">Defense Setups</h2>
                  </div>
                  <div className="space-y-4">
                    {reportData.defenseSetups.standardSetups && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">Standard Setups</h3>
                        <p className="text-sm" style={{ color: '#fffffe' }}>{reportData.defenseSetups.standardSetups}</p>
                      </div>
                    )}
                    {reportData.defenseSetups.aggressivePlays && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">Aggressive Plays</h3>
                        <p className="text-sm" style={{ color: '#fffffe' }}>{reportData.defenseSetups.aggressivePlays}</p>
                      </div>
                    )}
                    {reportData.defenseSetups.tendencies.length > 0 && (
                      <ul className="space-y-2 mt-3">
                        {reportData.defenseSetups.tendencies.slice(0, 4).map((tendency, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <div className="mt-1 w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                            <p className="text-sm" style={{ color: '#fffffe' }}>{tendency}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </GlassBox>
              </motion.div>

              {/* 4. Pistol Round Analysis - 1 Column */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="lg:col-span-1"
              >
                <GlassBox className="h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <Crosshair className="w-6 h-6 text-yellow-400" />
                    <h2 className="text-2xl font-bold text-white">Pistol Rounds</h2>
                  </div>
                  <p className="whitespace-pre-wrap" style={{ color: '#fffffe' }}>
                    {reportData.pistolRounds || 'No pistol round analysis available.'}
                  </p>
                </GlassBox>
              </motion.div>

              {/* 5. Economy Intel - 2 Columns */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.45 }}
                className="lg:col-span-2"
              >
                <GlassBox className="h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <DollarSign className="w-6 h-6 text-green-400" />
                    <h2 className="text-2xl font-bold text-white">Economy Intel</h2>
                  </div>
                  {(reportData.economyIntel.forceBuyTendency || reportData.economyIntel.economyExploit) ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        {reportData.economyIntel.forceBuyTendency && (
                          <div className="flex items-start gap-2">
                            <span className="text-blue-300 text-sm font-semibold min-w-[120px]">Force Buy:</span>
                            <span className="text-sm" style={{ color: '#fffffe' }}>{reportData.economyIntel.forceBuyTendency}</span>
                          </div>
                        )}
                        {reportData.economyIntel.ecoRoundWinRate && (
                          <div className="flex items-start gap-2">
                            <span className="text-blue-300 text-sm font-semibold min-w-[120px]">Eco Win Rate:</span>
                            <span className="text-sm" style={{ color: '#fffffe' }}>{reportData.economyIntel.ecoRoundWinRate}</span>
                          </div>
                        )}
                        {reportData.economyIntel.operatorInvestment && (
                          <div className="flex items-start gap-2">
                            <span className="text-blue-300 text-sm font-semibold min-w-[120px]">Op Investment:</span>
                            <span className="text-sm" style={{ color: '#fffffe' }}>{reportData.economyIntel.operatorInvestment}</span>
                          </div>
                        )}
                        {reportData.economyIntel.bonusRoundStyle && (
                          <div className="flex items-start gap-2">
                            <span className="text-blue-300 text-sm font-semibold min-w-[120px]">Bonus Style:</span>
                            <span className="text-sm" style={{ color: '#fffffe' }}>{reportData.economyIntel.bonusRoundStyle}</span>
                          </div>
                        )}
                      </div>
                      
                      {reportData.economyIntel.economyExploit && (
                        <div className="p-4 rounded-lg bg-green-400/10 border border-green-400/20 flex flex-col justify-center">
                          <span className="text-green-400 text-sm font-semibold block mb-2">💡 Exploit Strategy:</span>
                          <p className="text-sm italic" style={{ color: '#fffffe' }}>"{reportData.economyIntel.economyExploit}"</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p style={{ color: '#fffffe' }}>No economy intel available.</p>
                  )}
                </GlassBox>
              </motion.div>

              {/* 6. Player Intel - Full Width */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="lg:col-span-3"
              >
                <GlassBox className="h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <Users className="w-6 h-6 text-purple-400" />
                    <h2 className="text-2xl font-bold text-white">Player Intel</h2>
                  </div>
                  {reportData.playerIntel.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="text-left py-2 px-3 text-white font-semibold">Player</th>
                            <th className="text-left py-2 px-3 text-white font-semibold">Agent</th>
                            <th className="text-left py-2 px-3 text-white font-semibold">Key Insight</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.playerIntel.map((player, i) => {
                            const agentName = player.agent.trim();
                            const agentImage = `/src/assets/agents/${agentName}.png`;
                            
                            return (
                              <tr key={i} className="border-b border-white/5">
                                <td className="py-2 px-3 text-white font-semibold">{player.player}</td>
                                <td className="py-2 px-3">
                                  <img 
                                    src={agentImage} 
                                    alt={agentName}
                                    className="w-6 h-6 rounded"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                </td>
                                <td className="py-2 px-3" style={{ color: '#fffffe' }}>{player.insight}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-white">No player intel available.</p>
                  )}
                </GlassBox>
              </motion.div>

              {/* 7. Counter-Strat Playbook - Full Width */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="lg:col-span-3"
              >
                <GlassBox>
                  <div className="flex items-center gap-3 mb-4">
                    <Target className="w-6 h-6 text-orange-400" />
                    <h2 className="text-2xl font-bold text-white">Counter-Strat Playbook</h2>
                  </div>
                  {reportData.counterStrats.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {reportData.counterStrats.map((strat, i) => (
                        <div
                          key={i}
                          className="p-4 rounded-lg bg-orange-400/10 border border-orange-400/20"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded">
                              Priority {strat.priority}
                            </span>
                            <span className="text-white font-semibold">{strat.name}</span>
                          </div>
                          <p className="text-sm" style={{ color: '#fffffe' }}>{strat.advice}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-white">No counter-strategies available.</p>
                  )}
                </GlassBox>
              </motion.div>

              {/* 8. Coach's Final Note - Full Width */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                className="lg:col-span-3"
              >
                <GlassBox>
                  <div className="flex items-center gap-3 mb-4">
                    <MessageSquare className="w-6 h-6 text-cyan-400" />
                    <h2 className="text-2xl font-bold text-white">Coach's Final Note</h2>
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap" style={{ color: '#fffffe' }}>
                    {reportData.coachNote || 'No coach notes available.'}
                  </p>
                </GlassBox>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AIInsightTab;
