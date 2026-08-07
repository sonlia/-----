import { NextRequest, NextResponse } from 'next/server';
import { getRooms, createRoom, deleteRoom } from '@/lib/db';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const floorId = parseInt(searchParams.get('floor_id') || '0');
  if (!floorId) return NextResponse.json({ success: false, error: '缺少 floor_id' }, { status: 400 });
  return NextResponse.json({ success: true, data: getRooms(floorId) });
}

export async function POST(req: NextRequest) {
  const { floor_id, project_id, name } = await req.json();
  if (!floor_id || !project_id || !name) return NextResponse.json({ success: false, error: '楼层ID、项目ID、房间名必填' }, { status: 400 });
  return NextResponse.json({ success: true, data: createRoom(floor_id, project_id, name) });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get('id') || '0');
  if (!id) return NextResponse.json({ success: false, error: '缺少 id' }, { status: 400 });
  deleteRoom(id);
  return NextResponse.json({ success: true });
}
