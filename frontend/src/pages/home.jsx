import { useAuth } from "../context/Authcontext";

export default function Home() {
  const { user, logout } = useAuth();

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      fontFamily: "sans-serif"
    }}>
      <h1>🍺 Benvenuto nel Pub Manager</h1>

      {user ? (
        <>
          <p>Ciao <strong>{user.name}</strong>! Ruolo: <strong>{user.role}</strong></p>
          <button
            onClick={logout}
            style={{
              padding: "10px 20px",
              marginTop: "20px",
              backgroundColor: "#d33",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer"
            }}
          >
            Logout
          </button>
        </>
      ) : (
        <p>Effettua il login per accedere alle funzioni del gestionale.</p>
      )}
    </div>
  );
}
