import { BrowserRouter, Link, Routes, Route } from 'react-router-dom'
import './App.css'
import {useState} from 'react'
import Home from "./pages/Home.tsx";
import AnalyticsBreakdown from "./pages/AnalyticsBreakdown.tsx";
import MatchHistory from "./pages/MatchHistory.tsx";
import type {Team} from "./types/Team.ts";
import getTeams from "./services/getTeams.ts";

function App() {
    const [team, setTeam] = useState<Team | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [teamsDropdown, setTeamsDropdown] = useState<Team[]>([]);

    async function fetchTeams(contains: string) {
        if (!contains) {
            setTeamsDropdown([]);
            return;
        }
        const teams = await getTeams(contains);
        setTeamsDropdown(teams);
    }

    return (
        <BrowserRouter>
            <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-8">
                    <span className="text-xl font-bold text-red-500 tracking-tighter">VALOBRAIN</span>
                    <div className="flex space-x-6">
                        <Link to="/" className="text-gray-300 hover:text-white transition-colors font-medium">Home</Link>
                        <Link to="/analytics" className="text-gray-300 hover:text-white transition-colors font-medium">Analytics</Link>
                        <Link to="/history" className="text-gray-300 hover:text-white transition-colors font-medium">Match History</Link>
                    </div>
                </div>

                <div className="relative w-72">
                    <div className="flex items-center bg-gray-800 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-red-500 transition-all">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                fetchTeams(e.target.value);
                            }}
                            placeholder="Search teams..."
                            className="bg-transparent border-none outline-none text-sm text-white w-full placeholder-gray-500"
                        />
                    </div>

                    {teamsDropdown.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-50">
                            {teamsDropdown.map((t) => (
                                <div
                                    key={t.id}
                                    onClick={() => {
                                        setTeam(t);
                                        setSearchTerm(t.name);
                                        setTeamsDropdown([]);
                                    }}
                                    className="flex items-center px-4 py-3 hover:bg-gray-700 cursor-pointer transition-colors border-b border-gray-700 last:border-b-0"
                                >
                                    {t.logoUrl && <img src={t.logoUrl} alt="" className="w-6 h-6 rounded-full mr-3 object-contain" />}
                                    <span className="text-sm text-gray-200">{t.name}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </nav>

            <main className="max-w-7xl mx-auto p-6">
                {team && (
                    <div className="mb-8 flex items-center p-4 bg-gray-800/50 rounded-xl border border-gray-700 animate-in fade-in slide-in-from-top-2">
                        <div 
                            className="w-2 h-12 rounded-full mr-4" 
                            style={{ backgroundColor: team.colorPrimary }}
                        />
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Active Selection</p>
                            <h2 className="text-2xl font-bold text-white">{team.name}</h2>
                        </div>
                    </div>
                )}

                <Routes>
                    <Route path="/" element={<Home team={team} />} />
                    <Route path="/analytics" element={<AnalyticsBreakdown team={team} />} />
                    <Route path="/history" element={<MatchHistory team={team} />} />
                </Routes>
            </main>
        </BrowserRouter>
    )
}

export default App
