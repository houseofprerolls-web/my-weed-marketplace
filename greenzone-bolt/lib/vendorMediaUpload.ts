import { supabase } from '@/lib/supabase';

const BUCKET = 'vendor-media';

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

/**
 * Upload to public `vendor-media` bucket. Object path: `{userId}/{timestamp}-{fileName}`.
 * Returns public URL for use in `vendors.logo_url`, `products.images`, etc.
 */
export async function uploadVendorMediaFile(userId: string, file: File): Promise<{ url: string } | { error: string }> {
  const path = `${userId}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) {
    return { error: error.message };
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    return { error: 'No public URL returned' };
  }
  return { url: data.publicUrl };
}
