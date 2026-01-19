import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Brain, BarChart3, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import getTeams from '../services/getTeams.ts';
import type { Team } from '../types/Team.ts';

interface Node {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/**
 * Home Page
 */
const Home = () => {
  const navigate = useNavigate();
  const [teamName, setTeamName] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [teamsDropdown, setTeamsDropdown] = useState<Team[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);

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

    // Animate nodes
    const interval = setInterval(() => {
      setNodes(prev => prev.map(node => {
        let newX = node.x + node.vx;
        let newY = node.y + node.vy;
        let newVx = node.vx;
        let newVy = node.vy;

        // Bounce off edges
        if (newX <= 0 || newX >= 100) newVx = -node.vx;
        if (newY <= 0 || newY >= 100) newVy = -node.vy;

        newX = Math.max(0, Math.min(100, newX));
        newY = Math.max(0, Math.min(100, newY));

        return { ...node, x: newX, y: newY, vx: newVx, vy: newVy };
      }));
    }, 50);

    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: 'Match History',
      description: 'Track and analyze all your team matches with detailed statistics',
    },
    {
      icon: <Search className="w-8 h-8" />,
      title: 'Analytics',
      description: 'Deep dive into performance metrics and tactical insights',
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: 'Scouting Report',
      description: 'Generate comprehensive reports on team strategies and patterns',
    },
  ];

  const matchImages = [
    '/DSC01465.JPG',
    '/DSC01201.JPG',
    '/DSC01331.JPG',
    '/DSC01412.JPG',
  ];

  // Auto-play carousel
  useEffect(() => {
    if (!isPlaying) return;
    
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % matchImages.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [matchImages.length, isPlaying]);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-12 px-6 overflow-hidden">
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

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header with Search */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <Brain className="w-12 h-12 text-blue-400" />
            <h1 className="text-6xl font-bold text-white">ValoBrain</h1>
          </div>
          <p className="text-xl text-blue-200 mb-8">
            Advanced Valorant Team Analytics & Intelligence
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto relative">
            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-3 hover:border-blue-400/50 transition-all duration-300">
              <div className="flex items-center gap-3">
                <Search className="w-6 h-6 text-blue-400 ml-3" />
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => {
                    setTeamName(e.target.value);
                    fetchTeams(e.target.value);
                  }}
                  placeholder="Enter team name..."
                  className="flex-1 bg-transparent text-white placeholder-blue-200/50 outline-none text-lg py-3"
                />
                <button
                  type="submit"
                  className="px-8 py-3 bg-blue-600 hover:bg-gradient-to-r hover:from-blue-600 hover:to-cyan-400 text-white font-semibold rounded-xl transition-all duration-300"
                >
                  Search
                </button>
              </div>
            </div>

            {/* Dropdown */}
            {teamsDropdown.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-3 bg-gray-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                <div className="py-2">
                  {teamsDropdown.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setTeamName(t.name);
                        handleTeamSelect(t);
                      }}
                      className="w-full flex items-center px-5 py-3 hover:bg-white/10 transition-colors text-left group"
                    >
                      {t.logoUrl ? (
                        <img src={t.logoUrl} alt="" className="w-8 h-8 rounded-md mr-4 object-contain bg-black/40 p-1" />
                      ) : (
                        <div className="w-8 h-8 rounded-md mr-4 bg-gray-800 flex items-center justify-center text-xs text-gray-400 font-bold uppercase">
                          {t.name.substring(0, 1)}
                        </div>
                      )}
                      <span className="text-sm font-semibold text-blue-200 group-hover:text-blue-100 transition-colors">
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
            <p className="text-blue-200/60 text-sm">
              Try searching: Sentinels, Team Liquid, FNATIC, or any team name
            </p>
          </motion.div>
        </motion.div>

        {/* Feature Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-16"
        >
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
              >
                <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-lg p-8 hover:border-blue-400/50 hover:bg-white/10 transition-all duration-300 h-full">
                  <div className="text-blue-400 mb-4 flex justify-center">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3 text-center">
                    {feature.title}
                  </h3>
                  <p className="text-blue-200/80 text-center">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Match Gallery Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <h2 className="text-2xl font-semibold text-white mb-6 text-center">Featured Matches</h2>
          <div className="relative max-w-3xl mx-auto">
            {/* Carousel Container */}
            <div className="relative overflow-hidden rounded-3xl backdrop-blur-md bg-white/10 border border-white/10 p-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="relative aspect-video"
                >
                  <img
                    src={matchImages[currentSlide]}
                    alt={`VALORANT Match ${currentSlide + 1}`}
                    className="w-full h-full object-cover rounded-2xl"
                    onError={(e) => {
                      e.currentTarget.src = 'https://via.placeholder.com/800x450?text=Match+Image';
                    }}
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Bottom Controls */}
            <div className="flex justify-center items-center gap-4 mt-6">
              {/* Dots Indicator */}
              <div className="flex gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full">
                {matchImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`transition-all duration-300 rounded-full ${
                      currentSlide === index 
                        ? 'bg-blue-400 w-12 h-2' 
                        : 'bg-white/30 hover:bg-white/50 w-2 h-2'
                    }`}
                  />
                ))}
              </div>

              {/* Play/Pause Button */}
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-full transition-all duration-300"
                aria-label={isPlaying ? 'Pause carousel' : 'Play carousel'}
              >
                {isPlaying ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Home;