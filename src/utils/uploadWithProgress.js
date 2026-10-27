/**
 * Unified Accurate Upload Progress Utility (Stage 34 — Req #14)
 * 
 * Uses XMLHttpRequest.upload.onprogress to provide true byte-level progress
 * tracking without fake timers or simulated progress bars.
 */

export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function uploadWithProgress({
  url,
  method = "POST",
  file,
  formData = null,
  headers = {},
  onProgress,
  signal,
}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);

    // Apply custom headers
    Object.entries(headers).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        xhr.setRequestHeader(key, String(val));
      }
    });

    // Abort controller integration
    if (signal) {
      signal.addEventListener("abort", () => {
        xhr.abort();
        reject(new DOMException("Upload aborted by user", "AbortError"));
      });
    }

    // Real byte-level upload progress tracking
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && typeof onProgress === "function") {
        const percent = Math.min(100, Math.max(0, Math.round((e.loaded / e.total) * 100)));
        onProgress({
          percent,
          loaded: e.loaded,
          total: e.total,
          loadedFormatted: formatBytes(e.loaded),
          totalFormatted: formatBytes(e.total),
        });
      }
    };

    xhr.onload = () => {
      let responseData = null;
      try {
        responseData = JSON.parse(xhr.responseText);
      } catch {
        responseData = xhr.responseText;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        if (typeof onProgress === "function") {
          const total = file?.size || 100;
          onProgress({
            percent: 100,
            loaded: total,
            total: total,
            loadedFormatted: formatBytes(total),
            totalFormatted: formatBytes(total),
          });
        }
        resolve(responseData);
      } else {
        const errMsg =
          responseData?.error ||
          responseData?.message ||
          `Upload failed with HTTP status ${xhr.status}`;
        reject(new Error(errMsg));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network connection error during upload. Please check your connection."));
    };

    xhr.ontimeout = () => {
      reject(new Error("Upload timed out. Please try again."));
    };

    // Prepare payload
    let payload = formData;
    if (!payload && file) {
      payload = new FormData();
      payload.append("file", file);
    }

    xhr.send(payload);
  });
}
