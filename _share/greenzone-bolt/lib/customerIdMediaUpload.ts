import { supabase } from '@/lib/supabase';

// Reuse existing bucket to avoid provisioning storage buckets during this change.
// The resulting URL is what gets copied into `profiles.id_document_url` and then into
// `order_documents.file_url`.
const BUCKET = 'vendor-media';

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

export async function uploadCustomerIdDocumentFile(
  userId: string,
  file: File,
  documentType: 'government_id' | 'passport' | 'photo_id'
): Promise<{ url: string } | { error: string }> {
  const path = `customers/${userId}/id/${documentType}/${Date.now()}-${sanitizeFileName(file.name)}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) return { error: error.message };

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) return { error: 'No public URL returned' };

  return { url: data.publicUrl };
}

