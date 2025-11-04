import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth(); 

  console.log('🏠 Home render - user:', user, 'loading:', loading);

  if (loading) {
    console.log('⏳ Home showing loading...');
    return <div style={{ padding: '20px' }}>Loading...</div>;
  }

  console.log('🎯 Home showing main content');

  const handleGoToDashboard = () => {
    if (!user) return;
    navigate(user.role === "admin" ? "/admin" : "/dashboard");
  };

  return (
    <div className="home-container">
      <h1>🍺 Benvenuto nel Pub Manager</h1>

      {user ? (
        <>
          <p>Ciao <strong>{user.name}</strong>! Ruolo: <strong>{user.role}</strong></p>
          <div className="button-group">
            <button className="btn primary" onClick={handleGoToDashboard}>
              Vai al gestionale
            </button>
            <button className="btn danger" onClick={logout}>
              Logout
            </button>
          </div>
        </>
      ) : (
        <button className="btn primary" onClick={() => navigate("/login")}>
          Accedi
        </button>
      )}
    </div>
  );
}




