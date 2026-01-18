import { useState } from 'react';
import { Search, Compass, BookOpen, GraduationCap, Mic } from 'lucide-react';
import { motion } from 'framer-motion';
import { ParticleSystem } from './ParticleSystem';

interface StartPageProps {
  onNavigate: (url: string) => void;
  onNewTab: () => void;
  onVoiceClick: () => void;
}

export function StartPage({ onNavigate, onNewTab, onVoiceClick }: StartPageProps) {
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      if (query.includes('.') && !query.includes(' ')) {
        const url = query.startsWith('http') ? query : `https://${query}`;
        onNavigate(url);
      } else {
        onNavigate(`https://google.com/search?q=${encodeURIComponent(query)}`);
      }
    }
  };

  const quickLinks = [
    { icon: Compass, label: 'Explore', url: 'new-tab' },
    { icon: BookOpen, label: 'Docs', url: 'https://docs.google.com' },
    { icon: GraduationCap, label: 'Canvas', url: 'https://canvas.ucsc.edu/' },
    { icon: Mic, label: 'Voice', url: 'noteva://voice' },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden relative selection:bg-purple-500/30 transition-colors duration-300">
      {/* Background Gradients & Particles */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <motion.div 
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
            className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]" 
        />
        <motion.div 
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 2, delay: 0.5, repeat: Infinity, repeatType: "reverse" }}
            className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]"
        />
        <ParticleSystem />
      </div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="z-10 flex flex-col items-center max-w-2xl w-full px-4"
      >
        {/* Hero Section */}
        <motion.div variants={item} className="mb-12 text-center">
          <h1 className="text-6xl md:text-8xl font-black mb-4 tracking-tighter text-[var(--text-primary)] drop-shadow-lg">
            Noteva
          </h1>
          <p className="text-lg md:text-xl text-[var(--text-secondary)] font-light tracking-wide">
            The browser for <span className="text-purple-400 font-medium">thinkers</span>.
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.form variants={item} onSubmit={handleSearch} className="w-full relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[var(--text-secondary)] group-focus-within:text-purple-400 transition-colors">
            <Search size={22} className="stroke-[2.5]" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or enter URL..."
            autoFocus
            className="w-full py-4 pl-14 pr-6 rounded-2xl bg-[var(--input-bg)] border border-[var(--border-color)] backdrop-blur-xl text-lg text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:bg-[var(--input-bg)] transition-all shadow-lg hover:shadow-purple-500/10 hover:border-[var(--hover-bg)]"
          />
        </motion.form>

        {/* Quick Links */}
        <motion.div variants={item} className="mt-12 grid grid-cols-4 gap-4 md:gap-8 w-full">
          {quickLinks.map((link, index) => (
            <motion.button
              key={index}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (link.url === 'new-tab') {
                  onNewTab();
                } else if (link.url === 'noteva://voice') {
                  onVoiceClick();
                } else if (link.url.startsWith('noteva')) {
                  console.log('Internal link');
                } else {
                  onNavigate(link.url);
                }
              }}
              className="flex flex-col items-center group p-4 rounded-xl hover:bg-[var(--hover-bg)] transition-colors"
            >
              <div className="p-4 rounded-2xl bg-[var(--input-bg)] border border-[var(--border-color)] mb-3 group-hover:bg-purple-500/20 group-hover:border-purple-500/30 group-hover:text-purple-400 transition-all shadow-md group-hover:shadow-purple-500/20">
                <link.icon size={26} className="stroke-[1.5]" />
              </div>
              <span className="text-sm font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                {link.label}
              </span>
            </motion.button>
          ))}
        </motion.div>
      </motion.div>

      <div className="absolute bottom-8 text-xs text-[var(--text-secondary)] font-mono tracking-widest uppercase">
        Designed for Focus
      </div>
    </div>
  );
}
