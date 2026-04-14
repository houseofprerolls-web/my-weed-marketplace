"use server";

import { createServerSupabase } from "@/lib/supabase/server";

export async function submitBusinessInquiryAction(formData: FormData) {
  const dispensaryName = String(formData.get("dispensaryName") ?? "").trim();
  const licenseInformation = String(
    formData.get("licenseInformation") ?? ""
  ).trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!dispensaryName || dispensaryName.length < 2) {
    throw new Error("Dispensary name is required.");
  }
  if (!licenseInformation || licenseInformation.length < 4) {
    throw new Error("License information is required.");
  }
  if (!phone || phone.length < 7) {
    throw new Error("A valid phone number is required.");
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("A valid email is required.");
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.from("business_inquiries").insert({
    dispensary_name: dispensaryName,
    license_information: licenseInformation,
    phone,
    email,
  });

  if (error) {
    if (error.message.includes("business_inquiries")) {
      throw new Error(
        "Submissions are not available yet—ask your admin to apply migration 0020."
      );
    }
    throw new Error(error.message);
  }
}
