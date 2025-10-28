import { useState } from "react";
import { useAuth } from "../../context/Authcontext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      const data = await login(email, password);

      if (data.user) {
        // Se l'utente è admin → dashboard
        if (data.user.role === "admin") navigate("/admin");
        // Se cameriere/barista/cuoco → home
        else navigate("/");
      } else {
        setError("Credenziali non valide");
      }
    } catch (err) {
      console.error(err);
      setError("Errore di connessione al server");
    }
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: "100px" }}>
      <form
        onSubmit={handleSubmit}
        style={{
          width: "350px",
          padding: "30px",
          border: "1px solid #ccc",
          borderRadius: "10px",
          background: "#f9f9f9",
        }}
      >
        <h2>Accedi al Pub Manager 🍺</h2>

        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={{ width: "100%", marginBottom: "10px", padding: "8px" }}
        />

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={{ width: "100%", marginBottom: "15px", padding: "8px" }}
        />

        {error && <p style={{ color: "red" }}>{error}</p>}

        <button
          type="submit"
          style={{
            width: "100%",
            padding: "10px",
            background: "#222",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Login
        </button>
      </form>
    </div>
  );
}
