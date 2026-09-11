const fs = require('fs');
let data = fs.readFileSync('c:/development/silachomka/src/data/releases.js', 'utf8');

const target = `    title: "SOBOBO",
    slug: "sobobo",
    date: "2025-03-15",`;

const replacement = `    title: "SOBOBO",
    slug: "sobobo",
    cover: "/covers/hunchoa-sobobo.jpg",
    date: "2025-03-15",`;

if (data.includes(target)) {
    fs.writeFileSync('c:/development/silachomka/src/data/releases.js', data.replace(target, replacement));
    console.log("Added cover for SOBOBO");
} else {
    // try regex for crlf differences
    const targetRegex = /title:\s*"SOBOBO",\s*slug:\s*"sobobo",\s*date:\s*"2025-03-15",/m;
    if (targetRegex.test(data)) {
        fs.writeFileSync('c:/development/silachomka/src/data/releases.js', data.replace(targetRegex, `title: "SOBOBO",\n    slug: "sobobo",\n    cover: "/covers/hunchoa-sobobo.jpg",\n    date: "2025-03-15",`));
        console.log("Added cover for SOBOBO using regex");
    } else {
        console.log("Could not find SOBOBO to add cover");
    }
}
