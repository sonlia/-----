import { NextRequest, NextResponse } from 'next/server';
import { getDevices, createDevice, deleteDevice, updateDeviceStatus } from '@/lib/db';

export const dynamic = 'force-dynamic';

// 设备类型定义
export const DEVICE_TYPES: Record<string, { label: string; subtypes?: Record<string, string> }> = {
  chiller: { label: '制冷机', subtypes: { screw: '螺杆式', centrifugal: '离心式', magnetic: '磁悬浮' } },
  frozen_pump: { label: '冷冻泵' },
  cooling_pump: { label: '冷却泵' },
  cooling_tower: { label: '冷却塔' },
  ahu: { label: '风柜' },
};

// GET /api/admin/devices?station_id=X
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const stationId = parseInt(searchParams.get('station_id') || '0');
    if (!stationId) return NextResponse.json({ success: false, error: '缺少 station_id' }, { status: 400 });
    const devices = getDevices(stationId);
    return NextResponse.json({ success: true, data: devices, types: DEVICE_TYPES });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// POST - 创建设备
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { station_id, project_id, device_type, chiller_subtype, name, code, location, running_status, is_fault, is_offline } = body;
    if (!station_id || !project_id || !device_type || !name || !code) {
      return NextResponse.json({ success: false, error: '冷站ID、项目ID、设备类型、名称、编号必填' }, { status: 400 });
    }
    const device = createDevice({ station_id, project_id, device_type, chiller_subtype, name, code, location, running_status, is_fault, is_offline });
    return NextResponse.json({ success: true, data: device });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// PUT - 更新设备状态
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, running_status, is_fault, is_offline } = body;
    if (!id) return NextResponse.json({ success: false, error: '缺少 id' }, { status: 400 });
    updateDeviceStatus(id, running_status, is_fault, is_offline);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// DELETE?id=X
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get('id') || '0');
    if (!id) return NextResponse.json({ success: false, error: '缺少 id' }, { status: 400 });
    deleteDevice(id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
