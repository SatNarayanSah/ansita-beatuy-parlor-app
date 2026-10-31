// Node stand-ins for the native modules the service layer imports, so it can run
// against a real backend outside the phone (see api-flows.ts).
const memory = new Map();

export const getItemAsync = async (key) => (memory.has(key) ? memory.get(key) : null);
export const setItemAsync = async (key, value) => void memory.set(key, value);
export const deleteItemAsync = async (key) => void memory.delete(key);

export const Platform = { OS: 'web', select: (options) => options.web ?? options.default };
export const AppState = { currentState: 'active', addEventListener: () => ({ remove: () => undefined }) };

const Constants = { expoConfig: {} };
export default Constants;
