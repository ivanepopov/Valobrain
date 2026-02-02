# Valobrain 🧠

AI-powered Valorant match analytics and insights platform using real-time data from GRID.gg and Google Gemini AI.

## 🚀 Tech Stack

### Client (Frontend)

- **React 19** with **TypeScript**
- **Vite** - Build tooling
- **Tailwind CSS** - Styling
- **Spline** - 3D graphics
- **Lucide React** - Icons
- **React Router** - Navigation

### Server (Backend)

- **Node.js** with **Express**
- **Google Gemini AI** - AI-powered analysis
- **GRID.gg API** - Valorant match data
- **Axios** - HTTP requests
- **Rate Limiting** - API protection

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **npm** (comes with Node.js)
- **GRID.gg API Key** ([Get one here](https://grid.gg))
- **Google Gemini API Key** ([Get one here](https://ai.google.dev))

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/ivanepopov/Valobrain.git
cd Valobrain
```

### 2. Install Client Dependencies

```bash
cd client
npm install
```

### 3. Install Server Dependencies

```bash
cd ../server
npm install
```

## ⚙️ Configuration

### Server Environment Variables

1. Navigate to the `server` directory
2. Create a `.env` file based on `.env.example`:

   ```bash
   cp .env.example .env
   ```

3. Edit `.env` with your API keys:

   ```env
   # GRID.gg API Key (Required for downloading stats)
   API_KEY=your_grid_api_key_here

   # Google Gemini API Key (Required for AI Analysis)
   GEMINI_API_KEY=your_gemini_api_key_here

   # Storage Optimization
   # Set to 'false' to automatically delete 100MB+ match files after processing.
   # Set to 'true' to keep them for debugging or re-parsing.
   KEEP_RAW_FILES=true

   # Server Configuration
   PORT=8080
   ```

## 🏃 Running the Application

### Start the Backend Server

```bash
cd server
npm run dev
```

The server will start on `http://localhost:8080`

### Start the Frontend Client

Open a new terminal:

```bash
cd client
npm run dev
```

The client will start on `http://localhost:5173` (or another port if 5173 is occupied)

### Access the Application

Open your browser and navigate to the client URL (typically `http://localhost:5173`)

## ✨ Features

- **🔍 Match Search**: Search for teams and players using real-time GRID.gg data
- **📊 Match History**: View detailed match results and statistics
- **📈 Analytics Dashboard**: Comprehensive performance metrics and visualizations
- **🤖 AI Insights**: AI-powered scouting reports and strategic analysis using Google Gemini
- **🎯 Player Statistics**: Track individual player performance across matches
- **🗺️ Match Details**: Round-by-round breakdowns with detailed stats

## 🏗️ Project Structure

```
Valobrain/
├── client/          # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── ...
│   └── package.json
├── server/          # Express backend
│   ├── routes/
│   ├── services/
│   ├── prompts/
│   ├── server.js
│   └── package.json
└── README.md
```

## 📝 License

MIT License


---

Built with ❤️ for the Valorant competitive community
