import React from 'react';
import { LayoutDashboard, Calendar } from 'lucide-react';
import { ViewState } from '../types';
import { motion } from 'framer-motion';

interface NavbarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onChangeView }) => {
  if (currentView === 'record') return null;

  return (
    <div className="absolute bottom-6 left-4 right-4 z-50">
      <div 
        className="bg-white/40 backdrop-blur-xl backdrop-saturate-150 border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.08)] rounded-[32px] p-2 flex justify-between items-center relative"
      >
        <NavButton 
            isActive={currentView === 'dashboard'} 
            onClick={() => onChangeView('dashboard')}
            icon={<LayoutDashboard size={22} />}
            label="概览"
        />

        <NavButton 
            isActive={currentView === 'calendar'} 
            onClick={() => onChangeView('calendar')}
            icon={<Calendar size={22} />}
            label="日志"
        />
      </div>
    </div>
  );
};

const NavButton = ({ isActive, onClick, icon, label }: any) => (
    <button 
        onClick={onClick}
        className={`
            flex-1 flex items-center justify-center gap-2 py-4 rounded-[26px] transition-colors duration-300 relative z-10
            ${isActive ? 'text-white' : 'text-gray-500 hover:text-gray-700'}
        `}
        style={{ WebkitTapHighlightColor: 'transparent' }}
    >
        {isActive && (
            <motion.div
                layoutId="nav-pill"
                className="absolute inset-0 bg-gradient-to-br from-sky-600 to-sky-700 shadow-lg shadow-sky-900/20 rounded-[26px] z-[-1]"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
        )}
        
        {React.cloneElement(icon, { 
            strokeWidth: isActive ? 2.5 : 2,
            className: "relative z-10"
        })}
        
        <span className="text-sm font-bold relative z-10 tracking-wide">{label}</span>
    </button>
);