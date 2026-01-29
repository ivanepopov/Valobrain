import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, FileText, Calendar, TrendingUp, Sparkles } from "lucide-react";
import MatchHistory from "../components/match/MatchHistory";
import AnalyticsBreakdown from "../components/analytics/AnalyticsBreakdown";
import ScoutingReport from "../components/report/ScoutingReport";
import AIInsightTab from "../components/ai-insight/AIInsightTab";
import getTeam from "../services/getTeam";
import getTeamStats from "../services/getTeamStats";
import getSeriesStats from "../services/getSeriesStats";
import { getAdvancedSeriesStats } from "../services/getAdvancedSeriesStats";
import type { Team } from "../types/Team";
import type { TeamStats } from "../types/TeamStats";
import type { SeriesStats } from "../types/SeriesStats";
import type { AIInsightReportState } from "../types/AIInsight";
import { initialAIInsightReportState } from "../types/AIInsight";
import NeuralNetworkBackground from "../components/ui/NeuralNetworkBackground.tsx";

const Dashboard = () => {
    const { teamId } = useParams<{ teamId: string }>();
    const navigate = useNavigate();
    
    const [team, setTeam] = useState<Team | null>(null);
    const [activeTab, setActiveTab] = useState<"history" | "analytics" | "scouting" | "ai-insight">("history");
    const [stats, setStats] = useState<TeamStats | null>(null);
    const [allSeriesData, setAllSeriesData] = useState<SeriesStats[]>([]);
    const [validSeriesIds, setValidSeriesIds] = useState<string[]>([]);
    const [isFetchingSeries, setIsFetchingSeries] = useState(false);
    
    // Scouting states
    const [scoutingRawData, setScoutingRawData] = useState<any[]>([]);
    const [isScoutingLoading, setIsScoutingLoading] = useState(false);
    const [scoutingProgress, setScoutingProgress] = useState({ current: 0, total: 0, status: '' });
    const [scoutingError, setScoutingError] = useState<string | null>(null);

    // AI Insight states (lifted from AIInsightTab for persistence across tab switches)
    const [aiInsightReport, setAiInsightReport] = useState<AIInsightReportState>(initialAIInsightReportState);

    useEffect(() => {
        const fetchTeamData = async () => {
            if (teamId) {
                const teamData = await getTeam(teamId);
                if (!teamData) return;
                setTeam(teamData);

                const statsData = await getTeamStats(teamId, "LAST_6_MONTHS");
                if (!statsData) return;
                setStats(statsData);

                if (statsData?.aggregationSeriesIds) {
                    setIsFetchingSeries(true);
                    const seriesPromises = statsData.aggregationSeriesIds.map(id => getSeriesStats(id));
                    const results = await Promise.all(seriesPromises);

                    // Filter valid results AND keep track of corresponding IDs
                    const validResults: SeriesStats[] = [];
                    const matchingIds: string[] = [];

                    results.forEach((s, index) => {
                        if (s !== null &&
                            s.seriesState?.format !== undefined &&
                            Array.isArray(s.seriesState?.teams) &&
                            Array.isArray(s.seriesState?.games)) {
                            validResults.push(s);
                            matchingIds.push(statsData.aggregationSeriesIds[index]);
                        }
                    });

                    setAllSeriesData(validResults);
                    setValidSeriesIds(matchingIds);
                    setIsFetchingSeries(false);

                    // Start Scouting Background Fetch
                    await performBackgroundScouting(statsData.aggregationSeriesIds, teamData?.name);
                }
            }
        };

        const performBackgroundScouting = async (ids: string[], teamName?: string) => {
            const cacheKey = `scout_raw_cache_${teamName || 'unknown'}`;
            const cached = sessionStorage.getItem(cacheKey);
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    if (parsed.idHash === ids.join(',')) {
                        setScoutingRawData(parsed.data);
                        return;
                    }
                } catch (e) { sessionStorage.removeItem(cacheKey); }
            }

            setIsScoutingLoading(true);
            const fetched: any[] = [];
            for (let i = 0; i < ids.length; i++) {
                setScoutingProgress({ current: i + 1, total: ids.length, status: 'Downloading Match Data...' });
                try {
                    const data = await getAdvancedSeriesStats(ids[i], teamName);
                    if (data) fetched.push(data);
                } catch (err: any) {
                    if (err.status === 429) {
                        setScoutingProgress(prev => ({ ...prev, status: 'Rate limit hit. Cooling down...' }));
                        await new Promise(r => setTimeout(r, 8000));
                        i--; continue;
                    }
                }
                if (i < ids.length - 1) await new Promise(r => setTimeout(r, 4000));
            }
            
            if (fetched.length > 0) {
                setScoutingRawData(fetched);
                sessionStorage.setItem(cacheKey, JSON.stringify({ idHash: ids.join(','), data: fetched }));
            } else {
                setScoutingError("Scouting data unavailable.");
            }
            setIsScoutingLoading(false);
        };

        fetchTeamData();
    }, [teamId]);

    const tabs = [
        { id: "history", label: "Match History", icon: Calendar },
        { id: "analytics", label: "Analytics", icon: TrendingUp },
        { id: "scouting", label: "Scouting Report", icon: FileText },
        { id: "ai-insight", label: "AI Insight", icon: Sparkles },
    ];

    return (
        <div className="relative min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-slate-900 text-white p-8 overflow-hidden">
            {/* Neural Network Background */}
            <NeuralNetworkBackground />

            <div className="relative z-10 max-w-7xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-8"
                >
                    <button 
                        onClick={() => navigate("/")}
                        className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-4 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Search
                    </button>
                    <div className="flex items-center gap-4">
                        {team?.logoUrl && (
                            <img src={team.logoUrl} alt="" className="w-12 h-12 object-contain" />
                        )}
                        <div>
                            <h1 className="text-4xl font-bold text-white">{team?.name || "Loading..."}</h1>
                            <p className="text-blue-200">Team Dashboard</p>
                        </div>
                    </div>
                </motion.div>

                {isFetchingSeries ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-6">
                        <div className="relative">
                            <div className="h-16 w-16 animate-spin rounded-full border-4 border-blue-400/20 border-t-blue-400"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="h-8 w-8 animate-pulse rounded-full bg-blue-400/20"></div>
                            </div>
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-bold text-white">Aggregating Intelligence</h3>
                            <p className="text-sm text-blue-200/60 mt-2">
                                Processing {stats?.aggregationSeriesIds?.length || 0} historical series...
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Tabs */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="mb-6"
                        >
                            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-2 inline-flex gap-2">
                                {tabs.map((tab) => {
                                    const Icon = tab.icon;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id as "history" | "analytics" | "scouting" | "ai-insight")}
                                            className={`
                                                flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-300
                                                ${activeTab === tab.id 
                                                    ? 'bg-blue-900 text-white' 
                                                    : 'text-blue-200 hover:bg-white/5'
                                                }
                                            `}
                                        >
                                            <Icon className="w-5 h-5" />
                                            {tab.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>

                        {/* Tab Content */}
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            {activeTab === "history" && (
                                <MatchHistory 
                                    team={team} 
                                    stats={stats} 
                                    allSeriesData={allSeriesData}
                                    isLoadingSeries={isFetchingSeries}
                                />
                            )}
                            {activeTab === "analytics" && (
                                <AnalyticsBreakdown 
                                    team={team} 
                                    stats={stats}
                                    allSeriesData={allSeriesData}
                                    isLoadingSeries={isFetchingSeries}
                                />
                            )}
                            {activeTab === "scouting" && (
                                <ScoutingReport
                                    teamName={team?.name}
                                    rawData={scoutingRawData}
                                    isLoading={isScoutingLoading}
                                    progress={scoutingProgress}
                                    error={scoutingError}
                                />
                            )}
                            {activeTab === "ai-insight" && (
                                <AIInsightTab
                                    teamName={team?.name || ""}
                                    seriesData={allSeriesData}
                                    seriesIds={validSeriesIds}
                                    reportState={aiInsightReport}
                                    setReportState={setAiInsightReport}
                                />
                            )}
                        </motion.div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Dashboard;