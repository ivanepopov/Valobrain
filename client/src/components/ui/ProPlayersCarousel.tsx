import { motion } from 'motion/react';
import masImage from '../../assets/people/mas.jpg';
import gucc107Image from '../../assets/people/gucc107.png';
import huynhImage from '../../assets/people/HUYNH.png';
import fireballopsImage from '../../assets/people/fireballops.png';
import runiImage from '../../assets/people/runi.png';
import kessImage from '../../assets/people/kess.png';

const proPlayers = [
  { name: 'mas', team: 'Former FaZe', image: masImage },
  { name: 'Gucc107', team: 'WVU', image: gucc107Image },
  { name: 'HUYNH', team: 'Former GenG', image: huynhImage },
  { name: 'FireBallOps', team: 'NBG', image: fireballopsImage },
  { name: 'runi', team: 'Former Cloud9', image: runiImage },
  { name: 'Kess', team: 'LYON', image: kessImage },
  { name: 'p7', team: 'Team Liquid', image: 'https://owcdn.net/img/61c31870ef077.png' },
  { name: 'p8', team: 'FNATIC', image: 'https://owcdn.net/img/63fd958f30c12.png' },
];

const ProPlayersCarousel = () => {
  // Duplicate the array to create seamless loop
  const duplicatedPlayers = [...proPlayers, ...proPlayers];

  return (
    <section className="w-full py-2 overflow-hidden" aria-label="Professional players using ValoBrain">
      {/* Header Text */}
      <p className="text-center text-xl mb-8" style={{ color: '#ffffff' }}>
        Trusted by professional Valorant players and coaches
      </p>
      
      <div className="relative">
        {/* Infinite scrolling container */}
        <motion.div
          className="flex gap-8"
          animate={{
            x: [0, -((proPlayers.length * 160))], // 160px = width (128px) + gap (32px) per item
          }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 20,
              ease: "linear",
            },
          }}
          aria-label="Scrolling list of professional players"
        >
          {duplicatedPlayers.map((player, index) => (
            <div
              key={index}
              className="flex flex-col items-center gap-3 w-32 flex-shrink-0"
            >
              {/* Player Image */}
              <div className="w-32 h-32 rounded-lg overflow-hidden border-2 border-white/10 bg-slate-900/50 backdrop-blur-sm">
                <img
                  src={player.image}
                  alt={`${player.name}, professional player from ${player.team}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback if image fails to load
                    e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" fill="%231e293b"/><text x="50%" y="50%" font-size="32" fill="%2394a3b8" text-anchor="middle" dy=".3em">' + player.name[0] + '</text></svg>';
                  }}
                />
              </div>
              
              {/* Player Name */}
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-200">{player.name}</p>
                <p className="text-xs text-gray-200">{player.team}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default ProPlayersCarousel;
