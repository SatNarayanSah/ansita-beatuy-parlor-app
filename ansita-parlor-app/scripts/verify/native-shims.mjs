// Node stand-ins for the native modules the service layer imports, so it can run
// against a real backend outside the phone (see api-flows.ts).
const memory = new Map();

export const getItemAsync = async (key) => (memory.has(key) ? memory.get(key) : null);
export const setItemAsync = async (key, value) => void memory.set(key, value);
export const deleteItemAsync = async (key) => void memory.delete(key);

export const Platform = { OS: 'web', select: (options) => options.web ?? options.default };
export const AppState = { currentState: 'active', addEventListener: () => ({ remove: () => undefined }) };
export const Linking = { openSettings: async () => undefined, openURL: async () => undefined };

export const ExecutionEnvironment = { Bare: 'bare', Standalone: 'standalone', StoreClient: 'storeClient' };

const Constants = { expoConfig: {}, executionEnvironment: ExecutionEnvironment.Bare };
export default Constants;

// expo-file-system's `File`, as used by the upload helper: reads a local file into an ArrayBuffer.
export class File {
  constructor(uri) {
    this.uri = uri;
  }

  async arrayBuffer() {
    const { readFile } = await import('node:fs/promises');
    const { fileURLToPath } = await import('node:url');
    const bytes = await readFile(this.uri.startsWith('file:') ? fileURLToPath(this.uri) : this.uri);
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }
}

// expo-device / expo-notifications: Node is not a device, so phone notifications stay off.
export const isDevice = false;

export const AndroidImportance = { DEFAULT: 3, HIGH: 4, MAX: 5 };
export const SchedulableTriggerInputTypes = { DATE: 'date', TIME_INTERVAL: 'timeInterval' };
const denied = async () => ({ status: 'denied', granted: false, canAskAgain: false });
export const setNotificationHandler = () => undefined;
export const setNotificationChannelAsync = async () => null;
export const getPermissionsAsync = denied;
export const requestPermissionsAsync = denied;
export const getExpoPushTokenAsync = async () => ({ type: 'expo', data: '' });
export const scheduleNotificationAsync = async () => '';
export const getAllScheduledNotificationsAsync = async () => [];
export const cancelScheduledNotificationAsync = async () => undefined;
export const cancelAllScheduledNotificationsAsync = async () => undefined;
export const dismissAllNotificationsAsync = async () => undefined;
export const setBadgeCountAsync = async () => true;
