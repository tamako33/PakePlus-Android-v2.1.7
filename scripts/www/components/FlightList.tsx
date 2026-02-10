import React, { useState, useMemo } from 'react';
import { FlightLog, MoodType } from '../types';
import { Calendar as CalendarIcon, Clock, Sparkles, ChevronLeft, ChevronRight, Star, Moon, User, Users, Droplets, Plus } from 'lucide-react';
import { analyzeFlightHistory } from '../services/geminiService';
import { 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, format, addMonths, subMonths, 
  isSameMonth, isSameDay, isToday 
} from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface FlightListProps {
  logs: FlightLog[];
  onManualRecord: (date: Date) => void; // New prop
}

const MOOD_EMOJIS: Record<MoodType, string> = {
    tired: '😫',
    normal: '😐',
    comfortable: '😌',
    happy: '😆'
};

export const FlightList: React.FC<FlightListProps> = ({ logs, onManualRecord }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Calendar Grid Calculation
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }); // Monday start
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Selected Date Logs
  const selectedDateLogs = useMemo(() => {
    return logs.filter(log => isSameDay(new Date(log.date), selectedDate))
               .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [logs, selectedDate]);

  // Check if a date has logs
  const getLogsForDate = (date: Date) => {
    return logs.filter(log => isSameDay(new Date(log.date), date));
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysis(null);
    setError(null);
    try {
        if (!process.env.API_KEY) {
             const hasKey = await window.aistudio?.hasSelectedApiKey();
             if(!hasKey) {
                 await window.aistudio?.openSelectKey();
             }
        }
        
        const result = await analyzeFlightHistory(logs);
        setAnalysis(result);
    } catch (err) {
        setError("分析失败，请重试。");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const getTypeIcon = (type: string) => {
      switch(type) {
          case 'multi': return <Users size={14} />;
          case 'night': return <Droplets size={14} />;
          default: return <User size={14} />;
      }
  };

  const formatDurationLog = (hours: number) => {
      const totalSeconds = Math.round(hours * 3600);
      const m = Math.floor(totalSeconds / 60);
      const s = totalSeconds % 60;
      return `${m}分${s.toString().padStart(2, '0')}秒`;
  };

  return (
    <div className="flex flex-col animate-fade-in space-y-5 pb-40">
      
      {/* Header & Controls */}
      <div className="flex items-center justify-between pt-2 px-1">
        <h2 className="text-2xl font-bold text-fresh-text tracking-tight flex items-center gap-2">
            <CalendarIcon size={24} className="text-sky-600"/>
            飞行日志
        </h2>
        <button 
            onClick={handleAnalyze}
            disabled={isAnalyzing || logs.length === 0}
            className={`
                flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all
                ${isAnalyzing 
                    ? 'bg-gray-100 text-gray-400' 
                    : 'bg-white text-sky-600 shadow-soft hover:shadow-md border border-sky-100'
                }
            `}
        >
            {isAnalyzing ? "AI 分析中..." : <><Sparkles size={14} /> <span>智能总结</span></>}
        </button>
      </div>

      {/* Analysis Result Box */}
      {analysis && (
          <div className="bg-gradient-to-br from-white to-sky-50 p-6 rounded-[28px] shadow-soft text-sm text-fresh-text leading-relaxed animate-slide-up relative border border-sky-100">
               <button 
                onClick={() => setAnalysis(null)}
                className="absolute top-4 right-4 text-gray-300 hover:text-gray-500 font-bold p-1"
               >×</button>
              <h3 className="font-bold mb-3 flex items-center gap-2 text-sky-700 text-base">
                  <Sparkles size={18} /> 机长简报
              </h3>
              <p className="whitespace-pre-wrap opacity-90 text-gray-600">{analysis}</p>
          </div>
      )}

      {/* Calendar View */}
      <div className="bg-white/80 backdrop-blur-md rounded-[32px] shadow-soft p-6 border border-white">
        
        {/* Month Navigator */}
        <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-50 text-gray-400 hover:text-gray-600 rounded-full transition-colors">
                <ChevronLeft size={24} />
            </button>
            <span className="text-xl font-bold text-fresh-text tracking-wide">
                {format(currentMonth, 'yyyy年 MM月')}
            </span>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-50 text-gray-400 hover:text-gray-600 rounded-full transition-colors">
                <ChevronRight size={24} />
            </button>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 mb-4 text-center">
            {['一', '二', '三', '四', '五', '六', '日'].map(day => (
                <div key={day} className="text-[11px] font-bold text-gray-300 uppercase tracking-widest">{day}</div>
            ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-y-3 gap-x-1">
            {calendarDays.map((day, idx) => {
                const dayLogs = getLogsForDate(day);
                const hasLogs = dayLogs.length > 0;
                // Get unique flight types for the day
                const types = new Set(dayLogs.map(l => l.type));
                
                const isSelected = isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isTodayDate = isToday(day);

                return (
                    <button
                        key={idx}
                        onClick={() => setSelectedDate(day)}
                        className={`
                            relative aspect-square rounded-2xl flex flex-col items-center justify-center transition-all duration-300 border
                            ${!isCurrentMonth ? 'opacity-20 border-transparent' : ''}
                            ${isSelected 
                                ? 'bg-sky-600 text-white shadow-lg shadow-sky-200 scale-105 z-10 border-sky-600' 
                                : hasLogs
                                    ? 'bg-sky-50 text-fresh-text border-sky-100' // Distinct background for days with logs
                                    : isTodayDate
                                        ? 'bg-gray-50 text-sky-500 font-bold border-gray-100'
                                        : 'hover:bg-gray-50 text-fresh-text border-transparent'
                            }
                        `}
                    >
                        <span className={`text-sm ${isSelected ? 'font-bold' : 'font-medium'}`}>
                            {format(day, 'd')}
                        </span>
                        
                        {/* Flight Indicator Dots */}
                        <div className="flex gap-[2px] mt-1 h-1.5 items-end justify-center">
                            {types.has('single') && (
                                <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-orange-200' : 'bg-orange-400'}`}></div>
                            )}
                            {types.has('multi') && (
                                <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-blue-200' : 'bg-sky-900'}`}></div>
                            )}
                            {types.has('night') && (
                                <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-purple-200' : 'bg-purple-500'}`}></div>
                            )}
                        </div>
                    </button>
                );
            })}
        </div>
      </div>

      {/* Selected Day Details */}
      <div className="animate-fade-in flex-1">
          <div className="flex items-center justify-between mb-4 pl-2">
              <div className="flex items-center gap-3 flex-1">
                  <h3 className="font-bold text-gray-400 text-sm uppercase tracking-wider">
                      {format(selectedDate, 'M月d日', { locale: zhCN })}
                  </h3>
                  <div className="h-[1px] flex-1 bg-gray-100"></div>
              </div>
              
              {/* Add Button for Manual Record */}
              <button 
                  onClick={() => onManualRecord(selectedDate)}
                  className="ml-2 w-8 h-8 flex items-center justify-center rounded-full bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors shadow-sm"
                  title="补录该日记录"
              >
                  <Plus size={18} strokeWidth={2.5} />
              </button>
          </div>

          {selectedDateLogs.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-gray-300 gap-3">
                  <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center">
                      <Clock size={32} className="opacity-20" />
                  </div>
                  <span className="text-sm font-bold">暂无飞行记录</span>
                  <button 
                    onClick={() => onManualRecord(selectedDate)}
                    className="text-sky-500 text-xs font-bold mt-1 hover:underline"
                  >
                      点击右上角 + 号补录
                  </button>
              </div>
          ) : (
              <div className="space-y-4">
                  {selectedDateLogs.map(log => (
                      <div key={log.id} className="bg-white rounded-[28px] p-6 shadow-soft hover:shadow-lg transition-all flex flex-col gap-4 group border border-gray-50/50">
                          
                          {/* Header */}
                          <div className="flex justify-between items-center">
                               <div className="flex items-center gap-3">
                                   <div className={`
                                       w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm
                                       ${log.type === 'night' ? 'bg-purple-600' : log.type === 'multi' ? 'bg-sky-900' : 'bg-orange-400'}
                                   `}>
                                       {getTypeIcon(log.type)}
                                   </div>
                                   <div>
                                       <div className="text-xs font-bold text-gray-400 mb-0.5">
                                            {format(new Date(log.date), 'HH:mm')} 记录
                                       </div>
                                       <div className="text-sm font-bold text-fresh-text">
                                            {log.type === 'single' ? '单人飞行' : log.type === 'multi' ? '亲密飞行' : '泄漏事故'}
                                       </div>
                                   </div>
                               </div>
                               <div className="flex items-baseline gap-1">
                                   <span className="text-2xl font-bold text-fresh-text font-sans tracking-tight">
                                       {formatDurationLog(log.flightTime)}
                                   </span>
                               </div>
                          </div>

                          {/* Ratings Bubble & Mood */}
                          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-2xl">
                              {log.ratings && (
                                <div className="flex gap-2">
                                    <RatingPill label="航前" val={log.ratings.preFlight} />
                                    <RatingPill label="航中" val={log.ratings.inFlight} />
                                    <RatingPill label="航后" val={log.ratings.postFlight} />
                                </div>
                              )}
                              
                              {/* Mood Display */}
                              {log.mood && (
                                  <div className="text-2xl" title="心情">
                                      {MOOD_EMOJIS[log.mood]}
                                  </div>
                              )}
                          </div>

                          {/* Notes */}
                          {log.notes && (
                              <div className="mt-1 text-sm text-gray-600 bg-cream p-4 rounded-2xl leading-relaxed border border-stone-100">
                                  {log.notes}
                              </div>
                          )}
                      </div>
                  ))}
              </div>
          )}
      </div>
    </div>
  );
};

const RatingPill = ({ label, val }: {label: string, val: number}) => (
    <div className="flex items-center gap-1">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{label}</span>
        <div className="flex items-center bg-white px-1.5 py-0.5 rounded-md shadow-sm border border-gray-100">
            <Star size={10} fill="#fbbf24" className="text-amber-400 mr-0.5" strokeWidth={0} />
            <span className="text-xs font-bold text-gray-700 font-mono">{val}</span>
        </div>
    </div>
);