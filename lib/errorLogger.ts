import AsyncStorage from '@react-native-async-storage/async-storage';

export type ErrorLog = {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  context?: string;
};

const MAX_LOGS = 100;
const STORAGE_KEY = '@error_logs';

export const logError = async (error: Error | string, context?: string) => {
  try {
    const errorLog: ErrorLog = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'string' ? undefined : error.stack,
      context,
    };

    const existingLogs = await getErrorLogs();
    const newLogs = [errorLog, ...existingLogs].slice(0, MAX_LOGS);

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newLogs));

    if (__DEV__) {
      console.error('Error logged:', errorLog);
    }
  } catch (e) {
    console.error('Failed to log error:', e);
  }
};

export const getErrorLogs = async (): Promise<ErrorLog[]> => {
  try {
    const logs = await AsyncStorage.getItem(STORAGE_KEY);
    return logs ? JSON.parse(logs) : [];
  } catch (e) {
    console.error('Failed to retrieve error logs:', e);
    return [];
  }
};

export const clearErrorLogs = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear error logs:', e);
  }
};
