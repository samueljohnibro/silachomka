const fs = require('fs');
let appJsx = fs.readFileSync('c:/development/silachomka/src/App.jsx', 'utf8');

// Add activeFilter prop to ReleaseCard
appJsx = appJsx.replace(
`function ReleaseCard({
  release,
  isLatest = false,
}) {`,
`function ReleaseCard({
  release,
  isLatest = false,
  activeFilter = "all",
}) {`
);

// Update link 1 in ReleaseCard
appJsx = appJsx.replace(
  `to={\`/release/\${release.slug}\`}`,
  `to={\`/release/\${release.slug}\${activeFilter !== 'all' ? '?filter=' + activeFilter : ''}\`}`
);

// Update link 2 in ReleaseCard
appJsx = appJsx.replace(
  `to={\`/release/\${release.slug}\`}`,
  `to={\`/release/\${release.slug}\${activeFilter !== 'all' ? '?filter=' + activeFilter : ''}\`}`
);

// Update MusicSection ReleaseCard call
appJsx = appJsx.replace(
`<ReleaseCard
              key={release.slug ?? release.id ?? release.title ?? index}
              release={release}
              isLatest={activeFilter === "all" && index === 0}
            />`,
`<ReleaseCard
              key={release.slug ?? release.id ?? release.title ?? index}
              release={release}
              isLatest={activeFilter === "all" && index === 0}
              activeFilter={activeFilter}
            />`
);

fs.writeFileSync('c:/development/silachomka/src/App.jsx', appJsx);
console.log("Updated App.jsx with activeFilter!");
