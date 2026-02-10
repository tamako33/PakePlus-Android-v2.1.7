import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { FlightStats, FlightType } from '../types';
import { Plane, Calendar, Activity, Clock, PlaneTakeoff, Cloud, Sun, Plus, X, CheckCircle2, PenLine, GripVertical, User, Users, Moon, Droplets, CalendarDays, Hourglass, Check, Zap, CalendarRange, ArrowRight, Trophy, TrendingDown, PauseCircle, Coffee, Armchair, TrendingUp, Palette, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';

interface DashboardProps {
  stats: FlightStats;
  onFlightStart: (type: FlightType) => void;
  onManualRecord: () => void;
}

// Added streak specific widget types
type WidgetType = 
    'flightsToday' | 'flightsWeek' | 'flightsYear' | 'flightsMonth' | 'totalFlights' | 
    'hoursToday' | 'hoursWeek' | 'hoursMonth' | 'hoursYear' | 'totalHours' | 'avgDuration' | 'maxDuration' | 'minDuration' |
    'soloFlightsToday' | 'soloFlightsWeek' | 'soloFlightsMonth' | 'soloFlightsYear' | 'totalSoloFlights' |
    'multiFlightsToday' | 'multiFlightsWeek' | 'multiFlightsMonth' | 'multiFlightsYear' | 'totalMultiFlights' |
    'currentStreak' | 'maxStreak' | 'minStreak' | 'streakBreaks' | // Flying Streak Types
    'currentRest' | 'maxRest' | 'minRest' | 'restBreaks' | // New Rest Streak Types
    'nightCount' | 'daysSinceLastIncident' | // Accident Stats
    'streak' | 'soloCount' | 'multiCount'; // Legacy types

interface Widget {
  id: string;
  type: WidgetType;
  customHue?: number;
}

const DEFAULT_WIDGETS: Widget[] = [
  { id: '1', type: 'flightsWeek' },
  { id: '2', type: 'currentStreak' },
  { id: '3', type: 'currentRest' }, // Add Rest as default
];

export const Dashboard: React.FC<DashboardProps> = ({ stats, onFlightStart, onManualRecord }) => {
  // Local state for widgets, persisted in localStorage
  const [widgets, setWidgets] = useState<Widget[]>(() => {
    try {
      const saved = localStorage.getItem('dashboard_widgets_v1');
      let parsed = saved ? JSON.parse(saved) : DEFAULT_WIDGETS;
      
      // Migration Logic
      parsed = parsed.map((w: Widget) => {
          if (w.type === 'soloCount') return { ...w, type: 'totalSoloFlights' };
          if (w.type === 'multiCount') return { ...w, type: 'totalMultiFlights' };
          if (w.type === 'streak') return { ...w, type: 'currentStreak' };
          return w;
      });

      return parsed;
    } catch {
      return DEFAULT_WIDGETS;
    }
  });

  const [isEditMode, setIsEditMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTakeoffModal, setShowTakeoffModal] = useState(false);
  
  // Widget Configuration Modal State
  const [configWidgetId, setConfigWidgetId] = useState<string | null>(null);
  
  // Color Picker State
  const [tempHue, setTempHue] = useState<number | undefined>(undefined);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Long Press Refs
  const longPressTimer = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('dashboard_widgets_v1', JSON.stringify(widgets));
  }, [widgets]);

  const addWidget = (type: WidgetType) => {
    setWidgets([...widgets, { id: uuidv4(), type }]);
    setShowAddModal(false);
  };

  const removeWidget = (id: string) => {
    setWidgets(widgets.filter(w => w.id !== id));
  };

  const updateWidgetType = (id: string, newType: WidgetType) => {
      setWidgets(widgets.map(w => w.id === id ? { ...w, type: newType } : w));
      // Keep modal open but reset picker state if needed, though typically we might close it
      // setConfigWidgetId(null); 
  };
  
  const updateWidgetHue = (id: string, hue: number | undefined) => {
      setWidgets(widgets.map(w => w.id === id ? { ...w, customHue: hue } : w));
  };

  const handleTakeoffSelect = (type: FlightType) => {
      setShowTakeoffModal(false);
      onFlightStart(type);
  };

  // Sync tempHue when opening modal
  useEffect(() => {
      if (configWidgetId) {
          const w = widgets.find(w => w.id === configWidgetId);
          setTempHue(w?.customHue);
          setIsColorPickerOpen(false);
      }
  }, [configWidgetId]);

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
      setDraggedId(id);
      e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
      e.preventDefault(); 
      if (!draggedId || draggedId === targetId) return;

      const draggedIndex = widgets.findIndex(w => w.id === draggedId);
      const targetIndex = widgets.findIndex(w => w.id === targetId);

      if (draggedIndex === -1 || targetIndex === -1) return;

      const newWidgets = [...widgets];
      const [draggedItem] = newWidgets.splice(draggedIndex, 1);
      newWidgets.splice(targetIndex, 0, draggedItem);
      
      setWidgets(newWidgets);
  };

  const handleDragEnd = () => {
      setDraggedId(null);
  };

  // Long Press Handlers
  const handleTouchStart = () => {
      if (isEditMode) return;
      longPressTimer.current = setTimeout(() => {
          setIsEditMode(true);
          if (navigator.vibrate) navigator.vibrate(50);
      }, 600); // 600ms for long press
  };

  const handleTouchEnd = () => {
      if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
      }
  };

  // Widget Click Handler
  const handleWidgetClick = (widget: Widget) => {
      if (isEditMode) return;
      
      const flightCountTypes = ['flightsYear', 'flightsMonth', 'flightsWeek', 'flightsToday', 'totalFlights'];
      const flightDurationTypes = ['hoursYear', 'hoursMonth', 'hoursWeek', 'hoursToday', 'totalHours'];
      const soloTypes = ['soloFlightsToday', 'soloFlightsWeek', 'soloFlightsMonth', 'soloFlightsYear', 'totalSoloFlights'];
      const multiTypes = ['multiFlightsToday', 'multiFlightsWeek', 'multiFlightsMonth', 'multiFlightsYear', 'totalMultiFlights'];
      const streakTypes = ['currentStreak', 'maxStreak', 'minStreak', 'streakBreaks', 'streak'];
      const restTypes = ['currentRest', 'maxRest', 'minRest', 'restBreaks'];
      const efficiencyTypes = ['avgDuration', 'maxDuration', 'minDuration'];
      const accidentTypes = ['nightCount', 'daysSinceLastIncident'];

      const interactiveTypes = [
          ...flightCountTypes, ...flightDurationTypes, 
          ...soloTypes, ...multiTypes, 
          ...streakTypes, ...restTypes, 
          ...efficiencyTypes, ...accidentTypes
      ];
      
      // Check if it's an interactive widget
      if (interactiveTypes.includes(widget.type)) {
          setConfigWidgetId(widget.id);
      }
  };

  // Formatting helpers
  const formatDurationDisplay = (hours: number) => {
      const totalSeconds = Math.round(hours * 3600);
      const threshold1 = 999 * 60 + 59; 
      const threshold2 = 999 * 3600 + 59 * 60; 

      if (totalSeconds <= threshold1) {
          const m = Math.floor(totalSeconds / 60);
          const s = totalSeconds % 60;
          return `${m}分${s}秒`;
      } else if (totalSeconds <= threshold2) {
          const h = Math.floor(totalSeconds / 3600);
          const m = Math.floor((totalSeconds % 3600) / 60);
          return `${h}小时${m}分`;
      } else {
          const d = Math.floor(hours / 24);
          const h = Math.floor(hours % 24);
          return `${d}天${h}小时`;
      }
  };

  const formatAvgDuration = (hours: number) => {
      const totalMin = Math.round(hours * 60);
      if (totalMin < 60) return `${totalMin}m`;
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      return `${h}h${m > 0 ? m + 'm' : ''}`;
  };

  const renderWidget = (widget: Widget) => {
    const flightCountTypes = ['flightsYear', 'flightsMonth', 'flightsWeek', 'flightsToday', 'totalFlights'];
    const flightDurationTypes = ['hoursYear', 'hoursMonth', 'hoursWeek', 'hoursToday', 'totalHours'];
    const soloTypes = ['soloFlightsToday', 'soloFlightsWeek', 'soloFlightsMonth', 'soloFlightsYear', 'totalSoloFlights'];
    const multiTypes = ['multiFlightsToday', 'multiFlightsWeek', 'multiFlightsMonth', 'multiFlightsYear', 'totalMultiFlights'];
    const streakTypes = ['currentStreak', 'maxStreak', 'minStreak', 'streakBreaks', 'streak'];
    const restTypes = ['currentRest', 'maxRest', 'minRest', 'restBreaks'];
    const efficiencyTypes = ['avgDuration', 'maxDuration', 'minDuration'];
    const accidentTypes = ['nightCount', 'daysSinceLastIncident'];
    
    const isInteractive = [
        ...flightCountTypes, ...flightDurationTypes, 
        ...soloTypes, ...multiTypes, 
        ...streakTypes, ...restTypes, 
        ...efficiencyTypes, ...accidentTypes
    ].includes(widget.type) && !isEditMode;

    const customStyle = widget.customHue !== undefined ? {
        backgroundColor: `hsl(${widget.customHue}, 50%, 97%)`,
        color: `hsl(${widget.customHue}, 60%, 30%)`,
        borderColor: 'transparent',
    } : undefined;

    const content = (() => {
        switch (widget.type) {
            // --- FLIGHT COUNTS ---
            case 'flightsToday':
                return <StatCardContent icon={<Zap size={18} />} label="今日执飞" value={stats.flightsToday} unit="次" color="bg-pink-50 text-pink-900" isInteractive={isInteractive} customStyle={customStyle} />;
            case 'flightsWeek':
                return <StatCardContent icon={<CalendarRange size={18} />} label="本周执飞" value={stats.flightsThisWeek} unit="次" color="bg-violet-50 text-violet-900" isInteractive={isInteractive} customStyle={customStyle} />;
            case 'flightsYear':
                return <StatCardContent icon={<Calendar size={18} />} label="本年执飞" value={stats.flightsThisYear} unit="次" color="bg-white text-indigo-900" isInteractive={isInteractive} customStyle={customStyle} />;
            case 'flightsMonth':
                return <StatCardContent icon={<CalendarDays size={18} />} label="本月执飞" value={stats.flightsThisMonth} unit="次" color="bg-orange-50 text-orange-800" isInteractive={isInteractive} customStyle={customStyle} />;
            case 'totalFlights':
                return <StatCardContent icon={<Plane size={18} />} label="生涯总计" value={stats.totalFlights} unit="次" color="bg-white text-indigo-900" isInteractive={isInteractive} customStyle={customStyle} />;
            
            // --- FLIGHT DURATIONS ---
            case 'hoursToday':
                return <StatCardContent icon={<Clock size={18} />} label="今日飞行时长" value={formatDurationDisplay(stats.hoursToday)} unit="" color="bg-pink-50 text-pink-900" isInteractive={isInteractive} valueSize="text-2xl" customStyle={customStyle} />;
            case 'hoursWeek':
                return <StatCardContent icon={<Clock size={18} />} label="本周飞行时长" value={formatDurationDisplay(stats.hoursThisWeek)} unit="" color="bg-violet-50 text-violet-900" isInteractive={isInteractive} valueSize="text-2xl" customStyle={customStyle} />;
            case 'hoursMonth':
                return <StatCardContent icon={<Clock size={18} />} label="本月飞行时长" value={formatDurationDisplay(stats.hoursThisMonth)} unit="" color="bg-orange-50 text-orange-800" isInteractive={isInteractive} valueSize="text-2xl" customStyle={customStyle} />;
            case 'hoursYear':
                return <StatCardContent icon={<Clock size={18} />} label="本年飞行时长" value={formatDurationDisplay(stats.hoursThisYear)} unit="" color="bg-white text-indigo-900" isInteractive={isInteractive} valueSize="text-2xl" customStyle={customStyle} />;
            case 'totalHours':
                return <StatCardContent icon={<Clock size={18} />} label="生涯飞行时长" value={formatDurationDisplay(stats.totalHours)} unit="" color="bg-white text-sky-900" isInteractive={isInteractive} valueSize="text-2xl" customStyle={customStyle} />;
            
            // --- SOLO FLIGHTS ---
            case 'soloFlightsToday':
                return <StatCardContent icon={<User size={18} />} label="今日单人" value={stats.soloFlightsToday} unit="次" color="bg-sky-50 text-sky-800" isInteractive={isInteractive} customStyle={customStyle} />;
            case 'soloFlightsWeek':
                return <StatCardContent icon={<User size={18} />} label="本周单人" value={stats.soloFlightsThisWeek} unit="次" color="bg-sky-50 text-sky-800" isInteractive={isInteractive} customStyle={customStyle} />;
            case 'soloFlightsMonth':
                return <StatCardContent icon={<User size={18} />} label="本月单人" value={stats.soloFlightsThisMonth} unit="次" color="bg-sky-50 text-sky-800" isInteractive={isInteractive} customStyle={customStyle} />;
            case 'soloFlightsYear':
                return <StatCardContent icon={<User size={18} />} label="本年单人" value={stats.soloFlightsThisYear} unit="次" color="bg-sky-50 text-sky-800" isInteractive={isInteractive} customStyle={customStyle} />;
            case 'totalSoloFlights':
                return <StatCardContent icon={<User size={18} />} label="单人飞行总计" value={stats.totalSoloFlights} unit="次" color="bg-sky-50 text-sky-800" isInteractive={isInteractive} customStyle={customStyle} />;

            // --- MULTI FLIGHTS ---
            case 'multiFlightsToday':
                return <StatCardContent icon={<Users size={18} />} label="今日亲密" value={stats.multiFlightsToday} unit="次" color="bg-mint text-mint-dark" isInteractive={isInteractive} customStyle={customStyle} />;
            case 'multiFlightsWeek':
                return <StatCardContent icon={<Users size={18} />} label="本周亲密" value={stats.multiFlightsThisWeek} unit="次" color="bg-mint text-mint-dark" isInteractive={isInteractive} customStyle={customStyle} />;
            case 'multiFlightsMonth':
                return <StatCardContent icon={<Users size={18} />} label="本月亲密" value={stats.multiFlightsThisMonth} unit="次" color="bg-mint text-mint-dark" isInteractive={isInteractive} customStyle={customStyle} />;
            case 'multiFlightsYear':
                return <StatCardContent icon={<Users size={18} />} label="本年亲密" value={stats.multiFlightsThisYear} unit="次" color="bg-mint text-mint-dark" isInteractive={isInteractive} customStyle={customStyle} />;
            case 'totalMultiFlights':
                return <StatCardContent icon={<Users size={18} />} label="亲密飞行总计" value={stats.totalMultiFlights} unit="次" color="bg-mint text-mint-dark" isInteractive={isInteractive} customStyle={customStyle} />;

            // --- STREAK STATS ---
            case 'currentStreak':
                return <StatCardContent icon={<Activity size={18} />} label="本次连飞" value={stats.consecutiveDays} unit="天" color="bg-teal-50 text-teal-800" isInteractive={isInteractive} customStyle={customStyle} />;
            case 'maxStreak':
                const maxStreakVal = stats.maxStreak > 0 ? stats.maxStreak : "暂无";
                const maxStreakUnit = stats.maxStreak > 0 ? "天" : "";
                return <StatCardContent icon={<Trophy size={18} />} label="最长连飞" value={maxStreakVal} unit={maxStreakUnit} color="bg-teal-50 text-teal-800" isInteractive={isInteractive} valueSize={stats.maxStreak > 0 ? "text-4xl" : "text-xl"} customStyle={customStyle} />;
            case 'minStreak':
                const minStreakVal = stats.minStreak > 0 ? stats.minStreak : "暂无";
                const minStreakUnit = stats.minStreak > 0 ? "天" : "";
                return <StatCardContent icon={<TrendingDown size={18} />} label="最短连飞" value={minStreakVal} unit={minStreakUnit} color="bg-teal-50 text-teal-800" isInteractive={isInteractive} valueSize={stats.minStreak > 0 ? "text-4xl" : "text-xl"} customStyle={customStyle} />;
            case 'streakBreaks':
                return <StatCardContent icon={<PauseCircle size={18} />} label="连飞中断" value={stats.streakBreaks} unit="次" color="bg-teal-50 text-teal-800" isInteractive={isInteractive} customStyle={customStyle} />;

            // --- REST STATS (New) ---
            case 'currentRest':
                return <StatCardContent icon={<Coffee size={18} />} label="当前停飞" value={stats.daysSinceLastFlight} unit="天" color="bg-slate-50 text-slate-600" isInteractive={isInteractive} customStyle={customStyle} />;
            case 'maxRest':
                const maxRestVal = stats.maxRestStreak > 0 ? stats.maxRestStreak : "暂无";
                const maxRestUnit = stats.maxRestStreak > 0 ? "天" : "";
                return <StatCardContent icon={<Armchair size={18} />} label="最长停飞" value={maxRestVal} unit={maxRestUnit} color="bg-slate-50 text-slate-600" isInteractive={isInteractive} valueSize={stats.maxRestStreak > 0 ? "text-4xl" : "text-xl"} customStyle={customStyle} />;
            case 'minRest':
                const minRestVal = stats.minRestStreak > 0 ? stats.minRestStreak : "暂无";
                const minRestUnit = stats.minRestStreak > 0 ? "天" : "";
                return <StatCardContent icon={<Zap size={18} />} label="最短停飞" value={minRestVal} unit={minRestUnit} color="bg-slate-50 text-slate-600" isInteractive={isInteractive} valueSize={stats.minRestStreak > 0 ? "text-4xl" : "text-xl"} customStyle={customStyle} />;
            case 'restBreaks':
                const breaksVal = stats.restBreaks > 0 ? stats.restBreaks : "暂无";
                const breaksUnit = stats.restBreaks > 0 ? "次" : "";
                return <StatCardContent icon={<PlaneTakeoff size={18} />} label="休息中断" value={breaksVal} unit={breaksUnit} color="bg-slate-50 text-slate-600" isInteractive={isInteractive} valueSize={stats.restBreaks > 0 ? "text-4xl" : "text-xl"} customStyle={customStyle} />;

            // --- OTHERS ---
            case 'avgDuration':
                return <StatCardContent icon={<Hourglass size={18} />} label="平均时长" value={formatAvgDuration(stats.avgDuration)} unit="" color="bg-sky-50 text-sky-900" valueSize="text-2xl" isInteractive={isInteractive} customStyle={customStyle} />;
            case 'maxDuration':
                return <StatCardContent icon={<TrendingUp size={18} />} label="单次最长" value={formatAvgDuration(stats.maxDuration)} unit="" color="bg-sky-50 text-sky-900" valueSize="text-2xl" isInteractive={isInteractive} customStyle={customStyle} />;
            case 'minDuration':
                 const minDurVal = stats.totalFlights > 0 ? formatAvgDuration(stats.minDuration) : "暂无";
                 const minDurUnit = "";
                return <StatCardContent icon={<TrendingDown size={18} />} label="单次最短" value={minDurVal} unit={minDurUnit} color="bg-sky-50 text-sky-900" valueSize={stats.totalFlights > 0 ? "text-2xl" : "text-xl"} isInteractive={isInteractive} customStyle={customStyle} />;
            case 'nightCount':
                return <StatCardContent icon={<Droplets size={18} />} label="泄漏统计" value={stats.totalNightFlights} unit="次" color="bg-lavender text-lavender-dark" isInteractive={isInteractive} customStyle={customStyle} />;
            case 'daysSinceLastIncident':
                const incidentVal = stats.totalNightFlights > 0 ? stats.daysSinceLastIncident : "暂无";
                const incidentUnit = stats.totalNightFlights > 0 ? "天" : "";
                return <StatCardContent icon={<Droplets size={18} />} label="距离上一次泄漏" value={incidentVal} unit={incidentUnit} color="bg-lavender text-lavender-dark" isInteractive={isInteractive} valueSize={stats.totalNightFlights > 0 ? "text-4xl" : "text-xl"} customStyle={customStyle} />;
            
            // Legacy fallbacks
            case 'streak':
                 return <StatCardContent icon={<Activity size={18} />} label="连飞记录" value={stats.consecutiveDays} unit="天" color="bg-teal-50 text-teal-800" isInteractive={isInteractive} customStyle={customStyle} />;
            case 'soloCount':
                return <StatCardContent icon={<User size={18} />} label="单人飞行" value={stats.totalSoloFlights} unit="次" color="bg-sky-50 text-sky-800" isInteractive={isInteractive} customStyle={customStyle} />;
            case 'multiCount':
                return <StatCardContent icon={<Users size={18} />} label="亲密飞行" value={stats.totalMultiFlights} unit="次" color="bg-mint text-mint-dark" isInteractive={isInteractive} customStyle={customStyle} />;
            
            default:
                return null;
        }
    })();

    return (
        <motion.div 
            layout
            key={widget.id}
            onClick={() => handleWidgetClick(widget)}
            // Long Press Handlers
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleTouchStart}
            onMouseUp={handleTouchEnd}
            onMouseLeave={handleTouchEnd}
            
            initial={false}
            animate={isEditMode ? { 
                rotate: [0, -1.5, 1.5, -1.5, 0], // Increased shake
                transition: { 
                    repeat: Infinity, 
                    duration: 0.8,
                    ease: "easeInOut",
                    delay: Math.random() * 0.2
                } 
            } : { rotate: 0 }}
            whileHover={!isEditMode && isInteractive ? { scale: 1.02 } : isEditMode ? { scale: 1.05 } : {}}
            whileTap={!isEditMode && isInteractive ? { scale: 0.98 } : isEditMode ? { scale: 0.95 } : {}}
            draggable={isEditMode}
            onDragStart={(e) => handleDragStart(e as any, widget.id)}
            onDragOver={(e) => handleDragOver(e as any, widget.id)}
            onDragEnd={handleDragEnd}
            className={`relative group/card ${isEditMode ? 'cursor-move' : ''} ${isInteractive ? 'cursor-pointer' : ''} ${draggedId === widget.id ? 'opacity-30' : ''} touch-pan-y`}
            style={{ 
                willChange: 'transform',
                backgroundColor: customStyle?.backgroundColor,
                color: customStyle?.color,
                borderColor: customStyle?.borderColor || 'rgba(255,255,255,0.6)'
            }} 
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
        >
             <AnimatePresence>
             {isEditMode && (
                 <>
                    {/* Delete Button */}
                    <motion.button 
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        onClick={(e) => { e.stopPropagation(); removeWidget(widget.id); }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 z-30 shadow-md hover:bg-red-600 active:scale-95"
                    >
                        <X size={14} strokeWidth={3} />
                    </motion.button>
                    
                    {/* Drag Handle Indicator */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-20 border-2 border-dashed border-gray-300 rounded-[28px] bg-white/10 pointer-events-none flex items-center justify-center"
                    >
                         <GripVertical className="text-gray-400 opacity-50" />
                    </motion.div>
                 </>
             )}
             </AnimatePresence>
             {content}
        </motion.div>
    );
  };

  // Determine what type of config modal to show
  const currentWidget = configWidgetId ? widgets.find(w => w.id === configWidgetId) : null;
  const currentConfigType = currentWidget?.type;
  
  const isFlightCountWidget = currentConfigType && ['flightsToday', 'flightsWeek', 'flightsMonth', 'flightsYear', 'totalFlights'].includes(currentConfigType);
  const isDurationWidget = currentConfigType && ['hoursToday', 'hoursWeek', 'hoursMonth', 'hoursYear', 'totalHours'].includes(currentConfigType);
  const isSoloWidget = currentConfigType && ['soloFlightsToday', 'soloFlightsWeek', 'soloFlightsMonth', 'soloFlightsYear', 'totalSoloFlights', 'soloCount'].includes(currentConfigType);
  const isMultiWidget = currentConfigType && ['multiFlightsToday', 'multiFlightsWeek', 'multiFlightsMonth', 'multiFlightsYear', 'totalMultiFlights', 'multiCount'].includes(currentConfigType);
  const isStreakWidget = currentConfigType && ['currentStreak', 'maxStreak', 'minStreak', 'streakBreaks', 'streak'].includes(currentConfigType);
  const isRestWidget = currentConfigType && ['currentRest', 'maxRest', 'minRest', 'restBreaks'].includes(currentConfigType);
  const isEfficiencyWidget = currentConfigType && ['avgDuration', 'maxDuration', 'minDuration'].includes(currentConfigType);
  const isAccidentWidget = currentConfigType && ['nightCount', 'daysSinceLastIncident'].includes(currentConfigType);

  // Helper to get modal title and icon
  const getModalHeader = () => {
      if (isFlightCountWidget) return { title: '执飞统计详情', icon: <Plane size={24} /> };
      if (isDurationWidget) return { title: '飞行时长详情', icon: <Clock size={24} /> };
      if (isSoloWidget) return { title: '单人飞行详情', icon: <User size={24} /> };
      if (isMultiWidget) return { title: '亲密飞行详情', icon: <Users size={24} /> };
      if (isStreakWidget) return { title: '连飞记录详情', icon: <Activity size={24} /> };
      if (isRestWidget) return { title: '停飞记录详情', icon: <Coffee size={24} /> };
      if (isEfficiencyWidget) return { title: '效率统计详情', icon: <Hourglass size={24} /> };
      if (isAccidentWidget) return { title: '泄漏统计详情', icon: <Droplets size={24} /> };
      return { title: '详情', icon: <Activity size={24} /> };
  };

  const { title: modalTitle, icon: modalIcon } = getModalHeader();
  
  const activeHue = tempHue !== undefined ? tempHue : currentWidget?.customHue;
  const modalDynamicStyle = activeHue !== undefined ? {
      backgroundColor: `hsla(${activeHue}, 50%, 97%, 0.98)`,
      color: `hsl(${activeHue}, 60%, 30%)`,
      borderColor: `hsl(${activeHue}, 40%, 85%)`
  } : {};

  return (
    <div className="flex flex-col min-h-full space-y-6 animate-fade-in pb-36">
      
      {/* Hero Card */}
      <div className="bg-gradient-to-br from-sky-200 to-sky-50 border border-white shadow-soft-lg rounded-[40px] p-8 relative overflow-hidden min-h-[300px] flex flex-col justify-between group shrink-0">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/40 rounded-full blur-3xl"></div>
        
        {/* Decorative Clouds - Reduced for cleaner look */}
        <div className="absolute top-8 left-8 text-white/80 animate-float"><Cloud size={56} fill="currentColor" /></div>
        
        <div className="absolute bottom-24 right-8 text-yellow-200/80 animate-float" style={{ animationDelay: '1.5s' }}><Sun size={72} fill="currentColor" /></div>

        <div className="z-10 relative mt-4">
            <div className="text-4xl font-bold text-sky-900/90 leading-tight drop-shadow-sm">
                {stats.daysSinceLastFlight === 0 
                    ? "欢迎回来，\n机长。" 
                    : "准备好\n起飞了吗？"}
            </div>
        </div>

        <div className="z-10 relative flex items-end justify-between mt-4">
             <div>
                 <div className="text-xs font-bold text-sky-800/60 uppercase tracking-widest mb-1">距离上次飞行</div>
                 <div className="flex items-baseline gap-1">
                     <div className="text-6xl font-black text-sky-900/90 tracking-tighter">
                        {stats.daysSinceLastFlight}
                     </div>
                     <span className="text-lg font-bold text-sky-800/60 mb-1">天</span>
                 </div>
             </div>
             
             {/* Action Buttons */}
             <div className="flex items-end gap-3">
                 {/* Manual Add Button */}
                 <button 
                    onClick={onManualRecord}
                    className="bg-white/40 backdrop-blur-sm text-sky-800 p-3 rounded-full hover:bg-white/60 active:scale-95 transition-all shadow-sm border border-white/20"
                    title="补录日志"
                 >
                    <PenLine size={20} strokeWidth={2.5} />
                 </button>

                 {/* Takeoff Button */}
                 <button 
                    onClick={() => setShowTakeoffModal(true)}
                    className="bg-sky-600 text-white p-5 rounded-[24px] shadow-lg shadow-sky-200 hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center group/btn"
                 >
                    <PlaneTakeoff size={32} className="group-hover/btn:-translate-y-1 group-hover/btn:translate-x-1 transition-transform duration-500" />
                 </button>
             </div>
        </div>
      </div>

      {/* Control Bar for Widgets */}
      <div className="flex justify-between items-center px-2">
         <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">数据概览</span>
         <button 
            onClick={() => setIsEditMode(!isEditMode)}
            className={`text-xs font-bold px-3 py-1 rounded-full transition-all ${isEditMode ? 'bg-sky-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-100'}`}
         >
            {isEditMode ? '完成' : '编辑'}
         </button>
      </div>

      {/* Dynamic Grid - Using Framer Motion Layout */}
      <motion.div layout className="grid grid-cols-2 gap-4">
        <AnimatePresence>
            {widgets.map((widget) => renderWidget(widget))}
        </AnimatePresence>
        
        {/* Add Button */}
        <button 
            onClick={() => setShowAddModal(true)}
            className={`w-full h-32 rounded-[28px] border-2 border-dashed border-gray-200 text-gray-300 hover:text-sky-500 hover:border-sky-300 hover:bg-sky-50 transition-all flex flex-col items-center justify-center gap-2 ${isEditMode ? 'opacity-50 pointer-events-none' : ''}`}
        >
            <Plus size={24} />
            <span className="text-xs font-bold">添加卡片</span>
        </button>
      </motion.div>

      {/* Config Widget Modal (Detail View) */}
      {createPortal(
          <AnimatePresence>
          {configWidgetId && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
                  <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-sky-900/30 backdrop-blur-md"
                      onClick={() => setConfigWidgetId(null)}
                  />
                  <motion.div 
                      initial={{ opacity: 0, scale: 0.9, y: 30 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 30 }}
                      className={`backdrop-blur-xl rounded-[40px] p-8 w-full max-w-sm shadow-2xl relative border flex flex-col ${activeHue === undefined ? 'bg-white/90 border-white/40' : ''}`}
                      style={modalDynamicStyle}
                  >
                       <button 
                          onClick={() => setConfigWidgetId(null)}
                          className="absolute top-4 right-4 p-2 bg-black/5 rounded-full hover:bg-black/10 transition-colors"
                          style={{ color: 'currentColor', opacity: 0.5 }}
                      >
                          <X size={20} />
                      </button>

                      <h3 className={`text-xl font-bold mb-2 flex items-center gap-2 ${activeHue === undefined ? 'text-sky-900' : ''}`}>
                          {modalIcon}
                          {modalTitle}
                      </h3>
                      
                      {/* --- HUE SLIDER CONTROL --- */}
                      <div className="mb-6">
                         <button 
                            onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
                            className="flex items-center justify-between w-full mb-3 text-xs font-bold opacity-60 uppercase tracking-wider hover:opacity-100 transition-opacity"
                            style={{color: 'currentColor'}}
                         >
                            <div className="flex items-center gap-2">
                                <Palette size={14} /> 卡片色调
                            </div>
                            <div className="flex items-center gap-2">
                                {tempHue !== undefined && (
                                    <span 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setTempHue(undefined);
                                            updateWidgetHue(configWidgetId!, undefined);
                                        }}
                                        className="flex items-center gap-1 text-[10px] bg-black/5 px-2 py-1 rounded-full hover:bg-black/10 mr-2"
                                    >
                                        <RotateCcw size={10} /> 重置
                                    </span>
                                )}
                                {isColorPickerOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </div>
                         </button>
                         
                         <AnimatePresence>
                             {isColorPickerOpen && (
                                 <motion.div
                                     initial={{ height: 0, opacity: 0 }}
                                     animate={{ height: 'auto', opacity: 1 }}
                                     exit={{ height: 0, opacity: 0 }}
                                     className="overflow-hidden"
                                 >
                                    <div className="relative h-10 w-full rounded-full overflow-hidden shadow-inner border border-black/5 mb-2">
                                        <div className="absolute inset-0 opacity-80" style={{background: 'linear-gradient(to right, hsl(0,80%,80%), hsl(30,80%,80%), hsl(60,80%,80%), hsl(90,80%,80%), hsl(120,80%,80%), hsl(150,80%,80%), hsl(180,80%,80%), hsl(210,80%,80%), hsl(240,80%,80%), hsl(270,80%,80%), hsl(300,80%,80%), hsl(330,80%,80%), hsl(360,80%,80%))'}}></div>
                                        
                                        <input 
                                            type="range" 
                                            min="0" 
                                            max="360" 
                                            value={tempHue || 0}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                setTempHue(val);
                                                updateWidgetHue(configWidgetId!, val);
                                            }}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        />
                                        
                                        {tempHue !== undefined && (
                                            <div 
                                                className="absolute top-0 bottom-0 w-6 bg-white border-2 border-white shadow-md rounded-full pointer-events-none transition-transform duration-75 flex items-center justify-center"
                                                style={{ left: `${(tempHue / 360) * 100}%`, transform: 'translateX(-50%)' }}
                                            >
                                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: `hsl(${tempHue}, 50%, 60%)` }}></div>
                                            </div>
                                        )}

                                        {tempHue === undefined && (
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <span className="text-xs font-bold text-gray-500/80 bg-white/50 px-2 py-0.5 rounded-full backdrop-blur-sm">默认主题</span>
                                            </div>
                                        )}
                                    </div>
                                 </motion.div>
                             )}
                         </AnimatePresence>
                      </div>

                      <div className="space-y-4 max-h-[50vh] overflow-y-auto no-scrollbar pb-4">
                          {isFlightCountWidget && (
                              <>
                                <ConfigOption 
                                    isActive={currentConfigType === 'flightsToday'}
                                    label="今日执飞"
                                    value={stats.flightsToday}
                                    unit="次"
                                    sub="当日累计起落次数"
                                    icon={<Zap size={24} />}
                                    color="text-pink-600 bg-pink-50"
                                    onClick={() => updateWidgetType(configWidgetId, 'flightsToday')}
                                    customStyle={activeHue !== undefined ? { color: `hsl(${activeHue}, 60%, 40%)`, backgroundColor: 'rgba(255,255,255,0.6)' } : undefined}
                                />
                                <ConfigOption 
                                    isActive={currentConfigType === 'flightsWeek'}
                                    label="本周执飞"
                                    value={stats.flightsThisWeek}
                                    unit="次"
                                    sub="本周累计起落次数"
                                    icon={<CalendarRange size={24} />}
                                    color="text-violet-600 bg-violet-50"
                                    onClick={() => updateWidgetType(configWidgetId, 'flightsWeek')}
                                    customStyle={activeHue !== undefined ? { color: `hsl(${activeHue}, 60%, 40%)`, backgroundColor: 'rgba(255,255,255,0.6)' } : undefined}
                                />
                                <ConfigOption 
                                    isActive={currentConfigType === 'flightsMonth'}
                                    label="本月执飞"
                                    value={stats.flightsThisMonth}
                                    unit="次"
                                    sub="当月累计起落次数"
                                    icon={<CalendarDays size={24} />}
                                    color="text-orange-600 bg-orange-50"
                                    onClick={() => updateWidgetType(configWidgetId, 'flightsMonth')}
                                    customStyle={activeHue !== undefined ? { color: `hsl(${activeHue}, 60%, 40%)`, backgroundColor: 'rgba(255,255,255,0.6)' } : undefined}
                                />
                                <ConfigOption 
                                    isActive={currentConfigType === 'flightsYear'}
                                    label="本年执飞"
                                    value={stats.flightsThisYear}
                                    unit="次"
                                    sub="当年累计起落次数"
                                    icon={<Calendar size={24} />}
                                    color="text-indigo-600 bg-indigo-50"
                                    onClick={() => updateWidgetType(configWidgetId, 'flightsYear')}
                                    customStyle={activeHue !== undefined ? { color: `hsl(${activeHue}, 60%, 40%)`, backgroundColor: 'rgba(255,255,255,0.6)' } : undefined}
                                />
                                <ConfigOption 
                                    isActive={currentConfigType === 'totalFlights'}
                                    label="生涯总计"
                                    value={stats.totalFlights}
                                    unit="次"
                                    sub="职业生涯总起落次数"
                                    icon={<Plane size={24} />}
                                    color="text-sky-600 bg-sky-50"
                                    onClick={() => updateWidgetType(configWidgetId, 'totalFlights')}
                                    customStyle={activeHue !== undefined ? { color: `hsl(${activeHue}, 60%, 40%)`, backgroundColor: 'rgba(255,255,255,0.6)' } : undefined}
                                />
                              </>
                          )}

                          {isDurationWidget && (
                              <>
                                <ConfigOption 
                                    isActive={currentConfigType === 'hoursToday'}
                                    label="今日飞行时长"
                                    value={formatDurationDisplay(stats.hoursToday)}
                                    unit=""
                                    sub="当日累计飞行时间"
                                    icon={<Zap size={24} />}
                                    color="text-pink-600 bg-pink-50"
                                    onClick={() => updateWidgetType(configWidgetId, 'hoursToday')}
                                    customStyle={activeHue !== undefined ? { color: `hsl(${activeHue}, 60%, 40%)`, backgroundColor: 'rgba(255,255,255,0.6)' } : undefined}
                                />
                                <ConfigOption 
                                    isActive={currentConfigType === 'hoursWeek'}
                                    label="本周飞行时长"
                                    value={formatDurationDisplay(stats.hoursThisWeek)}
                                    unit=""
                                    sub="本周累计飞行时间"
                                    icon={<CalendarRange size={24} />}
                                    color="text-violet-600 bg-violet-50"
                                    onClick={() => updateWidgetType(configWidgetId, 'hoursWeek')}
                                    customStyle={activeHue !== undefined ? { color: `hsl(${activeHue}, 60%, 40%)`, backgroundColor: 'rgba(255,255,255,0.6)' } : undefined}
                                />
                                <ConfigOption 
                                    isActive={currentConfigType === 'hoursMonth'}
                                    label="本月飞行时长"
                                    value={formatDurationDisplay(stats.hoursThisMonth)}
                                    unit=""
                                    sub="当月累计飞行时间"
                                    icon={<CalendarDays size={24} />}
                                    color="text-orange-600 bg-orange-50"
                                    onClick={() => updateWidgetType(configWidgetId, 'hoursMonth')}
                                    customStyle={activeHue !== undefined ? { color: `hsl(${activeHue}, 60%, 40%)`, backgroundColor: 'rgba(255,255,255,0.6)' } : undefined}
                                />
                                <ConfigOption 
                                    isActive={currentConfigType === 'hoursYear'}
                                    label="本年飞行时长"
                                    value={formatDurationDisplay(stats.hoursThisYear)}
                                    unit=""
                                    sub="当年累计飞行时间"
                                    icon={<Calendar size={24} />}
                                    color="text-indigo-600 bg-indigo-50"
                                    onClick={() => updateWidgetType(configWidgetId, 'hoursYear')}
                                    customStyle={activeHue !== undefined ? { color: `hsl(${activeHue}, 60%, 40%)`, backgroundColor: 'rgba(255,255,255,0.6)' } : undefined}
                                />
                                <ConfigOption 
                                    isActive={currentConfigType === 'totalHours'}
                                    label="生涯飞行时长"
                                    value={formatDurationDisplay(stats.totalHours)}
                                    unit=""
                                    sub="生涯累计飞行时间"
                                    icon={<Clock size={24} />}
                                    color="text-sky-600 bg-sky-50"
                                    onClick={() => updateWidgetType(configWidgetId, 'totalHours')}
                                    customStyle={activeHue !== undefined ? { color: `hsl(${activeHue}, 60%, 40%)`, backgroundColor: 'rgba(255,255,255,0.6)' } : undefined}
                                />
                              </>
                          )}

                          {isSoloWidget && (
                              <>
                                <ConfigOption 
                                    isActive={currentConfigType === 'soloFlightsToday'}
                                    label="今日单人"
                                    value={stats.soloFlightsToday}
                                    unit="次"
                                    sub="当日单人飞行次数"
                                    icon={<Zap size={24} />}
                                    color="text-pink-600 bg-pink-50"
                                    onClick={() => updateWidgetType(configWidgetId, 'soloFlightsToday')}
                                    customStyle={activeHue !== undefined ? { color: `hsl(${activeHue}, 60%, 40%)`, backgroundColor: 'rgba(255,255,255,0.6)' } : undefined}
                                />
                                <ConfigOption 
                                    isActive={currentConfigType === 'soloFlightsWeek'}
                                    label="本周单人"
                                    value={stats.soloFlightsThisWeek}
                                    unit="次"
                                    sub="本周单人飞行次数"
                                    icon={<CalendarRange size={24} />}
                                    color="text-violet-600 bg-violet-50"
                                    onClick={() => updateWidgetType(configWidgetId, 'soloFlightsWeek')}
                                    customStyle={activeHue !== undefined ? { color: `hsl(${activeHue}, 60%, 40%)`, backgroundColor: 'rgba(255,255,255,0.6)' } : undefined}
                                />
                                <ConfigOption 
                                    isActive={currentConfigType === 'soloFlightsMonth'}
                                    label="本月单人"
                                    value={stats.soloFlightsThisMonth}
                                    unit="次"
                                    sub="当月单人飞行次数"
                                    icon={<CalendarDays size={24} />}
                                    color="text-orange-600 bg-orange-50"
                                    onClick={() => updateWidgetType(configWidgetId, 'soloFlightsMonth')}
                                    customStyle={activeHue !== undefined ? { color: `hsl(${activeHue}, 60%, 40%)`, backgroundColor: 'rgba(255,255,255,0.6)' } : undefined}
                                />
                                <ConfigOption 
                                    isActive={currentConfigType === 'soloFlightsYear'}
                                    label="本年单人"
                                    value={stats.soloFlightsThisYear}
                                    unit="次"
                                    sub="当年单人飞行次数"
                                    icon={<Calendar size={24} />}
                                    color="text-indigo-600 bg-indigo-50"
                                    onClick={() => updateWidgetType(configWidgetId, 'soloFlightsYear')}
                                    customStyle={activeHue !== undefined ? { color: `hsl(${activeHue}, 60%, 40%)`, backgroundColor: 'rgba(255,255,255,0.6)' } : undefined}
                                />
                                <ConfigOption 
                                    isActive={currentConfigType === 'totalSoloFlights'}
                                    label="单人总计"
                                    value={stats.totalSoloFlights}
                                    unit="次"
                                    sub="生涯单人飞行次数"
                                    icon={<User size={24} />}
                                    color="text-sky-600 bg-sky-50"
                                    onClick={() => updateWidgetType(configWidgetId, 'totalSoloFlights')}
                                    customStyle={activeHue !== undefined ? { color: `hsl(${activeHue}, 60%, 40%)`, backgroundColor: 'rgba(255,255,255,0.6)' } : undefined}
                                />
                              </>
                          )}

                          {isMultiWidget && (
                              <>
                                <ConfigOption 
                                    isActive={currentConfigType === 'multiFlightsToday'}
                                    label="今日亲密"
                                    value={stats.multiFlightsToday}
                                    unit="次"
                                    sub="当日亲密飞行次数"
                                    icon={<Zap size={24} />}
                                    color="text-pink-600 bg-pink-50"
                                    onClick={() => updateWidgetType(configWidgetId, 'multiFlightsToday')}
                                    customStyle={activeHue !== undefined ? { color: `hsl(${activeHue}, 60%, 40%)`, backgroundColor: 'rgba(255,255,255,0.6)' } : undefined}
                                />
                                <ConfigOption 
                                    isActive={currentConfigType === 'multiFlightsWeek'}
                                    label="本周亲密"
                                    value={stats.multiFlightsThisWeek}
                                    unit="次"
                                    sub="本周亲密飞行次数"
                                    icon={<CalendarRange size={24} />}
                                    color="text-violet-600 bg-violet-50"
                                    onClick={() => updateWidgetType(configWidgetId, 'multiFlightsWeek')}
                                    customStyle={activeHue !== undefined ? { color: `hsl(${activeHue}, 60%, 40%)`, backgroundColor: 'rgba(255,255,255,0.6)' } : undefined}
                                />
                                <ConfigOption 
                                    isActive={currentConfigType === 'multiFlightsMonth'}
                                    label="本月亲密"
                                    value={stats.multiFlightsThisMonth}
                                    unit="次"
                                    sub="当月亲密飞行次数"
                                    icon={<CalendarDays size={24} />}
                                    color="text-orange-600 bg-orange-50"
                                    onClick={() => updateWidgetType(configWidgetId, 'multiFlightsMonth')}
                                    customStyle={activeHue !== undefined ? { color: `hsl(${activeHue}, 60%, 40%)`, backgroundColor: 'rgba(255,255,255,0.6)' } : undefined}
                                />
                                <ConfigOption 
                                    isActive={currentConfigType === 'multiFlightsYear'}
                                    label="本年亲密"
                                    value={stats.multiFlightsThisYear}
                                    unit="次"
                                    sub="当年亲密飞行次数"
                                    icon={<Calendar size={24} />}
                                    color="text-indigo-600 bg-indigo-50"
                                    onClick={() => updateWidgetType(configWidgetId, 'multiFlightsYear')}
                                    customStyle={activeHue !== undefined ? { color: `hsl(${activeHue}, 60%, 40%)`, backgroundColor: 'rgba(255,255,255,0.6)' } : undefined}
                                />
                                <ConfigOption 
                                    isActive={currentConfigType === 'totalMultiFlights'}
                                    label="亲密总计"
                                    value={stats.totalMultiFlights}
                                    unit="次"
                                    sub="生涯亲密飞行次数"
                                    icon={<Users size={24} />}
                                    color="text-mint-dark bg-mint"
                                    onClick={() => updateWidgetType(configWidgetId, 'totalMultiFlights')}
                                    customStyle={activeHue !== undefined ? { color: `hsl(${activeHue}, 60%, 40%)`, backgroundColor: 'rgba(255,255,255,0.6)' } : undefined}
                                />
                              </>
                          )}

                          {isStreakWidget && (
                              <>
                                <ConfigOption 
                                    isActive={currentConfigType === 'currentStreak'}
                                    label="本次连飞"
                                    value={stats.consecutiveDays}
                                    unit="天"
                                    sub="当前连续执勤天数"
                                    icon={<Activity size={24} />}
                                    color="text-emerald-600 bg-emerald-50"
                                    onClick={() => updateWidgetType(configWidgetId, 'currentStreak')}
                                    customStyle={activeHue !== undefined ? { color: `hsl(${activeHue}, 60%, 40%)`, backgroundColor: 'rgba(255,255,255,0.6)' } : undefined}
                                />
                                <ConfigOption 
                                    isActive={currentConfigType === 'maxStreak'}
                                    label="最长连飞"
                                    value={stats.maxStreak > 0 ? stats.maxStreak : "暂无记录"}
                                    unit={stats.maxStreak > 0 ? "天" : ""}
                                    sub="生涯最长连续执勤纪录"
                                    icon={<Trophy size={24} />}
                                    color="text-amber-600 bg-amber-50"
                                    onClick={() => updateWidgetType(configWidgetId, 'maxStreak')}
                                    customStyle={activeHue !== undefined ? { color: `hsl(${activeHue}, 60%, 40%)`, backgroundColor: 'rgba(255,255,255,0.6)' } : undefined}
                                />
                                <ConfigOption 
                                    isActive={currentConfigType === 'streakBreaks'}
                                    label="连飞中断"
                                    value={stats.streakBreaks}
                                    unit="次"
                                    sub="连飞纪录中断总次数"
                                    icon={<PauseCircle size={24} />}
                                    color="text-red-600 bg-red-50"
                                    onClick={() => updateWidgetType(configWidgetId, 'streakBreaks')}
                                    customStyle={activeHue !== undefined ? { color: `hsl(${activeHue}, 60%, 40%)`, backgroundColor: 'rgba(255,255,255,0.6)' } : undefined}
                                />
                                <ConfigOption 
                                    isActive={currentConfigType === 'minStreak'}
                                    label="最短连飞"
                                    value={stats.minStreak > 0 ? stats.minStreak : "暂无记录"}
                                    unit={stats.minStreak > 0 ? "天" : ""}
                                    sub="单次连飞最短天数"
                                    icon={<TrendingDown size={24} />}
                                    color="text-cyan-600 bg-cyan-50"
                                    onClick={() => updateWidgetType(configWidgetId, 'minStreak')}
                                    customStyle={activeHue !== undefined ? { color: `hsl(${activeHue}, 60%, 40%)`, backgroundColor: 'rgba(255,255,255,0.6)' } : undefined}
                                />
                              </>
                          )}

                          {isRestWidget && (
                              <>
                                <ConfigOption 
                                    isActive={currentConfigType === 'currentRest'}
                                    label="当前停飞"
                                    value={stats.daysSinceLastFlight}
                                    unit="天"
                                    sub="距离上次飞行天数"
                                    icon={<Coffee size={24} />}
                                    color="text-sky-600 bg-sky-50"
                                    onClick={() => updateWidgetType(configWidgetId, 'currentRest')}
                                    customStyle={activeHue !== undefined ? { color: `hsl(${activeHue}, 60%, 40%)`, backgroundColor: 'rgba(255,255,255,0.6)' } : undefined}
                                />
                                <ConfigOption 
                                    isActive={currentConfigType === 'maxRest'}
                                    label="最长停飞"
                                    value={stats.maxRestStreak > 0 ? stats.maxRestStreak : "暂无记录"}
                                    unit={stats.maxRestStreak > 0 ? "天" : ""}
                                    sub="生涯最长休息期"
                                    icon={<Armchair size={24} />}
                                    color="text-amber-600 bg-amber-50"
                                    onClick={() => updateWidgetType(configWidgetId, 'maxRest')}
                                    customStyle={activeHue !== undefined ? { color: `hsl(${activeHue}, 60%, 40%)`, backgroundColor: 'rgba(255,255,255,0.6)' } : undefined}
                                />
                                <ConfigOption 
                                    isActive={currentConfigType === 'restBreaks'}
                                    label="休息中断"
                                    value={stats.restBreaks > 0 ? stats.restBreaks : "暂无记录"}
                                    unit={stats.restBreaks > 0 ? "次" : ""}
                                    sub="停飞记录被中断次数 (执勤次数)"
                                    icon={<PlaneTakeoff size={24} />}
                                    color="text-rose-600 bg-rose-50"
                                    onClick={() => updateWidgetType(configWidgetId, 'restBreaks')}
                                    customStyle={activeHue !== undefined ? { color: `hsl(${activeHue}, 60%, 40%)`, backgroundColor: 'rgba(255,255,255,0.6)' } : undefined}
                                />
                                <ConfigOption 
                                    isActive={currentConfigType === 'minRest'}
                                    label="最短停飞"
                                    value={stats.minRestStreak > 0 ? stats.minRestStreak : "暂无记录"}
                                    unit={stats.minRestStreak > 0 ? "天" : ""}
                                    sub="最短飞行间隔天数"
                                    icon={<Zap size={24} />}
                                    color="text-teal-600 bg-teal-50"
                                    onClick={() => updateWidgetType(configWidgetId, 'minRest')}
                                    customStyle={activeHue !== undefined ? { color: `hsl(${activeHue}, 60%, 40%)`, backgroundColor: 'rgba(255,255,255,0.6)' } : undefined}
                                />
                              </>
                          )}

                          {isEfficiencyWidget && (
                              <>
                                <ConfigOption 
                                    isActive={currentConfigType === 'avgDuration'}
                                    label="平均时长"
                                    value={formatAvgDuration(stats.avgDuration)}
                                    unit=""
                                    sub="平均每次飞行耗时"
                                    icon={<Hourglass size={24} />}
                                    color="text-blue-600 bg-blue-50"
                                    onClick={() => updateWidgetType(configWidgetId, 'avgDuration')}
                                    customStyle={activeHue !== undefined ? { color: `hsl(${activeHue}, 60%, 40%)`, backgroundColor: 'rgba(255,255,255,0.6)' } : undefined}
                                />
                                <ConfigOption 
                                    isActive={currentConfigType === 'maxDuration'}
                                    label="单次最长"
                                    value={formatAvgDuration(stats.maxDuration)}
                                    unit=""
                                    sub="生涯最长单次飞行时长"
                                    icon={<TrendingUp size={24} />}
                                    color="text-purple-600 bg-purple-50"
                                    onClick={() => updateWidgetType(configWidgetId, 'maxDuration')}
                                    customStyle={activeHue !== undefined ? { color: `hsl(${activeHue}, 60%, 40%)`, backgroundColor: 'rgba(255,255,255,0.6)' } : undefined}
                                />
                                <ConfigOption 
                                    isActive={currentConfigType === 'minDuration'}
                                    label="单次最短"
                                    value={stats.totalFlights > 0 ? formatAvgDuration(stats.minDuration) : "暂无记录"}
                                    unit=""
                                    sub="生涯最短单次飞行时长"
                                    icon={<TrendingDown size={24} />}
                                    color="text-orange-600 bg-orange-50"
                                    onClick={() => updateWidgetType(configWidgetId, 'minDuration')}
                                    customStyle={activeHue !== undefined ? { color: `hsl(${activeHue}, 60%, 40%)`, backgroundColor: 'rgba(255,255,255,0.6)' } : undefined}
                                />
                              </>
                          )}

                          {isAccidentWidget && (
                               <>
                                <ConfigOption 
                                    isActive={currentConfigType === 'nightCount'}
                                    label="泄漏统计"
                                    value={stats.totalNightFlights}
                                    unit="次"
                                    sub="泄漏事故发生总次数"
                                    icon={<Droplets size={24} />}
                                    color="text-purple-600 bg-purple-50"
                                    onClick={() => updateWidgetType(configWidgetId, 'nightCount')}
                                    customStyle={activeHue !== undefined ? { color: `hsl(${activeHue}, 60%, 40%)`, backgroundColor: 'rgba(255,255,255,0.6)' } : undefined}
                                />
                                <ConfigOption 
                                    isActive={currentConfigType === 'daysSinceLastIncident'}
                                    label="距离上一次泄漏"
                                    value={stats.totalNightFlights > 0 ? stats.daysSinceLastIncident : "暂无记录"}
                                    unit={stats.totalNightFlights > 0 ? "天" : ""}
                                    sub="距离上次泄漏事故天数"
                                    icon={<CheckCircle2 size={24} />}
                                    color="text-green-600 bg-green-50"
                                    onClick={() => updateWidgetType(configWidgetId, 'daysSinceLastIncident')}
                                    customStyle={activeHue !== undefined ? { color: `hsl(${activeHue}, 60%, 40%)`, backgroundColor: 'rgba(255,255,255,0.6)' } : undefined}
                                />
                               </>
                          )}
                      </div>

                      <p className="text-center text-xs text-gray-400 mt-2 font-bold opacity-60">
                          点击上方卡片可切换首页显示的数据
                      </p>
                  </motion.div>
              </div>
          )}
          </AnimatePresence>,
          document.body
      )}

      {/* Takeoff Selection Modal */}
      {createPortal(
          <AnimatePresence>
          {showTakeoffModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
                  {/* Backdrop */}
                  <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-sky-900/30 backdrop-blur-md"
                      onClick={() => setShowTakeoffModal(false)}
                  />
                  
                  <motion.div 
                      initial={{ opacity: 0, scale: 0.9, y: 30 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 30 }}
                      className="bg-white/90 backdrop-blur-xl rounded-[40px] p-8 w-full max-w-sm shadow-2xl relative border border-white/40 flex flex-col items-center"
                  >
                      {/* Close Button */}
                      <button 
                          onClick={() => setShowTakeoffModal(false)}
                          className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
                      >
                          <X size={20} />
                      </button>

                      <h3 className="text-xl font-bold text-sky-900 mb-8 flex items-center gap-2">
                          <PlaneTakeoff size={24} />
                          选择飞行模式
                      </h3>

                      <div className="flex flex-col gap-3 w-full">
                           <TakeoffOption 
                              icon={<User size={28} />} 
                              label="单人飞行"
                              sub="记录单人飞行时数"
                              color="bg-sky-100 text-sky-600"
                              onClick={() => handleTakeoffSelect('single')}
                            />
                            <TakeoffOption 
                              icon={<Users size={28} />} 
                              label="亲密飞行"
                              sub="记录双人/机组飞行"
                              color="bg-mint text-mint-dark"
                              onClick={() => handleTakeoffSelect('multi')}
                            />
                            <TakeoffOption 
                              icon={<Droplets size={28} />} 
                              label="泄漏事故" 
                              sub="记录夜间或特殊事件"
                              color="bg-lavender text-lavender-dark"
                              onClick={() => handleTakeoffSelect('night')}
                            />
                      </div>
                  </motion.div>
              </div>
          )}
          </AnimatePresence>,
          document.body
      )}

      {/* Add Widget Modal */}
      {createPortal(
          <AnimatePresence>
          {showAddModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                  <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm"
                      onClick={() => setShowAddModal(false)}
                  />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="bg-white/95 backdrop-blur-xl rounded-[32px] p-6 w-full max-w-sm shadow-2xl relative border border-white/20 max-h-[80vh] overflow-y-auto no-scrollbar"
                  >
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="text-lg font-bold text-gray-700">添加数据卡片</h3>
                          <button onClick={() => setShowAddModal(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-500">
                              <X size={16} />
                          </button>
                      </div>
                      
                      <div className="space-y-3 p-1">
                          <AddItem label="执飞统计" sub="查看日、周、月、年及生涯执飞数据" icon={<CalendarRange size={20}/>} color="bg-violet-50 text-violet-700" onClick={() => addWidget('flightsWeek')} />
                          <AddItem label="飞行时长" sub="查看日、周、月、年及生涯飞行时长" icon={<Clock size={20}/>} color="bg-pink-50 text-pink-700" onClick={() => addWidget('hoursWeek')} />
                          <AddItem label="单人飞行" sub="统计日、周、月、年及生涯单人数据" icon={<User size={20}/>} color="bg-sky-50 text-sky-700" onClick={() => addWidget('soloFlightsWeek')} />
                          <AddItem label="亲密飞行" sub="统计日、周、月、年及生涯亲密数据" icon={<Users size={20}/>} color="bg-mint text-mint-dark" onClick={() => addWidget('multiFlightsWeek')} />
                          <AddItem label="连飞记录" sub="查看最长连飞、中断次数等" icon={<Activity size={20}/>} color="bg-emerald-50 text-emerald-700" onClick={() => addWidget('currentStreak')} />
                          <AddItem label="停飞记录" sub="查看最长停飞、休息中断等" icon={<Coffee size={20}/>} color="bg-slate-50 text-slate-600" onClick={() => addWidget('currentRest')} />
                          <AddItem label="效率统计" sub="平均时长、单次最长/最短飞行" icon={<Hourglass size={20}/>} color="bg-blue-50 text-blue-700" onClick={() => addWidget('avgDuration')} />
                          <AddItem label="泄漏统计" sub="泄漏事故发生总次数" icon={<Droplets size={20}/>} color="bg-lavender text-lavender-dark" onClick={() => addWidget('nightCount')} />
                      </div>
                  </motion.div>
              </div>
          )}
          </AnimatePresence>,
          document.body
      )}
    </div>
  );
};

const StatCardContent = ({ icon, label, value, unit, color, isInteractive, valueSize = "text-4xl", customStyle }: any) => {
    const bgClass = customStyle ? '' : color.split(' ')[0];
    const textClass = customStyle ? '' : color.split(' ')[1];
    
    return (
    <div 
        className={`
            h-32 rounded-[28px] p-4 flex flex-col justify-between shadow-soft border border-white/60 transition-all overflow-hidden
            ${bgClass} 
            ${isInteractive ? 'group-hover/card:shadow-lg' : ''}
        `}
        style={customStyle ? { backgroundColor: customStyle.backgroundColor, color: customStyle.color, borderColor: customStyle.borderColor } : {}}
    >
        <div className="flex justify-between items-start">
            <div 
                className={`p-2 rounded-xl bg-white/60 backdrop-blur-sm ${textClass}`}
                style={customStyle ? { color: customStyle.color } : {}}
            >
                {icon}
            </div>
            {isInteractive && (
                <ArrowRight 
                    size={16} 
                    className={`opacity-0 group-hover/card:opacity-100 transition-opacity ${textClass}`}
                    style={customStyle ? { color: customStyle.color } : {}}
                />
            )}
        </div>
        <div>
             <div className="text-xs font-bold opacity-80 uppercase tracking-wider mb-1">{label}</div>
             <div className="flex items-baseline gap-1">
                 <span 
                    className={`${valueSize} font-black tracking-tight ${textClass}`}
                    style={customStyle ? { color: customStyle.color } : {}}
                 >{value}</span>
                 {unit && <span className="text-xs font-bold opacity-60">{unit}</span>}
             </div>
        </div>
    </div>
    )
};

const ConfigOption = ({ isActive, label, value, unit, sub, icon, color, onClick, customStyle }: any) => (
    <button 
        onClick={onClick}
        className={`w-full flex items-center gap-4 p-4 rounded-3xl border transition-all ${
            isActive 
                ? 'shadow-sm' 
                : 'bg-white border-transparent hover:bg-gray-50'
        } ${isActive && !customStyle ? 'bg-sky-50 border-sky-200' : ''}`}
        style={isActive && customStyle ? { backgroundColor: customStyle.backgroundColor, borderColor: customStyle.color.replace('0.6', '0.3') } : {}}
    >
        <div 
            className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}
            style={isActive && customStyle ? { color: customStyle.color, backgroundColor: 'rgba(255,255,255,0.5)' } : {}}
        >
            {icon}
        </div>
        <div className="flex-1 text-left">
            <div className="flex items-baseline justify-between">
                <span 
                    className={`font-bold ${isActive ? 'text-sky-900' : 'text-gray-700'}`}
                    style={isActive && customStyle ? { color: customStyle.color } : {}}
                >{label}</span>
                <div className="flex items-center gap-2">
                    {isActive && (
                        <span 
                            className="bg-sky-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0"
                            style={customStyle ? { backgroundColor: customStyle.color } : {}}
                        >当前</span>
                    )}
                    <span 
                        className={`text-lg font-black ${isActive ? 'text-sky-700' : 'text-gray-400'}`}
                        style={isActive && customStyle ? { color: customStyle.color } : {}}
                    >
                        {value}<span className="text-xs ml-0.5 font-bold opacity-60">{unit}</span>
                    </span>
                </div>
            </div>
            <div className="text-xs text-gray-400 font-bold mt-0.5">{sub}</div>
        </div>
    </button>
);

const TakeoffOption = ({ icon, label, sub, color, onClick }: any) => (
    <button 
        onClick={onClick}
        className="w-full px-5 py-5 rounded-[24px] border border-gray-100 bg-white hover:border-sky-200 hover:bg-gray-50/50 flex items-center gap-4 transition-all group text-left shadow-sm hover:shadow-md active:scale-98"
    >
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${color} shadow-sm shrink-0`}>
            {icon}
        </div>
        <div>
            <div className="text-base font-bold text-gray-700">{label}</div>
            <div className="text-xs text-gray-400 font-medium">{sub}</div>
        </div>
         <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-sky-500">
            <PlaneTakeoff size={20} />
        </div>
    </button>
);

const AddItem = ({ label, sub, icon, color, onClick }: any) => (
    <button 
        onClick={onClick}
        className="flex items-center gap-4 w-full p-4 rounded-2xl bg-white border border-gray-100 hover:border-sky-300 hover:shadow-md transition-all group text-left active:scale-98 touch-manipulation"
    >
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${color}`}>
            {icon}
        </div>
        <div className="flex-1">
            <div className="text-base font-bold text-gray-700">{label}</div>
            <div className="text-xs text-gray-400 font-medium">{sub}</div>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-sky-500">
            <CheckCircle2 size={20} />
        </div>
    </button>
);