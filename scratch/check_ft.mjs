import releases from '../src/data/releases.js';

// Show all ft. silachomka releases
const ftSila = releases.filter(r => r.featsSilachomka);
ftSila.forEach(r => {
    console.log(`\n${r.title} (artist: ${r.artist})`);
    r.tracks.forEach(t => {
        console.log(`  track: ${t.title}, featuring: ${JSON.stringify(t.featuring)}, producers: ${JSON.stringify(t.producers)}`);
    });
});

// Show all prod by silachomka releases that aren't by silachomka
const prodSila = releases.filter(r => r.producedBySilachomka !== false && r.artist !== "silachomka");
console.log("\n--- PROD BY SILACHOMKA (non-silachomka artist) ---");
prodSila.forEach(r => {
    console.log(`\n${r.title} (artist: ${r.artist})`);
    r.tracks.forEach(t => {
        console.log(`  track: ${t.title}, producers: ${JSON.stringify(t.producers)}`);
    });
});
