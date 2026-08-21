// scripts/publish.js
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (query, defaultValue = "") =>
  new Promise((resolve) => {
    const promptText = defaultValue ? `${query} [${defaultValue}]: ` : `${query}: `;
    rl.question(promptText, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });

const slugify = (text) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

async function addGalleryPost() {
  console.log("\n==========================================");
  console.log("📸 PUBLISH NEW GALLERY ARCHIVE ENTRY");
  console.log("==========================================\n");

  const title = await ask("Post Title (e.g. Savage Studio Visuals)");
  const caption = await ask("Caption");
  const category = await ask("Category (releases/freestyles/portraits/videos/bts)", "portraits");
  const type = await ask("Media Type (image/video/carousel)", "image");
  const src = await ask("Media Path/URL (e.g. /covers/savage.png)", "/covers/noisemaker.png");
  
  let slides = [];
  if (type === "carousel") {
    const rawSlides = await ask("Additional slide paths (comma-separated)", "");
    slides = [src, ...rawSlides.split(",").map((s) => s.trim()).filter(Boolean)];
  }

  const link = await ask("Connected Release/Link (optional)", "");
  const tagsInput = await ask("Tags", "#silachomka #chomkaMUSIC");
  const tags = tagsInput.split(/\s+/).map((t) => (t.startsWith("#") ? t : `#${t}`)).filter(Boolean);

  const today = new Date();
  const dateStr = today.toISOString().split("T")[0];
  const displayDate = today.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const id = slugify(title || `post-${Date.now()}`);

  const newPost = {
    id,
    type,
    category,
    title: title || "Archive Post",
    caption,
    date: dateStr,
    displayDate,
    src,
    ...(type === "carousel" ? { slides } : {}),
    ...(type === "video" ? { videoSrc: src } : {}),
    ...(link ? { link } : {}),
    tags,
  };

  const galleryFilePath = path.join(rootDir, "src", "data", "gallery.js");
  const currentContent = fs.readFileSync(galleryFilePath, "utf-8");

  // Insert before the closing `];`
  const lastBracketIndex = currentContent.lastIndexOf("];");
  if (lastBracketIndex === -1) {
    console.error("Could not locate closing array in src/data/gallery.js");
    rl.close();
    return;
  }

  const formattedEntry = `  ${JSON.stringify(newPost, null, 2).replace(/\n/g, "\n  ")},\n`;
  const updatedContent =
    currentContent.slice(0, lastBracketIndex) +
    formattedEntry +
    currentContent.slice(lastBracketIndex);

  fs.writeFileSync(galleryFilePath, updatedContent, "utf-8");

  console.log(`\n✓ Successfully published "${title}" to src/data/gallery.js!`);
  console.log("Your new post is now live in the website gallery.\n");
  rl.close();
}

async function addBeat() {
  console.log("\n==========================================");
  console.log("🎹 REGISTER NEW STUDIO BEAT");
  console.log("==========================================\n");

  const title = await ask("Beat Title (e.g. OVERDOSE)");
  const genre = await ask("Genre Description", "Afro-Alternative × Afro Trap");
  const bpm = await ask("BPM", "130 BPM");
  const key = await ask("Musical Key", "F Minor");
  const video = await ask("Video Visualizer Path", "/beats/chinese-empathy.mp4");
  const audio = await ask("Audio Stream Path", "/beats/chinese-empathy.mp3");
  const categoriesRaw = await ask("Categories (comma-separated, e.g. afro, trap)", "afro, trap");
  const categories = categoriesRaw.split(",").map((c) => c.trim()).filter(Boolean);

  const id = slugify(title);
  const newBeat = {
    id,
    title: title.toUpperCase(),
    genre,
    shortGenre: genre,
    categories,
    bpm: bpm.includes("BPM") ? bpm : `${bpm} BPM`,
    key,
    video,
    audio,
    showVisualTitle: true,
    status: "available",
  };

  const beatsFilePath = path.join(rootDir, "src", "data", "beats.js");
  const currentContent = fs.readFileSync(beatsFilePath, "utf-8");

  // Find the rawBeats array insertion point
  const rawBeatsMatch = currentContent.match(/const rawBeats\s*=\s*\[/);
  if (!rawBeatsMatch) {
    console.error("Could not find rawBeats array in src/data/beats.js");
    rl.close();
    return;
  }

  const insertPos = currentContent.lastIndexOf("];\n\nfunction resolveBeatVideo");
  const targetIndex = insertPos !== -1 ? insertPos : currentContent.indexOf("];");

  const formattedEntry = `  ${JSON.stringify(newBeat, null, 2).replace(/\n/g, "\n  ")},\n`;
  const updatedContent =
    currentContent.slice(0, targetIndex) +
    formattedEntry +
    currentContent.slice(targetIndex);

  fs.writeFileSync(beatsFilePath, updatedContent, "utf-8");

  console.log(`\n✓ Successfully registered beat "${newBeat.title}" in src/data/beats.js!`);
  console.log("Your new beat is now active in the studio catalog and audio player.\n");
  rl.close();
}

async function main() {
  const arg = process.argv[2];
  if (arg === "post") {
    await addGalleryPost();
    return;
  }
  if (arg === "beat") {
    await addBeat();
    return;
  }

  console.log("==========================================");
  console.log("SILACHOMKA / CHOMKA NATION PUBLISHER");
  console.log("==========================================\n");
  console.log("1. Publish new Gallery Post (Image, Video, Carousel)");
  console.log("2. Register new Studio Beat (Audio, Video, Specs)\n");

  const choice = await ask("Select an option (1 or 2)", "1");
  if (choice === "2") {
    await addBeat();
  } else {
    await addGalleryPost();
  }
}

main().catch((err) => {
  console.error("Publishing error:", err);
  rl.close();
});
