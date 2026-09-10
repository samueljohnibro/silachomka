const fs = require('fs');

let content = fs.readFileSync('c:/development/silachomka/src/pages/BeatsPage.jsx', 'utf8');

const oldToolbar = `      <section className="beats-toolbar" aria-label="Beat catalog filters">
        <div>
          <span className="toolbar-label">Catalog</span>
          <span className="toolbar-count">
            {filteredBeats.length} {filteredBeats.length === 1 ? "Beat" : "Beats"}
          </span>
        </div>

        <div className="toolbar-right" role="group" aria-label="Filter beats by genre">
          {filters.map((filter) => {
            const isActive = activeFilter === filter.id;

            return (
              <button
                key={filter.id}
                type="button"
                className={isActive ? "is-active" : ""}
                onClick={() => handleFilterChange(filter.id)}
                aria-pressed={isActive}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </section>`;

const newToolbar = `      <section className="beats-toolbar" aria-label="Beat catalog filters">
        <div>
          <span className="toolbar-label">Catalog</span>
          <span className="toolbar-count">
            {filteredBeats.length} {filteredBeats.length === 1 ? "Beat" : "Beats"}
          </span>
        </div>

        <div className="filter-toolbar beats-filter-toolbar">
          <div className="filter-hamburger">
            <button
              className="filter-toggle-btn"
              onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
              aria-expanded={isFilterMenuOpen}
            >
              {filters.find(f => f.id === activeFilter)?.label} 
              <span className="filter-icon">▼</span>
            </button>
            
            {isFilterMenuOpen && (
              <div className="filter-dropdown">
                {filters.map((filter) => (
                  <button
                    key={filter.id}
                    className={\`filter-dropdown-item \${activeFilter === filter.id ? "is-active" : ""}\`}
                    onClick={() => {
                      handleFilterChange(filter.id);
                      setIsFilterMenuOpen(false);
                    }}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="filter-desktop-list">
            {filters.map((filter) => {
              const isActive = activeFilter === filter.id;

              return (
                <button
                  key={filter.id}
                  type="button"
                  className={isActive ? "is-active" : ""}
                  onClick={() => handleFilterChange(filter.id)}
                  aria-pressed={isActive}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>`;

content = content.replace(oldToolbar, newToolbar);

// We need to add `isFilterMenuOpen` state
const oldState = `  const [activeFilter, setActiveFilter] = useState("all");
  const [isExclusiveModalOpen, setIsExclusiveModalOpen] = useState(false);`;

const newState = `  const [activeFilter, setActiveFilter] = useState("all");
  const [isExclusiveModalOpen, setIsExclusiveModalOpen] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);`;

content = content.replace(oldState, newState);

fs.writeFileSync('c:/development/silachomka/src/pages/BeatsPage.jsx', content);
