import { supabase } from './supabaseClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'images';

export interface UploadResult {
  success: boolean;
  url?: string;
  filename?: string;
  error?: string;
}

/**
 * Upload an image file to Supabase Storage via Render backend
 */
export async function uploadImage(file: File): Promise<UploadResult> {
  // Try backend first if configured
  if (API_URL) {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${API_URL}/api/upload/image`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, url: data.url, filename: data.filename };
      }
    } catch (_) {}
  }

  // Fallback: upload directly to Supabase Storage
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    cacheControl: '3600',
    contentType: file.type,
  });
  if (uploadError) {
    return { success: false, error: uploadError.message };
  }

  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { success: true, url: publicData.publicUrl, filename: path };
}

/**
 * Delete an image from Supabase Storage via Render backend
 */
export async function deleteImage(filename: string): Promise<boolean> {
  // Try backend first if configured
  if (API_URL) {
    try {
      const response = await fetch(`${API_URL}/api/upload/image/${filename}`, { method: 'DELETE' });
      if (response.ok) return true;
    } catch (_) {}
  }

  const { error } = await supabase.storage.from(BUCKET).remove([filename]);
  return !error;
}

/**
 * Get public URL for an image filename (if you need to construct URL manually)
 */
export function getImageUrl(filename: string): string {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`;
}
