import { Brain } from 'lucide-react';
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity w-fit">
          <Brain className="w-8 h-8 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">ValoBrain</h1>
        </Link>
      </div>
    </header>
  );
};

export default Header;
