import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MatchHistory from "../components/MatchHistory";
import AnalyticsBreakdown from "../components/AnalyticsBreakdown";
import ScoutingReport from "../components/ScoutingReport";
import getTeam from "../services/getTeam";
import getTeamStats from "../services/getTeamStats";
import getSeriesStats from "../services/getSeriesStats";
import type { Team } from "../types/Team";
import type { TeamStats } from "../types/TeamStats";
import type { SeriesStats } from "../types/SeriesStats";

const Dashboard = () => {
    const { teamId } = useParams<{ teamId: string }>();
    const navigate = useNavigate();
    
    const [team, setTeam] = useState<Team | null>(null);
    const [activeTab, setActiveTab] = useState<"history" | "analytics" | "scouting">("history");
    const [stats, setStats] = useState<TeamStats | null>(null);
    const [allSeriesData, setAllSeriesData] = useState<SeriesStats[]>([]);
    const [isFetchingSeries, setIsFetchingSeries] = useState(false);

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
        { id: "history", label: "Match history" },
        { id: "analytics", label: "Analytics" },
        { id: "scouting", label: "Scouting report" },
    ];

    return (
        <div className="min-h-screen bg-gray-950 text-white px-12 py-10">
            {/* Back Button */}
            <button 
                onClick={() => navigate("/")}
                className="flex items-center text-gray-400 hover:text-white transition-colors mb-8 group"
            >
                <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span>
                back to search
            </button>

            {/* Team Ribbon Header */}
            <div className="relative mb-12">
                <div className="absolute inset-y-0 left-0 w-1 bg-blue-600 rounded-full"></div>
                <div className="pl-6">
                    <div className="flex items-center gap-3 mb-1">
                        {team?.logoUrl && <img src={team.logoUrl} alt="" className="w-8 h-8 object-contain" />}
                        <h1 className="text-4xl font-black uppercase tracking-tighter italic">
                            {team?.name || "Loading..."}
                        </h1>
                    </div>
                    <p className="text-gray-500 font-medium tracking-widest text-sm uppercase">
                        Team Intelligence Dashboard
                    </p>
                </div>
            </div>

            {isFetchingSeries ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-6">
                    <div className="relative">
                        <div className="h-16 w-16 animate-spin rounded-full border-4 border-blue-600/20 border-t-blue-600"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="h-8 w-8 animate-pulse rounded-full bg-blue-600/20"></div>
                        </div>
                    </div>
                    <div className="text-center">
                        <h3 className="text-lg font-black uppercase tracking-[0.2em] italic text-white">Aggregating Intelligence</h3>
                        <p className="text-sm text-gray-500 font-medium tracking-widest uppercase mt-2">
                            processing {stats?.aggregationSeriesIds?.length || 0} historical series...
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Navigation Bar */}
                    <div className="flex border-b border-gray-800 mb-8">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-8 py-4 text-sm font-bold uppercase tracking-widest transition-all relative ${
                                    activeTab === tab.id 
                                    ? "text-white" 
                                    : "text-gray-500 hover:text-gray-300"
                                }`}
                            >
                                {tab.label}
                                {activeTab === tab.id && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]"></div>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Dynamic Content Area */}
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                            <ScoutingReport
                                aggregationSeriesIds={stats?.aggregationSeriesIds || []}
                                teamName={team?.name}
                            />
                        )}
                        </div>
                    </>
            )}
        </div>
    );
};

export default Dashboard;