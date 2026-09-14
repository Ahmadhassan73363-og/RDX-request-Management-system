// LocalStorage persistence utility for enterprise state

const PREFIX = 'request_mgmt_';

export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(PREFIX + key);
      if (!item) return defaultValue;
      return JSON.parse(item) as T;
    } catch (err) {
      console.error(`Error reading key ${key} from storage`, err);
      return defaultValue;
    }
  },

  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('storage-synced', { detail: { key } }));
      }
    } catch (err) {
      console.error(`Error saving key ${key} to storage`, err);
    }
  },

  remove: (key: string): void => {
    try {
      localStorage.removeItem(PREFIX + key);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('storage-synced', { detail: { key } }));
      }
    } catch (err) {
      console.error(`Error removing key ${key} from storage`, err);
    }
  },

  clearAll: (): void => {
    try {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith(PREFIX)) {
          localStorage.removeItem(k);
        }
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('storage-synced', { detail: { key: 'all' } }));
      }
    } catch (err) {
      console.error('Error clearing storage', err);
    }
  },

  exportAllData: (): string => {
    const data: Record<string, any> = {};
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith(PREFIX)) {
        const shortKey = k.replace(PREFIX, '');
        try {
          data[shortKey] = JSON.parse(localStorage.getItem(k) || 'null');
        } catch {
          data[shortKey] = localStorage.getItem(k);
        }
      }
    });
    return JSON.stringify(data, null, 2);
  },

  importAllData: (jsonData: string): boolean => {
    try {
      const parsed = JSON.parse(jsonData);
      Object.keys(parsed).forEach((k) => {
        localStorage.setItem(PREFIX + k, JSON.stringify(parsed[k]));
      });
      return true;
    } catch (err) {
      console.error('Error importing data', err);
      return false;
    }
  }
};
