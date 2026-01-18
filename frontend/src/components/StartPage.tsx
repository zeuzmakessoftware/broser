import { useState } from 'react';
import { Search, Compass, BookOpen, Clock, Settings } from 'lucide-react';

interface StartPageProps {
  onNavigate: (url: string) => void;
}

export function StartPage({ onNavigate }: StartPageProps) {
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      // Basic heuristic: if it looks like a URL, go there, else search
      if (query.includes('.') && !query.includes(' ')) {
        const url = query.startsWith('http') ? query : `https://${query}`;
        onNavigate(url);
      } else {
        onNavigate(`https://google.com/search?q=${encodeURIComponent(query)}`);
      }
    }
  };

  const quickLinks = [
    { icon: Compass, label: 'Explore', url: 'https://dribbble.com' },
    { icon: BookOpen, label: 'Docs', url: 'https://developer.mozilla.org' },
    { icon: Clock, label: 'History', url: 'noteva://history' }, // Placeholder
    { icon: Settings, label: 'Settings', url: 'noteva://settings' }, // Placeholder
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-[#1a1a1a] text-white overflow-hidden relative selection:bg-purple-500/30">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse delay-700"></div>
        </div>

      <div className="z-10 flex flex-col items-center max-w-2xl w-full px-4 animate-in fade-in zoom-in duration-500">
        {/* Hero Section */}
        <div className="mb-12 text-center">
            <h1 className="text-6xl md:text-8xl font-black mb-4 tracking-tighter bg-gradient-to-br from-white via-gray-200 to-gray-500 bg-clip-text text-transparent drop-shadow-lg scale-y-95">
            Noteva
            </h1>
            <p className="text-lg md:text-xl text-gray-400 font-light tracking-wide">
            The browser for <span className="text-purple-400 font-medium">thinkers</span>.
            </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="w-full relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-purple-400 transition-colors">
            <Search size={22} className="stroke-[2.5]" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or enter URL..."
            autoFocus
            className="w-full py-4 pl-14 pr-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl text-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:bg-white/10 transition-all shadow-lg hover:shadow-purple-500/10 hover:border-white/20"
          />
        </form>

        {/* Quick Links */}
        <div className="mt-12 grid grid-cols-4 gap-4 md:gap-8 w-full">
          {quickLinks.map((link, index) => (
            <button
              key={index}
              onClick={() => link.url.startsWith('noteva') ? console.log('Internal link') : onNavigate(link.url)}
              className="flex flex-col items-center group p-4 rounded-xl hover:bg-white/5 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 mb-3 group-hover:bg-purple-500/20 group-hover:border-purple-500/30 group-hover:text-purple-400 transition-all shadow-md group-hover:shadow-purple-500/20">
                <link.icon size={26} className="stroke-[1.5]" />
              </div>
              <span className="text-sm font-medium text-gray-400 group-hover:text-white transition-colors">
                {link.label}
              </span>
            </button>
          ))}
        </div>
      </div>
      
        <div className="absolute bottom-8 text-xs text-gray-600 font-mono tracking-widest uppercase">
            Designed for Focus
        </div>
    </div>
  );
}
