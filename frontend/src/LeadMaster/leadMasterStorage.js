const KEY_KANBAN = 'lm-kanban-v1';
const KEY_AUDIT = 'lm-audit-v1';
const KEY_INTEREST = 'lm-interest-v1';

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function loadKanban(defaultKanban) {
  try {
    const raw = localStorage.getItem(KEY_KANBAN);
    if (!raw) return clone(defaultKanban);
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    /* ignore */
  }
  return clone(defaultKanban);
}

export function saveKanban(kanban) {
  localStorage.setItem(KEY_KANBAN, JSON.stringify(kanban));
}

export function loadAuditLog() {
  try {
    const raw = localStorage.getItem(KEY_AUDIT);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendAuditLog(entry) {
  const next = [{ ...entry, at: new Date().toISOString() }, ...loadAuditLog()].slice(0, 200);
  localStorage.setItem(KEY_AUDIT, JSON.stringify(next));
}

export function loadInterestMap(defaultMap) {
  try {
    const raw = localStorage.getItem(KEY_INTEREST);
    if (!raw) return { ...defaultMap };
    return { ...defaultMap, ...JSON.parse(raw) };
  } catch {
    return { ...defaultMap };
  }
}

export function saveInterestMap(map) {
  localStorage.setItem(KEY_INTEREST, JSON.stringify(map));
}

export function tasksKey(leadId) {
  return `lm-tasks-${leadId}`;
}

export function loadTasks(leadId) {
  try {
    const raw = localStorage.getItem(tasksKey(leadId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTasks(leadId, tasks) {
  localStorage.setItem(tasksKey(leadId), JSON.stringify(tasks));
}
