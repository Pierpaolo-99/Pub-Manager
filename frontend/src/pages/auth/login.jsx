import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./login.css";

export default function Login() {

    const { login } = useAuth();
    const navigate = useNavigate();

    const initialForm = {
        email: "",
        password: ""
    };

    const [form, setForm] = useState(initialForm);
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        // Rimuovi l'errore quando l'utente inizia a digitare
        if (errors[e.target.name]) {
            setErrors({ ...errors, [e.target.name]: null });
        }
        // Rimuovi anche errore generale
        if (errors.general) {
            setErrors({ ...errors, general: null });
        }
    }

    const validateForm = () => {
        const newErrors = {};

        // Validazione email
        if (!form.email.trim()) {
            newErrors.email = "Email è obbligatoria";
        } else if (!/\S+@\S+\.\S+/.test(form.email)) {
            newErrors.email = "Email non valida";
        }

        // Validazione password
        if (!form.password) {
            newErrors.password = "Password è obbligatoria";
        } else if (form.password.length < 6) {
            newErrors.password = "Password troppo corta";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log("🔑 Login form submitted:", { email: form.email, password: '[HIDDEN]' });

        if (!validateForm()) {
            console.log("❌ Login validation failed:", errors);
            return;
        }

        setIsLoading(true);
        setErrors({}); // Pulisci errori precedenti

        try {
            // CORREGGI QUESTA LINEA: passa email e password separatamente
            const result = await login(form.email, form.password);
            
            if (result.success) {
                console.log("✅ Login successful");
                navigate("/admin");
            } else {
                console.log("❌ Login failed:", result.message);
                setErrors({ general: result.message || 'Credenziali non valide' });
            }
        } catch (error) {
            console.error("🚨 Login error:", error);
            setErrors({ general: 'Errore di connessione al server' });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <h1 className="login-title">🍺 Accedi al Pub Manager</h1>
                    <p className="login-subtitle">Inserisci le tue credenziali per accedere</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {/* Errore generale */}
                    {errors.general && (
                        <div className="error-message general-error">
                            ⚠️ {errors.general}
                        </div>
                    )}

                    {/* Email */}
                    <div className="form-group">
                        <label htmlFor="email" className="form-label">
                            Email <span className="required">*</span>
                        </label>
                        <input
                            type="email"
                            className={`form-input ${errors.email ? 'error' : ''}`}
                            id="email" 
                            name="email"
                            placeholder="nome@esempio.com"
                            value={form.email}
                            onChange={handleChange}
                            disabled={isLoading}
                            required
                            autoComplete="email"
                            autoFocus
                        />
                        {errors.email && <span className="error-message">{errors.email}</span>}
                    </div>

                    {/* Password */}
                    <div className="form-group">
                        <label htmlFor="password" className="form-label">
                            Password <span className="required">*</span>
                        </label>
                        <input
                            type="password"
                            className={`form-input ${errors.password ? 'error' : ''}`}
                            id="password"
                            name="password"
                            placeholder="Inserisci la tua password"
                            value={form.password}
                            onChange={handleChange}
                            disabled={isLoading}
                            required
                            autoComplete="current-password"
                        />
                        {errors.password && <span className="error-message">{errors.password}</span>}
                    </div>

                    {/* Submit Button */}
                    <button 
                        type="submit" 
                        className={`btn-primary ${isLoading ? 'loading' : ''}`}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <span className="spinner"></span>
                                Accesso in corso...
                            </>
                        ) : (
                            '🚀 Accedi'
                        )}
                    </button>
                </form>

                <div className="login-footer">
                    <div className="forgot-password-link">
                        <Link to={"/forgot-password"} className="link">
                            🔑 Password dimenticata?
                        </Link>
                    </div>
                    
                    <div className="register-link">
                        <p>Non hai un account? <Link to={'/register'} className="link">Registrati qui</Link></p>
                    </div>
                </div>

                {/* Credenziali demo per sviluppo */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="demo-credentials">
                        <h4>🧪 Credenziali Demo:</h4>
                        <div className="demo-item">
                            <strong>Admin:</strong> admin@pub.com / password
                        </div>
                        <button 
                            type="button" 
                            className="btn-demo"
                            onClick={() => setForm({ email: 'admin@pub.com', password: 'password' })}
                        >
                            Usa credenziali Admin
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}