import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const proPlayers = [
  { name: 'mas', team: 'Former FaZe Coach', image: 'https://owcdn.net/img/6243ca96e555d.png' },
  { name: 'p2', team: 'Leviatán', image: 'https://owcdn.net/img/63fd95c6a0d8b.png' },
  { name: 'p3', team: 'NRG', image: 'https://owcdn.net/img/64d4f0e0b7c74.png' },
  { name: 'p4', team: 'FNATIC', image: 'https://owcdn.net/img/641e51d76ad57.png' },
  { name: 'p5', team: 'LOUD', image: 'https://owcdn.net/img/627c554b1d30d.png' },
  { name: 'p6', team: 'FNATIC', image: 'https://owcdn.net/img/61c317d9c70a4.png' },
  { name: 'p7', team: 'Team Liquid', image: 'https://owcdn.net/img/61c31870ef077.png' },
  { name: 'p8', team: 'FNATIC', image: 'https://owcdn.net/img/63fd958f30c12.png' },
];

const ProPlayersCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const playersPerPage = 5;

  const handlePrev = () => {
    setCurrentIndex((prev) => {
      if (prev === 0) {
        return proPlayers.length - playersPerPage;
      }
      return prev - 1;
    });
  };

  const handleNext = () => {
    setCurrentIndex((prev) => {
      if (prev >= proPlayers.length - playersPerPage) {
        return 0;
      }
      return prev + 1;
    });
  };

  // Get visible players, wrapping around if necessary
  const getVisiblePlayers = () => {
    const players = [];
    for (let i = 0; i < playersPerPage; i++) {
      const index = (currentIndex + i) % proPlayers.length;
      players.push({ ...proPlayers[index], key: currentIndex + i });
    }
    return players;
  };

  const visiblePlayers = getVisiblePlayers();

  return (
    <div className="w-full py-2">
      {/* Header Text */}
      <p className="text-center text-slate-400 text-sm mb-8">
        Trusted by top and former Valorant professionals, coaches, and teams 
      </p>
      
      <div className="relative flex items-center justify-center gap-4">
        {/* Left Arrow */}
        <button
          onClick={handlePrev}
          className="text-white/50 hover:text-white transition-colors"
          aria-label="Previous players"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>

        {/* Players Container */}
        <div className="flex gap-8 justify-center items-center flex-1 max-w-3xl">
          {visiblePlayers.map((player) => (
            <div
              key={player.key}
              className="flex flex-col items-center gap-3 w-24"
            >
              {/* Player Image */}
              <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-white/10 bg-slate-900/50 backdrop-blur-sm">
                <img
                  src={player.image}
                  alt={player.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback if image fails to load
                    e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="%231e293b"/><text x="50%" y="50%" font-size="24" fill="%2394a3b8" text-anchor="middle" dy=".3em">' + player.name[0] + '</text></svg>';
                  }}
                />
              </div>
              
              {/* Player Name */}
              <div className="text-center">
                <p className="text-sm font-semibold text-white">{player.name}</p>
                <p className="text-xs text-blue-200/70">{player.team}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Right Arrow */}
        <button
          onClick={handleNext}
          className="text-white/50 hover:text-white transition-colors"
          aria-label="Next players"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      </div>
    </div>
  );
};

export default ProPlayersCarousel;
