import { NavLink, Outlet, useNavigate } from 'react-router-dom';

export default function AppLayout() {
  const navigate = useNavigate();

  return (
    <>
      <div className="sidebar-narrow d-flex flex-column justify-content-between py-3 px-2 border-end">
        <div className="d-flex flex-column gap-3">
          <div className="d-flex justify-content-center mb-1">
            <img 
              src="/logo.png" 
              alt="Logo" 
              style={{ width: '40px', height: '40px', cursor: 'pointer', borderRadius: '6px' }} 
              onClick={() => navigate('/dashboard')} 
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none"><rect width="40" height="40" fill="%233e444a" rx="6"/><text x="50%" y="54%" fill="%23ffffff" font-family="sans-serif" font-weight="bold" font-size="20" text-anchor="middle" dominant-baseline="middle">UE</text></svg>';
              }}
            />
          </div>
          <NavLink to="/dashboard" className={({ isActive }) => `nav-icon-link ${isActive ? 'active' : ''}`}>
            <i className="bi bi-speedometer2"></i>Dashboard
          </NavLink>
          <NavLink to="/students" className={({ isActive }) => `nav-icon-link ${isActive ? 'active' : ''}`}>
            <i className="bi bi-people"></i>Student<br />Directory
          </NavLink>
          <NavLink to="/archive" className={({ isActive }) => `nav-icon-link ${isActive ? 'active' : ''}`}>
            <i className="bi bi-archive"></i>Student<br />Archive
          </NavLink>
          <NavLink to="/requirements" className={({ isActive }) => `nav-icon-link ${isActive ? 'active' : ''}`}>
            <i className="bi bi-card-checklist"></i>Reqs.<br />Manager
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-icon-link ${isActive ? 'active' : ''}`}>
            <i className="bi bi-gear"></i>Settings
          </NavLink>
        </div>
        <div className="text-center text-muted" style={{ fontSize: '0.65rem' }}>v1.0</div>
      </div>

      <div className="main-workspace p-4">
        <Outlet />
      </div>
    </>
  );
}
