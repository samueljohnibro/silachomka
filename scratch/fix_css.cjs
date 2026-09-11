const fs = require('fs');
let css = fs.readFileSync('c:/development/silachomka/src/App.css', 'utf8');

css = css.replace(
  '.filter-toolbar {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n}',
  '.filter-toolbar {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  margin-bottom: 24px;\n}'
);

css = css.replace(
  '.filter-dropdown {\n  position: absolute;\n  top: calc(100% + 4px);\n  right: 0;',
  '.filter-dropdown {\n  position: absolute;\n  top: calc(100% + 4px);\n  left: 0;\n}\n.beats-filter-toolbar .filter-dropdown {\n  left: auto;\n  right: 0;'
);

fs.writeFileSync('c:/development/silachomka/src/App.css', css);
console.log("Updated App.css!");
