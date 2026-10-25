import React, { useState, useEffect, useRef } from 'react';
import { adminApi } from '../../data/adminApi';

/**
 * MediaAssetPicker
 * Integrated media asset selector and file upload component.
 * Supports:
 * - Real file selection and upload through storage infrastructure.
 * - Saves resulting storage key/reference in the database.
 * - Live preview (image thumbnail, audio player, video preview).
 * - Replacement and removal controls.
 * - Optional selection from existing media library.
 */
export const MediaAssetPicker = ({
  assetType = 'IMAGE', // 'IMAGE' | 'AUDIO' | 'VIDEO'
  value, // UUID string
  onChange, // (assetId, assetRecord) => void
  label = 'Media Asset',
  required = false,
  disabled = false,
  hint = ''
}) => {
  const [assets, setAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [showLibrarySelect, setShowLibrarySelect] = useState(false);
  const fileInputRef = useRef(null);

  const fetchAssets = async () => {
    try {
      const data = await adminApi.getMediaAssets();
      setAssets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Failed to fetch media assets for picker:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  // Filter assets by type
  const matchingAssets = assets.filter(a => a.asset_type === assetType);
  const selectedAsset = assets.find(a => a.id === value);
  const hasAsset = Boolean(selectedAsset || value);

  // Robust preview URL resolver
  const previewUrl = selectedAsset?.has_file_data
    ? `/api/media/asset/${selectedAsset.id}`
    : selectedAsset?.r2_key
      ? (selectedAsset.r2_key.startsWith('http') ? selectedAsset.r2_key : '/' + selectedAsset.r2_key.replace(/^\//, ''))
      : selectedAsset?.url
        ? selectedAsset.url
        : value
          ? `/api/media/asset/${value}`
          : null;

  const displayName = selectedAsset?.original_filename || selectedAsset?.r2_key || (value ? `Attached ${assetType === 'IMAGE' ? 'Image' : assetType === 'VIDEO' ? 'Video' : 'Audio'}` : 'Selected Asset');

  // Accepted file types based on assetType
  const acceptMap = {
    IMAGE: 'image/jpeg,image/png,image/webp,image/gif',
    AUDIO: 'audio/mpeg,audio/wav,audio/mp3,audio/m4a',
    VIDEO: 'video/mp4,image/gif'
  };
  const acceptTypes = acceptMap[assetType] || '*/*';

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const uploadedRecord = await adminApi.uploadMediaAsset(file, assetType);
      const fullRecord = {
        ...uploadedRecord,
        has_file_data: true,
        url: uploadedRecord.url || `/api/media/asset/${uploadedRecord.id}`
      };
      // Immediately inject into local state so selectedAsset resolves without waiting for network re-fetch
      setAssets(prev => [fullRecord, ...prev.filter(a => a.id !== fullRecord.id)]);
      onChange(fullRecord.id, fullRecord);
      setShowLibrarySelect(false);
      await fetchAssets();
    } catch (err) {
      setUploadError(err.message || 'File upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      // Reset input value so same file can be selected again if replaced
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLibrarySelect = (e) => {
    const assetId = e.target.value;
    if (!assetId) {
      onChange(null, null);
      return;
    }
    const found = assets.find(a => a.id === assetId);
    onChange(assetId, found || null);
  };

  const handleRemove = (e) => {
    if (e) e.preventDefault();
    onChange(null, null);
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="studio-field media-asset-picker" style={{ textAlign: 'left' }}>
      {/* Hidden native file input for actual device file selection */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptTypes}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={disabled || isUploading}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-h)' }}>
          {label} {required && '*'}
        </label>
        <button
          type="button"
          onClick={() => setShowLibrarySelect(!showLibrarySelect)}
          disabled={disabled || isUploading}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--gold)',
            fontSize: '11px',
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
        >
          {showLibrarySelect ? 'Hide media library' : 'Choose from existing library'}
        </button>
      </div>

      {hint && (
        <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: 'var(--muted)' }}>
          {hint}
        </p>
      )}

      {/* EXISTING LIBRARY SELECTOR (Optional toggle) */}
      {showLibrarySelect && (
        <div style={{ marginBottom: '10px' }}>
          <select
            className="studio-input"
            value={value || ''}
            onChange={handleLibrarySelect}
            disabled={disabled || isLoading || isUploading}
            style={{ height: '40px', fontSize: '13px' }}
          >
            <option value="">-- Choose from existing media library --</option>
            {matchingAssets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.original_filename || asset.r2_key} ({asset.r2_key})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* UPLOAD ERROR DISPLAY */}
      {uploadError && (
        <div style={{ color: '#fca5a5', fontSize: '12px', marginBottom: '8px', padding: '6px 10px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '4px' }}>
          {uploadError}
        </div>
      )}

      {/* ACTIVE ASSET PREVIEW OR UPLOAD TRIGGER */}
      {hasAsset ? (
        <div
          className="media-asset-card"
          style={{
            padding: '12px 14px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            flexWrap: 'wrap'
          }}
        >
          {/* MEDIA PREVIEW */}
          {assetType === 'IMAGE' && (
            <div style={{ position: 'relative', width: '56px', height: '56px', flexShrink: 0, borderRadius: '4px', overflow: 'hidden', background: '#000', border: '1px solid var(--border)' }}>
              <img
                src={previewUrl}
                alt={displayName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  if (!e.target.dataset.fallbackTried && selectedAsset?.r2_key) {
                    e.target.dataset.fallbackTried = 'true';
                    e.target.src = '/' + selectedAsset.r2_key.replace(/^\//, '');
                  } else if (!e.target.dataset.fallbackTried) {
                    e.target.dataset.fallbackTried = 'true';
                    e.target.src = '/og-image.png';
                  }
                }}
              />
            </div>
          )}

          {assetType === 'AUDIO' && (
            <div style={{ flexShrink: 0 }}>
              <audio
                controls
                src={previewUrl}
                style={{ height: '36px', maxWidth: '280px' }}
              />
            </div>
          )}

          {assetType === 'VIDEO' && (
            <div style={{ position: 'relative', width: '56px', height: '56px', flexShrink: 0, borderRadius: '4px', overflow: 'hidden', background: '#000', border: '1px solid var(--border)' }}>
              <img
                src={previewUrl}
                alt="Visualizer"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  if (!e.target.dataset.fallbackTried) {
                    e.target.dataset.fallbackTried = 'true';
                    e.target.src = '/og-image.png';
                  }
                }}
              />
            </div>
          )}

          {/* ASSET METADATA */}
          <div style={{ flex: 1, minWidth: '160px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-h)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {displayName}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
              Reference: <span style={{ color: 'var(--gold)' }}>{selectedAsset?.original_filename || selectedAsset?.r2_key || 'Uploaded Media Asset'}</span>
              {selectedAsset?.size_bytes && <span> • {formatFileSize(selectedAsset.size_bytes)}</span>}
              {selectedAsset?.mime_type && <span> • {selectedAsset.mime_type}</span>}
            </div>
          </div>

          {/* CONTROLS: REPLACE & REMOVE */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={triggerFileInput}
              disabled={disabled || isUploading}
              className="studio-pill-btn"
              style={{ fontSize: '12px', padding: '4px 12px' }}
            >
              {isUploading ? 'Uploading...' : 'Replace'}
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled || isUploading}
              className="studio-pill-btn"
              style={{ background: 'transparent', color: 'var(--muted)', borderColor: 'transparent', fontSize: '12px', padding: '4px 8px' }}
              title="Remove file reference"
            >
              ✕ Remove
            </button>
          </div>
        </div>
      ) : (
        /* NO ASSET SELECTED: FILE UPLOAD ACTION BUTTON */
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={triggerFileInput}
            disabled={disabled || isUploading}
            className="studio-pill-btn"
            style={{
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 500,
              background: 'rgba(223, 194, 125, 0.08)',
              borderColor: 'var(--gold)',
              color: 'var(--gold)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}
          >
            {isUploading ? (
              <>
                <span className="beat-loading-spinner" style={{ width: 14, height: 14 }} />
                <span>Uploading {label}...</span>
              </>
            ) : (
              <>
                <span>📁</span> Select & Upload File
              </>
            )}
          </button>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
            No file chosen yet
          </span>
        </div>
      )}
    </div>
  );
};

export default MediaAssetPicker;
