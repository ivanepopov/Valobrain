import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, Calendar, TrendingUp, Sparkles } from "lucide-react";
import Spline from '@splinetool/react-spline';
import MatchHistory from "../components/match/MatchHistory";
import AnalyticsBreakdown from "../components/analytics/AnalyticsBreakdown";
import AIInsightTab from "../components/ai-insight/AIInsightTab";
import getTeam from "../services/getTeam";
import getTeamStats from "../services/getTeamStats";
import getSeriesStats from "../services/getSeriesStats";
import type { Team } from "../types/Team";
import type { TeamStats } from "../types/TeamStats";
import type { SeriesStats } from "../types/SeriesStats";
import type { AIInsightReportState } from "../types/AIInsight";
import { initialAIInsightReportState } from "../types/AIInsight";
import NeuralNetworkBackground from "../components/ui/NeuralNetworkBackground.tsx";
import Header from "../components/ui/Header.tsx";
import Footer from "../components/ui/Footer.tsx";
import { GlassBox } from "../components/ui/GlassBox.tsx";

const Dashboard = () => {
    const { teamId } = useParams<{ teamId: string }>();
    const navigate = useNavigate();

    const [team, setTeam] = useState<Team | null>(null);
    const [activeTab, setActiveTab] = useState<"history" | "analytics" | "ai-insight">("history");
    const [stats, setStats] = useState<TeamStats | null>(null);
    const [allSeriesData, setAllSeriesData] = useState<SeriesStats[]>([]);
    const [validSeriesIds, setValidSeriesIds] = useState<string[]>([]);
    const [isLoadingTeam, setIsLoadingTeam] = useState(true);
    const [isFetchingSeries, setIsFetchingSeries] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filter states (shared across Analytics and AI Insight tabs)
    const [selectedMap, setSelectedMap] = useState<string>("All");
    const [timeRange, setTimeRange] = useState<string>("all");

    // AI Insight states (lifted from AIInsightTab for persistence across tab switches)
    const [aiInsightReport, setAiInsightReport] = useState<AIInsightReportState>(initialAIInsightReportState);

    useEffect(() => {
        const controller = new AbortController();

        const fetchTeamData = async () => {
            if (!teamId) {
                setError("No team ID provided");
                setIsLoadingTeam(false);
                return;
            }

            try {
                setIsLoadingTeam(true);
                setError(null);

                const teamData = await getTeam(teamId, controller.signal);
                if (controller.signal.aborted) return;

                if (!teamData) {
                    setError("Team not found");
                    setIsLoadingTeam(false);
                    return;
                }
                setTeam(teamData);

                const statsData = await getTeamStats(teamId, "LAST_6_MONTHS", controller.signal);
                if (controller.signal.aborted) return;

                if (!statsData) {
                    setError("Failed to load team statistics");
                    setIsLoadingTeam(false);
                    return;
                }
                setStats(statsData);
                setIsLoadingTeam(false);

                if (statsData?.aggregationSeriesIds) {
                    setIsFetchingSeries(true);
                    const seriesPromises = statsData.aggregationSeriesIds.map(id =>
                        getSeriesStats(id, controller.signal)
                    );
                    const results = await Promise.all(seriesPromises);
                    if (controller.signal.aborted) return;

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
                }
            } catch (err) {
                if (controller.signal.aborted) return;
                console.error("Error fetching team data:", err);
                setError("Failed to load team data");
                setIsLoadingTeam(false);
            }
        };

        fetchTeamData();

        return () => {
            controller.abort();
        };
    }, [teamId]);

    const tabs = [
        { id: "history", label: "Match History", icon: Calendar },
        { id: "analytics", label: "Analytics", icon: TrendingUp },
        { id: "ai-insight", label: "AI Insight", icon: Sparkles },
    ];

    // Early return for loading state
    if (isLoadingTeam) {
        return (
            <div className="relative min-h-screen bg-linear-to-b from-slate-950 via-blue-950 to-slate-900 text-white p-8 overflow-hidden">
                <NeuralNetworkBackground />
                <div className="relative z-10 flex flex-col items-center justify-center min-h-[60vh] space-y-6">
                    <div className="relative">
                        <div className="h-16 w-16 animate-spin rounded-full border-4 border-blue-400/20 border-t-blue-400"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="h-8 w-8 animate-pulse rounded-full bg-blue-400/20"></div>
                        </div>
                    </div>
                    <div className="text-center">
                        <h3 className="text-lg font-bold text-white">Loading Team Data</h3>
                        <p className="text-sm text-blue-200/60 mt-2">
                            Retrieving team information...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Early return for error state
    if (error || !team || !stats) {
        return (
            <div className="relative min-h-screen bg-linear-to-b from-slate-950 via-blue-950 to-slate-900 text-white p-8 overflow-hidden">
                <NeuralNetworkBackground />
                <div className="relative z-10 max-w-7xl mx-auto">
                    <button
                        onClick={() => navigate("/")}
                        className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-4 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Search
                    </button>
                    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                        <div className="text-red-400 text-6xl">⚠️</div>
                        <h2 className="text-2xl font-bold text-white">{error || "Team Not Found"}</h2>
                        <p className="text-blue-200">Please try searching for a different team.</p>
                        <button
                            onClick={() => navigate("/")}
                            className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-colors"
                        >
                            Return to Search
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Now we can safely render - team and stats are guaranteed to be non-null
    return (
        <div className="relative min-h-screen bg-linear-to-b from-slate-950 via-blue-950 to-slate-900 text-white py-12 px-6 overflow-hidden">
            {/* Header */}
            <Header />

            {/* Spline 3D Background */}
            <div className="fixed inset-0 z-0 opacity-60 pointer-events-none">
                <Spline
                    scene="https://prod.spline.design/Exoc-c1KvXHUx7bJ/scene.splinecode"
                />
            </div>

            {/* Neural Network Background */}
            <NeuralNetworkBackground />

            <div className="relative z-10 max-w-7xl mx-auto pt-20">
                {/* Header with Back Button and Tabs on Same Row */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-8"
                >
                    {/* Row 1: Back Button + Team Info + Tabs */}
                    <div className="flex items-center justify-between mb-4">
                        {/* Left: Back Button + Team Info */}
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => navigate("/")}
                                className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-blue-400 hover:text-blue-300 transition-all duration-300"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                            
                            <div className="flex items-center gap-3">
                                {team.logoUrl && (
                                    <img src={team.logoUrl} alt={`${team.name} logo`} className="w-10 h-10 object-contain" />
                                )}
                                <div>
                                    <h1 className="text-2xl font-bold text-white">{team.name}</h1>
                                    <p className="text-sm text-blue-200">Team Dashboard</p>
                                </div>
                            </div>
                        </div>

                        {!isFetchingSeries && (
                            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-2 inline-flex gap-2">
                                {tabs.map((tab) => {
                                    const Icon = tab.icon;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id as "history" | "analytics" | "ai-insight")}
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
                        )}
                    </div>

                    {/* Row 2: Filter Section (full width) */}
                    <div className="flex items-start justify-end gap-6">
                        {/* Compact Filter Section (only for Analytics and AI Insight) */}
                        {!isFetchingSeries && (activeTab === "analytics" || activeTab === "ai-insight") && (
                            <div className="w-full">
                                <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-lg px-4 py-2.5">
                                    {/* Map Filter */}
                                    <div className={activeTab === "analytics" ? "mb-4" : ""}>
                                        <label className="text-blue-200 text-sm mb-2 block">Filter by Map</label>
                                        <div className="flex gap-2 flex-wrap">
                                            {['All', 'Abyss', 'Ascent', 'Bind', 'Breeze', 'Corrode', 'Fracture', 'Haven', 'Icebox', 'Lotus', 'Pearl', 'Split', 'Sunset'].map((map) => (
                                                <button
                                                    key={map}
                                                    onClick={() => setSelectedMap(map)}
                                                    className={`
                                                        px-2.5 py-1 rounded text-sm font-semibold transition-all duration-300
                                                        ${selectedMap === map
                                                            ? 'bg-blue-900 text-white'
                                                            : 'bg-white/5 text-blue-200 hover:bg-white/10'
                                                        }
                                                    `}
                                                >
                                                    {map}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Timeframe Filter (only for Analytics) */}
                                    {activeTab === "analytics" && (
                                        <div>
                                            <label className="text-blue-200 text-sm mb-2 block">Filter by Timeframe</label>
                                            <div className="flex gap-2">
                                                {['All', 'Last 30 Days', 'Last 60 Days', 'Last 90 Days'].map((timeframe) => (
                                                    <button
                                                        key={timeframe}
                                                        onClick={() => setTimeRange(
                                                            timeframe === 'All' ? 'all' :
                                                            timeframe === 'Last 30 Days' ? '30' :
                                                            timeframe === 'Last 60 Days' ? '60' : '90'
                                                        )}
                                                        className={`
                                                            px-2.5 py-1 rounded text-sm font-semibold transition-all duration-300
                                                            ${(timeframe === 'All' && timeRange === 'all') ||
                                                              (timeframe === 'Last 30 Days' && timeRange === '30') ||
                                                              (timeframe === 'Last 60 Days' && timeRange === '60') ||
                                                              (timeframe === 'Last 90 Days' && timeRange === '90')
                                                                ? 'bg-blue-900 text-white'
                                                                : 'bg-white/5 text-blue-200 hover:bg-white/10'
                                                            }
                                                        `}
                                                    >
                                                        {timeframe}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
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
                                Processing {stats.aggregationSeriesIds?.length || 0} historical series...
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
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
                                    allSeriesData={allSeriesData}
                                    isLoadingSeries={isFetchingSeries}
                                />
                            )}
                            {activeTab === "analytics" && (
                                <AnalyticsBreakdown 
                                    team={team}
                                    allSeriesData={allSeriesData}
                                    isLoadingSeries={isFetchingSeries}
                                    selectedMap={selectedMap}
                                    timeRange={timeRange}
                                />
                            )}
                            {activeTab === "ai-insight" && (
                                <AIInsightTab
                                    teamName={team.name}
                                    seriesData={allSeriesData}
                                    seriesIds={validSeriesIds}
                                    reportState={aiInsightReport}
                                    setReportState={setAiInsightReport}
                                    selectedMap={selectedMap}
                                />
                            )}
                        </motion.div>
                    </>
                )}
            </div>

            {/* Footer */}
            <Footer />
        </div>
    );
};

export default Dashboard;