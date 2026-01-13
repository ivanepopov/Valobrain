import { BrowserRouter, Link, Routes, Route } from 'react-router-dom'
import './App.css'
import Home from "./pages/Home.tsx";
import AnalyticsBreakdown from "./pages/AnalyticsBreakdown.tsx";
import MatchHistory from "./pages/MatchHistory.tsx";

function App() {

  return (
    <BrowserRouter>
        <nav className="navbar">
            <Link to="/">Home</Link>
            <Link to="/analytics">Analytics</Link>
            <Link to="/history">Match History</Link>
        </nav>

        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/analytics" element={<AnalyticsBreakdown />} />
            <Route path="/history" element={<MatchHistory selectedTeam="Cloud9"/>} />
        </Routes>
    </BrowserRouter>
  )
}

export default App
