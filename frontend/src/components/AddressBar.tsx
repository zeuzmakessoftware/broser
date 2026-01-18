import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

interface AddressBarProps {
  url: string;
  onNavigate: (url: string) => void;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  isLoading?: boolean;
}

export function AddressBar({ url, onNavigate, onBack, onForward, onReload, isLoading }: AddressBarProps) {
  const [inputVal, setInputVal] = useState(url);

  useEffect(() => {
    setInputVal(url);
  }, [url]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onNavigate(inputVal);
    }
  };

  return (
    <div className="h-10 bg-[var(--bg-secondary)] flex items-center px-4 gap-3 no-drag border-b border-[var(--border-color)] transition-colors duration-300">
      <div className="flex gap-1 text-[var(--text-secondary)]">
        <motion.button 
          whileHover={{ scale: 1.1, backgroundColor: "var(--hover-bg)" }}
          whileTap={{ scale: 0.9 }}
          onClick={onBack} 
          className="p-1.5 rounded-md transition-colors"
        >
          <ArrowLeft size={16} />
        </motion.button>
        <motion.button 
          whileHover={{ scale: 1.1, backgroundColor: "var(--hover-bg)" }}
          whileTap={{ scale: 0.9 }}
          onClick={onForward} 
          className="p-1.5 rounded-md transition-colors"
        >
          <ArrowRight size={16} />
        </motion.button>
        <motion.button 
          whileHover={{ scale: 1.1, backgroundColor: "var(--hover-bg)" }}
          whileTap={{ scale: 0.9 }}
          onClick={onReload} 
          className="p-1.5 rounded-md transition-colors"
        >
          <RotateCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </motion.button>
      </div>

      <div className="flex-1 flex items-center bg-[var(--input-bg)] rounded-lg px-3 h-8 border border-transparent focus-within:border-blue-500/50 transition-colors">
         <ShieldCheck size={14} className="text-[var(--text-secondary)] mr-2" />
         <input 
            type="text"
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none"
            placeholder="Search or enter website name"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={(e) => e.target.select()}
         />
         {/* Could add a 'star' or 'bookmark' icon here */}
      </div>

       <div className="flex gap-2">
           {/* Extensions / Menu can go here */}
       </div>
    </div>
  );
}
