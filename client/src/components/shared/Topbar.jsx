import { useAuth } from '../../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Topbar({ roomStatus }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('Signed out');
  };

  return (
    <div className="topbar">
      <div className="topbar-logo">
        <span>🌍</span>
        <span>International Business</span>
        <span className="dot" />
        {roomStatus && (
          <span className={`status-pill ${roomStatus}`} style={{ marginLeft: 4 }}>
            <span className="dot" />{roomStatus}
          </span>
        )}
      </div>
      <div className="topbar-right">
        {user?.roomCode && <span className="room-badge">{user.roomCode}</span>}
        <span className={`role-badge ${user?.role}`}>
          {user?.role === 'banker' ? '🏦 Banker' : `👤 ${user?.name}`}
        </span>
        <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Exit</button>
      </div>
    </div>
  );
}
