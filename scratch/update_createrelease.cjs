const fs = require('fs');
let data = fs.readFileSync('c:/development/silachomka/src/data/releases.js', 'utf8');

const targetRegex = /const createRelease = \(\{\s*number,\s*title,\s*slug,\s*edition,\s*date,\s*displayDate,\s*cover,\s*description,\s*\/\/\s*Accept either sources \(array\) or source \(string\) for backward compat\s*sources,\s*source,\s*platforms\s*=\s*\{\},\s*tracks\s*=\s*\[\],\s*\}\) => \{\s*\/\/\s*Normalise to a sources array\s*let normalisedSources;\s*if\s*\(Array.isArray\(sources\) && sources.length > 0\)\s*\{\s*normalisedSources = sources;\s*\}\s*else if\s*\(typeof source === "string" && source.trim\(\)\)\s*\{\s*normalisedSources = \[source.trim\(\)\];\s*\}\s*else\s*\{\s*normalisedSources = \[DEFAULT_SOURCE\];\s*\}\s*return \{\s*number,\s*title,\s*slug,\s*edition,\s*date,\s*displayDate,\s*cover,\s*sources:\s*normalisedSources,/m;

const replacement = `const createRelease = ({
  number,
  title,
  slug,
  edition,
  date,
  displayDate,
  cover,
  description,
  // Accept either sources (array) or source (string) for backward compat
  sources,
  source,
  platforms = {},
  tracks = [],
  type,
  artist,
  featsSilachomka = false,
  producedBySilachomka = true,
}) => {
  // Normalise to a sources array
  let normalisedSources;
  if (Array.isArray(sources) && sources.length > 0) {
    normalisedSources = sources;
  } else if (typeof source === "string" && source.trim()) {
    normalisedSources = [source.trim()];
  } else {
    normalisedSources = [DEFAULT_SOURCE];
  }

  // Auto-determine type if not explicitly provided
  let derivedType = type;
  if (!derivedType) {
    derivedType = tracks.length <= 2 ? "single" : "ep";
  }

  return {
    number,
    title,
    slug,
    edition,
    date,
    displayDate,
    cover,
    type: derivedType,
    artist: artist || "silachomka",
    featsSilachomka,
    producedBySilachomka,
    sources: normalisedSources,`;

if (targetRegex.test(data)) {
    fs.writeFileSync('c:/development/silachomka/src/data/releases.js', data.replace(targetRegex, replacement));
    console.log("Successfully replaced createRelease!");
} else {
    console.log("Target not found!");
}
