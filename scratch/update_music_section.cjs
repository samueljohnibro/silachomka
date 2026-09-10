const fs = require('fs');

let content = fs.readFileSync('c:/development/silachomka/src/App.jsx', 'utf8');

const oldMusicSection = `function MusicSection({
  releases: sortedReleases,
  totalTracks,
}) {
  return (
    <section
      className="music-section"
      id="music"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            DISCOGRAPHY
          </p>

          <h2>
            Music
          </h2>
        </div>

        <span>
          {sortedReleases.length}{" "}
          {sortedReleases.length === 1
            ? "release"
            : "releases"}{" "}
          /{" "}
          {totalTracks}{" "}
          {totalTracks === 1
            ? "track"
            : "tracks"}
        </span>
      </div>

      {sortedReleases.length > 0 ? (
        <div className="release-grid">
          {sortedReleases.map(
            (release, index) => (
              <ReleaseCard
                key={
                  release.slug ??
                  release.id ??
                  release.title ??
                  index
                }
                release={release}
                isLatest={
                  index === 0
                }
              />
            )
          )}
        </div>
      ) : (
        <div className="gallery-placeholder">
          <span>
            01
          </span>

          <h3>
            No releases yet.
          </h3>

          <p>
            Music will appear here when
            releases are added to the
            authoritative release data.
          </p>
        </div>
      )}
    </section>
  );
}`;

const newMusicSection = `function MusicSection({
  releases: sortedReleases,
  totalTracks,
}) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);

  const filters = [
    { id: "all", label: "ALL" },
    { id: "singles", label: "SINGLES" },
    { id: "eps", label: "EPS" },
    { id: "albums", label: "ALBUMS" },
    { id: "ft_silachomka", label: "FT. SILACHOMKA" },
    { id: "prod_by_silachomka", label: "PROD. BY SILACHOMKA" },
  ];

  const filteredReleases = useMemo(() => {
    if (activeFilter === "all") return sortedReleases;
    return sortedReleases.filter((release) => {
      if (activeFilter === "singles") return release.type === "single";
      if (activeFilter === "eps") return release.type === "ep";
      if (activeFilter === "albums") return release.type === "album";
      if (activeFilter === "ft_silachomka") return release.featsSilachomka === true;
      if (activeFilter === "prod_by_silachomka") return release.producedBySilachomka !== false;
      return true;
    });
  }, [sortedReleases, activeFilter]);

  const toggleFilterMenu = () => setFilterMenuOpen(!filterMenuOpen);

  return (
    <section className="music-section" id="music">
      <div className="section-heading">
        <div>
          <p className="eyebrow">DISCOGRAPHY</p>
          <h2>Music</h2>
        </div>
        <span>
          {filteredReleases.length} {filteredReleases.length === 1 ? "release" : "releases"}
        </span>
      </div>

      <div className="filter-toolbar">
        <div className="filter-hamburger">
          <button
            className="filter-toggle-btn"
            onClick={toggleFilterMenu}
            aria-expanded={filterMenuOpen}
          >
            {filters.find(f => f.id === activeFilter)?.label} 
            <span className="filter-icon">▼</span>
          </button>
          
          {filterMenuOpen && (
            <div className="filter-dropdown">
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  className={\`filter-dropdown-item \${activeFilter === filter.id ? "is-active" : ""}\`}
                  onClick={() => {
                    setActiveFilter(filter.id);
                    setFilterMenuOpen(false);
                  }}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="filter-desktop-list">
          {filters.map((filter) => (
            <button
              key={filter.id}
              className={\`filter-btn \${activeFilter === filter.id ? "is-active" : ""}\`}
              onClick={() => setActiveFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {filteredReleases.length > 0 ? (
        <div className="release-grid">
          {filteredReleases.map((release, index) => (
            <ReleaseCard
              key={release.slug ?? release.id ?? release.title ?? index}
              release={release}
              isLatest={activeFilter === "all" && index === 0}
            />
          ))}
        </div>
      ) : (
        <div className="gallery-placeholder">
          <span>01</span>
          <h3>No releases found.</h3>
          <p>No music matches the selected filter.</p>
        </div>
      )}
    </section>
  );
}`;

content = content.replace(oldMusicSection, newMusicSection);

const oldReleaseCardTitle = `          <h3>
            {release.title}
          </h3>`;

const newReleaseCardTitle = `          <h3>
            {release.title}
          </h3>
          {release.artist && release.artist !== "silachomka" && (
            <p className="release-artist">{release.artist}</p>
          )}`;

content = content.replace(oldReleaseCardTitle, newReleaseCardTitle);

fs.writeFileSync('c:/development/silachomka/src/App.jsx', content);
