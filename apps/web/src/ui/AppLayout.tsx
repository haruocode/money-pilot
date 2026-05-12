import { NavLink, Outlet } from "react-router-dom";

const links = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/snapshots", label: "Snapshots" },
  { to: "/expenses", label: "Expenses" },
];

export function AppLayout() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Money Pilot</p>
          <h1 className="app-title">Personal finance cockpit</h1>
        </div>

        <nav className="nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                isActive ? "nav-link nav-link-active" : "nav-link"
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}

