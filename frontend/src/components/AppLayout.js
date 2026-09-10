import Sidebar from "./Sidebar";

function AppLayout({ active, isAdmin, onNavigate, onLogout, children }) {
  return (
    <div className="app-shell">
      <Sidebar active={active} isAdmin={isAdmin} onNavigate={onNavigate} onLogout={onLogout} />
      <main className="main-content">{children}</main>
    </div>
  );
}

export default AppLayout;
