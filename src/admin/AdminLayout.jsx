import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAdminAuth } from "./useAdminAuth";

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: "◈", end: true },
  { to: "/admin/gallery", label: "Gallery", icon: "◻" },
  { to: "/admin/music", label: "Music", icon: "♫" },
  { to: "/admin/beats", label: "Beats", icon: "◉" },
  { to: "/admin/media", label: "Media", icon: "▣" },
  { to: "/admin/links", label: "Links", icon: "⊡" },
  { to: "/admin/settings", label: "Settings", icon: "⚙" },
];

export default function AdminLayout() {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    navigate("/admin/login", { replace: true });
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="admin-shell">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="admin-sidebar-overlay"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <div className="admin-sidebar-brand">
          <span className="admin-sidebar-mark">SC</span>
          <div>
            <strong className="admin-sidebar-title">silachomka</strong>
            <span className="admin-sidebar-label">Admin</span>
          </div>
        </div>

        <nav className="admin-nav" aria-label="Admin navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `admin-nav-item ${isActive ? "is-active" : ""}`
              }
              onClick={closeSidebar}
            >
              <span className="admin-nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-info">
            <span className="admin-user-avatar" aria-hidden="true">
              {user?.email?.charAt(0).toUpperCase() || "A"}
            </span>
            <span className="admin-user-email" title={user?.email}>
              {user?.email || "Admin"}
            </span>
          </div>
          <button
            className="admin-logout-btn"
            onClick={handleLogout}
            disabled={loggingOut}
            aria-label="Sign out"
          >
            {loggingOut ? "..." : "Sign Out"}
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="admin-main">
        <header className="admin-header">
          <button
            type="button"
            className="admin-menu-toggle"
            onClick={() => setSidebarOpen((p) => !p)}
            aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={sidebarOpen}
          >
            <span className="admin-menu-bar" />
            <span className="admin-menu-bar" />
            <span className="admin-menu-bar" />
          </button>

          <span className="admin-header-badge">chomkaMUSIC™ Admin</span>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
