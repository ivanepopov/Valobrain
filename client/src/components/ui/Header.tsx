import { Brain } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

const Header = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    if (!isHomePage) return;

    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const scrollableHeight = documentHeight - windowHeight;
      const progress = (scrollTop / scrollableHeight) * 100;
      setScrollProgress(Math.min(progress, 100));

      
      const sections = ['hero', 'features', 'how-it-works', 'get-started'];
      const offset = 100; // Header offset
      
      for (const sectionId of sections) {
        const element = document.getElementById(sectionId);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= offset && rect.bottom >= offset) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
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
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-white/10 h-15">
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center">
        <div className="w-full flex items-center justify-center relative">
          <Link to="/" className="absolute left-6 flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Brain className="w-8 h-8" style={{ color: '#80B9FF' }} />
            <h1 className="text-2xl font-bold text-white">ValoBrain</h1>
          </Link>

          {isHomePage && (
            <nav className="flex items-center gap-6 relative">
              <button
                onClick={() => scrollToSection('hero')}
                className="transition-colors text-sm font-medium text-white hover:text-blue-300"
                style={{ color: activeSection === 'hero' ? '#80B9FF' : undefined }}
              >
                Home
              </button>
              <button
                onClick={() => scrollToSection('features')}
                className="transition-colors text-sm font-medium text-white hover:text-blue-300"
                style={{ color: activeSection === 'features' ? '#80B9FF' : undefined }}
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="transition-colors text-sm font-medium text-white hover:text-blue-300"
                style={{ color: activeSection === 'how-it-works' ? '#80B9FF' : undefined }}
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection('get-started')}
                className="transition-colors text-sm font-medium text-white hover:text-blue-300"
                style={{ color: activeSection === 'get-started' ? '#80B9FF' : undefined }}
              >
                Get Started
              </button>
              
              {/* Scroll Progress Indicator */}
              <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-white/10">
                <div 
                  className="h-full transition-all duration-300 ease-out"
                  style={{ width: `${scrollProgress}%`, backgroundColor: '#80B9FF' }}
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
