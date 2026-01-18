import { BookOpen, MessageSquare, Settings, Mic, Notebook, Clock, Sun, Moon } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  isOpen: boolean;
  activeMode: 'notes' | 'chat' | 'settings' | 'research' | 'history' | null;
  onToggle: (mode: 'notes' | 'chat' | 'settings' | 'research' | 'history') => void;
  onVoiceClick: () => void;
  isListening?: boolean;
  currentTheme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export function Sidebar({ isOpen: _isOpen, activeMode, onToggle, onVoiceClick, isListening, currentTheme, onToggleTheme }: SidebarProps) {
  return (
    <div className="w-22 bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] flex flex-col items-center py-4 gap-4 z-50 dragged-region transition-colors duration-300">
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
          activeMode === 'research' ? "bg-[var(--hover-bg)] text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)]"
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
          activeMode === 'notes' ? "bg-[var(--hover-bg)] text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)]"
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
          activeMode === 'chat' ? "bg-[var(--hover-bg)] text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)]"
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
          activeMode === 'history' ? "bg-[var(--hover-bg)] text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)]"
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
          "p-2 rounded-full transition-all duration-300 mt-auto mb-4 border border-transparent hover:border-[var(--border-color)] no-drag",
          isListening ? "bg-red-500/20 text-red-500 animate-pulse" : "bg-[var(--input-bg)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
        )}
        title="Voice Assistant"
      >
        <Mic size={20} />
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.9 }}
        onClick={onToggleTheme}
        className="p-2 rounded-lg transition-all duration-200 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] no-drag relative"
        title={currentTheme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        <AnimatePresence mode='wait' initial={false}>
          <motion.div
            key={currentTheme}
            initial={{ y: -20, opacity: 0, rotate: -90 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: 20, opacity: 0, rotate: 90 }}
            transition={{ duration: 0.2 }}
          >
            {currentTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </motion.div>
        </AnimatePresence>
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => onToggle('settings')}
        className={clsx(
          "p-2 rounded-lg transition-all duration-200 no-drag",
          activeMode === 'settings' ? "bg-[var(--hover-bg)] text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)]"
        )}
        title="Settings"
      >
        <Settings size={20} />
      </motion.button>
    </div>
  );
}

