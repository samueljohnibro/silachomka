// src/data/store.js

import { useEffect, useState } from "react";
import { fetchAllCatalogue } from "./api";

const DB_NAME = "silachomka_db";
const DB_VERSION = 1;
const STORE_NAME = "chomka_kv";

const EVENT_NAME = "chomka_store_update";

/* =========================================================
   INDEXEDDB UNLIMITED STORAGE DRIVER (KEPT FOR STUDIO)
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
   IN-MEMORY STORE & API FETCH LOGIC
   ========================================================= */

const memoryStore = {
  releases: [],
  beats: [],
  gallery: [],
  videos: [],
};

let globalSocials = { artist: [], ecosystem: [] };
let globalIsLoaded = false;
let isFetching = false;
let globalError = null;

function notifyUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  }
}

async function initializeStore() {
  if (globalIsLoaded || isFetching) return;
  isFetching = true;
  
  try {
    const data = await fetchAllCatalogue();
    memoryStore.releases = data.releases;
    memoryStore.beats = data.beats;
    memoryStore.gallery = data.gallery;
    memoryStore.videos = data.videos;
    globalSocials = data.socials;
    
    globalIsLoaded = true;
    globalError = null;
  } catch (err) {
    globalError = err.message;
  } finally {
    isFetching = false;
    notifyUpdate();
  }
}

// Kick off fetch early
if (typeof window !== "undefined") {
  initializeStore();
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
  await dbSet("silachomka_store_releases", updated);
  notifyUpdate();
  return updated;
}

export async function deleteRelease(slug) {
  const current = getReleases();
  const updated = current.filter((r) => r.slug !== slug);
  memoryStore.releases = updated;
  await dbSet("silachomka_store_releases", updated);
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
  await dbSet("silachomka_store_beats", updated);
  notifyUpdate();
  return updated;
}

export async function deleteBeat(id) {
  const current = getBeats();
  const updated = current.filter((b) => b.id !== id);
  memoryStore.beats = updated;
  await dbSet("silachomka_store_beats", updated);
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
  await dbSet("silachomka_store_gallery", updated);
  notifyUpdate();
  return updated;
}

export async function deleteGalleryPost(id) {
  const current = getGallery();
  const updated = current.filter((p) => p.id !== id);
  memoryStore.gallery = updated;
  await dbSet("silachomka_store_gallery", updated);
  notifyUpdate();
  return updated;
}

/* =========================================================
   VIDEOS
   ========================================================= */

export function getVideos() {
  return [...memoryStore.videos];
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
  await dbSet("silachomka_store_videos", updated);
  notifyUpdate();
  return updated;
}

export async function deleteVideo(id) {
  const current = getVideos();
  const updated = current.filter((v) => v.id !== id);
  memoryStore.videos = updated;
  await dbSet("silachomka_store_videos", updated);
  notifyUpdate();
  return updated;
}

/* =========================================================
   GLOBAL HOOK
   ========================================================= */

export function useChomkaStore() {
  const [releases, setReleases] = useState(getReleases);
  const [beats, setBeats] = useState(getBeats);
  const [gallery, setGallery] = useState(getGallery);
  const [videos, setVideos] = useState(getVideos);
  const [socials, setSocials] = useState(globalSocials);
  const [isLoading, setIsLoading] = useState(!globalIsLoaded);
  const [error, setError] = useState(globalError);

  useEffect(() => {
    const handleUpdate = () => {
      setReleases(getReleases());
      setBeats(getBeats());
      setGallery(getGallery());
      setVideos(getVideos());
      setSocials(globalSocials);
      setIsLoading(!globalIsLoaded && isFetching);
      setError(globalError);
    };

    window.addEventListener(EVENT_NAME, handleUpdate);
    return () => window.removeEventListener(EVENT_NAME, handleUpdate);
  }, []);

  return {
    releases,
    beats,
    gallery,
    videos,
    socials,
    isLoading,
    error,
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
