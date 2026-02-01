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
    const [displayedText, setDisplayedText] = useState('');
    const fullText = 'Level up your Valorant IQ.';

    useEffect(() => {
        let index = 0;
        const typingInterval = setInterval(() => {
            if (index < fullText.length) {
                setDisplayedText(fullText.slice(0, index + 1));
                index++;
            } else {
                clearInterval(typingInterval);
            }
        }, 100); // Adjust speed here (lower = faster)

        return () => clearInterval(typingInterval);
    }, []);

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
    <div className="relative min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-slate-900 overflow-x-hidden">
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

      <div className="relative z-10 w-full">
        {/* Section 1: Hero & Search + Pro Players */}
        <section id="hero" className="min-h-screen flex flex-col items-center justify-center pt-20 px-6">
            <div className="max-w-7xl mx-auto w-full">
                {/* Header with Search */}
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="text-center mb-16"
                >
                  <div className="flex items-center justify-center gap-3 mb-6">
                    <h1 className="text-4xl md:text-6xl font-bold text-white" style={{ color: '#ffffff' }} >
                      {displayedText}
                      <span className="cursor-blink">|</span>
                    </h1>
                  </div>
                  <p className="text-lg md:text-xl mb-8 max-w-3xl mx-auto" style={{ color: '#ffffff' }}>
                    Discover how teams play, where they excel, and how to counter their strategies with AI-powered match analytics, just with a team name.
                  </p>
        
                  {/* Search Bar */}
                  <form onSubmit={handleSubmit} className="max-w-2xl mx-auto relative" ref={dropdownRef}>
                    <label htmlFor="team-search" className="sr-only">Search for a Valorant team</label>
                    <div
                        className="backdrop-blur-md bg-white/5 border-2 border-white/10 rounded-2xl p-3 hover:border-[#7f5af0] focus-within:border-[#7f5af0] focus-within:ring-2 focus-within:ring-[#7f5af0]/30 transition-all duration-300">
                      <div className="flex items-center gap-3">
                        <Search className="w-6 h-6 ml-3" style={{ color: '#7f5af0' }} aria-hidden="true"/>
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
                          className="px-6 md:px-8 py-3 font-semibold rounded-xl transition-all duration-300 hover:scale-105"
                          style={{ backgroundColor: '#7f5af0', color: '#ffffff' }}
                          aria-label="Search team"
                        >
                          Search
                        </button>
                      </div>
                    </div>
        
                    <p className="text-sm mt-4" style={{ color: '#ffffff' }}>
                      Try searching: Sentinels, Team Liquid, FNATIC, or any team name
                    </p>
        
                    {/* Dropdown */}
                    {isOpen && teamsDropdown.length > 0 && (
                        <div
                            id="team-results"
                            role="listbox"
                            className="absolute top-full left-0 right-0 mt-3 backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl overflow-hidden z-50">
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
                </motion.div>
        
                {/* Pro Players Carousel */}
                <div className="w-full">
                  <ProPlayersCarousel />
                </div>
            </div>
        </section>

        {/* Section 2: Feature Cards */}
        <section id="features" className="min-h-screen flex items-center py-24 px-6 scroll-mt-20">
            <div className="max-w-7xl mx-auto w-full">
                <FeaturedCards />
            </div>
        </section>

        {/* Section 3: How It Works */}
        <section id="how-it-works" className="min-h-screen flex items-center py-24 px-6 scroll-mt-20">
            <div className="max-w-7xl mx-auto w-full">
                <HowItWorks />
            </div>
        </section>

        {/* Section 4: Showcase */}
        <section id="showcase" className="min-h-screen flex items-center py-24 px-6 scroll-mt-20">
            <div className="max-w-7xl mx-auto w-full">
                <FeaturedImagesCarousel />
            </div>
        </section>

        {/* Section 5: CTA & Footer */}
        <section id="get-started" className="min-h-screen flex flex-col scroll-mt-20">
            <div className="flex-1 flex items-center py-24 px-6">
                <div className="max-w-7xl mx-auto w-full">
                    <CTASection />
                </div>
            </div>
            <Footer />
        </section>
      </div>
    </div>
  );
};

export default Home;