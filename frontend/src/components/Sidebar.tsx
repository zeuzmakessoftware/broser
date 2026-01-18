import { BookOpen, MessageSquare, Settings, Mic, Notebook, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

interface SidebarProps {
  isOpen: boolean;
  activeMode: 'notes' | 'chat' | 'settings' | 'research' | 'history' | null;
  onToggle: (mode: 'notes' | 'chat' | 'settings' | 'research' | 'history') => void;
  onVoiceClick: () => void;
  isListening?: boolean;
}

export function Sidebar({ isOpen: _isOpen, activeMode, onToggle, onVoiceClick, isListening }: SidebarProps) {
  return (
    <div className="w-22 bg-[#1a1a1a] border-r border-white/5 flex flex-col items-center py-4 gap-4 z-50 dragged-region">
      {/* App Logo / Dashboard Home */}
      {/* Mac Traffic Lights Spacing */}
      <div className="h-6 w-full" />

      <img src="/swagscg.svg" alt="Logo" className="w-14 h-14 mb-2 no-drag select-none rounded-xl" />

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => onToggle('research')}
        className={clsx(
          "p-2 rounded-lg transition-all duration-200 group relative no-drag",
          activeMode === 'research' ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
        )}
        title="Research"
      >
        <BookOpen size={20} />
        {activeMode === 'research' && (
          <motion.div
            layoutId="sidebar-active"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-green-500 rounded-r-full"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => onToggle('notes')}
        className={clsx(
          "p-2 rounded-lg transition-all duration-200 group relative no-drag",
          activeMode === 'notes' ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
        )}
        title="Notes"
      >
        <Notebook size={20} />
        {activeMode === 'notes' && (
          <motion.div
            layoutId="sidebar-active"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-blue-500 rounded-r-full"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => onToggle('chat')}
        className={clsx(
          "p-2 rounded-lg transition-all duration-200 group relative no-drag",
          activeMode === 'chat' ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
        )}
        title="AI Chat"
      >
        <MessageSquare size={20} />
        {activeMode === 'chat' && (
          <motion.div
            layoutId="sidebar-active"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-purple-500 rounded-r-full"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => onToggle('history')}
        className={clsx(
          "p-2 rounded-lg transition-all duration-200 group relative no-drag",
          activeMode === 'history' ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
        )}
        title="History"
      >
        <Clock size={20} />
        {activeMode === 'history' && (
          <motion.div
            layoutId="sidebar-active"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-yellow-500 rounded-r-full"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onVoiceClick}
        className={clsx(
          "p-2 rounded-full transition-all duration-300 mt-auto mb-4 border border-transparent hover:border-white/10 no-drag",
          isListening ? "bg-red-500/20 text-red-500 animate-pulse" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
        )}
        title="Voice Assistant"
      >
        <Mic size={20} />
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => onToggle('settings')}
        className={clsx(
          "p-2 rounded-lg transition-all duration-200 no-drag",
          activeMode === 'settings' ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
        )}
        title="Settings"
      >
        <Settings size={20} />
      </motion.button>
    </div>
  );
}

