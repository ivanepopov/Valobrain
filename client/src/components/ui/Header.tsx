import { Brain } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

const Header = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    if (!isHomePage) return;

    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const scrollableHeight = documentHeight - windowHeight;
      const progress = (scrollTop / scrollableHeight) * 100;
      setScrollProgress(Math.min(progress, 100));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initialize on mount

    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHomePage]);

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
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded-lg" aria-label="ValoBrain home">
            <Brain className="w-8 h-8 text-blue-400" aria-hidden="true" />
            <span className="text-2xl font-bold text-white">ValoBrain</span>
          </Link>

          {isHomePage && (
            <nav className="flex items-center gap-6 relative" aria-label="Main navigation">
              <button
                onClick={() => scrollToSection('features')}
                className="text-slate-300 hover:text-white focus:text-blue-400 transition-colors text-sm font-medium min-h-[44px] px-2 focus:outline-none"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="text-slate-300 hover:text-white focus:text-blue-400 transition-colors text-sm font-medium min-h-[44px] px-2 focus:outline-none"
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection('showcase')}
                className="text-slate-300 hover:text-white focus:text-blue-400 transition-colors text-sm font-medium min-h-[44px] px-2 focus:outline-none"
              >
                Showcase
              </button>
              <button
                onClick={() => scrollToSection('get-started')}
                className="text-slate-300 hover:text-white focus:text-blue-400 transition-colors text-sm font-medium min-h-[44px] px-2 focus:outline-none"
              >
                Get Started
              </button>
              
              {/* Scroll Progress Indicator */}
              <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-white/10" aria-hidden="true">
                <div 
                  className="h-full bg-blue-400 transition-all duration-300 ease-out"
                  style={{ width: `${scrollProgress}%` }}
                  role="progressbar"
                  aria-label="Page scroll progress"
                  aria-valuenow={Math.round(scrollProgress)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
