import { NextRequest, NextResponse } from 'next/server';
import { getMeters, createMeter, deleteMeter, getMeterStats } from '@/lib/db';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = parseInt(searchParams.get('project_id') || '0');
  if (!projectId) return NextResponse.json({ success: false, error: '缺少 project_id' }, { status: 400 });
  const meters = getMeters(projectId);
  const stats = getMeterStats(projectId);
  return NextResponse.json({ success: true, data: meters, stats });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.project_id || !body.meter_level || !body.name || !body.code) {
    return NextResponse.json({ success: false, error: '项目ID、计量级别、名称、编号必填' }, { status: 400 });
  }
  return NextResponse.json({ success: true, data: createMeter(body) });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get('id') || '0');
  if (!id) return NextResponse.json({ success: false, error: '缺少 id' }, { status: 400 });
  deleteMeter(id);
  return NextResponse.json({ success: true });
}
