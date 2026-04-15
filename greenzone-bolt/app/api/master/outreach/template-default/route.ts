import { NextRequest, NextResponse } from 'next/server';
import { requireMasterOutreachAuth } from '@/lib/masterOutreachRequest';
import { getOutreachPlaceholderTemplateForEditor } from '@/lib/outreachTemplate';

export async function GET(request: NextRequest) {
  const auth = await requireMasterOutreachAuth(request);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json(getOutreachPlaceholderTemplateForEditor());
}
