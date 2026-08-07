import { NextRequest, NextResponse } from 'next/server';
import { getEnergyMonthly, upsertEnergyMonthly, deleteEnergyMonthly, getEnergyStats } from '@/lib/db';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = parseInt(searchParams.get('project_id') || '0');
  const stats = searchParams.get('stats') === '1';
  if (!projectId) return NextResponse.json({ success: false, error: '缺少 project_id' }, { status: 400 });
  if (stats) {
    return NextResponse.json({ success: true, data: getEnergyStats(projectId) });
  }
  return NextResponse.json({ success: true, data: getEnergyMonthly(projectId) });
}

export async function POST(req: NextRequest) {
  const { project_id, year, month, electricity_kwh, cost_cny } = await req.json();
  if (!project_id || !year || !month) return NextResponse.json({ success: false, error: '项目ID、年、月必填' }, { status: 400 });
  return NextResponse.json({ success: true, data: upsertEnergyMonthly({ project_id, year, month, electricity_kwh: electricity_kwh || 0, cost_cny: cost_cny || 0 }) });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get('id') || '0');
  if (!id) return NextResponse.json({ success: false, error: '缺少 id' }, { status: 400 });
  deleteEnergyMonthly(id);
  return NextResponse.json({ success: true });
}
