import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, ShieldCheck } from 'lucide-react';

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
    <div className="h-10 bg-[#2b2b2b] flex items-center px-4 gap-3 no-drag border-b border-black/20">
      <div className="flex gap-1 text-gray-400">
        <button onClick={onBack} className="p-1.5 hover:bg-white/10 rounded-md hover:text-white transition-colors">
          <ArrowLeft size={16} />
        </button>
        <button onClick={onForward} className="p-1.5 hover:bg-white/10 rounded-md hover:text-white transition-colors">
          <ArrowRight size={16} />
        </button>
        <button onClick={onReload} className="p-1.5 hover:bg-white/10 rounded-md hover:text-white transition-colors">
          <RotateCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex-1 flex items-center bg-[#1a1a1a] rounded-lg px-3 h-8 border border-transparent focus-within:border-blue-500/50 transition-colors">
         <ShieldCheck size={14} className="text-gray-500 mr-2" />
         <input 
            type="text"
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
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
