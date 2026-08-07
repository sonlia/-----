import { NextRequest, NextResponse } from 'next/server';
import { getStations, createStation, deleteStation } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/admin/stations?project_id=X
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = parseInt(searchParams.get('project_id') || '0');
    if (!projectId) return NextResponse.json({ success: false, error: '缺少 project_id' }, { status: 400 });
    const stations = getStations(projectId);
    return NextResponse.json({ success: true, data: stations });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// POST - 创建冷站
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { project_id, name, location } = body;
    if (!project_id || !name) {
      return NextResponse.json({ success: false, error: '项目ID、冷站名必填' }, { status: 400 });
    }
    const station = createStation(project_id, name, location);
    return NextResponse.json({ success: true, data: station });
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
    deleteStation(id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
