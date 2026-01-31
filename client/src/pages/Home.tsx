import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Search } from 'lucide-react';
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
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            if (teamName.trim().length >= 2) {
                const teams = await getTeams(teamName, controller.signal);
                setTeamsDropdown(teams);
                setIsOpen(teams.length > 0);
            } else {
                setTeamsDropdown([]);
                setIsOpen(false);
            }
        }, 300);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [teamName]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (teamName.trim() && teamsDropdown.length > 0) {
            handleTeamSelect(teamsDropdown[0]);
        }
    };

    const handleTeamSelect = (selectedTeam: Team) => {
        setIsOpen(false);
        navigate(`/dashboard/${selectedTeam.id}`);
    };



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

      <div className="relative z-10 w-full px-6 pt-20">
        {/* Header with Search */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-24"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <h1 className="text-6xl font-bold text-white" >Level up your Valorant IQ</h1>
          </div>
          <p className="text-xl text-blue-200 mb-8">
            Discover how teams play, where they excel, and how to counter their strategies with AI-powered match analytics and tactical reports, just with a team name.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto relative" ref={dropdownRef}>
            <label htmlFor="team-search" className="sr-only">Search for a Valorant team</label>
            <div
                className="backdrop-blur-md bg-white/5 border-2 border-white/10 rounded-2xl p-3 hover:border-blue-400/50 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-400/30 transition-all duration-300">
              <div className="flex items-center gap-3">
                <Search className="w-6 h-6 text-blue-400 ml-3" aria-hidden="true"/>
                <input
                    id="team-search"
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    onFocus={() => teamsDropdown.length > 0 && setIsOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setIsOpen(false);
                      } else if (e.key === 'ArrowDown' && teamsDropdown.length > 0) {
                        e.preventDefault();
                        setIsOpen(true);
                      }
                    }}
                    placeholder="Search for a team name..."
                    className="flex-1 bg-transparent text-white placeholder-slate-400 outline-none text-lg py-3"
                    aria-label="Search for a Valorant team"
                    aria-autocomplete="list"
                    aria-expanded={isOpen}
                    aria-controls="team-results"
                />
                <button
                  type="submit"
                  className="px-8 py-3 bg-blue-900 text-white font-semibold rounded-xl transition-all duration-300 hover:scale-105"
                  aria-label="Search team"
                >
                  Search
                </button>
              </div>
            </div>

            <p className="text-blue-200/70 text-sm mt-4">
              Try searching: Sentinels, Team Liquid, FNATIC, or any team name
            </p>

            {/* Dropdown */}
            {isOpen && teamsDropdown.length > 0 && (
                <div
                    id="team-results"
                    role="listbox"
                    className="absolute top-full left-0 right-0 mt-3 backdrop-blur-md bg-slate-900/95 border border-white/20 rounded-2xl shadow-2xl overflow-hidden z-50">
                  <div className="py-2">
                    {teamsDropdown.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            role="option"
                            aria-selected={false}
                            onClick={() => {
                              setTeamName(t.name);
                              handleTeamSelect(t);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleTeamSelect(t);
                              } else if (e.key === 'Escape') {
                                setIsOpen(false);
                              }
                            }}
                            className="w-full flex items-center px-5 py-3 min-h-[44px] hover:bg-white/10 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-400 transition-all duration-200 text-left group"
                        >
                          {t.logoUrl ? (
                              <img src={t.logoUrl} alt={`${t.name} logo`}
                                   className="w-8 h-8 rounded-md mr-4 object-contain bg-black/40 p-1"/>
                          ) : (
                              <div
                                  className="w-8 h-8 rounded-md mr-4 bg-white/10 backdrop-blur-sm flex items-center justify-center text-xs text-slate-300 font-bold uppercase"
                                  aria-hidden="true">
                                {t.name.substring(0, 1)}
                              </div>
                          )}
                          <span
                              className="text-base font-medium text-slate-200 group-hover:text-white transition-colors">
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
        <div className="mb-32">
          <ProPlayersCarousel />
        </div>

        {/* Feature Cards */}
        <div id="features" className="scroll-mt-24 mb-32">
          <FeaturedCards />
        </div>

        {/* How It Works */}
        <div id="how-it-works" className="scroll-mt-24 mb-32">
          <HowItWorks />
        </div>

        {/* Feature Images Carousel */}
        <div id="showcase" className="scroll-mt-24 mb-32">
          <FeaturedImagesCarousel />
        </div>

        {/* CTA Section */}
        <div id="get-started" className="scroll-mt-24 mb-32">
          <CTASection />
        </div>

      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Home;