import React from 'react';
import { Plus, X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'framer-motion';

interface Tab {
  id: string;
  title: string;
  active: boolean;
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
                  ? "bg-[#2b2b2b] text-white" 
                  : "bg-transparent text-gray-400 hover:bg-[#2b2b2b]/50 hover:text-gray-200"
              )}
            >
              <span className="flex-1 text-xs truncate mr-2">{tab.title || 'New Tab'}</span>
              <button
                onClick={(e) => onCloseTab(tab.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded-md transition-all no-drag"
              >
                <X size={12} />
              </button>
            </motion.div>
          ))}
      </AnimatePresence>
      <motion.button 
        whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.1)" }}
        whileTap={{ scale: 0.9 }}
        onClick={onNewTab}
        className="p-2 text-gray-400 hover:text-white rounded-md transition-colors no-drag"
      >
        <Plus size={16} />
      </motion.button>
    </div>
  );
}
