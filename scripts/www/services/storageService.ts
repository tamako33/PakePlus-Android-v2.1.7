import { FlightLog } from '../types';

const STORAGE_KEY = 'skylog_data_v1';

export const saveLogs = (logs: FlightLog[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch (error) {
    console.error('Failed to save logs to local storage', error);
  }
};

export const loadLogs = (): FlightLog[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load logs from local storage', error);
    return [];
  }
};
