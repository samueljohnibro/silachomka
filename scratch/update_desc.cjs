const fs = require('fs');
let data = fs.readFileSync('c:/development/silachomka/src/data/releases.js', 'utf8');

const regex = /description:\s*description \|\|\s*`\$\{title\} is an official studio release by silachomka published under chomkaMUSIC.*?,/;
const replacement = `description:
      description ||
      \`\${title} is an official studio release by \${artist || "silachomka"} published under \${normalisedSources.join(" & ")}.\`,`;

if (regex.test(data)) {
    fs.writeFileSync('c:/development/silachomka/src/data/releases.js', data.replace(regex, replacement));
    console.log("Updated description logic!");
} else {
    console.log("Regex did not match.");
}
