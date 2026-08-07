import { NextRequest, NextResponse } from 'next/server';
import { getFloors, createFloor, deleteFloor } from '@/lib/db';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = parseInt(searchParams.get('project_id') || '0');
  if (!projectId) return NextResponse.json({ success: false, error: '缺少 project_id' }, { status: 400 });
  return NextResponse.json({ success: true, data: getFloors(projectId) });
}

export async function POST(req: NextRequest) {
  const { project_id, name, sort_order } = await req.json();
  if (!project_id || !name) return NextResponse.json({ success: false, error: '项目ID、楼层名必填' }, { status: 400 });
  return NextResponse.json({ success: true, data: createFloor(project_id, name, sort_order || 0) });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get('id') || '0');
  if (!id) return NextResponse.json({ success: false, error: '缺少 id' }, { status: 400 });
  deleteFloor(id);
  return NextResponse.json({ success: true });
}
