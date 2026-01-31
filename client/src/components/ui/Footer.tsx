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
        <footer className="relative border-t border-white/10 mt-20">
            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="grid md:grid-cols-3 gap-8 mb-8">
                    {/* Brand */}
                    <div>
                        <Link to="/" className="flex items-center gap-3 mb-4 w-fit">
                            <Brain className="w-8 h-8 text-blue-400" />
                            <h3 className="text-xl font-bold text-white">ValoBrain</h3>
                        </Link>
                        <p className="text-blue-200/60 text-sm">
                            Advanced Valorant team analytics powered by AI. Gain insights, analyze performance, and elevate your strategic understanding.
                        </p>
                    </div>

                    {/* About */}
                    <div>
                        <h4 className="text-white font-semibold mb-4">About</h4>
                        <ul className="space-y-2">
                            <li>
                                <button
                                    onClick={() => scrollToSection('how-it-works')}
                                    className="text-blue-200/60 hover:text-blue-400 transition-colors text-sm"
                                >
                                    How It Works
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => scrollToSection('features')}
                                    className="text-blue-200/60 hover:text-blue-400 transition-colors text-sm"
                                >
                                    Features
                                </button>
                            </li>
                            <li>
                                <a
                                    href="#"
                                    className="text-blue-200/60 hover:text-blue-400 transition-colors text-sm"
                                >
                                    Privacy Policy
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* GitHub & Credits */}
                    <div>
                        <h4 className="text-white font-semibold mb-4">Connect</h4>
                        <a
                            href="https://github.com/ivanepopov/Valobrain"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-blue-200/60 hover:text-blue-400 transition-colors mb-4"
                        >
                            <Github className="w-5 h-5" />
                            <span className="text-sm">View on GitHub</span>
                        </a>
                        <p className="text-blue-200/60 text-sm">
                            Built with ❤️ by the ValoBrain team
                        </p>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="pt-8 border-t border-white/10">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-blue-200/50 text-sm">
                            © {currentYear} ValoBrain. All rights reserved.
                        </p>
                        <p className="text-blue-200/50 text-sm">
                            Data provided by GRID API
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
