import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FlightLog, FlightType, FlightRatings, MoodType } from '../types';
import { 
    User, Users, Moon, Play, Pause, Square, 
    Star, ArrowLeft, Check, Cloud, Timer as TimerIcon, FileText, CalendarDays,
    ChevronLeft, ChevronRight, X, Plane, Droplets
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, format, addMonths, subMonths, 
  isSameMonth, isSameDay, getDate
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

interface FlightRecorderProps {
  mode: 'timer' | 'manual';
  initialType?: FlightType;
  initialDate?: Date; // Added prop
  onCancel: () => void;
  onSave: (log: FlightLog) => void;
}

type Step = 'selection' | 'timer' | 'evaluation' | 'manual-input';

const MOODS: { id: MoodType; label: string; emoji: string }[] = [
    { id: 'tired', label: '疲惫', emoji: '😫' },
    { id: 'normal', label: '平常', emoji: '😐' },
    { id: 'comfortable', label: '舒适', emoji: '😌' },
    { id: 'happy', label: '愉悦', emoji: '😆' },
];

export const FlightRecorder: React.FC<FlightRecorderProps> = ({ mode, initialType, initialDate, onCancel, onSave }) => {
  // Determine initial step and state based on props
  const [step, setStep] = useState<Step>(() => {
    if (mode === 'manual') return 'manual-input';
    if (initialType) {
        return initialType === 'night' ? 'evaluation' : 'timer';
    }
    return 'selection';
  });
  
  // Flight Data
  const [flightType, setFlightType] = useState<FlightType>(initialType || 'single');
  const [startTime, setStartTime] = useState<number | null>(() => {
      // Auto start if in timer mode and not night
      if (mode === 'timer' && initialType && initialType !== 'night') return Date.now();
      return null;
  });
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  
  // Transition State
  const [isLanding, setIsLanding] = useState(false);

  // Manual Entry State
  const [manualDate, setManualDate] = useState(initialDate || new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(initialDate || new Date());

  const [manualMinutes, setManualMinutes] = useState(0);
  const [manualSeconds, setManualSeconds] = useState(0);

  // Timer State
  const [isRunning, setIsRunning] = useState(() => {
       // Auto run if in timer mode and not night
       return mode === 'timer' && initialType !== undefined && initialType !== 'night';
  });
  const timerRef = useRef<number | null>(null);

  // Evaluation State
  const [ratings, setRatings] = useState<FlightRatings>({ preFlight: 0, inFlight: 0, postFlight: 0 });
  const [mood, setMood] = useState<MoodType | undefined>(undefined);
  const [notes, setNotes] = useState('');

  // Timer Logic
  useEffect(() => {
    if (isRunning) {
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  const handleStartTimer = (type: FlightType) => {
    setFlightType(type);
    setStartTime(Date.now());

    if (type === 'night') {
        // Night mode skips timer
        setStep('evaluation');
        setElapsedSeconds(0); 
    } else {
        setStep('timer');
        setIsRunning(true);
    }
  };

  const handleEndFlight = () => {
    // For single/multi flights, show landing animation
    if (flightType !== 'night') {
        setIsLanding(true);
        setTimeout(() => {
            setIsRunning(false);
            setStep('evaluation');
            setIsLanding(false);
        }, 1500); // 1.5s animation duration
    } else {
        setIsRunning(false);
        setStep('evaluation');
    }
  };

  const handleManualSave = () => {
      let totalSeconds = 0;
      if (flightType !== 'night') {
          totalSeconds = (manualMinutes * 60) + manualSeconds;
      }
      
      const date = new Date(manualDate);
      // Logic: If user selected "today" (by date), use current time for better sorting order.
      // Otherwise default to noon so it doesn't look weird.
      if (new Date().toDateString() === date.toDateString()) {
           const now = new Date();
           date.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
      } else {
          date.setHours(12, 0, 0, 0);
      }
      
      const hours = totalSeconds / 3600;
      
      const newLog: FlightLog = {
        id: uuidv4(),
        date: date.toISOString(),
        type: flightType,
        flightTime: parseFloat(hours.toFixed(4)),
        ratings,
        mood,
        notes,
        createdAt: Date.now(),
        departure: 'FLY',
        arrival: 'LAND',
        aircraftType: 'AUTO'
      };
      onSave(newLog);
  };

  const handleTimerSave = () => {
    const hours = elapsedSeconds / 3600;
    const newLog: FlightLog = {
      id: uuidv4(),
      date: new Date(startTime || Date.now()).toISOString(),
      type: flightType,
      flightTime: parseFloat(hours.toFixed(4)),
      ratings,
      mood,
      notes,
      createdAt: Date.now(),
      departure: 'FLY',
      arrival: 'LAND',
      aircraftType: 'AUTO'
    };
    onSave(newLog);
  };

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    if (m >= 60) {
        const h = Math.floor(m / 60);
        const remM = m % 60;
        return `${h}:${remM.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Calendar Calculation for Manual Input
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(calendarMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(calendarMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [calendarMonth]);

  const prevMonth = () => setCalendarMonth(subMonths(calendarMonth, 1));
  const nextMonth = () => setCalendarMonth(addMonths(calendarMonth, 1));
  const selectDate = (day: Date) => {
      setManualDate(day);
      setShowCalendar(false);
  };

  const getLabelForType = (type: FlightType) => {
      switch(type) {
          case 'single': return '单人飞行';
          case 'multi': return '亲密飞行';
          case 'night': return '泄漏事故';
          default: return '';
      }
  }

  // --- RENDER STEPS ---

  // 1. MANUAL INPUT (Merged with Evaluation)
  if (step === 'manual-input') {
      return (
        <div className="h-full flex flex-col pt-6 px-4 animate-slide-up pb-safe">
            <div className="flex items-center mb-6 px-2">
                <button onClick={onCancel} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors -ml-2">
                    <ArrowLeft size={24} />
                </button>
                <h2 className="text-xl font-bold text-fresh-text ml-2">补录日志</h2>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto pb-20 no-scrollbar">
                {/* Type Selection - Animated Tabs */}
                <div className="bg-white rounded-[28px] p-2 shadow-soft border border-white/60 flex relative">
                     {(['single', 'multi', 'night'] as FlightType[]).map(t => {
                         const isActive = flightType === t;
                         return (
                             <button
                                key={t}
                                onClick={() => setFlightType(t)}
                                className={`flex-1 py-3 rounded-3xl text-sm font-bold transition-colors relative z-10 ${
                                    isActive ? 'text-sky-700' : 'text-gray-400 hover:text-gray-600'
                                }`}
                                style={{ WebkitTapHighlightColor: 'transparent' }}
                             >
                                 {isActive && (
                                     <motion.div
                                        layoutId="flightTypePill"
                                        className="absolute inset-0 bg-sky-100 shadow-sm rounded-3xl z-[-1]"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                     />
                                 )}
                                 {getLabelForType(t)}
                             </button>
                         );
                     })}
                </div>

                {/* Date Picker */}
                <div className="bg-white rounded-[28px] shadow-soft border border-white/60 overflow-hidden transition-all">
                     <button 
                        onClick={() => setShowCalendar(!showCalendar)}
                        className="w-full p-6 flex items-center justify-between"
                     >
                         <div className="flex items-center gap-3 text-sky-700">
                             <CalendarDays size={24} />
                             <span className="font-bold">日期</span>
                         </div>
                         <div className={`text-fresh-text font-bold bg-gray-50 px-4 py-2 rounded-xl transition-colors ${showCalendar ? 'bg-sky-50 text-sky-700' : ''}`}>
                             {format(manualDate, 'yyyy年 MM月 dd日', { locale: zhCN })}
                         </div>
                     </button>
                     
                     <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showCalendar ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="px-6 pb-6 pt-2 border-t border-gray-50">
                            <div className="flex items-center justify-between mb-4">
                                <button onClick={(e) => {e.stopPropagation(); prevMonth()}} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft size={20}/></button>
                                <span className="text-sm font-bold text-gray-600">{format(calendarMonth, 'yyyy年 MM月')}</span>
                                <button onClick={(e) => {e.stopPropagation(); nextMonth()}} className="p-2 hover:bg-gray-100 rounded-full"><ChevronRight size={20}/></button>
                            </div>
                            <div className="grid grid-cols-7 mb-2 text-center">
                                {['一', '二', '三', '四', '五', '六', '日'].map(d => (
                                    <div key={d} className="text-[10px] text-gray-400 font-bold">{d}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                                {calendarDays.map((day, idx) => {
                                    const isSelected = isSameDay(day, manualDate);
                                    const isCurrent = isSameMonth(day, calendarMonth);
                                    return (
                                        <button 
                                            key={idx}
                                            onClick={() => selectDate(day)}
                                            className={`
                                                aspect-square rounded-xl text-xs font-bold flex items-center justify-center transition-all
                                                ${!isCurrent ? 'opacity-20' : ''}
                                                ${isSelected 
                                                    ? 'bg-sky-600 text-white shadow-md' 
                                                    : 'hover:bg-gray-50 text-gray-700'
                                                }
                                            `}
                                        >
                                            {getDate(day)}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                     </div>
                </div>

                {/* Duration Picker - HIDDEN FOR NIGHT MODE */}
                {flightType !== 'night' && (
                    <div className="bg-white rounded-[28px] p-6 shadow-soft border border-white/60 animate-fade-in">
                        <div className="flex items-center gap-3 text-sky-700 mb-4">
                             <TimerIcon size={24} />
                             <span className="font-bold">飞行时长</span>
                         </div>
                         <div className="flex items-center justify-center h-48 relative">
                             <div className="absolute top-1/2 left-4 right-4 h-12 -translate-y-1/2 bg-sky-50 rounded-xl border border-sky-100 pointer-events-none z-0"></div>
                             
                             <div className="flex flex-col items-center w-24 relative z-10 -translate-y-3">
                                <span className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">分钟</span>
                                <ScrollWheel 
                                    range={180} 
                                    value={manualMinutes}
                                    onChange={setManualMinutes}
                                />
                             </div>

                             <div className="h-16 w-[1px] bg-gray-100 mx-4"></div>

                             <div className="flex flex-col items-center w-24 relative z-10 -translate-y-3">
                                <span className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">秒</span>
                                <ScrollWheel 
                                    range={60} 
                                    value={manualSeconds}
                                    onChange={setManualSeconds}
                                />
                             </div>
                         </div>
                    </div>
                )}

                {/* Ratings Section */}
                <div className="bg-white rounded-[28px] p-6 shadow-soft border border-white/60">
                    <div className="flex items-center gap-3 text-sky-700 mb-4">
                        <Star size={24} />
                        <span className="font-bold">状态评价</span>
                    </div>
                    <div className="flex flex-col gap-5 py-2">
                        {flightType === 'night' ? (
                            <>
                                <RatingRow label="昨晚休息" sub="Last Night" value={ratings.preFlight} onChange={(v) => setRatings({...ratings, preFlight: v})} />
                                <div className="h-px bg-gray-50"></div>
                                <RatingRow label="晨间状态" sub="Morning" value={ratings.postFlight} onChange={(v) => setRatings({...ratings, postFlight: v})} />
                            </>
                        ) : (
                            <>
                                <RatingRow label="航前准备" sub="Pre-Flight" value={ratings.preFlight} onChange={(v) => setRatings({...ratings, preFlight: v})} />
                                <div className="h-px bg-gray-50"></div>
                                <RatingRow label="飞行状态" sub="In-Flight" value={ratings.inFlight} onChange={(v) => setRatings({...ratings, inFlight: v})} />
                                <div className="h-px bg-gray-50"></div>
                                <RatingRow label="落地讲评" sub="Post-Flight" value={ratings.postFlight} onChange={(v) => setRatings({...ratings, postFlight: v})} />
                            </>
                        )}
                    </div>
                </div>

                {/* Mood & Notes */}
                <div className="bg-white rounded-[28px] p-6 shadow-soft border border-white/60">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 block text-center">
                        {flightType === 'night' ? '醒来心情' : '整体心情'}
                    </label>
                    <div className="flex justify-between gap-2 mb-6">
                        {MOODS.map((m) => (
                            <button
                                key={m.id}
                                onClick={() => setMood(m.id)}
                                className={`flex-1 flex flex-col items-center gap-2 py-3 rounded-2xl transition-all ${
                                    mood === m.id 
                                        ? 'bg-sky-50 ring-2 ring-sky-200 scale-105' 
                                        : 'hover:bg-gray-50 opacity-60 hover:opacity-100'
                                }`}
                            >
                                <span className="text-2xl">{m.emoji}</span>
                            </button>
                        ))}
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-1 border border-gray-100 h-32">
                        <textarea 
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="备注..."
                            className="w-full h-full bg-transparent p-4 text-fresh-text placeholder:text-gray-300 outline-none resize-none text-sm"
                        />
                    </div>
                </div>
            </div>

            <button 
                onClick={handleManualSave}
                className="w-full bg-sky-800 text-white rounded-2xl py-4 shadow-xl shadow-sky-900/20 hover:shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 font-bold text-lg mb-8"
            >
                <Check size={20} />
                <span>保存记录</span>
            </button>
        </div>
      );
  }

  // 2. SELECTION SCREEN - DEPRECATED / FALLBACK
  if (step === 'selection') {
    return (
      <div className="h-full flex flex-col pt-6 px-4 animate-slide-up">
        {/* ... Existing Selection ... */}
        <div className="flex items-center mb-6 px-2">
            <button onClick={onCancel} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors -ml-2">
                <ArrowLeft size={24} />
            </button>
            <h2 className="text-xl font-bold text-fresh-text ml-2">新建飞行</h2>
        </div>

        <div className="flex-1 flex flex-col gap-4">
            <div className="text-sm font-bold text-gray-400 uppercase tracking-wider px-2 mb-2">选择模式</div>
            <OptionButton 
                icon={<User size={28} />} 
                label="单人飞行" 
                subLabel="Solo Flight"
                color="bg-sky-100 text-sky-600"
                onClick={() => handleStartTimer('single')}
            />
            <OptionButton 
                icon={<Users size={28} />} 
                label="亲密飞行" 
                subLabel="Intimate Flight"
                color="bg-mint text-mint-dark"
                onClick={() => handleStartTimer('multi')}
            />
            <OptionButton 
                icon={<Droplets size={28} />} 
                label="泄漏事故" 
                subLabel="Leakage Accident"
                color="bg-lavender text-lavender-dark"
                onClick={() => handleStartTimer('night')}
            />
        </div>
      </div>
    );
  }

  // 3. TIMER SCREEN
  if (step === 'timer') {
    return (
      <div className="h-full flex flex-col pt-6 px-4 animate-fade-in pb-12 relative overflow-hidden">
         {/* Top Header */}
         <div className="flex items-center justify-between mb-6 px-2">
             <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                 <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">正在飞行</span>
             </div>
             <div className="px-3 py-1 bg-white rounded-full text-xs font-bold text-sky-600 shadow-sm border border-sky-100">
                 {getLabelForType(flightType)}
             </div>
         </div>

         {/* Visual Card */}
         <div className="bg-gradient-to-b from-sky-200 to-sky-50 rounded-[32px] aspect-[4/3] relative overflow-hidden shadow-soft-lg mb-8 border-4 border-white">
             {/* Clouds */}
             <div className="absolute inset-0">
                 <div className={`absolute top-10 flex gap-40 w-[200%] transition-transform ${isRunning ? 'animate-float-left' : ''}`} style={{ animationDuration: '20s' }}>
                    <Cloud size={60} className="text-white/80" fill="currentColor" />
                    <Cloud size={80} className="text-white/60 mt-10" fill="currentColor" />
                 </div>
             </div>

             {/* Top-down Plane Animation - Lucide Icon Version */}
             <div className={`absolute inset-0 flex items-center justify-center transition-transform duration-1000 ${isRunning ? 'animate-float' : ''}`}>
                 <div className={`transition-transform duration-500 ${isRunning ? 'scale-110' : 'scale-100'}`}>
                    <Plane 
                        size={80} 
                        strokeWidth={1.5}
                        className="text-white drop-shadow-xl rotate-45"
                        fill="currentColor"
                        fillOpacity={0.9}
                    />
                 </div>
             </div>
         </div>

         {/* Timer Display */}
         <div className="flex-1 flex flex-col items-center">
             <div className={`text-6xl font-sans font-bold tracking-tighter tabular-nums mb-2 transition-colors duration-300 ${isRunning ? 'text-sky-900' : 'text-gray-300'}`}>
                 {formatTime(elapsedSeconds)}
             </div>
             <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">飞行时长</span>
         </div>

         {/* Controls - FIXED ALIGNMENT */}
         <div className="flex items-center justify-around w-full px-6 mt-auto pb-6 relative">
             {/* Cancel Button with Long Press (2s) - Circle */}
             <LongPressButton 
                 icon={<X size={28} strokeWidth={2.5} />}
                 onTrigger={onCancel}
                 colorClass="text-gray-400 hover:text-red-500 hover:bg-red-50"
                 progressColor="#f87171"
                 label="长按取消"
             />

             {/* Play/Pause - Centered - No Spacer - Label absolutely positioned */}
             <div className="relative flex flex-col items-center justify-center">
                <button 
                    onClick={() => setIsRunning(!isRunning)}
                    className={`w-24 h-24 rounded-full flex items-center justify-center shadow-xl active:scale-95 transition-all relative ${
                        isRunning 
                            ? 'bg-amber-100 text-amber-500 hover:bg-amber-200 ring-4 ring-amber-50' 
                            : 'bg-green-500 text-white shadow-green-200 hover:bg-green-600 ring-4 ring-green-100'
                    }`}
                >
                    {isRunning ? <Pause size={40} fill="currentColor" /> : <Play size={40} fill="currentColor" className="ml-2" />}
                </button>
                {/* Empty label holder to reserve same space if needed, or just abs pos */}
                {/* We rely on align-items:center of the row to align the circles if LongPressButton is purely circular in flow */}
             </div>
             
             {/* Stop/Finish Button with Long Press (2s) - Circle */}
             <LongPressButton 
                 icon={<Square size={24} fill="currentColor" />}
                 onTrigger={handleEndFlight}
                 colorClass="text-sky-600 hover:bg-sky-50 border border-sky-100"
                 progressColor="#0ea5e9"
                 label="长按结束"
             />
         </div>

         {/* Landing Transition Overlay */}
         <AnimatePresence>
            {isLanding && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 z-[200] bg-sky-50 flex items-center justify-center overflow-hidden"
                >
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-sky-800 font-bold text-xl tracking-widest uppercase mb-32 font-sans"
                    >
                        降落中...
                    </motion.div>

                    <div className="absolute inset-0">
                         {/* Moving Plane - Landing trajectory (Top Left to Bottom Right) */}
                         <motion.div
                            initial={{ x: -300, y: -300, scale: 4, rotate: 15 }}
                            animate={{ x: 0, y: 0, scale: 1, rotate: 0 }}
                            transition={{ duration: 1.5, ease: "easeInOut" }}
                            className="absolute top-1/2 left-1/2 -ml-12 -mt-12 text-sky-600"
                         >
                             <Plane size={96} fill="currentColor" />
                         </motion.div>

                         {/* Passing Clouds - Moving Upwards to simulate descent */}
                         <motion.div 
                            initial={{ y: 200, opacity: 0 }}
                            animate={{ y: -400, opacity: 0.6 }}
                            transition={{ duration: 1.2, delay: 0.2 }}
                            className="absolute top-1/3 left-10 text-white"
                         >
                             <Cloud size={120} fill="currentColor" />
                         </motion.div>
                         
                         <motion.div 
                            initial={{ y: 300, opacity: 0 }}
                            animate={{ y: -300, opacity: 0.4 }}
                            transition={{ duration: 1, delay: 0.5 }}
                            className="absolute bottom-1/3 right-10 text-white"
                         >
                             <Cloud size={80} fill="currentColor" />
                         </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </div>
    );
  }

  // 4. EVALUATION SCREEN (After Timer)
  return (
    <div className="h-full flex flex-col animate-slide-up pt-6 px-4 pb-12">
        {/* ... Existing Evaluation ... */}
        {/* Header */}
        <div className="flex items-center mb-6 px-2">
            <h2 className="text-xl font-bold text-fresh-text flex items-center gap-2">
                <FileText size={24} className="text-sky-600" />
                飞行报告
            </h2>
        </div>

        {/* Summary Card */}
        <div className="bg-white rounded-[28px] p-6 shadow-soft mb-6 border border-white/60">
            <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-3">
                     <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white ${flightType === 'night' ? 'bg-purple-500' : 'bg-sky-500'}`}>
                         {flightType === 'single' ? <User size={18}/> : flightType === 'multi' ? <Users size={18}/> : <Droplets size={18}/>}
                     </div>
                     <div>
                         <div className="text-xs text-gray-400 font-bold uppercase">类型</div>
                         <div className="text-sm font-bold text-gray-700">
                            {getLabelForType(flightType)}
                         </div>
                     </div>
                 </div>
                 <div className="text-right">
                     <div className="text-xs text-gray-400 font-bold uppercase">时长</div>
                     <div className="text-2xl font-sans font-bold text-sky-900 leading-none">
                         {formatTime(elapsedSeconds)}
                     </div>
                 </div>
            </div>
            
            <div className="h-px bg-gray-100 my-4"></div>

            {/* Ratings (Vertical Layout) */}
            <div className="flex flex-col gap-5 py-2">
                {flightType === 'night' ? (
                    <>
                       <RatingRow label="昨晚休息" sub="Last Night" value={ratings.preFlight} onChange={(v) => setRatings({...ratings, preFlight: v})} />
                       <div className="h-px bg-gray-50"></div>
                       <RatingRow label="晨间状态" sub="Morning" value={ratings.postFlight} onChange={(v) => setRatings({...ratings, postFlight: v})} />
                    </>
                ) : (
                    <>
                        <RatingRow label="航前准备" sub="Pre-Flight" value={ratings.preFlight} onChange={(v) => setRatings({...ratings, preFlight: v})} />
                        <div className="h-px bg-gray-50"></div>
                        <RatingRow label="飞行状态" sub="In-Flight" value={ratings.inFlight} onChange={(v) => setRatings({...ratings, inFlight: v})} />
                        <div className="h-px bg-gray-50"></div>
                        <RatingRow label="落地讲评" sub="Post-Flight" value={ratings.postFlight} onChange={(v) => setRatings({...ratings, postFlight: v})} />
                    </>
                )}
            </div>
        </div>

        {/* Mood & Notes */}
        <div className="flex-1 space-y-6">
            <div className="bg-white rounded-[28px] p-6 shadow-soft border border-white/60">
                 <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 block text-center">
                    {flightType === 'night' ? '醒来心情' : '整体心情'}
                 </label>
                 <div className="flex justify-between gap-2">
                    {MOODS.map((m) => (
                        <button
                            key={m.id}
                            onClick={() => setMood(m.id)}
                            className={`flex-1 flex flex-col items-center gap-2 py-3 rounded-2xl transition-all ${
                                mood === m.id 
                                    ? 'bg-sky-50 ring-2 ring-sky-200 scale-105' 
                                    : 'hover:bg-gray-50 opacity-60 hover:opacity-100'
                            }`}
                        >
                            <span className="text-2xl">{m.emoji}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-[28px] p-1 shadow-soft border border-white/60 flex flex-col h-40">
                <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="备注..."
                    className="w-full h-full bg-transparent p-5 text-fresh-text placeholder:text-gray-300 outline-none resize-none text-base"
                />
            </div>
        </div>

        <button 
            onClick={handleTimerSave}
            className="mt-6 w-full bg-sky-800 text-white rounded-2xl py-4 shadow-xl shadow-sky-900/20 hover:shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 font-bold text-lg"
        >
            <Check size={20} />
            <span>保存记录</span>
        </button>
    </div>
  );
};

// --- Sub-components ---

// Squircle Long Press Button Component - FIX ALIGNMENT
const LongPressButton = ({ icon, onTrigger, colorClass, progressColor, label }: any) => {
    const [progress, setProgress] = useState(0);
    const timerRef = useRef<number | null>(null);
    const startTimeRef = useRef<number>(0);

    const startPress = (e: React.TouchEvent | React.MouseEvent) => {
        e.preventDefault(); 
        if (timerRef.current) return;
        
        startTimeRef.current = Date.now();
        setProgress(0);
        
        timerRef.current = window.setInterval(() => {
            const elapsed = Date.now() - startTimeRef.current;
            const p = Math.min((elapsed / 2000) * 100, 100); // 2s duration
            setProgress(p);
            
            if (p >= 100) {
                stopPress();
                onTrigger();
            }
        }, 16);
    };

    const stopPress = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setProgress(0);
    };

    // Circle params
    // Container 72x72. Button 64x64.
    const radius = 34;
    const perimeter = 2 * Math.PI * radius; 
    const strokeDashoffset = perimeter - (perimeter * progress) / 100;

    // Use relative container for alignment, absolute label to not affect flow height
    return (
        <div className="relative flex flex-col items-center justify-center">
            <div className="relative w-[72px] h-[72px] flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ transform: 'rotate(-90deg)' }}>
                    <circle
                        cx="36" cy="36" r={radius}
                        fill="none"
                        stroke={progressColor}
                        strokeWidth="4"
                        strokeDasharray={perimeter} 
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="transition-all duration-75"
                        style={{ opacity: progress > 0 ? 1 : 0 }}
                    />
                </svg>
                <button 
                    onMouseDown={startPress}
                    onMouseUp={stopPress}
                    onMouseLeave={stopPress}
                    onTouchStart={startPress}
                    onTouchEnd={stopPress}
                    onTouchCancel={stopPress}
                    className={`w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-soft active:scale-95 transition-all relative z-10 ${colorClass}`}
                >
                    {icon}
                </button>
            </div>
            {/* Absolute Label */}
            <div className={`absolute -bottom-6 text-[10px] font-bold transition-opacity duration-300 whitespace-nowrap ${progress > 0 ? 'opacity-100' : 'opacity-0'}`} style={{color: progressColor}}>
                {label}
            </div>
        </div>
    );
};

const OptionButton = ({ icon, label, subLabel, color, onClick }: any) => (
    <button 
        onClick={onClick}
        className="group relative overflow-hidden bg-white rounded-[28px] p-5 shadow-soft hover:shadow-lg transition-all active:scale-95 text-left flex items-center gap-5 w-full border border-white/60"
    >
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color} shadow-sm group-hover:scale-110 transition-transform shrink-0`}>
            {icon}
        </div>
        <div>
            <div className="text-lg font-bold text-fresh-text">{label}</div>
            <div className="text-xs text-gray-400 font-bold uppercase tracking-wide">{subLabel}</div>
        </div>
    </button>
);

const RatingRow = ({ label, sub, value, onChange }: { label: string, sub: string, value: number, onChange: (n: number) => void }) => (
    <div className="flex items-center justify-between">
        <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-700">{label}</span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{sub}</span>
        </div>
        <div className="flex gap-1.5">
             {[1, 2, 3, 4, 5].map((star) => (
                 <button 
                    key={star}
                    onClick={() => onChange(star)}
                    className="p-1 hover:scale-110 transition-transform active:scale-90"
                 >
                     <Star 
                        size={24} 
                        fill={star <= value ? "#fbbf24" : "transparent"} 
                        className={star <= value ? "text-amber-400" : "text-gray-200"}
                        strokeWidth={star <= value ? 0 : 2}
                     />
                 </button>
             ))}
        </div>
    </div>
);

// Custom Scroll Wheel Component
const ScrollWheel = ({ range, value, onChange }: { range: number, value: number, onChange: (v: number) => void }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const itemHeight = 48; // Must match styling

    // Generate items
    const items = useMemo(() => Array.from({ length: range }, (_, i) => i), [range]);

    // Scroll to value on mount/update
    useEffect(() => {
        if (containerRef.current) {
            const targetScroll = value * itemHeight;
            if (Math.abs(containerRef.current.scrollTop - targetScroll) > 1) {
                containerRef.current.scrollTop = targetScroll;
            }
        }
    }, []);

    // Handle scroll to snap
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollTop = e.currentTarget.scrollTop;
        const index = Math.round(scrollTop / itemHeight);
        if (index >= 0 && index < range && index !== value) {
            onChange(index);
        }
    };

    const handleClick = (idx: number) => {
        onChange(idx);
        if (containerRef.current) {
            containerRef.current.scrollTo({
                top: idx * itemHeight,
                behavior: 'smooth'
            });
        }
    }

    return (
        <div 
            ref={containerRef}
            onScroll={handleScroll}
            className="h-36 w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar"
            style={{ 
                scrollBehavior: 'smooth',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
            }}
        >
            <div style={{ height: itemHeight, width: '100%' }}></div> {/* Top Spacer */}
            
            {items.map((num) => (
                <div 
                    key={num}
                    onClick={() => handleClick(num)}
                    className="snap-center flex items-center justify-center cursor-pointer transition-all duration-150"
                    style={{ height: itemHeight }}
                >
                    <span className={`font-sans text-2xl font-bold leading-none ${num === value ? 'text-sky-700 scale-110' : 'text-gray-300 scale-90'}`}>
                        {num.toString().padStart(2, '0')}
                    </span>
                </div>
            ))}

            <div style={{ height: itemHeight, width: '100%' }}></div> {/* Bottom Spacer */}
        </div>
    );
};