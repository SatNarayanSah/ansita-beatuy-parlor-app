// In-memory stand-in for @react-native-async-storage/async-storage under Node.
const store = new Map();
const AsyncStorage = {
  getItem: async (key) => (store.has(key) ? store.get(key) : null),
  setItem: async (key, value) => void store.set(key, value),
  removeItem: async (key) => void store.delete(key),
  clear: async () => store.clear(),
  getAllKeys: async () => [...store.keys()],
  multiGet: async (keys) => keys.map((key) => [key, store.get(key) ?? null]),
  multiSet: async (pairs) => pairs.forEach(([key, value]) => store.set(key, value)),
  multiRemove: async (keys) => keys.forEach((key) => store.delete(key)),
};
export default AsyncStorage;
