import { NextRequest, NextResponse } from 'next/server';
import { requireMasterOutreachAuth } from '@/lib/masterOutreachRequest';
import { parseOutreachFromOptions, defaultOutreachFromId } from '@/lib/outreachFromOptions';

export async function GET(request: NextRequest) {
  const auth = await requireMasterOutreachAuth(request);
  if (auth instanceof NextResponse) return auth;

  const options = parseOutreachFromOptions();
  return NextResponse.json({
    options,
    default_from_id: defaultOutreachFromId(),
  });
}
