const fs = require('fs');
let css = fs.readFileSync('c:/development/silachomka/src/App.css', 'utf8');

const newStyles = `

/* =========================================================
   NEW FILTERS & RESPONSIVE TWEAKS
   ========================================================= */

.filter-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}
.filter-desktop-list {
  display: flex;
  gap: 8px;
  flex-wrap: nowrap;
}
.filter-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 0 14px;
  border: 1px solid var(--line-gold);
  border-radius: 3px;
  background: rgba(223, 194, 125, 0.04);
  color: var(--text-secondary);
  font-size: 8px;
  font-weight: 700;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  white-space: nowrap;
  cursor: pointer;
  transition: all var(--transition-fast) ease;
}
.filter-btn:hover {
  border-color: var(--gold);
  background: rgba(223, 194, 125, 0.15);
  color: var(--text);
}
.filter-btn.is-active {
  border-color: var(--gold);
  background: var(--gold);
  color: var(--bg);
  box-shadow: 0 4px 18px var(--gold-glow);
}

.filter-hamburger {
  display: none;
  position: relative;
}
.filter-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 0 14px;
  border: 1px solid var(--gold);
  border-radius: 3px;
  background: var(--gold);
  color: var(--bg);
  font-size: 8px;
  font-weight: 700;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  cursor: pointer;
}
.filter-dropdown {
  position: absolute;
  top: calc(100% + 4px);
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
}
.filter-dropdown-item {
  text-align: left;
  padding: 10px 12px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  cursor: pointer;
  border-radius: 2px;
}
.filter-dropdown-item:hover {
  background: rgba(223, 194, 125, 0.1);
  color: var(--gold);
}
.filter-dropdown-item.is-active {
  color: var(--gold);
  background: rgba(223, 194, 125, 0.15);
}

.music-section .section-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 20px;
}

/* Beat Info Left-Align Override */
.beat-info {
  align-items: flex-start !important;
  text-align: left !important;
}
.beat-info > div {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
}
.beat-name, .beat-type, .credit-line {
  text-align: left !important;
}

/* Beat Skip Button */
.beat-skip-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(223, 194, 125, 0.1);
  color: var(--gold);
  border: 1px solid var(--line-gold);
  display: grid;
  place-items: center;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}
.beat-skip-btn:hover {
  background: rgba(223, 194, 125, 0.2);
  transform: scale(1.05);
}

/* Exclusive Modal Mobile Fix */
@media (max-width: 500px) {
  .exclusive-modal-content {
    max-height: 90vh;
    overflow-y: auto;
    padding: 24px 16px;
    width: 95vw;
    margin: 5vh auto;
  }
  .exclusive-modal-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    text-align: left;
  }
  .exclusive-modal-action-btn {
    width: 100%;
    margin-top: 8px;
    justify-content: center;
  }
  .filter-desktop-list {
    display: none;
  }
  .filter-hamburger {
    display: block;
  }
  .beats-toolbar .filter-toolbar {
    width: 100%;
    justify-content: flex-end;
  }
}

@media (max-width: 900px) {
  .filter-desktop-list {
    display: none;
  }
  .filter-hamburger {
    display: block;
  }
  .beats-toolbar > div:first-child {
    flex-wrap: wrap;
  }
}
`;

fs.writeFileSync('c:/development/silachomka/src/App.css', css + newStyles);
