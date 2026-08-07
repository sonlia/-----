import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database | null = null;

const DB_PATH = path.join(process.cwd(), 'data', 'ac-energy.db');

export function getDB(): Database.Database {
  if (db) return db;

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  initSchema(db);
  return db;
}

function initSchema(db: Database.Database) {
  // 1. 项目表
  db.exec(`
    CREATE TABLE IF NOT EXISTS ac_projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      province TEXT NOT NULL,
      city TEXT NOT NULL,
      name TEXT NOT NULL,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(province, city, name)
    );
  `);

  // 2. 楼层表
  db.exec(`
    CREATE TABLE IF NOT EXISTS ac_floors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES ac_projects(id) ON DELETE CASCADE
    );
  `);

  // 3. 房间表
  db.exec(`
    CREATE TABLE IF NOT EXISTS ac_rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      floor_id INTEGER NOT NULL,
      project_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (floor_id) REFERENCES ac_floors(id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES ac_projects(id) ON DELETE CASCADE
    );
  `);

  // 4. 冷站表
  db.exec(`
    CREATE TABLE IF NOT EXISTS ac_stations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      location TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES ac_projects(id) ON DELETE CASCADE
    );
  `);

  // 5. 设备表（关联到房间，不再直接关联冷站）
  db.exec(`
    CREATE TABLE IF NOT EXISTS ac_devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      station_id INTEGER,
      floor_id INTEGER,
      room_id INTEGER,
      device_type TEXT NOT NULL,
      chiller_subtype TEXT,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      location TEXT,
      running_status TEXT DEFAULT 'stopped',
      is_fault INTEGER DEFAULT 0,
      is_offline INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES ac_projects(id) ON DELETE CASCADE,
      FOREIGN KEY (station_id) REFERENCES ac_stations(id) ON DELETE SET NULL,
      FOREIGN KEY (floor_id) REFERENCES ac_floors(id) ON DELETE SET NULL,
      FOREIGN KEY (room_id) REFERENCES ac_rooms(id) ON DELETE SET NULL
    );
  `);

  // 6. 设备时序数据表
  db.exec(`
    CREATE TABLE IF NOT EXISTS ac_device_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id INTEGER NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      params TEXT NOT NULL,
      FOREIGN KEY (device_id) REFERENCES ac_devices(id) ON DELETE CASCADE
    );
  `);

  // 7. 计量表计表（一二三级计量）
  db.exec(`
    CREATE TABLE IF NOT EXISTS ac_meters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      meter_level INTEGER NOT NULL,  -- 1=一级(总表) 2=二级(区域表) 3=三级(终端表)
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      location TEXT,
      installed_at TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES ac_projects(id) ON DELETE CASCADE
    );
  `);

  // 8. 月度用电量/电费表
  db.exec(`
    CREATE TABLE IF NOT EXISTS ac_energy_monthly (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      electricity_kwh REAL DEFAULT 0,  -- 用电量 kWh
      cost_cny REAL DEFAULT 0,          -- 电费 元
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(project_id, year, month),
      FOREIGN KEY (project_id) REFERENCES ac_projects(id) ON DELETE CASCADE
    );
  `);

  // 9. 大屏模块配置表（控制大屏显示哪些模块及顺序）
  db.exec(`
    CREATE TABLE IF NOT EXISTS sys_modules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_key TEXT NOT NULL UNIQUE,     -- 模块标识: overview2/building/solar/charging/ac/load/grid/carbon
      label TEXT NOT NULL,                  -- 显示名称
      icon TEXT,                            -- 图标 emoji
      sort_order INTEGER DEFAULT 0,         -- 排序
      is_visible INTEGER DEFAULT 1,         -- 是否在大屏显示 0/1
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 初始化默认模块（如果表为空）
  const count = db.prepare('SELECT COUNT(*) as c FROM sys_modules').get() as any;
  if (count.c === 0) {
    const defaults = [
      { key: 'overview2', label: '全景总览', icon: '🗺', sort: 1 },
      { key: 'overview', label: '总览2', icon: '📊', sort: 2 },
      { key: 'building', label: '节能管理', icon: '🏢', sort: 3 },
      { key: 'solar', label: '光伏发电', icon: '☀', sort: 4 },
      { key: 'charging', label: '充电桩', icon: '🔌', sort: 5 },
      { key: 'ac', label: '空调节能', icon: '❄', sort: 6 },
      { key: 'load', label: '负荷管理', icon: '🎛', sort: 7 },
      { key: 'grid', label: '配网管理', icon: '⚡', sort: 8 },
      { key: 'carbon', label: '碳监测', icon: '🌱', sort: 9 },
    ];
    const stmt = db.prepare('INSERT INTO sys_modules (module_key, label, icon, sort_order) VALUES (?, ?, ?, ?)');
    defaults.forEach(d => stmt.run(d.key, d.label, d.icon, d.sort));
  }

  // 索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_metrics_device_time ON ac_device_metrics(device_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_devices_project ON ac_devices(project_id);
    CREATE INDEX IF NOT EXISTS idx_devices_room ON ac_devices(room_id);
    CREATE INDEX IF NOT EXISTS idx_floors_project ON ac_floors(project_id);
    CREATE INDEX IF NOT EXISTS idx_rooms_floor ON ac_rooms(floor_id);
    CREATE INDEX IF NOT EXISTS idx_meters_project ON ac_meters(project_id);
    CREATE INDEX IF NOT EXISTS idx_energy_project ON ac_energy_monthly(project_id, year, month);
  `);
}

// === 项目 CRUD ===
export function getProjects() {
  return getDB().prepare('SELECT * FROM ac_projects ORDER BY created_at DESC').all();
}

export function createProject(province: string, city: string, name: string, address?: string) {
  const result = getDB().prepare('INSERT INTO ac_projects (province, city, name, address) VALUES (?, ?, ?, ?)').run(province, city, name, address || '');
  return { id: result.lastInsertRowid, province, city, name, address };
}

export function deleteProject(id: number) {
  getDB().prepare('DELETE FROM ac_projects WHERE id = ?').run(id);
}

// === 楼层 CRUD ===
export function getFloors(projectId: number) {
  return getDB().prepare('SELECT * FROM ac_floors WHERE project_id = ? ORDER BY sort_order ASC, id ASC').all(projectId);
}

export function createFloor(projectId: number, name: string, sortOrder: number = 0) {
  const result = getDB().prepare('INSERT INTO ac_floors (project_id, name, sort_order) VALUES (?, ?, ?)').run(projectId, name, sortOrder);
  return { id: result.lastInsertRowid, projectId, name, sortOrder };
}

export function deleteFloor(id: number) {
  getDB().prepare('DELETE FROM ac_floors WHERE id = ?').run(id);
}

// === 房间 CRUD ===
export function getRooms(floorId: number) {
  return getDB().prepare('SELECT * FROM ac_rooms WHERE floor_id = ? ORDER BY id ASC').all(floorId);
}

export function createRoom(floorId: number, projectId: number, name: string) {
  const result = getDB().prepare('INSERT INTO ac_rooms (floor_id, project_id, name) VALUES (?, ?, ?)').run(floorId, projectId, name);
  return { id: result.lastInsertRowid, floorId, projectId, name };
}

export function deleteRoom(id: number) {
  getDB().prepare('DELETE FROM ac_rooms WHERE id = ?').run(id);
}

// === 冷站 CRUD ===
export function getStations(projectId: number) {
  return getDB().prepare('SELECT * FROM ac_stations WHERE project_id = ? ORDER BY created_at DESC').all(projectId);
}

export function createStation(projectId: number, name: string, location?: string) {
  const result = getDB().prepare('INSERT INTO ac_stations (project_id, name, location) VALUES (?, ?, ?)').run(projectId, name, location || '');
  return { id: result.lastInsertRowid, projectId, name, location };
}

export function deleteStation(id: number) {
  getDB().prepare('DELETE FROM ac_stations WHERE id = ?').run(id);
}

// === 设备 CRUD ===
export function getDevices(projectId: number) {
  return getDB().prepare('SELECT * FROM ac_devices WHERE project_id = ? ORDER BY device_type, created_at DESC').all(projectId);
}

export function getDevicesByRoom(roomId: number) {
  return getDB().prepare('SELECT * FROM ac_devices WHERE room_id = ? ORDER BY device_type').all(roomId);
}

export function createDevice(data: {
  project_id: number; station_id?: number; floor_id?: number; room_id?: number;
  device_type: string; chiller_subtype?: string; name: string; code: string;
  location?: string; running_status?: string; is_fault?: number; is_offline?: number;
}) {
  const result = getDB().prepare(`
    INSERT INTO ac_devices (project_id, station_id, floor_id, room_id, device_type, chiller_subtype, name, code, location, running_status, is_fault, is_offline)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.project_id, data.station_id || null, data.floor_id || null, data.room_id || null,
    data.device_type, data.chiller_subtype || null,
    data.name, data.code, data.location || '',
    data.running_status || 'stopped', data.is_fault || 0, data.is_offline || 0
  );
  return { id: result.lastInsertRowid, ...data };
}

export function deleteDevice(id: number) {
  getDB().prepare('DELETE FROM ac_devices WHERE id = ?').run(id);
}

export function updateDeviceStatus(id: number, running_status: string, is_fault: number, is_offline: number) {
  getDB().prepare('UPDATE ac_devices SET running_status = ?, is_fault = ?, is_offline = ? WHERE id = ?').run(running_status, is_fault, is_offline, id);
}

// === 时序数据 ===
export function recordMetrics(deviceId: number, params: Record<string, any>) {
  getDB().prepare('INSERT INTO ac_device_metrics (device_id, params) VALUES (?, ?)').run(deviceId, JSON.stringify(params));
}

export function getLatestMetrics(deviceId: number) {
  const row = getDB().prepare('SELECT * FROM ac_device_metrics WHERE device_id = ? ORDER BY timestamp DESC LIMIT 1').get(deviceId) as any;
  if (!row) return null;
  return { ...row, params: JSON.parse(row.params) };
}

export function getMetricsHistory(deviceId: number, limit: number = 100) {
  const rows = getDB().prepare('SELECT * FROM ac_device_metrics WHERE device_id = ? ORDER BY timestamp DESC LIMIT ?').all(deviceId, limit) as any[];
  return rows.map(r => ({ ...r, params: JSON.parse(r.params) }));
}

// === 计量表计 ===
export function getMeters(projectId: number) {
  return getDB().prepare('SELECT * FROM ac_meters WHERE project_id = ? ORDER BY meter_level, id ASC').all(projectId);
}

export function createMeter(data: { project_id: number; meter_level: number; name: string; code: string; location?: string; installed_at?: string }) {
  const result = getDB().prepare('INSERT INTO ac_meters (project_id, meter_level, name, code, location, installed_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    data.project_id, data.meter_level, data.name, data.code, data.location || '', data.installed_at || ''
  );
  return { id: result.lastInsertRowid, ...data };
}

export function deleteMeter(id: number) {
  getDB().prepare('DELETE FROM ac_meters WHERE id = ?').run(id);
}

// 统计量计数量
export function getMeterStats(projectId: number) {
  const stats = getDB().prepare(`
    SELECT meter_level, COUNT(*) as count FROM ac_meters WHERE project_id = ? GROUP BY meter_level
  `).all(projectId) as any[];
  const result: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  stats.forEach(s => { result[s.meter_level] = s.count; });
  return result;
}

// === 月度用电量/电费 ===
export function getEnergyMonthly(projectId: number) {
  return getDB().prepare('SELECT * FROM ac_energy_monthly WHERE project_id = ? ORDER BY year DESC, month DESC').all(projectId);
}

export function upsertEnergyMonthly(data: { project_id: number; year: number; month: number; electricity_kwh: number; cost_cny: number }) {
  getDB().prepare(`
    INSERT INTO ac_energy_monthly (project_id, year, month, electricity_kwh, cost_cny)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(project_id, year, month) DO UPDATE SET electricity_kwh = ?, cost_cny = ?
  `).run(
    data.project_id, data.year, data.month, data.electricity_kwh, data.cost_cny,
    data.electricity_kwh, data.cost_cny
  );
  return data;
}

export function deleteEnergyMonthly(id: number) {
  getDB().prepare('DELETE FROM ac_energy_monthly WHERE id = ?').run(id);
}

// 同比环比统计
export function getEnergyStats(projectId: number) {
  const rows = getDB().prepare('SELECT * FROM ac_energy_monthly WHERE project_id = ? ORDER BY year ASC, month ASC').all(projectId) as any[];
  if (rows.length === 0) return { total_kwh: 0, total_cost: 0, yoy: null, mom: null, monthly: [] };

  const total_kwh = rows.reduce((s, r) => s + r.electricity_kwh, 0);
  const total_cost = rows.reduce((s, r) => s + r.cost_cny, 0);

  const latest = rows[rows.length - 1];
  // 环比：上个月
  let prevMonthIdx = rows.length - 2;
  const mom = prevMonthIdx >= 0 ? {
    electricity_kwh: latest.electricity_kwh,
    prev_kwh: rows[prevMonthIdx].electricity_kwh,
    change_pct: rows[prevMonthIdx].electricity_kwh > 0
      ? ((latest.electricity_kwh - rows[prevMonthIdx].electricity_kwh) / rows[prevMonthIdx].electricity_kwh * 100).toFixed(1)
      : '0',
    cost_cny: latest.cost_cny,
    prev_cost: rows[prevMonthIdx].cost_cny,
  } : null;

  // 同比：去年同月
  const yoyRow = rows.find(r => r.year === latest.year - 1 && r.month === latest.month);
  const yoy = yoyRow ? {
    electricity_kwh: latest.electricity_kwh,
    prev_kwh: yoyRow.electricity_kwh,
    change_pct: yoyRow.electricity_kwh > 0
      ? ((latest.electricity_kwh - yoyRow.electricity_kwh) / yoyRow.electricity_kwh * 100).toFixed(1)
      : '0',
    cost_cny: latest.cost_cny,
    prev_cost: yoyRow.cost_cny,
  } : null;

  return { total_kwh, total_cost, yoy, mom, monthly: rows };
}

// === 大屏模块配置 ===
export function getModules() {
  return getDB().prepare('SELECT * FROM sys_modules ORDER BY sort_order ASC').all();
}

export function getVisibleModules() {
  return getDB().prepare('SELECT * FROM sys_modules WHERE is_visible = 1 ORDER BY sort_order ASC').all();
}

export function addModule(data: { module_key: string; label: string; icon: string; sort_order: number }) {
  const result = getDB().prepare('INSERT INTO sys_modules (module_key, label, icon, sort_order) VALUES (?, ?, ?, ?)').run(data.module_key, data.label, data.icon, data.sort_order);
  return { id: result.lastInsertRowid, ...data };
}

export function updateModule(id: number, data: { label?: string; icon?: string; sort_order?: number; is_visible?: number }) {
  const sets: string[] = [];
  const vals: any[] = [];
  if (data.label !== undefined) { sets.push('label = ?'); vals.push(data.label); }
  if (data.icon !== undefined) { sets.push('icon = ?'); vals.push(data.icon); }
  if (data.sort_order !== undefined) { sets.push('sort_order = ?'); vals.push(data.sort_order); }
  if (data.is_visible !== undefined) { sets.push('is_visible = ?'); vals.push(data.is_visible); }
  if (sets.length === 0) return;
  vals.push(id);
  getDB().prepare(`UPDATE sys_modules SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
}

export function deleteModule(id: number) {
  getDB().prepare('DELETE FROM sys_modules WHERE id = ?').run(id);
}
