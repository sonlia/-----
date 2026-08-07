import { NextResponse } from 'next/server';
import { getVisibleModules } from '@/lib/db';
export const dynamic = 'force-dynamic';

// 大屏前端调用此 API 获取需要显示的模块列表
export async function GET() {
  return NextResponse.json({ success: true, data: getVisibleModules() });
}
