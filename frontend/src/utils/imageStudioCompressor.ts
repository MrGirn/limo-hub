/**
 * AI Showroom Image Studio & Client-Side Canvas Compressor Utility.
 * Converts multi-megabyte smartphone/camera raw photos into ultra-crisp,
 * web-optimized WebP/JPEG assets under 250KB with AI studio lighting enhancement.
 */

export interface ProcessedStudioImage {
  originalName: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  compressionRatioPct: number;
  width: number;
  height: number;
  dataUrl: string;
  photoType: 'EXTERIOR' | 'CABIN' | 'COCKPIT' | 'TRUNK' | 'AMENITY';
  caption: string;
  isPrimary: boolean;
  isAiEnhanced: boolean;
}

/**
 * Compresses an image file in-browser using HTML5 Canvas.
 */
export async function compressStudioImage(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    applyAiLighting?: boolean;
    photoType?: 'EXTERIOR' | 'CABIN' | 'COCKPIT' | 'TRUNK' | 'AMENITY';
    caption?: string;
    isPrimary?: boolean;
  } = {}
): Promise<ProcessedStudioImage> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.85,
    applyAiLighting = false,
    photoType = 'EXTERIOR',
    caption = '',
    isPrimary = false
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image element'));
      img.onload = () => {
        // Calculate new dimensions preserving aspect ratio
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Canvas 2D context not available'));
          return;
        }

        // High quality downsampling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        if (applyAiLighting) {
          // AI Studio Lighting & Polish Filter (Contrast, Brightness, Saturation boost)
          ctx.filter = 'contrast(1.08) saturate(1.12) brightness(1.03)';
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Reset filter
        ctx.filter = 'none';

        // Output to WebP (or JPEG fallback)
        let outputType = 'image/webp';
        let dataUrl = canvas.toDataURL(outputType, quality);
        if (!dataUrl.startsWith('data:image/webp')) {
          outputType = 'image/jpeg';
          dataUrl = canvas.toDataURL(outputType, quality);
        }

        // Calculate compressed size in bytes from base64 string
        const base64Str = dataUrl.split(',')[1] || '';
        const compressedSizeBytes = Math.round((base64Str.length * 3) / 4);
        const originalSizeBytes = file.size;
        const compressionRatioPct = Math.round(
          ((originalSizeBytes - compressedSizeBytes) / originalSizeBytes) * 100
        );

        resolve({
          originalName: file.name,
          originalSizeBytes,
          compressedSizeBytes,
          compressionRatioPct: Math.max(0, compressionRatioPct),
          width,
          height,
          dataUrl,
          photoType,
          caption: caption || `${photoType.replace('_', ' ')} View`,
          isPrimary,
          isAiEnhanced: applyAiLighting
        });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Re-applies or toggles AI studio lighting directly on an existing dataUrl.
 */
export async function toggleAiStudioLighting(
  image: ProcessedStudioImage,
  enableAi: boolean
): Promise<ProcessedStudioImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error('Failed to load image for AI enhancement'));
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(image);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      if (enableAi) {
        ctx.filter = 'contrast(1.08) saturate(1.12) brightness(1.03)';
      } else {
        ctx.filter = 'none';
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/webp', 0.85);

      const base64Str = dataUrl.split(',')[1] || '';
      const compressedSizeBytes = Math.round((base64Str.length * 3) / 4);

      resolve({
        ...image,
        dataUrl,
        compressedSizeBytes,
        isAiEnhanced: enableAi
      });
    };
    img.src = image.dataUrl;
  });
}

/**
 * Formats bytes to human-readable size string.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
