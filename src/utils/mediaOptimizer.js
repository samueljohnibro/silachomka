/**
 * Universal Media Optimization & Validation Pipeline (Stage 26)
 *
 * Automatically optimizes uploaded files for web delivery on the client before
 * sending to the Cloudflare Worker (avoiding CPU/memory exhaustion inside the Worker),
 * while extracting dimensions/duration and distinguishing asset roles:
 *   - ORIGINAL_SOURCE
 *   - OPTIMIZED_WEB
 *   - PREVIEW_ASSET
 */

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB

const ALLOWED_MIMES_BY_TYPE = {
  IMAGE: new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif']),
  AUDIO: new Set(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac', 'audio/ogg', 'audio/flac']),
  VIDEO: new Set(['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska', 'image/gif'])
};

const ALLOWED_EXT_BY_TYPE = {
  IMAGE: new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif']),
  AUDIO: new Set(['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac']),
  VIDEO: new Set(['mp4', 'webm', 'mov', 'gif'])
};

export function validateMediaFile(file, assetType = 'IMAGE') {
  if (!file || typeof file === 'string') {
    throw new Error('No valid file selected.');
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('File exceeds the 100 MB maximum limit.');
  }
  const ext = (file.name || '').includes('.')
    ? file.name.split('.').pop().toLowerCase()
    : '';
  const mime = (file.type || '').toLowerCase();

  const allowedMimes = ALLOWED_MIMES_BY_TYPE[assetType];
  const allowedExts = ALLOWED_EXT_BY_TYPE[assetType];

  if (allowedMimes && allowedExts) {
    const mimeOk = mime && allowedMimes.has(mime);
    const extOk = ext && allowedExts.has(ext);
    if (!mimeOk && !extOk) {
      throw new Error(`Unsupported ${assetType.toLowerCase()} file format (${file.name || mime || 'unknown'}).`);
    }
  }
  return { ext, mime };
}

function loadImageDimensionsAndCanvas(file, maxDimension = 2048, quality = 0.88) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      resolve(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {}
      resolve(result);
    };

    const timer = setTimeout(() => finish(null), 6000);

    img.onload = () => {
      try {
        const naturalWidth = img.naturalWidth || img.width || 0;
        const naturalHeight = img.naturalHeight || img.height || 0;
        if (!naturalWidth || !naturalHeight) {
          finish(null);
          return;
        }

        // Preserve animated GIFs without canvas re-encoding so animation frames are never lost
        const isGif = file.type === 'image/gif' || /\.gif$/i.test(file.name || '');
        if (isGif) {
          finish({
            optimizedFile: file,
            width: naturalWidth,
            height: naturalHeight,
            wasCompressed: false,
            optimizationStatus: 'PASSTHROUGH_ANIMATED_GIF'
          });
          return;
        }

        let targetWidth = naturalWidth;
        let targetHeight = naturalHeight;
        if (naturalWidth > maxDimension || naturalHeight > maxDimension) {
          if (naturalWidth >= naturalHeight) {
            targetWidth = maxDimension;
            targetHeight = Math.round((naturalHeight / naturalWidth) * maxDimension);
          } else {
            targetHeight = maxDimension;
            targetWidth = Math.round((naturalWidth / naturalHeight) * maxDimension);
          }
        }

        // Only re-encode if dimensions exceed maxDimension or file is > 350 KB
        const needsCompression =
          targetWidth !== naturalWidth ||
          targetHeight !== naturalHeight ||
          file.size > 350 * 1024;

        if (!needsCompression) {
          finish({
            optimizedFile: file,
            width: naturalWidth,
            height: naturalHeight,
            wasCompressed: false,
            optimizationStatus: 'ALREADY_OPTIMAL'
          });
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          finish({
            optimizedFile: file,
            width: naturalWidth,
            height: naturalHeight,
            wasCompressed: false,
            optimizationStatus: 'ORIGINAL_FALLBACK'
          });
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        const outputMime = 'image/webp';
        canvas.toBlob(
          (blob) => {
            if (!blob || (blob.size >= file.size && targetWidth === naturalWidth)) {
              finish({
                optimizedFile: file,
                width: naturalWidth,
                height: naturalHeight,
                wasCompressed: false,
                optimizationStatus: 'ORIGINAL_RETAINED'
              });
              return;
            }
            const baseName = (file.name || 'image').replace(/\.[^.]+$/, '');
            const optimizedFile = new File([blob], `${baseName}.webp`, {
              type: outputMime,
              lastModified: Date.now()
            });
            finish({
              optimizedFile,
              width: targetWidth,
              height: targetHeight,
              wasCompressed: true,
              optimizationStatus: 'OPTIMIZED_WEBP'
            });
          },
          outputMime,
          quality
        );
      } catch {
        finish(null);
      }
    };

    img.onerror = () => finish(null);
    img.src = objectUrl;
  });
}

function probeMediaMetadata(file, tagType = 'audio') {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      resolve({});
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const el = document.createElement(tagType);
    el.preload = 'metadata';
    el.muted = true;
    let settled = false;

    const cleanup = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        el.removeAttribute('src');
        el.load();
      } catch {}
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {}
      resolve(result);
    };

    const timer = setTimeout(() => cleanup({}), 4000);

    el.onloadedmetadata = () => {
      const duration = Number.isFinite(el.duration) ? Number(el.duration.toFixed(2)) : null;
      const width = tagType === 'video' && el.videoWidth ? el.videoWidth : null;
      const height = tagType === 'video' && el.videoHeight ? el.videoHeight : null;
      cleanup({ duration_seconds: duration, width, height });
    };

    el.onerror = () => cleanup({});
    el.src = objectUrl;
  });
}

/**
 * Optimizes a media file before uploading and returns `{ file, meta }`.
 */
export async function optimizeMediaBeforeUpload(file, assetType = 'IMAGE', options = {}) {
  const { ext, mime } = validateMediaFile(file, assetType);
  const originalSizeBytes = file.size || 0;
  const originalMimeType = mime || file.type || 'application/octet-stream';
  const defaultRole = options.assetRole || (options.isPreview ? 'PREVIEW_ASSET' : 'OPTIMIZED_WEB');

  if (assetType === 'IMAGE' || (assetType === 'VIDEO' && (mime === 'image/gif' || ext === 'gif'))) {
    const result = await loadImageDimensionsAndCanvas(
      file,
      options.maxDimension || 2048,
      options.quality || 0.88
    );
    if (result) {
      return {
        file: result.optimizedFile,
        meta: {
          asset_role: defaultRole,
          original_size_bytes: originalSizeBytes,
          original_mime_type: originalMimeType,
          width: result.width,
          height: result.height,
          optimization_status: result.optimizationStatus
        }
      };
    }
  }

  if (assetType === 'AUDIO') {
    const probed = await probeMediaMetadata(file, 'audio');
    return {
      file,
      meta: {
        asset_role: options.assetRole || 'PREVIEW_ASSET',
        original_size_bytes: originalSizeBytes,
        original_mime_type: originalMimeType,
        duration_seconds: probed.duration_seconds || null,
        optimization_status: 'VERIFIED_WEB_AUDIO'
      }
    };
  }

  if (assetType === 'VIDEO') {
    const probed = await probeMediaMetadata(file, 'video');
    return {
      file,
      meta: {
        asset_role: defaultRole,
        original_size_bytes: originalSizeBytes,
        original_mime_type: originalMimeType,
        width: probed.width || null,
        height: probed.height || null,
        duration_seconds: probed.duration_seconds || null,
        optimization_status: 'VERIFIED_WEB_VIDEO'
      }
    };
  }

  return {
    file,
    meta: {
      asset_role: defaultRole,
      original_size_bytes: originalSizeBytes,
      original_mime_type: originalMimeType,
      optimization_status: 'ORIGINAL_SOURCE'
    }
  };
}
