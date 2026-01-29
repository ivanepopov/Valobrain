import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Brain } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Spline from '@splinetool/react-spline';
import getTeams from '../services/getTeams.ts';
import type { Team } from '../types/Team.ts';
import FeaturedImagesCarousel from '../components/ui/FeaturedImagesCarousel.tsx';
import NeuralNetworkBackground from '../components/ui/NeuralNetworkBackground.tsx';
import FeaturedCards from "../components/ui/FeaturedCards.tsx";
import Header from '../components/ui/Header.tsx';
import HowItWorks from '../components/ui/HowItWorks.tsx';
import Footer from '../components/ui/Footer.tsx';
import CTASection from '../components/ui/CTASection.tsx';
import ProPlayersCarousel from '../components/ui/ProPlayersCarousel.tsx';

/**
 * Home Page
 */
const Home = () => {
  const navigate = useNavigate();
  const [teamName, setTeamName] = useState('');
  const [teamsDropdown, setTeamsDropdown] = useState<Team[]>([]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (teamName.trim() && teamsDropdown.length > 0) {
      handleTeamSelect(teamsDropdown[0]);
    }
  };

  const handleTeamSelect = (selectedTeam: Team) => {
    navigate(`/dashboard/${selectedTeam.id}`);
  };

  async function fetchTeams(contains: string) {
    if (!contains) {
      setTeamsDropdown([]);
      return;
    }
    const teams = await getTeams(contains);
    setTeamsDropdown(teams);
  }



  return (
    <div className="relative min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-slate-900 py-12 px-6 overflow-hidden">
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

      <div className="relative z-10 max-w-6xl mx-auto pt-20">
        {/* Header with Search */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-24"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            {/* <Brain className="w-12 h-12 text-blue-400" /> */}
            <h1 className="text-6xl font-bold text-white" >Level up your Valorant IQ.</h1>
            {/* Grow your Valorant IQ with ValoBrain */}
          </div>
          <p className="text-xl text-blue-200 mb-8">
            Discover how teams play, where they excel, and how to counter their strategies with AI-powered match analytics and tactical reports, just with a team name.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto relative">
            <div
                className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-3 hover:border-blue-400/50 transition-all duration-300">
              <div className="flex items-center gap-3">
                <Search className="w-6 h-6 text-blue-400 ml-3"/>
                <input
                    type="text"
                    value={teamName}
                    onChange={(e) => {
                      setTeamName(e.target.value);
                      fetchTeams(e.target.value);
                    }}
                    placeholder="Search for a team name..."
                    className="flex-1 bg-transparent text-white placeholder-blue-200/50 outline-none text-lg py-3"
                />
                <button
                  type="submit"
                  className="px-8 py-3 bg-blue-900 hover:bg-white/5 text-white font-semibold rounded-xl transition-all duration-300 hover:scale-105"
                >
                  Search
                </button>
              </div>
            </div>
            
            <p className="text-blue-200/70 text-sm mt-4">
              Try searching: Sentinels, Team Liquid, FNATIC, or any team name
            </p>
              
            {/* Dropdown */}
            {teamsDropdown.length > 0 && (
                <div
                    className="absolute top-full left-0 right-0 mt-3 bg-gray-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="py-2">
                    {teamsDropdown.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setTeamName(t.name);
                              handleTeamSelect(t);
                            }}
                            className="w-full flex items-center px-5 py-3 hover:bg-white/10 transition-colors text-left group"
                        >
                          {t.logoUrl ? (
                              <img src={t.logoUrl} alt=""
                                   className="w-8 h-8 rounded-md mr-4 object-contain bg-black/40 p-1"/>
                          ) : (
                              <div
                                  className="w-8 h-8 rounded-md mr-4 bg-gray-800 flex items-center justify-center text-xs text-gray-400 font-bold uppercase">
                                {t.name.substring(0, 1)}
                              </div>
                          )}
                          <span
                              className="text-sm font-semibold text-blue-200 group-hover:text-blue-100 transition-colors">
                        {t.name}
                      </span>
                        </button>
                    ))}
                  </div>
                </div>
            )}
          </form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-4"
          >
            
          </motion.div>
        </motion.div>

        {/* Pro Players Carousel */}
        <div className="mb-16">
          <ProPlayersCarousel />
        </div>

        {/* Feature Cards */}
        <FeaturedCards />

        {/* How It Works */}
        <HowItWorks />

        {/* Feature Images Carousel */}
        <FeaturedImagesCarousel />

        {/* CTA Section */}
        <CTASection />

      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Home;