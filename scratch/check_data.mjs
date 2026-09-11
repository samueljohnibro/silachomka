import releases from '../src/data/releases.js';

// Check the FRIDAYTHE13TH release to see track structure
const fri13 = releases.find(r => r.slug === 'fridaythe13th');
if (fri13) {
    console.log("FRIDAYTHE13TH:");
    console.log("  artist:", fri13.artist);
    console.log("  featsSilachomka:", fri13.featsSilachomka);
    console.log("  producedBySilachomka:", fri13.producedBySilachomka);
    console.log("  type:", fri13.type);
    console.log("  tracks:", JSON.stringify(fri13.tracks, null, 2));
}

// Check SOBOBO
const sob = releases.find(r => r.slug === 'sobobo');
if (sob) {
    console.log("\nSOBOBO:");
    console.log("  artist:", sob.artist);
    console.log("  featsSilachomka:", sob.featsSilachomka);
    console.log("  producedBySilachomka:", sob.producedBySilachomka);
    console.log("  tracks:", JSON.stringify(sob.tracks, null, 2));
}

// Check a silachomka release like HORUS
const horus = releases.find(r => r.slug === 'horus');
if (horus) {
    console.log("\nHORUS:");
    console.log("  artist:", horus.artist);
    console.log("  featsSilachomka:", horus.featsSilachomka);
    console.log("  producedBySilachomka:", horus.producedBySilachomka);
    console.log("  tracks:", JSON.stringify(horus.tracks.map(t => ({title: t.title, featuring: t.featuring, producers: t.producers})), null, 2));
}

// Check description
console.log("\nFRIDAYTHE13TH desc:", fri13?.description);
console.log("SOBOBO desc:", sob?.description);
console.log("HORUS desc:", horus?.description);
