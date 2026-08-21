// src/data/store.js

import { useEffect, useState } from "react";
import canonicalReleases from "./releases";
import canonicalBeats from "./beats";
import canonicalGallery from "./gallery";
import canonicalVideos from "./videos";

const DB_NAME = "silachomka_db";
const DB_VERSION = 1;
const STORE_NAME = "chomka_kv";

const KEY_RELEASES = "silachomka_store_releases";
const KEY_BEATS = "silachomka_store_beats";
const KEY_GALLERY = "silachomka_store_gallery";
const KEY_VIDEOS = "silachomka_store_videos";

const EVENT_NAME = "chomka_store_update";

/* =========================================================
   INDEXEDDB UNLIMITED STORAGE DRIVER
   ========================================================= */

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB not supported"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function dbGet(key) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function dbSet(key, val) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(val, key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return false;
  }
}

/* =========================================================
   IN-MEMORY CACHE INITIALIZED WITH LOCALSTORAGE / CANONICAL
   ========================================================= */

function loadInitial(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return [...fallback];
}

const memoryStore = {
  releases: loadInitial(KEY_RELEASES, canonicalReleases),
  beats: loadInitial(KEY_BEATS, canonicalBeats),
  gallery: loadInitial(KEY_GALLERY, canonicalGallery),
  videos: loadInitial(KEY_VIDEOS, canonicalVideos),
};

/* Asynchronously populate from IndexedDB on startup */
if (typeof window !== "undefined") {
  Promise.all([
    dbGet(KEY_RELEASES),
    dbGet(KEY_BEATS),
    dbGet(KEY_GALLERY),
    dbGet(KEY_VIDEOS),
  ]).then(([dbRels, dbBts, dbGal, dbVids]) => {
    let changed = false;
    if (Array.isArray(dbRels) && dbRels.length > 0) {
      memoryStore.releases = dbRels;
      changed = true;
    }
    if (Array.isArray(dbBts) && dbBts.length > 0) {
      memoryStore.beats = dbBts;
      changed = true;
    }
    if (Array.isArray(dbGal) && dbGal.length > 0) {
      memoryStore.gallery = dbGal;
      changed = true;
    }
    if (Array.isArray(dbVids) && dbVids.length > 0) {
      memoryStore.videos = dbVids;
      changed = true;
    }
    if (changed) {
      notifyUpdate();
    }
  });
}

function notifyUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  }
}

function safeLocalStorageSet(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // QuotaExceededError is safely caught; IndexedDB acts as master store
  }
}

/* =========================================================
   RELEASES
   ========================================================= */

export function getReleases() {
  return [...memoryStore.releases].sort(
    (a, b) => new Date(b.date || "2026-01-01").getTime() - new Date(a.date || "2026-01-01").getTime()
  );
}

export async function saveRelease(release) {
  const current = getReleases();
  const existingIdx = current.findIndex(
    (r) => r.slug === release.slug || r.title.toLowerCase() === release.title.toLowerCase()
  );
  let updated;
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = { ...updated[existingIdx], ...release };
  } else {
    updated = [release, ...current];
  }
  updated.sort((a, b) => new Date(b.date || "2026-01-01").getTime() - new Date(a.date || "2026-01-01").getTime());
  memoryStore.releases = updated;
  safeLocalStorageSet(KEY_RELEASES, updated);
  await dbSet(KEY_RELEASES, updated);
  notifyUpdate();
  return updated;
}

export async function deleteRelease(slug) {
  const current = getReleases();
  const updated = current.filter((r) => r.slug !== slug);
  memoryStore.releases = updated;
  safeLocalStorageSet(KEY_RELEASES, updated);
  await dbSet(KEY_RELEASES, updated);
  notifyUpdate();
  return updated;
}

/* =========================================================
   BEATS
   ========================================================= */

export function getBeats() {
  return [...memoryStore.beats];
}

export async function saveBeat(beat) {
  const current = getBeats();
  const existingIdx = current.findIndex((b) => b.id === beat.id);
  let updated;
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = { ...updated[existingIdx], ...beat };
  } else {
    updated = [beat, ...current];
  }
  memoryStore.beats = updated;
  safeLocalStorageSet(KEY_BEATS, updated);
  await dbSet(KEY_BEATS, updated);
  notifyUpdate();
  return updated;
}

export async function deleteBeat(id) {
  const current = getBeats();
  const updated = current.filter((b) => b.id !== id);
  memoryStore.beats = updated;
  safeLocalStorageSet(KEY_BEATS, updated);
  await dbSet(KEY_BEATS, updated);
  notifyUpdate();
  return updated;
}

/* =========================================================
   GALLERY
   ========================================================= */

export function getGallery() {
  return [...memoryStore.gallery].sort(
    (a, b) => new Date(b.date || "2026-01-01").getTime() - new Date(a.date || "2026-01-01").getTime()
  );
}

export async function saveGalleryPost(post) {
  const current = getGallery();
  const existingIdx = current.findIndex((p) => p.id === post.id);
  let updated;
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = { ...updated[existingIdx], ...post };
  } else {
    updated = [post, ...current];
  }
  updated.sort((a, b) => new Date(b.date || "2026-01-01").getTime() - new Date(a.date || "2026-01-01").getTime());
  memoryStore.gallery = updated;
  safeLocalStorageSet(KEY_GALLERY, updated);
  await dbSet(KEY_GALLERY, updated);
  notifyUpdate();
  return updated;
}

export async function deleteGalleryPost(id) {
  const current = getGallery();
  const updated = current.filter((p) => p.id !== id);
  memoryStore.gallery = updated;
  safeLocalStorageSet(KEY_GALLERY, updated);
  await dbSet(KEY_GALLERY, updated);
  notifyUpdate();
  return updated;
}

/* =========================================================
   VIDEOS
   ========================================================= */

export function getVideos() {
  return [...memoryStore.videos].sort(
    (a, b) => new Date(b.date || "2026-01-01").getTime() - new Date(a.date || "2026-01-01").getTime()
  );
}

export async function saveVideo(video) {
  const current = getVideos();
  const existingIdx = current.findIndex((v) => v.id === video.id);
  let updated;
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = { ...updated[existingIdx], ...video };
  } else {
    updated = [video, ...current];
  }
  memoryStore.videos = updated;
  safeLocalStorageSet(KEY_VIDEOS, updated);
  await dbSet(KEY_VIDEOS, updated);
  notifyUpdate();
  return updated;
}

export async function deleteVideo(id) {
  const current = getVideos();
  const updated = current.filter((v) => v.id !== id);
  memoryStore.videos = updated;
  safeLocalStorageSet(KEY_VIDEOS, updated);
  await dbSet(KEY_VIDEOS, updated);
  notifyUpdate();
  return updated;
}

/* =========================================================
   REACT HOOK (AUTO-SUBSCRIBING)
   ========================================================= */

export function useChomkaStore() {
  const [releases, setReleases] = useState(getReleases);
  const [beats, setBeats] = useState(getBeats);
  const [gallery, setGallery] = useState(getGallery);
  const [videos, setVideos] = useState(getVideos);

  useEffect(() => {
    const handleUpdate = () => {
      setReleases(getReleases());
      setBeats(getBeats());
      setGallery(getGallery());
      setVideos(getVideos());
    };

    window.addEventListener(EVENT_NAME, handleUpdate);
    return () => window.removeEventListener(EVENT_NAME, handleUpdate);
  }, []);

  return {
    releases,
    beats,
    gallery,
    videos,
    saveRelease,
    deleteRelease,
    saveBeat,
    deleteBeat,
    saveGalleryPost,
    deleteGalleryPost,
    saveVideo,
    deleteVideo,
  };
}
