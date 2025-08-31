// PostgreSQL API Client (browser-safe wrapper)
// If running in the browser, we use the Express/Vercel HTTP API under /api/*.
// If running in Node (server-side), we use the Postgres models directly.

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

function buildQuery(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

function makeHttpEntity(basePath) {
  return {
    async list(order) {
      const res = await fetch(`${basePath}${buildQuery(order ? { order } : {})}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    async get(id) {
      const res = await fetch(`${basePath}/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    async filter(criteria = {}, order) {
      const res = await fetch(`${basePath}${buildQuery({ ...criteria, order })}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    async create(data) {
      const res = await fetch(basePath, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    async update(id, data) {
      const res = await fetch(`${basePath}${buildQuery({ id })}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    async delete(id) {
      const res = await fetch(`${basePath}${buildQuery({ id })}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
      return true;
    },
    async save(data) {
      return data?.id ? this.update(data.id, data) : this.create(data);
    },
    async saveAll(dataArray) {
      const out = [];
      for (const d of dataArray) out.push(await this.save(d));
      return out;
    },
    onSnapshot(callback) {
      this.list().then(callback).catch(() => callback([]));
      return () => {};
    },
    onDocSnapshot(id, callback) {
      this.get(id).then(callback).catch(() => callback(null));
      return () => {};
    },
  };
}

// ESM named exports: browser uses HTTP, server uses direct models
export const Student = isBrowser ? makeHttpEntity('/api/students') : new Proxy({}, {
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

export const DailyEvaluation = isBrowser ? makeHttpEntity('/api/evaluations') : new Proxy({}, {
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

export const ContactLog = isBrowser ? makeHttpEntity('/api/contact-logs') : new Proxy({}, {
  get(_, prop) {
    return async (...args) => {
      try {
        const { ContactLog } = await loadRealModels();
        return ContactLog[prop](...args);
      } catch {
        return placeholderEntity('ContactLog')[prop](...args);
      }
    };
  }
});

export const IncidentReport = isBrowser ? makeHttpEntity('/api/incident-reports') : new Proxy({}, {
  get(_, prop) {
    return async (...args) => {
      try {
        const { IncidentReport } = await loadRealModels();
        return IncidentReport[prop](...args);
      } catch {
        return placeholderEntity('IncidentReport')[prop](...args);
      }
    };
  }
});

export const Settings = isBrowser ? makeHttpEntity('/api/settings') : new Proxy({}, {
  get(_, prop) {
    return async (...args) => {
      try {
        const { Settings } = await loadRealModels();
        return Settings[prop](...args);
      } catch {
        return placeholderEntity('Settings')[prop](...args);
      }
    };
  }
});

export const BehaviorSummary = isBrowser ? makeHttpEntity('/api/behavior-summaries') : new Proxy({}, {
  get(_, prop) {
    return async (...args) => {
      try {
        const { BehaviorSummary } = await loadRealModels();
        return BehaviorSummary[prop](...args);
      } catch {
        return placeholderEntity('BehaviorSummary')[prop](...args);
      }
    };
  }
});

export const User = isBrowser ? makeHttpEntity('/api/users') : new Proxy({}, {
  get(_, prop) {
    return async (...args) => {
      try {
        const { User } = await loadRealModels();
        return User[prop](...args);
      } catch {
        return placeholderEntity('User')[prop](...args);
      }
    };
  }
});

// Check if PostgreSQL is available
export const isPostgresAvailable = async () => {
  if (isBrowser) {
    try {
      const res = await fetch('/api/status');
      if (!res.ok) return false;
      const json = await res.json();
      return Boolean(json?.database?.ready);
    } catch {
      return false;
    }
  }
  try {
    const { getDatabase } = await import('../database/postgres.js');
    const db = await getDatabase();
    await db.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
};

export const getStorageType = () => 'postgresql';
