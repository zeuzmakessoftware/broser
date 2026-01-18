import { BookOpen, MessageSquare, Settings, Mic } from 'lucide-react';
import { clsx } from 'clsx';

interface SidebarProps {
  isOpen: boolean;
  activeMode: 'notes' | 'chat' | 'settings' | 'research' | null;
  onToggle: (mode: 'notes' | 'chat' | 'settings' | 'research') => void;
  onVoiceClick: () => void;
  isListening?: boolean;
}

export function Sidebar({ isOpen: _isOpen, activeMode, onToggle, onVoiceClick, isListening }: SidebarProps) {
  return (
    <div className="w-12 bg-[#1a1a1a] border-r border-white/5 flex flex-col items-center py-4 gap-4 z-50">
       {/* App Logo / Dashboard Home */}
       <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg mb-2 shadow-lg shadow-blue-500/20" />

       <button
         onClick={() => onToggle('research')}
         className={clsx(
           "p-2 rounded-lg transition-all duration-200 group relative",
           activeMode === 'research' ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
         )}
         title="Research"
       >
         <BookOpen size={20} />
         {activeMode === 'research' && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-green-500 rounded-r-full" />}
       </button>

       <button
         onClick={() => onToggle('notes')}
         className={clsx(
           "p-2 rounded-lg transition-all duration-200 group relative",
           activeMode === 'notes' ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
         )}
         title="Notes"
       >
         <BookOpen size={20} />
         {activeMode === 'notes' && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-blue-500 rounded-r-full" />}
       </button>

       <button
         onClick={() => onToggle('chat')}
         className={clsx(
           "p-2 rounded-lg transition-all duration-200 group relative",
           activeMode === 'chat' ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
         )}
         title="AI Chat"
       >
         <MessageSquare size={20} />
          {activeMode === 'chat' && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-purple-500 rounded-r-full" />}
       </button>

       <button
         onClick={onVoiceClick}
         className={clsx(
            "p-2 rounded-full transition-all duration-300 mt-auto mb-4 border border-transparent hover:border-white/10",
            isListening ? "bg-red-500/20 text-red-500 animate-pulse" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
         )}
         title="Voice Assistant"
       >
          <Mic size={20} />
       </button>

       <button
         onClick={() => onToggle('settings')}
         className={clsx(
           "p-2 rounded-lg transition-all duration-200",
           activeMode === 'settings' ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
         )}
         title="Settings"
       >
         <Settings size={20} />
       </button>
    </div>
  );
}
