/**
 * Image Service - Upload images via Render Backend → Supabase Storage
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://tpimis-backend.onrender.com';

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
  try {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_URL}/api/upload/image`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to upload image',
      };
    }

    return {
      success: true,
      url: data.url,
      filename: data.filename,
    };
  } catch (error) {
    console.error('Error uploading image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload image',
    };
  }
}

/**
 * Delete an image from Supabase Storage via Render backend
 */
export async function deleteImage(filename: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/upload/image/${filename}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      console.error('Failed to delete image');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting image:', error);
    return false;
  }
}

/**
 * Get public URL for an image filename (if you need to construct URL manually)
 */
export function getImageUrl(filename: string): string {
  // Supabase Storage public URL pattern
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ligecpalemxczhpfmeid.supabase.co';
  return `${SUPABASE_URL}/storage/v1/object/public/images/${filename}`;
}
