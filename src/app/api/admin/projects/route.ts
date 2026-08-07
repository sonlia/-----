import { NextRequest, NextResponse } from 'next/server';
import { getProjects, createProject, deleteProject } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/admin/projects - 获取所有项目
export async function GET() {
  try {
    const projects = getProjects();
    return NextResponse.json({ success: true, data: projects });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// POST /api/admin/projects - 创建项目
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { province, city, name, address } = body;
    if (!province || !city || !name) {
      return NextResponse.json({ success: false, error: '省份、城市、项目名必填' }, { status: 400 });
    }
    const project = createProject(province, city, name, address);
    return NextResponse.json({ success: true, data: project });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// DELETE /api/admin/projects?id=X - 删除项目
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get('id') || '0');
    if (!id) return NextResponse.json({ success: false, error: '缺少 id' }, { status: 400 });
    deleteProject(id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
