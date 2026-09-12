
const fs = require("fs");

// BeatDetailPage
let bdp = fs.readFileSync("src/pages/BeatDetailPage.jsx", "utf8");
bdp = bdp.replace(
  "      if (!audioRef.current) {\r\n        const audio = new Audio(beat.audio);\r\n        audioRef.current = audio;",
  `      if (!audioRef.current) {
        const audio = new Audio(beat.audio);
        audioRef.current = audio;

        if ("mediaSession" in navigator) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: beat.title,
            artist: beat.artist || "silachomka",
            album: beat.genre || "Beat",
            artwork: [{ src: beat.image ? window.location.origin + beat.image : window.location.origin + "/og-image.png", sizes: "512x512", type: "image/jpeg" }]
          });
        }`
);
bdp = bdp.replace(
  "      if (!audioRef.current) {\n        const audio = new Audio(beat.audio);\n        audioRef.current = audio;",
  `      if (!audioRef.current) {
        const audio = new Audio(beat.audio);
        audioRef.current = audio;

        if ("mediaSession" in navigator) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: beat.title,
            artist: beat.artist || "silachomka",
            album: beat.genre || "Beat",
            artwork: [{ src: beat.image ? window.location.origin + beat.image : window.location.origin + "/og-image.png", sizes: "512x512", type: "image/jpeg" }]
          });
        }`
);
fs.writeFileSync("src/pages/BeatDetailPage.jsx", bdp);

// BeatsPage
let bp = fs.readFileSync("src/pages/BeatsPage.jsx", "utf8");
bp = bp.replace(
  "      const audio = new Audio();\r\n      audioRef.current = audio;\r\n      audio.preload = \"metadata\";\r\n      audio.src = beat.audio;",
  `      const audio = new Audio();
      audioRef.current = audio;
      audio.preload = "metadata";
      audio.src = beat.audio;

      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: beat.title,
          artist: beat.artist || "silachomka",
          album: beat.genre || "Beat",
          artwork: [{ src: beat.image ? window.location.origin + beat.image : window.location.origin + "/og-image.png", sizes: "512x512", type: "image/jpeg" }]
        });
      }`
);
bp = bp.replace(
  "      const audio = new Audio();\n      audioRef.current = audio;\n      audio.preload = \"metadata\";\n      audio.src = beat.audio;",
  `      const audio = new Audio();
      audioRef.current = audio;
      audio.preload = "metadata";
      audio.src = beat.audio;

      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: beat.title,
          artist: beat.artist || "silachomka",
          album: beat.genre || "Beat",
          artwork: [{ src: beat.image ? window.location.origin + beat.image : window.location.origin + "/og-image.png", sizes: "512x512", type: "image/jpeg" }]
        });
      }`
);
fs.writeFileSync("src/pages/BeatsPage.jsx", bp);
console.log("Done");

