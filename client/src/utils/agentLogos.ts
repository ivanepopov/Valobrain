/**
 * Agent Logo Utility
 * Maps Valorant agent names to their logo images
 */

// Import all agent logos
import Astra from '../assets/agents/Astra.png';
import Breach from '../assets/agents/Breach.png';
import Brimstone from '../assets/agents/Brimstone.png';
import Chamber from '../assets/agents/Chamber.png';
import Clove from '../assets/agents/Clove.png';
import Cypher from '../assets/agents/Cypher.png';
import Deadlock from '../assets/agents/Deadlock.png';
import Fade from '../assets/agents/Fade.png';
import Gekko from '../assets/agents/Gekko.png';
import Harbor from '../assets/agents/Harbor.png';
import Iso from '../assets/agents/Iso.png';
import Jett from '../assets/agents/Jett.png';
import KAYO from '../assets/agents/KAYO.png';
import Killjoy from '../assets/agents/Killjoy.png';
import Neon from '../assets/agents/Neon.png';
import Omen from '../assets/agents/Omen.png';
import Phoenix from '../assets/agents/Phoenix.png';
import Raze from '../assets/agents/Raze.png';
import Reyna from '../assets/agents/Reyna.png';
import Sage from '../assets/agents/Sage.png';
import Skye from '../assets/agents/Skye.png';
import Sova from '../assets/agents/Sova.png';
import Tejo from '../assets/agents/Tejo.png';
import Veto from '../assets/agents/Veto.png';
import Viper from '../assets/agents/Viper.png';
import Vyse from '../assets/agents/Vyse.png';
import Waylay from '../assets/agents/Waylay.png';
import Yoru from '../assets/agents/Yoru.png';

// Map agent names (lowercase) to their logo imports
const agentLogos: Record<string, string> = {
    'astra': Astra,
    'breach': Breach,
    'brimstone': Brimstone,
    'chamber': Chamber,
    'clove': Clove,
    'cypher': Cypher,
    'deadlock': Deadlock,
    'fade': Fade,
    'gekko': Gekko,
    'harbor': Harbor,
    'iso': Iso,
    'jett': Jett,
    'kay/o': KAYO,
    'kayo': KAYO,
    'kay-o': KAYO,
    'killjoy': Killjoy,
    'neon': Neon,
    'omen': Omen,
    'phoenix': Phoenix,
    'raze': Raze,
    'reyna': Reyna,
    'sage': Sage,
    'skye': Skye,
    'sova': Sova,
    'tejo': Tejo,
    'veto': Veto,
    'viper': Viper,
    'vyse': Vyse,
    'waylay': Waylay,
    'yoru': Yoru,
};

/**
 * Get the logo path for an agent by name (case-insensitive)
 * @param agentName - The name of the agent
 * @returns The path to the agent's logo, or undefined if not found
 */
export function getAgentLogo(agentName: string): string | undefined {
    const normalizedName = agentName.toLowerCase().trim();
    return agentLogos[normalizedName];
}

export default agentLogos;
