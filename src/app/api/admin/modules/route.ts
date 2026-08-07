import { NextRequest, NextResponse } from 'next/server';
import { getModules, addModule, updateModule, deleteModule } from '@/lib/db';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ success: true, data: getModules() });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.module_key || !body.label) return NextResponse.json({ success: false, error: 'module_key、label 必填' }, { status: 400 });
  return NextResponse.json({ success: true, data: addModule(body) });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ success: false, error: '缺少 id' }, { status: 400 });
  updateModule(id, data);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get('id') || '0');
  if (!id) return NextResponse.json({ success: false, error: '缺少 id' }, { status: 400 });
  deleteModule(id);
  return NextResponse.json({ success: true });
}
