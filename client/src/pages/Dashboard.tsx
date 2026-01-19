import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, Clock, BarChart3, FileText } from "lucide-react";
import MatchHistory from "../components/MatchHistory";
import AnalyticsBreakdown from "../components/AnalyticsBreakdown";
import getTeam from "../services/getTeam";
import getTeamStats from "../services/getTeamStats";
import getSeriesStats from "../services/getSeriesStats";
import type { Team } from "../types/Team";
import type { TeamStats } from "../types/TeamStats";
import type { SeriesStats } from "../types/SeriesStats";

interface Node {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
}

const Dashboard = () => {
    const { teamId } = useParams<{ teamId: string }>();
    const navigate = useNavigate();
    
    const [team, setTeam] = useState<Team | null>(null);
    const [activeTab, setActiveTab] = useState<"history" | "analytics" | "scouting">("history");
    const [stats, setStats] = useState<TeamStats | null>(null);
    const [allSeriesData, setAllSeriesData] = useState<SeriesStats[]>([]);
    const [isFetchingSeries, setIsFetchingSeries] = useState(false);
    const [nodes, setNodes] = useState<Node[]>([]);

    // Neural network nodes
    useEffect(() => {
        const initialNodes: Node[] = Array.from({ length: 30 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            vx: (Math.random() - 0.5) * 0.1,
            vy: (Math.random() - 0.5) * 0.1,
        }));
        setNodes(initialNodes);

        const interval = setInterval(() => {
            setNodes(prev => prev.map(node => {
                let newX = node.x + node.vx;
                let newY = node.y + node.vy;
                let newVx = node.vx;
                let newVy = node.vy;

                if (newX <= 0 || newX >= 100) newVx = -node.vx;
                if (newY <= 0 || newY >= 100) newVy = -node.vy;

                newX = Math.max(0, Math.min(100, newX));
                newY = Math.max(0, Math.min(100, newY));

                return { ...node, x: newX, y: newY, vx: newVx, vy: newVy };
            }));
        }, 50);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const fetchTeamData = async () => {
            if (teamId) {
                const teamData = await getTeam(teamId);
                setTeam(teamData);

                const statsData = await getTeamStats(teamId, "LAST_6_MONTHS");
                setStats(statsData);

                if (statsData?.aggregationSeriesIds) {
                    setIsFetchingSeries(true);
                    const seriesPromises = statsData.aggregationSeriesIds.map(id => getSeriesStats(id));
                    const results = await Promise.all(seriesPromises);
                    const validResults = results.filter((s): s is SeriesStats =>
                        s !== null &&
                        s.seriesState?.format !== undefined &&
                        Array.isArray(s.seriesState?.teams) &&
                        Array.isArray(s.seriesState?.games)
                    );
                    setAllSeriesData(validResults);
                    setIsFetchingSeries(false);
                }
            }
        };
        fetchTeamData();
    }, [teamId]);

    const tabs = [
        { id: "history", label: "Match History", icon: Clock },
        { id: "analytics", label: "Analytics", icon: BarChart3 },
        { id: "scouting", label: "Scouting Report", icon: FileText },
    ];

    return (
        <div className="relative min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-slate-900 text-white p-8 overflow-hidden">
            {/* Neural Network Background */}
            <svg className="absolute inset-0 w-full h-full opacity-30 pointer-events-none">
                <defs>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                
                {/* Draw connections */}
                {nodes.map((node, i) => 
                    nodes.slice(i + 1).map((otherNode, j) => {
                        const distance = Math.sqrt(
                            Math.pow(node.x - otherNode.x, 2) + Math.pow(node.y - otherNode.y, 2)
                        );
                        if (distance < 20) {
                            return (
                                <line
                                    key={`${i}-${j}`}
                                    x1={`${node.x}%`}
                                    y1={`${node.y}%`}
                                    x2={`${otherNode.x}%`}
                                    y2={`${otherNode.y}%`}
                                    stroke="#3b82f6"
                                    strokeWidth="1"
                                    opacity={1 - distance / 20}
                                    filter="url(#glow)"
                                />
                            );
                        }
                        return null;
                    })
                )}
                
                {/* Draw nodes */}
                {nodes.map(node => (
                    <circle
                        key={node.id}
                        cx={`${node.x}%`}
                        cy={`${node.y}%`}
                        r="3"
                        fill="#60a5fa"
                        filter="url(#glow)"
                    />
                ))}
            </svg>

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
                                            onClick={() => setActiveTab(tab.id as "history" | "analytics" | "scouting")}
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
                                />
                            )}
                            {activeTab === "scouting" && (
                                <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
                                    <p className="text-blue-200/60">Scouting reports are being generated for {team?.name}...</p>
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Dashboard;