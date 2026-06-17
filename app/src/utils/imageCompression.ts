// Image compression utility - compress images larger than 2MB

const MAX_SIZE_MB = 2;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export interface CompressionResult {
  file: File;
  compressed: boolean;
  originalSize: number;
  compressedSize: number;
}

async function compressImage(file: File): Promise<CompressionResult> {
  const originalSize = file.size;

  // If file is smaller than max size, no compression needed
  if (originalSize <= MAX_SIZE_BYTES) {
    return {
      file,
      compressed: false,
      originalSize,
      compressedSize: originalSize,
    };
  }

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = async () => {
      // Start with full dimensions
      let width = img.width;
      let height = img.height;
      let quality = 0.9;
      let compressedFile: File;

      // Loop to compress until size is acceptable or quality reaches minimum
      while (quality > 0.1) {
        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        // Convert to blob
        const blob = await new Promise<Blob>((blobResolve) => {
          canvas.toBlob(
            (blob) => {
              blobResolve(blob!);
            },
            'image/jpeg',
            quality
          );
        });

        // Check if size is acceptable
        if (blob.size <= MAX_SIZE_BYTES) {
          compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
            type: 'image/jpeg',
            lastModified: file.lastModified,
          });

          resolve({
            file: compressedFile,
            compressed: true,
            originalSize,
            compressedSize: blob.size,
          });
          return;
        }

        // Reduce quality or size
        if (quality > 0.5) {
          quality -= 0.15;
        } else {
          // If quality is already low, reduce dimensions
          width = Math.floor(width * 0.85);
          height = Math.floor(height * 0.85);
          quality = 0.9;
        }
      }

      // If we get here, even with lowest settings it's too big, return as-is
      resolve({
        file,
        compressed: true,
        originalSize,
        compressedSize: originalSize,
      });
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Read the image file
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}

export async function validateAndCompressImage(
  file: File
): Promise<{ file: File; message: string } | { error: string }> {
  // Check if file is an image
  if (!file.type.startsWith('image/')) {
    return { error: 'Please select an image file' };
  }

  try {
    const result = await compressImage(file);

    if (result.compressed) {
      const originalMB = (result.originalSize / (1024 * 1024)).toFixed(2);
      const compressedMB = (result.compressedSize / (1024 * 1024)).toFixed(2);
      return {
        file: result.file,
        message: `Image compressed: ${originalMB}MB → ${compressedMB}MB`,
      };
    }

    const sizeMB = (result.originalSize / (1024 * 1024)).toFixed(2);
    return {
      file: result.file,
      message: `Image ready (${sizeMB}MB)`,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Compression failed' };
  }
}
