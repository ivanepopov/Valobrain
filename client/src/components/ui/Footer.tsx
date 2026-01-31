import { Brain, Github } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const Footer = () => {
    const currentYear = new Date().getFullYear();
    const location = useLocation();
    const navigate = useNavigate();
    const isHomePage = location.pathname === '/';

    const scrollToSection = (sectionId: string) => {
        if (isHomePage) {
            const element = document.getElementById(sectionId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } else {
            navigate('/');
            setTimeout(() => {
                const element = document.getElementById(sectionId);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
        }
    };

    return (
        <footer className="relative border-t border-white/10 mt-20" role="contentinfo">
            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="grid md:grid-cols-3 gap-8 mb-8">
                    {/* Brand */}
                    <div>
                        <Link to="/" className="flex items-center gap-3 mb-4 w-fit hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-lg" aria-label="ValoBrain home">
                            <Brain className="w-8 h-8 text-blue-400" aria-hidden="true" />
                            <h3 className="text-xl font-bold text-white">ValoBrain</h3>
                        </Link>
                        <p className="text-slate-300 text-sm leading-relaxed">
                            Advanced Valorant team analytics powered by AI. Gain insights, analyze performance, and elevate your strategic understanding.
                        </p>
                    </div>

                    {/* About */}
                    <div>
                        <h4 className="text-white font-semibold mb-4">About</h4>
                        <nav aria-label="Footer navigation">
                            <ul className="space-y-3">
                                <li>
                                    <button
                                        onClick={() => scrollToSection('how-it-works')}
                                        className="text-slate-300 hover:text-white transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 rounded px-1 min-h-[44px] inline-flex items-center"
                                    >
                                        How It Works
                                    </button>
                                </li>
                                <li>
                                    <button
                                        onClick={() => scrollToSection('features')}
                                        className="text-slate-300 hover:text-white transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 rounded px-1 min-h-[44px] inline-flex items-center"
                                    >
                                        Features
                                    </button>
                                </li>
                            </ul>
                        </nav>
                    </div>

                    {/* GitHub & Credits */}
                    <div>
                        <h4 className="text-white font-semibold mb-4">Connect</h4>
                        <a
                            href="https://github.com/ivanepopov/Valobrain"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded px-1 min-h-[44px]"
                            aria-label="View ValoBrain on GitHub (opens in new tab)"
                        >
                            <Github className="w-5 h-5" aria-hidden="true" />
                            <span className="text-sm">View on GitHub</span>
                        </a>
                        <p className="text-slate-400 text-sm">
                            Built with ❤️ by the ValoBrain team
                        </p>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="pt-8 border-t border-white/10">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-slate-400 text-sm">
                            © {currentYear} ValoBrain. All rights reserved.
                        </p>
                        <p className="text-slate-400 text-sm">
                            Data provided by GRID API
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
