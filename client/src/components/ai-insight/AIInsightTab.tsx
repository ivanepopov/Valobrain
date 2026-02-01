import React, { useState, useMemo, useRef, useEffect } from 'react';
import {AnimatePresence, motion} from 'motion/react';
import axios from 'axios';
import type { SeriesStats } from '../../types/SeriesStats';
import type {
    TransformedSeries,
    ReportSections,
    AIInsightReportState,
    GenerationStage,
    CustomAIModel, AIAgent
} from '../../types/AIInsight';
import SeriesFilters from "../ui/SeriesFilters.tsx";
import AIModelFilter from "./AIModelFilter.tsx";
import AIModelModal from "./AIModelModal.tsx";
import ReportData from "./ReportData.tsx";
import FilteredSeries from "./FilteredSeries.tsx";
import GlassBox from "../ui/GlassBox.tsx";
import {FileText, Loader2, X} from "lucide-react";

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
        userApiKey,
        selectedAgent,
        selectedModel,
        customModels
    } = reportState;

    // Local state for showing/hiding API key
    const [showCustomModal, setShowCustomModal] = useState(false);
    const [customModelForm, setCustomModelForm] = useState<Omit<CustomAIModel, 'id'>>({
        name: '',
        endpoint: '',
        modelId: '',
        agent: 'openai'
    });

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

    const setSelectedModel = (model: string, agent?: AIAgent) => {
        setReportState(prev => ({
            ...prev,
            selectedModel: model,
            ...(agent ? { selectedAgent: agent } : {})
        }));
    };

    const addCustomModel = (model: Omit<CustomAIModel, 'id'>) => {
        const newModel: CustomAIModel = {
            ...model,
            id: `custom-${Date.now()}`
        };
        const updatedModels = [...customModels, newModel];
        setReportState(prev => ({
            ...prev,
            customModels: updatedModels,
            selectedModel: newModel.id,
            selectedAgent: newModel.agent
        }));
        // Save to localStorage for persistence
        localStorage.setItem('valobrain_custom_models', JSON.stringify(updatedModels));
    };

    // Load custom models on mount
    useEffect(() => {
        const saved = localStorage.getItem('valobrain_custom_models');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setReportState(prev => ({ ...prev, customModels: parsed }));
            } catch (e) {
                console.error('Failed to parse custom models from localStorage', e);
            }
        }
    }, []);

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
            economyIntel: { forceBuyTendency: '', ecoRoundWinRate: '', operatorInvestment: '', bonusRoundStyle: '', economyExploit: ''},
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

        // Extract Pistol Round Analysis (supports both old and new header formats)
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
        const counterMatch = markdown.match(/## 🧠 Counter-Strat Playbook[\s\S]*?\s*([\s\S]*?)(?=## 📝|\n---\n|\n---$|$)/);
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

        // Timeout after 10 minutes (some models are slow)
        const timeoutId = setTimeout(async () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }

            // Attempt to abort on backend to terminate AI request
            try {
                await axios.post(`/api/scouting/jobs/${pollJobId}/abort`);
            } catch (abortErr) {
                console.error('[AI Insight] Failed to abort timed out job:', abortErr);
                // Fallback to delete if abort fails or is not supported
                try {
                    await axios.delete(`/api/scouting/jobs/${pollJobId}`);
                } catch (delErr) {
                    console.error('[AI Insight] Failed to delete timed out job:', delErr);
                }
            }

            setError('Report generation timed out. Please try again.');
            setIsGenerating(false);
            setGenerationStatus('');
            setJobId(null);
        }, 600000);

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
            const agentParam = `&agent=${selectedAgent}`;

            // Determine model and endpoint
            let modelToUse = selectedModel;
            let endpointParam = '';
            const customModel = customModels.find(m => m.id === selectedModel);
            if (customModel) {
                modelToUse = customModel.modelId;
                if (customModel.endpoint) {
                    endpointParam = `&endpoint=${encodeURIComponent(customModel.endpoint)}`;
                }
            }
            const modelParam = `&model=${modelToUse}`;

            console.log('[AI Insight] Starting report for series:', selectedSeries.id, 'team:', teamName, 'map:', selectedReportMap, 'agent:', selectedAgent, 'model:', modelToUse, 'endpoint:', endpointParam);

            // Build headers with optional API key
            const headers: Record<string, string> = {};
            if (userApiKey) {
                const headerKey = selectedAgent === 'gemini' ? 'X-Gemini-API-Key' :
                    selectedAgent === 'openai' ? 'X-OpenAI-API-Key' :
                        'X-Claude-API-Key';
                headers[headerKey] = userApiKey;
            }

            const response = await axios.post(
                `/api/scouting/${selectedSeries.id}/report?team=${encodeURIComponent(teamName)}${mapParam}${agentParam}${modelParam}${endpointParam}`,
                null,
                { headers }
            );
            const { jobId: newJobId } = response.data;
            console.log('[AI Insight] Job created:', newJobId);

            // Store jobId so polling can resume if the user navigates away
            setJobId(newJobId);
            setGenerationStatus('Processing match data...');

            // 2. Start polling for completion
            startPolling(newJobId);

        } catch (err: unknown) {
            console.error('[AI Insight] Failed to start:', err);
            setError('Failed to start report generation');
            setIsGenerating(false);
            setGenerationStatus('');
        }
    };

    const handleCancelGeneration = async () => {
        if (!jobId) return;

        try {
            setGenerationStatus('Cancelling report...');
            await axios.delete(`/api/scouting/jobs/${jobId}`);

            // Stop polling
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }

            setIsGenerating(false);
            setGenerationStatus('');
            setGenerationStage('idle');
            setJobId(null);
        } catch (err: unknown) {
            console.error('[AI Insight] Failed to cancel report:', err);
            setError('Failed to cancel report generation properly.');
        }
    };

    return (
        <div className="space-y-6">
            {/* Filters Section */}
            <SeriesFilters
                setSelectedMap={setSelectedMap}
                selectedMap={selectedMap}
            />

            {/* Selection Section */}
            <AIModelFilter
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                customModels={customModels}
                setReportState={setReportState}
                userApiKey={userApiKey}
                setUserApiKey={setUserApiKey}
                selectedAgent={selectedAgent}
                setShowCustomModal={setShowCustomModal}
            />

            {/* Custom Model Modal */}
            {showCustomModal &&
                <AIModelModal
                    form={customModelForm}
                    setForm={setCustomModelForm}
                    onClose={() => setShowCustomModal(false)}
                    onAdd={addCustomModel}
                />
            }

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
                                <p className="text-sm" style={{ color: '#BEABF7' }}>
                                    {selectedSeries.date} • {selectedSeries.score}
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                {error && (
                                    <span className="text-red-400 text-sm">{error}</span>
                                )}
                                <div className="flex items-center gap-2">
                                    {isGenerating && (
                                        <button
                                            onClick={handleCancelGeneration}
                                            className="px-4 py-3 rounded-xl font-semibold bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-all duration-300 flex items-center gap-2"
                                        >
                                            <X className="w-5 h-5" />
                                            Cancel
                                        </button>
                                    )}
                                    <button
                                        onClick={handleGenerateReport}
                                        disabled={isGenerating}
                                        className={`
                      flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300
                      ${isGenerating
                                            ? 'text-white/50 cursor-not-allowed'
                                            : 'text-white hover:scale-105'
                                        }
                    `}
                                        style={{
                                            backgroundColor: '#7f5af0',
                                        }}
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
                        </div>

                        {/* Map Selection */}
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-purple-200 text-sm">Generate report for:</span>
                            {isLoadingMaps ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 text-purple-900 animate-spin" />
                                    <span className="text-purple-300 text-sm">Loading maps...</span>
                                </div>
                            ) : (
                                <div className="flex gap-2 flex-wrap">
                                    {getSeriesMaps().map((map, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setSelectedReportMap(map)}
                                            disabled={isGenerating}
                                            className={`
                        px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-300
                        ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                                            style={{
                                                backgroundColor: selectedReportMap === map ? '#7f5af0' : 'rgba(255, 255, 255, 0.05)',
                                                color: selectedReportMap === map ? '#fffffe' : '#94a1b2',
                                                boxShadow: selectedReportMap === map ? '0 10px 15px -3px rgba(127, 90, 240, 0.2)' : 'none'
                                            }}
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
                                                <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center mb-2 transition-all duration-300
                          ${isComplete
                                                    ? 'bg-green-500 text-white'
                                                    : isActive
                                                        ? 'bg-purple-900 text-white'
                                                        : 'bg-white/10 text-purple-300'
                                                }
                        `}>
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
                                                <span className={`
                          text-xs font-medium transition-colors duration-300
                          ${isActive ? 'text-purple-300' : isComplete ? 'text-green-400' : 'text-purple-400/50'}
                        `}>
                          {stage.label}
                        </span>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Progress Bar Track */}
                                <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                                    <motion.div
                                        className="absolute left-0 top-0 h-full bg-purple-900 rounded-full"
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
                                <p className="text-center text-purple-300 text-sm mt-3">
                                    {generationStatus || 'Initializing...'}
                                </p>
                            </motion.div>
                        )}
                    </GlassBox>
                </motion.div>
            )}

            {/* Report Content - Only show after generation */}
            <AnimatePresence>
                {reportGenerated && selectedSeries && reportData && (
                    <ReportData
                        reportData={reportData}
                        selectedSeries={selectedSeries}
                    />
                )}
            </AnimatePresence>

            {/* Recent/Filtered Series Section */}
            <FilteredSeries
                selectedMap={selectedMap}
                teamName={teamName}
                transformedSeriesCount={transformedSeries.length}
                isSeriesCollapsed={isSeriesCollapsed}
                setIsSeriesCollapsed={setIsSeriesCollapsed}
                isCheckingAvailability={isCheckingAvailability}
                filteredSeries={filteredSeries}
                selectedSeries={selectedSeries}
                setSelectedSeries={setSelectedSeries}
            />
        </div>
    );
}

export default AIInsightTab;
