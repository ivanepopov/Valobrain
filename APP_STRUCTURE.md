# Valobrain App Structure & Architecture Guide

## Overview
Valobrain is a full-stack Valorant analytics application built with React (TypeScript) frontend and Node.js backend. It provides deep insights into team performance, match history, and player statistics.

---

## 📁 Project Folder Structure

```
Valobrain/
├── client/                          # Frontend (React + Vite + TypeScript)
│   ├── src/
│   │   ├── App.tsx                 # Main routing component
│   │   ├── main.tsx                # Application entry point
│   │   ├── index.css               # Global styles
│   │   ├── App.css                 # App-level styles
│   │   │
│   │   ├── pages/                  # Page components (full-page routes)
│   │   │   ├── Home.tsx            # Home/landing page with team search
│   │   │   ├── Dashboard.tsx       # Team dashboard (dynamic route)
│   │   │   ├── MatchHistory.tsx    # Match history visualization
│   │   │   ├── AnalyticsBreakdown.tsx # Detailed analytics
│   │   │   └── [other pages]
│   │   │
│   │   ├── components/             # Reusable UI components
│   │   │   ├── Series.tsx          # Series stats display
│   │   │   ├── Match.tsx           # Individual match display
│   │   │   ├── PlayerStatistics.tsx # Player stats component
│   │   │   ├── PlayerStatisticsTable.tsx # Player stats table
│   │   │   ├── AnalyticsBreakdown.tsx # Analytics component
│   │   │   └── MatchHistory.tsx    # Match history component
│   │   │
│   │   ├── services/               # API communication & business logic
│   │   │   ├── getTeams.ts         # Fetch teams by search term
│   │   │   ├── getTeamStats.ts     # Fetch team statistics
│   │   │   ├── getTeamRoster.ts    # Fetch team roster
│   │   │   ├── getSeriesStats.ts   # Fetch series/match statistics
│   │   │   ├── getPlayerStats.ts   # Fetch player statistics
│   │   │   ├── getTeam.ts          # Fetch single team details
│   │   │   └── [other services]
│   │   │
│   │   ├── types/                  # TypeScript type definitions
│   │   │   ├── Team.ts             # Team data type
│   │   │   ├── TeamStats.ts        # Team statistics type
│   │   │   ├── MatchStats.ts       # Match data type
│   │   │   ├── SeriesStats.ts      # Series statistics type
│   │   │   ├── PlayerStats.ts      # Player statistics type
│   │   │   ├── MatchPlayerStats.ts # Player stats in a match
│   │   │   └── [other types]
│   │   │
│   │   └── assets/                 # Static assets (images, fonts, etc.)
│   │
│   ├── package.json                # Frontend dependencies
│   ├── tsconfig.json               # TypeScript configuration
│   ├── vite.config.ts              # Vite build configuration
│   ├── eslint.config.js            # ESLint rules
│   └── public/                     # Static files served as-is
│
├── server/                         # Backend (Node.js)
│   ├── server.js                   # Main server file
│   ├── package.json                # Backend dependencies
│   └── [other backend files]
│
└── package.json                    # Root workspace configuration

```

---

## 🏗️ Architecture Overview

### Data Flow

```
User Input (Home.tsx)
    ↓
Service Layer (getTeams.ts, getTeamStats.ts)
    ↓
Backend API (server/)
    ↓
Service Returns Data
    ↓
Component Renders Data
    ↓
UI Display
```

### Component Hierarchy

```
App (Router)
├── Home (Landing page with search)
│   └── Search Dropdown
├── Dashboard (Team detail page)
│   ├── PlayerStatistics
│   ├── MatchHistory
│   │   └── Series
│   │       └── Match
│   └── AnalyticsBreakdown
│       └── PlayerStatisticsTable
└── [Other Routes]
```

---

## 📝 Key Concepts & Good Practices

### 1. **Pages vs Components**

**Pages** (`/pages/`)
- Full-page components that correspond to routes
- Handle page-level logic and state
- Usually contain multiple child components
- Examples: `Home.tsx`, `Dashboard.tsx`

**Components** (`/components/`)
- Reusable UI elements
- Single responsibility principle
- Accept props for data and callbacks
- Examples: `Series.tsx`, `Match.tsx`

### 2. **Services Layer** (`/services/`)
- **Purpose**: Centralize all API calls and data fetching
- **Pattern**: Each service is a function that makes a specific API call
- **Benefits**: 
  - Easy to test
  - Changes to API endpoints only need to be made in one place
  - Reusable across components
  
**Example Service:**
```typescript
async function getTeamStats(teamId: string, timeFrame: string): Promise<TeamStats | null> {
    try {
        const res = await axios.get(`/api/teams/${teamId}/${timeFrame}`);
        return res.data.data.teamStatistics;
    } catch (err) {
        console.error(err);
        return null;
    }
}
```

### 3. **Type System** (`/types/`)
- Define clear TypeScript interfaces for all data structures
- Import and use types in components and services
- Never use `any` - always define proper types
- Keeps data structure consistent across the app

**Example Type:**
```typescript
export type Team = {
    id: string;
    name: string;
    region: string;
};
```

### 4. **State Management**

**Local Component State:**
- Use `useState` for simple component state
- Keep state as close as possible to where it's used

**Shared State (Across Pages):**
- Lift state up to `App.tsx` or a parent component
- Pass down as props
- Future: Consider Context API or state management library for complex shared state

**Example:**
```typescript
// In App.tsx
const [teamName, setTeamName] = useState<string>("");

// Pass to pages
<Route path="/" element={<Home teamName={teamName} setTeamName={setTeamName} />} />
```

### 5. **Routing Best Practices**

- Use React Router for page navigation
- Dynamic routes should use URL parameters (`:teamId`)
- Always define route types clearly
- Navigate using `useNavigate()` hook

**Example:**
```typescript
const navigate = useNavigate();
navigate(`/dashboard/${team.id}`);
```

---

## ✅ Good Practices to Follow

### Code Organization
1. **One component per file** (unless it's a small helper component)
2. **Descriptive file names** (e.g., `PlayerStatisticsTable.tsx` not `Table.tsx`)
3. **Group related files** (services together, types together, etc.)

### Type Safety
1. Always define prop types using `type Props = { ... }`
2. Use `type` for object definitions, `interface` for class-like structures
3. Export types from type files so they can be imported and reused
4. Define return types for functions

### Error Handling
1. Wrap async calls in try-catch blocks
2. Return `null` or a default value on error
3. Log errors to console for debugging
4. Show user-friendly error messages

### Performance
1. Use `React.memo` for expensive components
2. Implement `useCallback` for functions passed as props
3. Use `useEffect` dependencies correctly
4. Lazy load pages with `React.lazy` if needed

### Naming Conventions
- **Components**: PascalCase (`Home.tsx`, `PlayerStatistics.tsx`)
- **Services/Functions**: camelCase (`getTeamStats.ts`, `fetchPlayerData`)
- **Types/Interfaces**: PascalCase (`TeamStats`, `MatchStats`)
- **Variables/Constants**: camelCase (`teamName`, `maxRetries`)

---

## 🔄 Common Workflows

### Adding a New Page
1. Create file in `/pages/` (e.g., `NewPage.tsx`)
2. Define `Props` type if needed
3. Add route to `App.tsx` routing
4. Import components and services as needed

### Adding a New API Call
1. Create service in `/services/` (e.g., `getNewData.ts`)
2. Define return type using types from `/types/`
3. Use service in your component via `useEffect`
4. Handle loading and error states

### Adding a Reusable Component
1. Create file in `/components/` (e.g., `NewComponent.tsx`)
2. Define clear `Props` interface
3. Make it self-contained (minimal dependencies)
4. Export and import where needed

### Updating Data Types
1. Edit relevant file in `/types/`
2. Update any services that use that type
3. Update any components that display that data
4. Ensure TypeScript doesn't show errors

---

## 🔧 Development Tips

### Environment Setup
```bash
# Frontend
cd client
npm install
npm run dev

# Backend
cd server
npm install
npm start
```

### Debugging
- Use React DevTools browser extension
- Use VS Code debugger
- Check browser console for errors
- Use `console.log()` strategically in services

### Git Workflow
1. Create feature branches: `git checkout -b feature/feature-name`
2. Make incremental commits
3. Push and create pull requests
4. Keep commits focused and related

---

## 📋 Checklist for Maintaining Code Quality

- [ ] All TypeScript types are properly defined
- [ ] No `any` types used
- [ ] Services handle errors gracefully
- [ ] Components have clear prop interfaces
- [ ] No hardcoded values (use constants or config)
- [ ] Consistent naming conventions
- [ ] Props are well-documented
- [ ] Components are reusable where possible
- [ ] No unnecessary state in components
- [ ] API calls are in services, not components

---

## 🚀 Future Improvements

1. **State Management**: Implement Redux or Zustand for complex state
2. **Error Boundaries**: Add error boundaries for better error handling
3. **Loading States**: Add loading UI for async operations
4. **Caching**: Implement caching for API calls
5. **Tests**: Add unit and integration tests
6. **API Client**: Create an API client class instead of individual service functions
7. **Environment Variables**: Use .env files for API endpoints
8. **Logging**: Implement proper logging system

---

## 📚 Resources

- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org)
- [React Router Documentation](https://reactrouter.com)
- [Vite Documentation](https://vitejs.dev)
