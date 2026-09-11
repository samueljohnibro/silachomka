const fs = require('fs');

let appJsx = fs.readFileSync('c:/development/silachomka/src/App.jsx', 'utf8');

const targetStr = `function MusicSection({ releases: sortedReleases, totalTracks }) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);`;

const replacementStr = `function MusicSection({ releases: sortedReleases, totalTracks }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeFilter = searchParams.get("filter") || "all";
  const viewMode = searchParams.get("view") || "grid";
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);

  const setActiveFilter = (filter) => {
    const newParams = new URLSearchParams(searchParams);
    if (filter === "all") newParams.delete("filter");
    else newParams.set("filter", filter);
    setSearchParams(newParams, { replace: true });
  };

  const setViewMode = (mode) => {
    const newParams = new URLSearchParams(searchParams);
    if (mode === "grid") newParams.delete("view");
    else newParams.set("view", mode);
    setSearchParams(newParams, { replace: true });
  };`;

appJsx = appJsx.replace(targetStr, replacementStr);

const headingTarget = `      <div className="section-heading">
        <div>
          <p className="eyebrow">DISCOGRAPHY</p>
          <h2>Music</h2>
        </div>
        <span>
          {filteredReleases.length} {filteredReleases.length === 1 ? "release" : "releases"}
        </span>
      </div>

      <div className="filter-toolbar">`;

const headingReplacement = `      <div className="section-heading">
        <div>
          <p className="eyebrow">DISCOGRAPHY</p>
          <h2>Music</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ display: "flex", gap: "8px", border: "1px solid var(--line-gold)", borderRadius: "3px", padding: "2px" }}>
            <button 
              onClick={() => setViewMode("grid")}
              style={{
                background: viewMode === "grid" ? "rgba(223, 194, 125, 0.15)" : "transparent",
                color: viewMode === "grid" ? "var(--gold)" : "var(--text-secondary)",
                border: "none", padding: "4px 8px", cursor: "pointer", fontSize: "9px", fontWeight: "700", borderRadius: "2px", textTransform: "uppercase"
              }}>Grid</button>
            <button 
              onClick={() => setViewMode("list")}
              style={{
                background: viewMode === "list" ? "rgba(223, 194, 125, 0.15)" : "transparent",
                color: viewMode === "list" ? "var(--gold)" : "var(--text-secondary)",
                border: "none", padding: "4px 8px", cursor: "pointer", fontSize: "9px", fontWeight: "700", borderRadius: "2px", textTransform: "uppercase"
              }}>List</button>
          </div>
          <span>
            {filteredReleases.length} {filteredReleases.length === 1 ? "release" : "releases"}
          </span>
        </div>
      </div>

      <div className="filter-toolbar">`;

appJsx = appJsx.replace(headingTarget, headingReplacement);

const releasesTarget = `      {filteredReleases.length > 0 ? (
        <div className="release-grid">
          {filteredReleases.map((release, index) => (
            <ReleaseCard
              key={release.slug ?? release.id ?? release.title ?? index}
              release={release}
              isLatest={activeFilter === "all" && index === 0}
              activeFilter={activeFilter}
            />
          ))}
        </div>
      ) : (`;

const releasesReplacement = `      {filteredReleases.length > 0 ? (
        viewMode === "grid" ? (
          <div className="release-grid">
            {filteredReleases.map((release, index) => {
              // Calculate dynamic number within the filtered context chronologically (newest is first in list, so index 0 = length)
              const dynamicNumber = filteredReleases.length - index;
              return (
                <ReleaseCard
                  key={release.slug ?? release.id ?? release.title ?? index}
                  release={{ ...release, number: dynamicNumber }}
                  isLatest={activeFilter === "all" && index === 0}
                  activeFilter={activeFilter}
                />
              );
            })}
          </div>
        ) : (
          <div className="release-list-view" style={{ display: "flex", flexDirection: "column", gap: "32px", marginTop: "24px" }}>
            {filteredReleases.map((release, index) => {
              let tracksToShow = release.tracks || [];
              if (activeFilter === "ft_silachomka") {
                tracksToShow = tracksToShow.filter(t => Array.isArray(t.featuring) && t.featuring.some(f => f.toLowerCase() === "silachomka"));
              } else if (activeFilter === "prod_by_silachomka") {
                tracksToShow = tracksToShow.filter(t => Array.isArray(t.producers) && t.producers.some(p => p.toLowerCase() === "silachomka"));
              }
              const dynamicNumber = filteredReleases.length - index;

              return (
                <div key={release.slug ?? index} className="release-list-item tracklist-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <img src={release.cover} alt={release.title} style={{ width: "40px", height: "40px", borderRadius: "4px", objectFit: "cover" }} />
                      <div>
                        <h3 style={{ margin: 0, fontSize: "14px" }}>{release.title}</h3>
                        <p style={{ margin: 0, fontSize: "10px", color: "var(--gold)" }}>Release {String(dynamicNumber).padStart(2, "0")} • {release.artist && release.artist !== "silachomka" ? release.artist : "silachomka"}</p>
                      </div>
                    </div>
                    <Link to={\`/release/\${release.slug}\${activeFilter !== "all" ? "?filter=" + activeFilter : ""}\`} className="text-button" style={{ fontSize: "10px" }}>
                      View →
                    </Link>
                  </div>
                  <div>
                    {tracksToShow.map((track, trackIndex) => (
                      <TrackRow key={\`\${release.slug}-track-\${trackIndex}\`} track={track} index={trackIndex} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (`;

appJsx = appJsx.replace(releasesTarget, releasesReplacement);

fs.writeFileSync('c:/development/silachomka/src/App.jsx', appJsx);
console.log("Updated MusicSection successfully.");
