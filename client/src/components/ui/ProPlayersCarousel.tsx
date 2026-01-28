import { useState } from 'react';

const proPlayers = [
  { name: 'TenZ', team: 'Sentinels', image: 'https://owcdn.net/img/6243ca96e555d.png' },
  { name: 'aspas', team: 'Leviatán', image: 'https://owcdn.net/img/63fd95c6a0d8b.png' },
  { name: 'Demon1', team: 'NRG', image: 'https://owcdn.net/img/64d4f0e0b7c74.png' },
  { name: 'Chronicle', team: 'FNATIC', image: 'https://owcdn.net/img/641e51d76ad57.png' },
  { name: 'Less', team: 'LOUD', image: 'https://owcdn.net/img/627c554b1d30d.png' },
  { name: 'Derke', team: 'FNATIC', image: 'https://owcdn.net/img/61c317d9c70a4.png' },
  { name: 'yay', team: 'Team Liquid', image: 'https://owcdn.net/img/61c31870ef077.png' },
  { name: 'Leo', team: 'FNATIC', image: 'https://owcdn.net/img/63fd958f30c12.png' },
];

const ProPlayersCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const playersPerPage = 5;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? proPlayers.length - playersPerPage : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev >= proPlayers.length - playersPerPage ? 0 : prev + 1));
  };

  const visiblePlayers = proPlayers.slice(currentIndex, currentIndex + playersPerPage);

  return (
    <div className="w-full py-2">
      {/* Header Text */}
      <p className="text-center text-slate-400 text-sm mb-8">
        Trusted by top Valorant professionals, coaches, and teams worldwide
      </p>
      
      <div className="relative flex items-center justify-center">
        {/* Players Container */}
        <div className="flex gap-8 justify-center items-center flex-1 max-w-3xl">
          {visiblePlayers.map((player, index) => (
            <div
              key={currentIndex + index}
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
      </div>
    </div>
  );
};

export default ProPlayersCarousel;
