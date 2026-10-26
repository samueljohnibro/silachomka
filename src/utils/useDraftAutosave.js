import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Controlled Debounced CMS Draft Autosave (Stage 26 — Req #21 & #22)
 *
 * - Debounces form changes (1.5s) and persists working draft state to localStorage
 *   so navigating away or refreshing the page never loses work.
 * - Never auto-publishes content or mutates PUBLISHED status.
 * - Provides a non-intrusive status indicator ("Draft saved HH:MM", "Saving draft...")
 *   and a recovery banner if an unsaved draft is found when opening the form,
 *   plus an explicit "Discard Draft" action.
 */
export function useDraftAutosave({
  entityKey,
  enabled,
  isActive,
  formData,
  formState,
  setFormData,
  onRestoreDraft,
  debounceMs = 1500,
}) {
  const active = enabled !== undefined ? Boolean(enabled) : Boolean(isActive);
  const currentData = formData !== undefined ? formData : formState;
  const restoreCallback = setFormData || onRestoreDraft;

  const storageKey = `chomka_cms_draft_${entityKey}`;
  const [autosaveStatus, setAutosaveStatus] = useState('IDLE'); // 'IDLE' | 'SAVING' | 'SAVED' | 'RESTORED'
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [recoverableDraft, setRecoverableDraft] = useState(null);
  const timerRef = useRef(null);
  const initialJsonRef = useRef(null);
  const currentDataRef = useRef(currentData);
  const isDirtyRef = useRef(false);

  useEffect(() => {
    currentDataRef.current = currentData;
  }, [currentData]);

  // Synchronous flush handler
  const flushDraft = useCallback(() => {
    if (!active || !isDirtyRef.current || !currentDataRef.current) return;
    try {
      const nowIso = new Date().toISOString();
      const payload = {
        entityKey,
        savedAt: nowIso,
        data: {
          ...currentDataRef.current,
          _draftStatus: currentDataRef.current.status || 'DRAFT',
        },
      };
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {}
  }, [active, entityKey, storageKey]);

  // Flush dirty draft on beforeunload and unmount
  useEffect(() => {
    if (!active) return;
    const handleBeforeUnload = () => {
      flushDraft();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      flushDraft();
    };
  }, [active, flushDraft]);

  // Check for existing stored draft when entering CREATE or EDIT mode
  useEffect(() => {
    if (!active) {
      setAutosaveStatus('IDLE');
      setRecoverableDraft(null);
      initialJsonRef.current = null;
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.data && parsed.savedAt) {
          setRecoverableDraft(parsed);
        }
      }
    } catch {}
  }, [active, storageKey]);

  // Capture baseline snapshot of initial formState on form open
  useEffect(() => {
    if (active && currentData && initialJsonRef.current === null) {
      try {
        initialJsonRef.current = JSON.stringify(currentData);
      } catch {}
    }
  }, [active, currentData]);

  // Debounced autosave when formState changes
  useEffect(() => {
    if (!active || !currentData) return;

    let serialized = '';
    try {
      serialized = JSON.stringify(currentData);
    } catch {
      return;
    }

    // Do not overwrite an existing recoverable draft before user has edited anything
    if (serialized === initialJsonRef.current) return;

    isDirtyRef.current = true;
    setAutosaveStatus('SAVING');
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      try {
        const nowIso = new Date().toISOString();
        const payload = {
          entityKey,
          savedAt: nowIso,
          data: {
            ...currentData,
            // Ensure draft autosave never promotes status to PUBLISHED automatically
            _draftStatus: currentData.status || 'DRAFT',
          },
        };
        localStorage.setItem(storageKey, JSON.stringify(payload));
        setLastSavedAt(new Date(nowIso));
        setAutosaveStatus('SAVED');
      } catch {
        setAutosaveStatus('IDLE');
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active, currentData, entityKey, storageKey, debounceMs]);

  const restoreDraft = useCallback(() => {
    if (!recoverableDraft?.data) return;
    if (typeof restoreCallback === 'function') {
      restoreCallback(recoverableDraft.data);
    }
    try {
      initialJsonRef.current = JSON.stringify(recoverableDraft.data);
    } catch {}
    setRecoverableDraft(null);
    setAutosaveStatus('RESTORED');
    setLastSavedAt(new Date(recoverableDraft.savedAt));
  }, [recoverableDraft, restoreCallback]);

  const clearDraft = useCallback(() => {
    isDirtyRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    setRecoverableDraft(null);
    setAutosaveStatus('IDLE');
    setLastSavedAt(null);
  }, [storageKey]);

  return {
    autosaveStatus,
    lastSavedAt,
    recoverableDraft,
    hasRestorableDraft: Boolean(recoverableDraft),
    restoreDraft,
    discardDraft: clearDraft,
    clearDraft,
  };
}

export function DraftAutosaveBanner({
  autosaveStatus = 'IDLE',
  lastSavedAt,
  recoverableDraft,
  hasRestorableDraft,
  onRestore,
  onDiscard,
}) {
  const showRecovery = Boolean(recoverableDraft || hasRestorableDraft);
  const formattedTime =
    lastSavedAt instanceof Date && !isNaN(lastSavedAt.getTime())
      ? lastSavedAt.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      : typeof lastSavedAt === 'string' && lastSavedAt
      ? new Date(lastSavedAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      : '';

  const recoveryChildren = showRecovery
    ? React.createElement(
        'div',
        {
          role: 'region',
          'aria-label': 'Unsaved draft recovery',
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '10px 14px',
            background: 'rgba(223, 194, 125, 0.08)',
            border: '1px solid rgba(223, 194, 125, 0.35)',
            borderRadius: '6px',
            marginBottom: '10px',
          },
        },
        React.createElement(
          'div',
          { style: { fontSize: '12px', color: 'var(--text-h)' } },
          React.createElement(
            'strong',
            { style: { color: 'var(--gold)' } },
            'Unsaved draft found'
          ),
          recoverableDraft?.savedAt
            ? React.createElement(
                'span',
                { style: { color: 'var(--muted)', marginLeft: '6px' } },
                `(saved ${new Date(recoverableDraft.savedAt).toLocaleString()})`
              )
            : null
        ),
        React.createElement(
          'div',
          { style: { display: 'flex', gap: '8px' } },
          React.createElement(
            'button',
            {
              type: 'button',
              onClick: onRestore,
              className: 'studio-pill-btn',
              style: {
                padding: '4px 12px',
                fontSize: '11px',
                background: 'var(--gold)',
                color: '#050507',
                borderColor: 'var(--gold)',
                fontWeight: 700,
              },
            },
            'Restore Draft'
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              onClick: onDiscard,
              className: 'studio-pill-btn',
              style: {
                padding: '4px 10px',
                fontSize: '11px',
                background: 'transparent',
                color: 'var(--muted)',
              },
            },
            'Discard Draft'
          )
        )
      )
    : null;

  const statusText =
    autosaveStatus === 'SAVING'
      ? 'Autosaving draft...'
      : autosaveStatus === 'SAVED' || formattedTime
      ? `Draft autosaved at ${formattedTime}`
      : autosaveStatus === 'RESTORED'
      ? `Draft restored (${formattedTime})`
      : 'Draft autosave ready';

  const dotColor =
    autosaveStatus === 'SAVING'
      ? '#eab308'
      : autosaveStatus === 'SAVED' || autosaveStatus === 'RESTORED' || formattedTime
      ? '#4ade80'
      : 'rgba(255,255,255,0.2)';

  const statusRow = React.createElement(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '11px',
        color: 'var(--muted)',
        minHeight: '20px',
      },
    },
    React.createElement(
      'div',
      { style: { display: 'inline-flex', alignItems: 'center', gap: '6px' } },
      React.createElement('span', {
        style: {
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          background: dotColor,
        },
      }),
      React.createElement('span', null, statusText)
    ),
    autosaveStatus === 'SAVED' || autosaveStatus === 'RESTORED' || formattedTime
      ? React.createElement(
          'button',
          {
            type: 'button',
            onClick: onDiscard,
            style: {
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              fontSize: '11px',
              textDecoration: 'underline',
              cursor: 'pointer',
              padding: 0,
            },
          },
          'Discard saved draft'
        )
      : null
  );

  return React.createElement(
    'div',
    { className: 'cms-draft-autosave-bar', style: { marginBottom: '16px' } },
    recoveryChildren,
    statusRow
  );
}

/**
 * Hook to inspect existing draft for an entityKey without activating form autosave.
 * Perfect for LIST views to show a resume banner!
 */
export function useExistingDraft(entityKey) {
  const storageKey = `chomka_cms_draft_${entityKey}`;
  const [draft, setDraft] = useState(null);

  const check = useCallback(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.data && parsed?.savedAt) {
          setDraft(parsed);
          return;
        }
      }
      setDraft(null);
    } catch {
      setDraft(null);
    }
  }, [storageKey]);

  useEffect(() => {
    check();
  }, [check]);

  const discard = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    setDraft(null);
  }, [storageKey]);

  return {
    draft,
    hasDraft: Boolean(draft),
    checkDraft: check,
    discardDraft: discard,
  };
}

/**
 * List-View Resume Draft Banner (Stage 28 Req)
 * Prominently surfaces unfinished drafts on the admin index page so clicking it immediately
 * transitions into CREATE/EDIT view and restores all working fields and media.
 */
export function DraftListResumeBanner({
  entityKey,
  entityLabel = "draft",
  onResume,
  onDiscard,
}) {
  const { draft, hasDraft, discardDraft } = useExistingDraft(entityKey);

  if (!hasDraft || !draft) return null;

  const handleDiscard = (e) => {
    if (e) e.stopPropagation();
    discardDraft();
    if (onDiscard) onDiscard();
  };

  const handleResume = (e) => {
    if (e) e.stopPropagation();
    if (onResume) onResume(draft.data);
  };

  const dateStr = draft?.savedAt ? new Date(draft.savedAt).toLocaleString() : "";

  return React.createElement(
    'div',
    {
      role: 'region',
      'aria-label': 'Unfinished draft notification',
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '12px 18px',
        background: 'rgba(223, 194, 125, 0.1)',
        border: '1px solid rgba(223, 194, 125, 0.4)',
        borderRadius: '8px',
        marginBottom: '20px',
      },
    },
    React.createElement(
      'div',
      { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
      React.createElement('span', { style: { fontSize: '18px' } }, '📝'),
      React.createElement(
        'div',
        null,
        React.createElement(
          'strong',
          { style: { color: 'var(--gold)', fontSize: '13px' } },
          `Unfinished ${entityLabel} draft available`
        ),
        dateStr
          ? React.createElement(
              'span',
              { style: { color: 'var(--muted)', fontSize: '12px', marginLeft: '8px' } },
              `(saved ${dateStr})`
            )
          : null
      )
    ),
    React.createElement(
      'div',
      { style: { display: 'flex', gap: '10px' } },
      React.createElement(
        'button',
        {
          type: 'button',
          onClick: handleResume,
          className: 'studio-pill-btn',
          style: {
            padding: '5px 14px',
            fontSize: '12px',
            background: 'var(--gold)',
            color: '#050507',
            borderColor: 'var(--gold)',
            fontWeight: 700,
          },
        },
        'Resume Draft'
      ),
      React.createElement(
        'button',
        {
          type: 'button',
          onClick: handleDiscard,
          className: 'studio-pill-btn',
          style: {
            padding: '5px 12px',
            fontSize: '12px',
            background: 'transparent',
            color: 'var(--muted)',
          },
        },
        'Discard'
      )
    )
  );
}
