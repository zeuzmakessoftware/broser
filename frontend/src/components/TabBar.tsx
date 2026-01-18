import React from 'react';
import { Plus, X, Globe } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'framer-motion';

interface Tab {
  id: string;
  title: string;
  active: boolean;
  favicon?: string;
}

interface TabBarProps {
  tabs: Tab[];
  onNewTab: () => void;
  onSwitchTab: (id: string) => void;
  onCloseTab: (id: string, e: React.MouseEvent) => void;
  className?: string; // Allow extending classes
}

export function TabBar({ tabs, onNewTab, onSwitchTab, onCloseTab, className }: TabBarProps) {
  return (
    <div className={twMerge("flex items-end h-10 px-2 gap-1 no-drag", className)}>
      <AnimatePresence initial={false} mode="popLayout">
          {tabs.map(tab => (
            <motion.div
              layout
              key={tab.id}
              initial={{ opacity: 0, scale: 0.9, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.15 } }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              onClick={() => onSwitchTab(tab.id)}
              className={clsx(
                "group relative flex items-center min-w-[120px] max-w-[240px] h-9 px-3 rounded-t-lg cursor-pointer transition-colors duration-200 select-none no-drag",
                tab.active 
                  ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]" 
                  : "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
              )}
            >
              {tab.favicon ? (
                <img src={tab.favicon} alt="" className="w-4 h-4 mr-2 object-contain" />
              ) : (
                <Globe size={14} className="mr-2 opacity-70" />
              )}
              <span className="flex-1 text-xs truncate mr-2">{tab.title || 'New Tab'}</span>
              <button
                onClick={(e) => onCloseTab(tab.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--hover-bg)] rounded-md transition-all no-drag"
              >
                <X size={12} />
              </button>
            </motion.div>
          ))}
      </AnimatePresence>
      <motion.button 
        whileHover={{ scale: 1.1, backgroundColor: "var(--hover-bg)" }}
        whileTap={{ scale: 0.9 }}
        onClick={onNewTab}
        className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-md transition-colors no-drag"
      >
        <Plus size={16} />
      </motion.button>
    </div>
  );
}
