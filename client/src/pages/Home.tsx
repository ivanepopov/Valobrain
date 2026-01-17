import axios from "axios";
import type {TeamStats} from "../types/TeamStats.ts";
import {useEffect} from "react";
import type {Team} from "../types/Team.ts";

type Props = {
    team: Team | null;
}

/**
 * Home Page
 */
const Home = ({ team }: Props) => {

    if (!team) return <div>Select a team</div>;

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
        <div className="flex flex-col gap-4">
            <button onClick={() => fetchTeamStatisticsAPI()}>
                Click to fetch team statistics (check the console log)
            </button>
        </div>
    );
};

export default Home;