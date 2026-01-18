import {useState} from "react";
import {useNavigate} from "react-router-dom";
import getTeams from "../services/getTeams.ts";
import type {Team} from "../types/Team.ts";

/**
 * Home Page
 */
const Home = () => {
    const navigate = useNavigate();
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

    const handleTeamSelect = (selectedTeam: Team) => {
        navigate(`/dashboard/${selectedTeam.id}`);
    };

    return (
        <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
            {/* Logo and Branding Section */}
            <div className="flex flex-col items-center mb-4 text-center">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/40">
                        <span className="text-white font-bold text-2xl uppercase italic">V</span>
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">
                        Valo<span className="text-blue-500">brain</span>
                    </h1>
                </div>
                <p className="text-gray-400 text-sm mb-2 font-medium tracking-wide">
                    Search for any team to unlock deep insights
                </p>
            </div>

            {/* Search Section */}
            <div className="relative w-full max-w-md">
                <div className="flex items-center bg-gray-900/50 backdrop-blur-md border border-gray-800 rounded-2xl pl-5 pr-2 py-2 focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500 transition-all shadow-2xl">
                    <svg 
                        className="w-5 h-5 text-gray-500 mr-3 shrink-0" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            fetchTeams(e.target.value);
                        }}
                        placeholder="Enter team name..."
                        className="bg-transparent border-none outline-none text-lg text-white w-full placeholder-gray-600 py-2"
                    />
                    <button 
                        className="ml-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl font-bold uppercase text-sm tracking-widest transition-all shadow-lg shadow-blue-900/20 active:scale-95 cursor-pointer"
                        onClick={() => {
                            if (teamsDropdown.length > 0) {
                                handleTeamSelect(teamsDropdown[0]);
                            }
                        }}
                    >
                        Search
                    </button>
                </div>

                {/* Reformatted Dropdown */}
                {teamsDropdown.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-3 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-50">
                        <div className="py-2">
                            {teamsDropdown.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => handleTeamSelect(t)}
                                    className="w-full flex items-center px-5 py-3 hover:bg-gray-800 transition-colors text-left group"
                                >
                                    {t.logoUrl ? (
                                        <img src={t.logoUrl} alt="" className="w-8 h-8 rounded-md mr-4 object-contain bg-black/40 p-1" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-md mr-4 bg-gray-800 flex items-center justify-center text-xs text-gray-500 font-bold uppercase">
                                            {t.name.substring(0, 1)}
                                        </div>
                                    )}
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-gray-200 group-hover:text-white transition-colors">{t.name}</span>
                                        <span className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-black">Pro Team</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;