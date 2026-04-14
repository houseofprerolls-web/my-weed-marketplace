import { NextResponse } from 'next/server';
import { createSupabaseAnonServer } from '@/lib/supabaseServerAnon';
import { vendorLeadFormSchema } from '@/lib/vendorLeadFormSchema';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const parsed = vendorLeadFormSchema.safeParse(body);
  if (!parsed.success) {
    const msg =
      parsed.error.flatten().fieldErrors.businessName?.[0] ||
      parsed.error.flatten().fieldErrors.contactEmail?.[0] ||
      parsed.error.flatten().fieldErrors.contactPhone?.[0] ||
      parsed.error.flatten().fieldErrors.zip?.[0] ||
      parsed.error.flatten().fieldErrors.licenseNumber?.[0] ||
      parsed.error.flatten().fieldErrors.listAsStorefront?.[0] ||
      'Please check your entries and try again.';
    return NextResponse.json({ error: msg, details: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createSupabaseAnonServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Application intake is not configured on this server.' }, { status: 503 });
  }

  const v = parsed.data;
  const zipDigits = v.zip.replace(/\D/g, '').slice(0, 5);
  const license = v.licenseNumber?.trim();

  const { error } = await supabase.from('vendor_lead_applications').insert({
    business_name: v.businessName.trim(),
    contact_email: v.contactEmail.trim(),
    contact_phone: v.contactPhone.trim(),
    zip: zipDigits,
    license_number: license && license.length > 0 ? license : null,
    requested_delivery: v.listAsDelivery,
    requested_storefront: v.listAsStorefront,
  });

  if (error) {
    return NextResponse.json({ error: error.message || 'Could not save your application.' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
