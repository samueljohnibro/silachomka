// src/data/beats.js

const rawBeats = [
  {
    id: "shine",
    title: "SHINE",
    image: "/beats/shine.jpg",
    video: "/beats/shine.gif",
    audio: "/beats/shine.mp3",
    showVisualTitle: true,
    status: "available",
    selar: {
      basic: "https://selar.com/chomkamusicstudio-shine-basic",
      premium: "https://selar.com/chomkamusicstudio-shine-premium",
      ultimate: "https://selar.com/chomkamusicstudio-shine-ultimate",
    },
  },
  {
    id: "john-stewart",
    title: "JOHN STEWART",
    genre: "Trap × Alternative Rap Type Beat",
    shortGenre: "Trap × Alternative Rap",
    categories: ["trap"],
    bpm: "145 BPM",
    key: "D minor",
    image: "/beats/john-stewart.jpg",
    video: "/beats/john-stewart.gif",
    audio: "/beats/john-stewart.mp3",
    showVisualTitle: true,
    status: "available",
    selar: {
      basic: "https://selar.com/chomkamusicstudio-johnstewart-basic",
      premium: "https://selar.com/chomkamusicstudio-johnstewart-premium",
      ultimate: "https://selar.com/chomkamusicstudio-johnstewart-ultimate",
    },
  },
  {
    id: "faces",
    title: "FACES",
    genre: "Afro-Alternative Rap × Afro Trap",
    shortGenre: "Afro-Alternative Rap × Afro Trap",
    categories: ["afro", "trap"],
    bpm: "140 BPM",
    key: "C minor",
    image: "/beats/faces.jpg",
    video: "/beats/faces.gif",
    audio: "/beats/faces.mp3",
    showVisualTitle: true,
    status: "available",
    selar: {
      basic: "https://selar.com/chomkamusicstudio-faces-basic",
      premium: "https://selar.com/chomkamusicstudio-faces-premium",
      ultimate: "https://selar.com/chomkamusicstudio-faces-ultimate",
    },
  },
  {
    id: "chinese-empathy",
    title: "CHINESE EMPATHY",
    genre: "Afro-Alternative × Afro Trap",
    shortGenre: "Afro-Alternative × Afro Trap",
    categories: ["afro", "trap"],
    bpm: "140 BPM",
    key: "F minor",
    image: "/beats/chinese-empathy.jpg",
    video: "/beats/chinese-empathy.gif",
    audio: "/beats/chinese-empathy.mp3",
    letterboxed: true,
    showVisualTitle: true,
    status: "available",
    selar: {
      basic: "https://selar.com/chomkamusicstudio-chineseempathy-basic",
      premium: "https://selar.com/chomkamusicstudio-chineseempathy-premium",
      ultimate: "https://selar.com/chomkamusicstudio-chineseempathy-ultimate",
    },
  },
  {
    id: "overdose",
    title: "OVERDOSE",
    genre: "Afro Pop × Alternative",
    shortGenre: "Afro Pop × Alternative",
    categories: ["afro"],
    bpm: "100 BPM",
    key: "F minor",
    image: "/beats/overdose.jpg",
    video: "/beats/overdose.gif",
    audio: "/beats/overdose.mp3",
    showVisualTitle: true,
    status: "available",
    selar: {
      basic: "https://selar.com/chomkamusicstudio-overdose-basic",
      premium: "https://selar.com/chomkamusicstudio-overdose-premium",
      ultimate: "https://selar.com/chomkamusicstudio-overdose-ultimate",
    },
  },
  {
    id: "validation",
    title: "VALIDATION",
    genre: "Afro Pop × Alternative",
    shortGenre: "Afro Pop × Alternative",
    categories: ["afro"],
    bpm: "110 BPM",
    key: "E minor",
    image: "/beats/validation.jpg",
    video: "/beats/validation.gif",
    audio: "/beats/validation.mp3",
    showVisualTitle: true,
    status: "available",
    selar: {
      basic: "https://selar.com/chomkamusicstudio-validation-basic",
      premium: "https://selar.com/chomkamusicstudio-validation-premium",
      ultimate: "https://selar.com/chomkamusicstudio-validation-ultimate",
    },
  },
  {
    id: "smile",
    title: "SMILE",
    genre: "Afro Trap × Afro Rap",
    shortGenre: "Afro Trap × Afro Rap",
    categories: ["afro", "trap"],
    bpm: "149 BPM",
    key: "F♯ major",
    image: "/beats/smile.jpg",
    video: "/beats/smile.gif",
    audio: "/beats/smile.mp3",
    showVisualTitle: true,
    status: "available",
    selar: {
      basic: "https://selar.com/chomkamusicstudio-smile-basic",
      premium: "https://selar.com/chomkamusicstudio-smile-premium",
      ultimate: "https://selar.com/chomkamusicstudio-smile-ultimate",
    },
  },
  {
    id: "hubert",
    title: "HUBERT",
    genre: "Afro Trap × Afro Rap",
    shortGenre: "Afro Trap × Afro Rap",
    categories: ["afro", "trap"],
    bpm: "125 BPM",
    key: "D♯ minor",
    image: "/beats/hubert.jpg",
    video: "/beats/hubert.gif",
    audio: "/beats/hubert.mp3",
    showVisualTitle: true,
    status: "available",
    selar: {
      basic: "https://selar.com/chomkamusicstudio-hubert-basic",
      premium: "https://selar.com/chomkamusicstudio-hubert-premium",
      ultimate: "https://selar.com/chomkamusicstudio-hubert-ultimate",
    },
  },
  {
    id: "fanguan",
    title: "FÀNGUÀN",
    genre: "Afro Highlife × R&B",
    shortGenre: "Afro Highlife × R&B",
    categories: ["afro", "rnb"],
    bpm: "125 BPM",
    key: "C minor",
    image: "/beats/fanguan.jpg",
    video: "/beats/fanguan.gif",
    audio: "/beats/fanguan.mp3",
    showVisualTitle: true,
    status: "available",
    selar: {
      basic: "https://selar.com/chomkamusicstudio-fanguan-basic",
      premium: "https://selar.com/chomkamusicstudio-fanguan-premium",
      ultimate: "https://selar.com/chomkamusicstudio-fanguan-ultimate",
    },
  },
  {
    id: "congo",
    title: "CONGO",
    genre: "Afro Trap × Afro Highlife",
    shortGenre: "Afro Trap × Afro Highlife",
    categories: ["afro", "trap"],
    bpm: "116 BPM",
    key: "A♯ minor",
    image: "/beats/congo.jpg",
    video: "/beats/congo.gif",
    audio: "/beats/congo.mp3",
    showVisualTitle: true,
    status: "available",
    selar: {
      basic: "https://selar.com/chomkamusicstudio-congo-basic",
      premium: "https://selar.com/chomkamusicstudio-congo-premium",
      ultimate: "https://selar.com/chomkamusicstudio-congo-ultimate",
    },
  },
  {
    id: "want",
    title: "WANT",
    genre: "Afro Highlife × R&B",
    shortGenre: "Afro Highlife × R&B",
    categories: ["afro", "rnb"],
    bpm: "115 BPM",
    key: "G minor",
    image: "/beats/want.jpg",
    video: "/beats/want.gif",
    audio: "/beats/want.mp3",
    showVisualTitle: true,
    status: "available",
    selar: {
      basic: "https://selar.com/chomkamusicstudio-want-basic",
      premium: "https://selar.com/chomkamusicstudio-want-premium",
      ultimate: "https://selar.com/chomkamusicstudio-want-ultimate",
    },
  },
];


function resolveBeatVideo(beat) {
  if (!beat || typeof beat !== "object") return "";
  const candidates = [
    beat.video,
    beat.videoSrc,
    beat.videoUrl,
    beat.media?.video,
    beat.media?.videoSrc,
    beat.media?.videoUrl,
  ];
  const video = candidates.find(
    (value) => typeof value === "string" && value.trim()
  );
  return video ? video.trim() : "";
}

function normalizeBeat(beat, index) {
  if (!beat || typeof beat !== "object") return null;
  const video = resolveBeatVideo(beat);
  return {
    ...beat,
    id: beat.id ?? beat.slug ?? `beat-${index + 1}`,
    title: typeof beat.title === "string" ? beat.title : "",
    genre: typeof beat.genre === "string" ? beat.genre : "",
    producer: beat.producer || "silachomka",
    source: beat.source || "chomkaMUSIC™",
    video,
  };
}

const seenVideos = new Set();

const beats = rawBeats
  .map(normalizeBeat)
  .filter(Boolean)
  .filter((beat) => {
    if (!beat.video) return true;
    if (seenVideos.has(beat.video)) return false;
    seenVideos.add(beat.video);
    return true;
  });

export default beats;