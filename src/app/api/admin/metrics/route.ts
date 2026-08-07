import { NextRequest, NextResponse } from 'next/server';
import { recordMetrics, getLatestMetrics, getMetricsHistory } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/admin/metrics?device_id=X&limit=100
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const deviceId = parseInt(searchParams.get('device_id') || '0');
    const limit = parseInt(searchParams.get('limit') || '100');
    if (!deviceId) return NextResponse.json({ success: false, error: '缺少 device_id' }, { status: 400 });

    const history = searchParams.get('history');
    if (history === '1') {
      const data = getMetricsHistory(deviceId, limit);
      return NextResponse.json({ success: true, data });
    } else {
      const data = getLatestMetrics(deviceId);
      return NextResponse.json({ success: true, data });
    }
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// POST - 记录时序数据
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { device_id, params } = body;
    if (!device_id || !params) {
      return NextResponse.json({ success: false, error: 'device_id 和 params 必填' }, { status: 400 });
    }
    recordMetrics(device_id, params);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
