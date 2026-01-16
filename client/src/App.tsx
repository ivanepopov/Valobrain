import { BrowserRouter, Link, Routes, Route } from 'react-router-dom'
import './App.css'
import { useState } from 'react'
import Home from "./pages/Home.tsx";
import AnalyticsBreakdown from "./pages/AnalyticsBreakdown.tsx";
import MatchHistory from "./pages/MatchHistory.tsx";
import SearchBar from "./components/SearchBar.tsx";
import Series from "./components/Series.tsx";

function App() {
  const [searchedTeam, setSearchedTeam] = useState<string>("");

  const handleSearch = (searchValue: string) => {
    console.log("Searching for:", searchValue);
    setSearchedTeam(searchValue);
  };

  return (
    <BrowserRouter>
        <nav className="navbar">
            <Link to="/">Home</Link>
            <Link to="/analytics">Analytics</Link>
            <Link to="/history">Match History</Link>
        </nav>

        <SearchBar onSearch={handleSearch} />

        {searchedTeam && <Series seriesId="test" selectedTeam={searchedTeam} />}

        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/analytics" element={<AnalyticsBreakdown />} />
            <Route path="/history" element={<MatchHistory selectedTeam="Cloud9"/>} />
        </Routes>
    </BrowserRouter>
  )
}

export default App
