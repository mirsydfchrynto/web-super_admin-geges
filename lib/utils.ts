/**
 * Formats an image string (URL or Base64) for display in an <img> tag.
 * Handles raw Base64 strings by adding the appropriate prefix.
 */
export const getDisplayImageUrl = (urlOrBase64: string | undefined | null): string | null => {
  if (!urlOrBase64) return null;
  
  // If it's already a URL or a Base64 with prefix, return as is
  if (urlOrBase64.startsWith('http') || urlOrBase64.startsWith('data:')) {
    return urlOrBase64;
  }
  
  // Assume it's a raw Base64 string from Flutter
  // We use image/jpeg as a safe default for Base64
  return `data:image/jpeg;base64,${urlOrBase64}`;
};
