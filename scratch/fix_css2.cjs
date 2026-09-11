const fs = require('fs');
let css = fs.readFileSync('c:/development/silachomka/src/App.css', 'utf8');

css = css.replace(
  `.filter-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
}
.beats-filter-toolbar .filter-dropdown {
  left: auto;
  right: 0;
  z-index: 100;
  background: var(--surface-2);
  border: 1px solid var(--line-gold);
  border-radius: 4px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 160px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.8);
}`,
  `.filter-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 100;
  background: var(--surface-2);
  border: 1px solid var(--line-gold);
  border-radius: 4px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 160px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.8);
}
.beats-filter-toolbar .filter-dropdown {
  left: auto;
  right: 0;
}`
);

fs.writeFileSync('c:/development/silachomka/src/App.css', css);
console.log("Fixed App.css!");
