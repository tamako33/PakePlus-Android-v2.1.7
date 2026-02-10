
export type FlightType = 'single' | 'multi' | 'night';

export type MoodType = 'tired' | 'comfortable' | 'normal' | 'happy';

export interface FlightRatings {
  preFlight: number; // 1-5 stars (Used for "Last Night" in night mode)
  inFlight: number;  // (Ignored in night mode)
  postFlight: number; // (Used for "Morning" in night mode)
}

export interface FlightLog {
  id: string;
  date: string; // ISO string
  type: FlightType;
  flightTime: number; // in hours (float)
  ratings: FlightRatings;
  mood?: MoodType; // New field
  notes: string;
  createdAt: number;
  // Legacy fields
  departure?: string;
  arrival?: string;
  aircraftType?: string;
}

export type ViewState = 'dashboard' | 'calendar' | 'record';

export interface FlightStats {
  flightsToday: number;
  flightsThisWeek: number;
  flightsThisYear: number;
  flightsThisMonth: number;
  
  // New Duration Breakdown
  hoursToday: number;
  hoursThisWeek: number;
  hoursThisMonth: number;
  hoursThisYear: number;

  // Solo Breakdown (New)
  soloFlightsToday: number;
  soloFlightsThisWeek: number;
  soloFlightsThisMonth: number;
  soloFlightsThisYear: number;

  // Multi Breakdown (New)
  multiFlightsToday: number;
  multiFlightsThisWeek: number;
  multiFlightsThisMonth: number;
  multiFlightsThisYear: number;

  daysSinceLastFlight: number; // Current Rest Streak
  
  // Flying Streak Stats
  consecutiveDays: number; // Current Flying Streak
  maxStreak: number;
  minStreak: number;
  streakBreaks: number;

  // Rest Streak Stats (New)
  maxRestStreak: number;
  minRestStreak: number;
  restBreaks: number;

  totalFlights: number;
  totalSoloFlights: number;
  totalMultiFlights: number;
  totalHours: number;
  avgDuration: number;
  maxDuration: number; // New
  minDuration: number; // New
  totalNightFlights: number;
  daysSinceLastIncident: number; // New: Days since last 'night' flight
}