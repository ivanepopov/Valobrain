import { Brain } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Header = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Brain className="w-8 h-8 text-blue-400" />
            <h1 className="text-2xl font-bold text-white">ValoBrain</h1>
          </Link>

          {isHomePage && (
            <nav className="flex items-center gap-6">
              <button
                onClick={() => scrollToSection('features')}
                className="text-blue-200 hover:text-white transition-colors text-sm font-medium"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="text-blue-200 hover:text-white transition-colors text-sm font-medium"
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection('showcase')}
                className="text-blue-200 hover:text-white transition-colors text-sm font-medium"
              >
                Showcase
              </button>
              <button
                onClick={() => scrollToSection('get-started')}
                className="text-blue-200 hover:text-white transition-colors text-sm font-medium"
              >
                Get Started
              </button>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
