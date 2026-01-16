import { BrowserRouter, Link, Routes, Route } from 'react-router-dom'
import './App.css'
import { useState } from 'react'
import Home from "./pages/Home.tsx";
import AnalyticsBreakdown from "./pages/AnalyticsBreakdown.tsx";
import MatchHistory from "./pages/MatchHistory.tsx";

function App() {
  const [teamName, setTeamName] = useState<string>("");

  return (
    <BrowserRouter>
        <nav className="navbar">
            <Link to="/">Home</Link>
            <Link to="/analytics">Analytics</Link>
            <Link to="/history">Match History</Link>
        </nav>

        <Routes>
            <Route path="/" element={<Home teamName={teamName} setTeamName={setTeamName} />} />
            <Route path="/analytics" element={<AnalyticsBreakdown teamName={teamName} />} />
            <Route path="/history" element={<MatchHistory teamName={teamName} />} />
        </Routes>
    </BrowserRouter>
  )
}

export default App
