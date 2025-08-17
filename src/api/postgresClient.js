// PostgreSQL API Client (browser-safe wrapper)
// NOTE: The 'pg' library and direct DB access is Node-only. This file now
// safely provides lazy / placeholder exports so that it can be imported in
// the browser without Vite attempting to bundle Node core modules.

const isBrowser = typeof window !== 'undefined';
let loaded = false;
let realExports = null;

async function loadRealModels() {
  if (isBrowser) throw new Error('PostgreSQL models not available in browser');
  if (!loaded) {
    const [modelsModule, studentModule, evalModule] = await Promise.all([
      import('../database/models/PostgresModels.js'),
      import('../database/models/PostgresStudent.js'),
      import('../database/models/PostgresDailyEvaluation.js')
    ]);
    realExports = {
      Student: studentModule.PostgresStudent,
      DailyEvaluation: evalModule.PostgresDailyEvaluation,
      ContactLog: modelsModule.PostgresContactLog,
      IncidentReport: modelsModule.PostgresIncidentReport,
      Settings: modelsModule.PostgresSettings,
      BehaviorSummary: modelsModule.PostgresBehaviorSummary,
      User: modelsModule.PostgresUser,
    };
    loaded = true;
  }
  return realExports;
}

function placeholderEntity(name) {
  const reject = () => Promise.reject(new Error(`${name}: PostgreSQL not available in this environment`));
  return {
    list: reject,
    get: reject,
    create: reject,
    update: reject,
    delete: reject,
    save: reject,
    saveAll: reject,
    filter: reject,
    onSnapshot: () => () => {},
    onDocSnapshot: () => () => {},
  };
}

// ESM named exports expected by hybridStorage. These are lightweight proxies
// that delegate once (and only if) running server-side.

export const Student = new Proxy({}, {
  get(_, prop) {
    return async (...args) => {
      try {
        const { Student } = await loadRealModels();
        return Student[prop](...args);
      } catch {
        return placeholderEntity('Student')[prop](...args);
      }
    };
  }
});

export const DailyEvaluation = new Proxy({}, {
  get(_, prop) {
    return async (...args) => {
      try {
        const { DailyEvaluation } = await loadRealModels();
        return DailyEvaluation[prop](...args);
      } catch {
        return placeholderEntity('DailyEvaluation')[prop](...args);
      }
    };
  }
});

// Simple pass-through wrappers for other entities (same pattern)
export const ContactLog = placeholderEntity('ContactLog');
export const IncidentReport = placeholderEntity('IncidentReport');
export const Settings = placeholderEntity('Settings');
export const BehaviorSummary = placeholderEntity('BehaviorSummary');
export const User = placeholderEntity('User');

// Check if PostgreSQL is available (server-side only)
export const isPostgresAvailable = async () => {
  if (isBrowser) return false;
  try {
  const { getDatabase } = await import('../database/postgres.js');
  const db = await getDatabase();
    await db.query('SELECT 1');
    return true;
  } catch (error) {
    return false;
  }
};

export const getStorageType = () => 'postgresql';