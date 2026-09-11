const fs = require('fs');
let data = fs.readFileSync('c:/development/silachomka/src/data/releases.js', 'utf8');
data = data.replace('cover: "/covers/sobobo.jpg"', 'cover: "/covers/hunchoa-sobobo.jpg"');
fs.writeFileSync('c:/development/silachomka/src/data/releases.js', data);
console.log("Replaced SOBOBO cover art");
