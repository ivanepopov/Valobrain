import axios from "axios";
import type {TeamStats} from "../types/TeamStats.ts";
import {useEffect} from "react";
import Series from "../components/Series.tsx";

type Props = {
    teamName: string;
    setTeamName: (name: string) => void;
}

/**
 * Home Page
 */
const Home = ({ teamName, setTeamName }: Props) => {

    const fetchTestAPI = async () => {
        const response = await axios.get('http://localhost:8080/api/test')
        console.log(response.data)
    }

    const fetchTeamStatisticsAPI = async () => {
        const response = await axios.get('http://localhost:8080/api/teams/79/LAST_6_MONTHS')
        console.log(response.data)

        const data: TeamStats = response.data.data.teamStatistics;
        console.log(data['game']['won'])
    }

    useEffect(() => {
        fetchTestAPI().then(r => console.log(r));
    }, [])

    return (
        <div className="card">
            <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter a team name..."
            />
            <button onClick={() => fetchTeamStatisticsAPI()}>
                Click to fetch team statistics (check the console log)
            </button>
            {teamName && <Series seriesId="test" selectedTeam={teamName} />}
        </div>
    );
};

export default Home;