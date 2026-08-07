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

  db.exec(`
    CREATE TABLE IF NOT EXISTS ac_devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      station_id INTEGER NOT NULL,
      project_id INTEGER NOT NULL,
      device_type TEXT NOT NULL,
      chiller_subtype TEXT,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      location TEXT,
      running_status TEXT DEFAULT 'stopped',
      is_fault INTEGER DEFAULT 0,
      is_offline INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (station_id) REFERENCES ac_stations(id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES ac_projects(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS ac_device_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id INTEGER NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      params TEXT NOT NULL,
      FOREIGN KEY (device_id) REFERENCES ac_devices(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_metrics_device_time ON ac_device_metrics(device_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_devices_station ON ac_devices(station_id);
    CREATE INDEX IF NOT EXISTS idx_devices_project ON ac_devices(project_id);
  `);
}

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

export function getDevices(stationId: number) {
  return getDB().prepare('SELECT * FROM ac_devices WHERE station_id = ? ORDER BY device_type, created_at DESC').all(stationId);
}

export function createDevice(data: {
  station_id: number; project_id: number; device_type: string;
  chiller_subtype?: string; name: string; code: string; location?: string;
  running_status?: string; is_fault?: number; is_offline?: number;
}) {
  const result = getDB().prepare(`
    INSERT INTO ac_devices (station_id, project_id, device_type, chiller_subtype, name, code, location, running_status, is_fault, is_offline)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.station_id, data.project_id, data.device_type, data.chiller_subtype || null,
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
