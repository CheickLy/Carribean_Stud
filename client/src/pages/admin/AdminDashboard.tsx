import "../../styles/AdminDashboard.css";

const admin = {
  initials: "AN",
  name: "Alex North",
  role: "Administrator",
};

const openReportCount = 7;

const metrics = [
  { label: "Rooms created", value: "0" },
  { label: "Registered players", value: "0" },
  { label: "Ad impressions", value: "0" },
  { label: "Open reports", value: "0" },
];

export default function AdminDashboard() {
  return (
    <div className="admin-dashboard">
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <span className="admin-logo-mark" aria-hidden="true">
            ♣
          </span>
          <span>Reef Royale</span>
        </div>

        <nav className="admin-nav" aria-label="Admin">
          <button type="button" className="admin-nav-item is-active">
            Home
          </button>
          <button type="button" className="admin-nav-item">
            Players
          </button>
          <button type="button" className="admin-nav-item">
            Reports
            <span className="admin-nav-badge">{openReportCount}</span>
          </button>
        </nav>

        <div className="admin-identity">
          <span className="admin-avatar">{admin.initials}</span>
          <span>
            <strong>{admin.name}</strong>
            <small>{admin.role}</small>
          </span>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <h1>Admin Dashboard</h1>
          <button type="button" className="admin-range">
            Last 7 days
          </button>
        </header>

        <section className="admin-metrics" aria-label="Key metrics">
          {metrics.map((metric) => (
            <article key={metric.label} className="admin-metric">
              <p>{metric.label}</p>
              <strong>{metric.value}</strong>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
