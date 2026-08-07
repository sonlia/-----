import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDB();
    const projects = db.prepare('SELECT * FROM ac_projects ORDER BY province, city, name').all() as any[];
    const floors = db.prepare('SELECT * FROM ac_floors ORDER BY sort_order, id').all() as any[];
    const rooms = db.prepare('SELECT * FROM ac_rooms ORDER BY id').all() as any[];
    const devices = db.prepare('SELECT * FROM ac_devices ORDER BY device_type, id').all() as any[];
    const stations = db.prepare('SELECT * FROM ac_stations ORDER BY id').all() as any[];
    const meters = db.prepare('SELECT * FROM ac_meters ORDER BY meter_level, id').all() as any[];

    type TreeNode = {
      id: string; type: string; dbId: number; label: string; icon: string;
      meta?: string; data?: any; children?: TreeNode[];
    };

    const provinceMap: Record<string, Record<string, TreeNode[]>> = {};
    projects.forEach(p => {
      if (!provinceMap[p.province]) provinceMap[p.province] = {};
      if (!provinceMap[p.province][p.city]) provinceMap[p.province][p.city] = [];

      const projFloors = floors.filter(f => f.project_id === p.id);
      const floorNodes: TreeNode[] = projFloors.map(f => {
        const floorRooms = rooms.filter(r => r.floor_id === f.id);
        const roomNodes: TreeNode[] = floorRooms.map(r => {
          const roomDevices = devices.filter(d => d.room_id === r.id);
          return {
            id: `room:${r.id}`, type: 'room', dbId: r.id,
            label: r.name, icon: '🚪',
            children: roomDevices.map(d => ({
              id: `device:${d.id}`, type: 'device', dbId: d.id,
              label: d.name, icon: devIcon(d.device_type), data: d,
            })),
          };
        });
        const floorDevices = devices.filter(d => d.floor_id === f.id && !d.room_id);
        floorDevices.forEach(d => roomNodes.push({
          id: `device:${d.id}`, type: 'device', dbId: d.id,
          label: d.name, icon: devIcon(d.device_type), data: d,
        }));
        return { id: `floor:${f.id}`, type: 'floor', dbId: f.id, label: f.name, icon: '🏢', children: roomNodes };
      });

      const projStations = stations.filter(s => s.project_id === p.id);
      const stationNodes: TreeNode[] = projStations.map(s => {
        const stDevices = devices.filter(d => d.station_id === s.id && !d.room_id);
        return {
          id: `station:${s.id}`, type: 'station', dbId: s.id,
          label: s.name, icon: '❄', data: s,
          children: stDevices.map(d => ({
            id: `device:${d.id}`, type: 'device', dbId: d.id,
            label: d.name, icon: devIcon(d.device_type), data: d,
          })),
        };
      });

      const projMeters = meters.filter(m => m.project_id === p.id);
      const meterNodes: TreeNode[] = projMeters.map(m => ({
        id: `meter:${m.id}`, type: 'meter', dbId: m.id,
        label: m.name, icon: '⚡', data: m, meta: `${m.meter_level}级`,
      }));

      provinceMap[p.province][p.city].push({
        id: `project:${p.id}`, type: 'project', dbId: p.id,
        label: p.name, icon: '📁', data: p,
        children: [...stationNodes, ...floorNodes, ...meterNodes],
      });
    });

    const tree: TreeNode[] = Object.entries(provinceMap).map(([prov, cities]) => ({
      id: `province:${prov}`, type: 'province', dbId: 0,
      label: prov, icon: '🌐',
      children: Object.entries(cities).map(([city, projList]) => ({
        id: `city:${city}`, type: 'city', dbId: 0,
        label: city, icon: '🏙', children: projList,
      })),
    }));

    return NextResponse.json({ success: true, data: tree });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

function devIcon(type: string): string {
  const icons: Record<string, string> = {
    chiller: '🏭', frozen_pump: '💧', cooling_pump: '🌊', cooling_tower: '🌪', ahu: '🌬',
  };
  return icons[type] || '⚙';
}
