import React, { useState, useEffect, useMemo } from 'react';
import { Dashboard } from './components/Dashboard';
import { FlightList } from './components/FlightList';
import { FlightRecorder } from './components/FlightRecorder';
import { Navbar } from './components/Navbar';
import { FlightLog, ViewState, FlightStats, FlightType } from './types';
import { loadLogs, saveLogs } from './services/storageService';
import { differenceInDays, isSameDay, subDays, isSameMonth, isSameWeek } from 'date-fns';
import { Plane, Cloud } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('dashboard');
  const [recorderMode, setRecorderMode] = useState<'timer' | 'manual'>('timer');
  const [selectedFlightType, setSelectedFlightType] = useState<FlightType | undefined>(undefined);
  // Store the date passed from Calendar for manual recording
  const [initialManualDate, setInitialManualDate] = useState<Date | undefined>(undefined);
  const [logs, setLogs] = useState<FlightLog[]>([]);
  
  // Transition State
  const [isTakingOff, setIsTakingOff] = useState(false);

  useEffect(() => {
    const loaded = loadLogs();
    setLogs(loaded);
  }, []);

  const stats: FlightStats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Filter out 'night' (Leakage Events) for statistics standard flight stats
    const validLogs = logs.filter(l => l.type !== 'night');
    const nightLogs = logs.filter(l => l.type === 'night');
    
    // Sort night logs specifically for incident calculation
    const sortedNightLogs = [...nightLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const sortedLogs = [...validLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Counts Helper
    const getCounts = (dataset: FlightLog[]) => ({
        today: dataset.filter(l => isSameDay(new Date(l.date), now)).length,
        week: dataset.filter(l => isSameWeek(new Date(l.date), now, { weekStartsOn: 1 })).length,
        month: dataset.filter(l => isSameMonth(new Date(l.date), now)).length,
        year: dataset.filter(l => new Date(l.date).getFullYear() === currentYear).length,
        total: dataset.length
    });

    const allCounts = getCounts(sortedLogs);
    const soloCounts = getCounts(sortedLogs.filter(l => l.type === 'single'));
    const multiCounts = getCounts(sortedLogs.filter(l => l.type === 'multi'));
    
    // Durations (Summing hours)
    const sumHours = (logList: FlightLog[]) => logList.reduce((acc, curr) => acc + curr.flightTime, 0);

    const hoursToday = sumHours(sortedLogs.filter(l => isSameDay(new Date(l.date), now)));
    const hoursThisWeek = sumHours(sortedLogs.filter(l => isSameWeek(new Date(l.date), now, { weekStartsOn: 1 })));
    const hoursThisMonth = sumHours(sortedLogs.filter(l => isSameMonth(new Date(l.date), now)));
    const hoursThisYear = sumHours(sortedLogs.filter(l => new Date(l.date).getFullYear() === currentYear));

    const totalHours = sumHours(validLogs);
    const avgDuration = validLogs.length > 0 ? totalHours / validLogs.length : 0;
    
    // Calculate Max/Min Duration
    const durations = validLogs.map(l => l.flightTime);
    const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;
    const minDuration = durations.length > 0 ? Math.min(...durations) : 0;
    
    const daysSinceLastFlight = sortedLogs.length > 0 
        ? differenceInDays(now, new Date(sortedLogs[0].date)) 
        : 0;

    // Calculate Days Since Last Incident (Night Flight)
    const daysSinceLastIncident = sortedNightLogs.length > 0
        ? differenceInDays(now, new Date(sortedNightLogs[0].date))
        : -1; // -1 Indicates no incidents ever

    // --- Streak Logic Calculation (Strict Mode) ---
    // Get unique flight dates as YYYY-MM-DD strings
    // Sort descending (latest first)
    const uniqueDayStrings = Array.from(new Set(validLogs.map(l => {
        return new Date(l.date).toISOString().split('T')[0];
    }))).sort().reverse() as string[]; 

    // 1. Calculate Flying Streaks (Duty Periods)
    // Rule: Strict consecutive days. Diff must be 1.
    const streakLengths: number[] = [];
    let currentStreakRun = 0;
    
    // Iterate to find historical streaks
    for (let i = 0; i < uniqueDayStrings.length; i++) {
        if (currentStreakRun === 0) {
            currentStreakRun = 1; // Start a new streak (1 day duration initially)
        } else {
            const prevDate = new Date(uniqueDayStrings[i-1]);
            const currDate = new Date(uniqueDayStrings[i]);
            const diff = differenceInDays(prevDate, currDate);
            
            // Strict check: Only 1 day difference allowed
            if (diff === 1) {
                currentStreakRun++; 
            } else {
                streakLengths.push(currentStreakRun);
                currentStreakRun = 1;
            }
        }
    }
    if (currentStreakRun > 0) streakLengths.push(currentStreakRun);

    // Calculate CURRENT Streak specific logic
    let currentActiveStreak = 0;
    if (uniqueDayStrings.length > 0) {
        const lastFlightDate = new Date(uniqueDayStrings[0]);
        const diffFromNow = differenceInDays(now, lastFlightDate);
        
        // If the gap from NOW to last flight is <= 1 day (Today or Yesterday), streak is active.
        if (diffFromNow <= 1) {
             if (streakLengths.length > 0) {
                 currentActiveStreak = streakLengths[0];
             }
        } else {
            currentActiveStreak = 0;
        }
    }

    const maxStreak = streakLengths.length > 0 ? Math.max(...streakLengths) : 0;
    const validStreaks = streakLengths.filter(s => s > 0);
    const minStreak = validStreaks.length > 0 ? Math.min(...validStreaks) : 0;
    const streakBreaks = Math.max(0, validStreaks.length - 1);

    // 2. Calculate Rest Streaks (Stop Flying Periods)
    // Simply calculate gaps between flights.
    const restGaps: number[] = [];
    
    // Gaps are between unique flight dates.
    for (let i = 0; i < uniqueDayStrings.length - 1; i++) {
        const newer = new Date(uniqueDayStrings[i]);
        const older = new Date(uniqueDayStrings[i+1]);
        const diff = differenceInDays(newer, older);
        const gap = diff - 1;
        if (gap > 0) {
            restGaps.push(gap);
        }
    }

    const maxRestStreak = restGaps.length > 0 ? Math.max(...restGaps) : 0;
    const minRestStreak = restGaps.length > 0 ? Math.min(...restGaps) : 0;
    const restBreaks = streakLengths.length; // Number of duty periods = number of breaks in rest.

    return {
        flightsToday: allCounts.today,
        flightsThisWeek: allCounts.week,
        flightsThisYear: allCounts.year,
        flightsThisMonth: allCounts.month,
        
        hoursToday,
        hoursThisWeek,
        hoursThisMonth,
        hoursThisYear,

        soloFlightsToday: soloCounts.today,
        soloFlightsThisWeek: soloCounts.week,
        soloFlightsThisMonth: soloCounts.month,
        soloFlightsThisYear: soloCounts.year,

        multiFlightsToday: multiCounts.today,
        multiFlightsThisWeek: multiCounts.week,
        multiFlightsThisMonth: multiCounts.month,
        multiFlightsThisYear: multiCounts.year,

        daysSinceLastFlight,
        
        // Flying Streak
        consecutiveDays: currentActiveStreak,
        maxStreak,
        minStreak,
        streakBreaks,

        // Rest Streak
        maxRestStreak,
        minRestStreak,
        restBreaks,

        totalFlights: allCounts.total,
        totalSoloFlights: soloCounts.total,
        totalMultiFlights: multiCounts.total,
        totalHours,
        avgDuration,
        maxDuration,
        minDuration,
        totalNightFlights: nightLogs.length,
        daysSinceLastIncident
    };
  }, [logs]);

  const handleSaveLog = (log: FlightLog) => {
    const updatedLogs = [log, ...logs];
    setLogs(updatedLogs);
    saveLogs(updatedLogs);
    setView('calendar');
    setSelectedFlightType(undefined);
    setInitialManualDate(undefined);
  };

  const handleManualRecord = (date?: Date) => {
      setRecorderMode('manual');
      setSelectedFlightType(undefined);
      setInitialManualDate(date);
      setView('record');
  };

  const handleFlightStart = (type: FlightType) => {
      if (type === 'night') {
          setRecorderMode('timer');
          setSelectedFlightType(type);
          setView('record');
          return;
      }

      setIsTakingOff(true);
      
      setTimeout(() => {
          setRecorderMode('timer');
          setSelectedFlightType(type);
          setView('record');
          
          setTimeout(() => {
            setIsTakingOff(false);
          }, 300);
      }, 1000);
  };

  return (
    <div className="h-screen w-screen bg-[#fdfbf7] flex justify-center text-fresh-text font-sans overflow-hidden">
      <div className="w-full max-w-md bg-[#fdfbf7] h-full flex flex-col relative shadow-2xl overflow-hidden">
        
        <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
            {view !== 'record' && (
                // Safe area + fixed padding for Android status bar
                // Using pt-[max(env(safe-area-inset-top),32px)] simulation using standard CSS style for calculation if possible,
                // but tailwind arbitrary values with fallback are safer for basic Android WebViews.
                // We add 'pt-8' as a generous default which acts as status bar spacer.
                <header className="px-6 pt-safe pt-8 mt-2 pb-2">
                    <div className="flex items-center justify-between pb-2">
                        <div className="flex flex-col">
                            <h1 className="text-xl font-bold tracking-tight text-fresh-text flex items-center gap-1">
                                FLYLOG
                                <span className="w-1.5 h-1.5 rounded-full bg-mint-dark mt-1"></span>
                            </h1>
                        </div>
                        <div className="h-8 w-8 bg-sky-100 rounded-full flex items-center justify-center font-bold text-[10px] text-sky-700 shadow-sm">
                            机长
                        </div>
                    </div>
                </header>
            )}

            {/* Also ensure record view has safe area padding */}
            <div className={view === 'record' ? 'pt-safe pt-8' : 'px-4'}>
                {view === 'dashboard' && (
                    <Dashboard 
                        stats={stats} 
                        onFlightStart={handleFlightStart} 
                        onManualRecord={() => handleManualRecord()}
                    />
                )}
                {view === 'calendar' && (
                    <FlightList 
                        logs={logs} 
                        onManualRecord={handleManualRecord} 
                    />
                )}
                {view === 'record' && (
                    <FlightRecorder 
                        mode={recorderMode}
                        initialType={selectedFlightType}
                        initialDate={initialManualDate}
                        onCancel={() => {
                            setView('dashboard');
                            setInitialManualDate(undefined);
                        }} 
                        onSave={handleSaveLog} 
                    />
                )}
            </div>
        </main>

        <Navbar currentView={view} onChangeView={setView} />
        
        <AnimatePresence>
            {isTakingOff && (
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
                        准备起飞...
                    </motion.div>

                    <div className="absolute inset-0">
                         <motion.div
                            initial={{ x: 0, y: 0, scale: 1, rotate: 0 }}
                            animate={{ x: 300, y: -300, scale: 4, rotate: -15 }}
                            transition={{ duration: 1.5, ease: "easeInOut" }}
                            className="absolute top-1/2 left-1/2 -ml-12 -mt-12 text-sky-600"
                         >
                             <Plane size={96} fill="currentColor" />
                         </motion.div>

                         <motion.div 
                            initial={{ x: 200, opacity: 0 }}
                            animate={{ x: -400, opacity: 0.6 }}
                            transition={{ duration: 1.2, delay: 0.2 }}
                            className="absolute top-1/3 right-0 text-white"
                         >
                             <Cloud size={120} fill="currentColor" />
                         </motion.div>
                         
                         <motion.div 
                            initial={{ x: 300, opacity: 0 }}
                            animate={{ x: -300, opacity: 0.4 }}
                            transition={{ duration: 1, delay: 0.5 }}
                            className="absolute bottom-1/3 right-[-50px] text-white"
                         >
                             <Cloud size={80} fill="currentColor" />
                         </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default App;