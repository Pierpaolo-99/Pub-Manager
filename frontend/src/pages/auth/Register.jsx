import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./register.css";

export default function Register() {

    const { register } = useAuth();
    const navigate = useNavigate();

    const initialForm = {
        username: "",
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "waiter", // Default waiter
        phone: ""
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
    }

    const validateForm = () => {
        const newErrors = {};

        // Validazione username
        if (!form.username.trim()) {
            newErrors.username = "Username è obbligatorio";
        } else if (form.username.length < 3) {
            newErrors.username = "Username deve essere almeno 3 caratteri";
        }

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
            newErrors.password = "Password deve essere almeno 6 caratteri";
        }

        // Validazione conferma password
        if (form.password !== form.confirmPassword) {
            newErrors.confirmPassword = "Le password non coincidono";
        }

        // Validazione nome (opzionale ma se inserito non può essere vuoto)
        if (form.first_name && form.first_name.trim().length < 2) {
            newErrors.first_name = "Nome troppo corto";
        }

        // Validazione cognome (opzionale)
        if (form.last_name && form.last_name.trim().length < 2) {
            newErrors.last_name = "Cognome troppo corto";
        }

        // Validazione telefono (opzionale)
        if (form.phone && !/^\+?[\d\s\-\(\)]{8,}$/.test(form.phone)) {
            newErrors.phone = "Numero di telefono non valido";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log("Form submitted:", { ...form, password: '[HIDDEN]', confirmPassword: '[HIDDEN]' });

        if (!validateForm()) {
            console.log("❌ Validation failed:", errors);
            return;
        }

        setIsLoading(true);
        
        try {
            // Prepara i dati per la registrazione (rimuovi confirmPassword)
            const { confirmPassword, ...registrationData } = form;
            
            const result = await register(registrationData);
            
            if (result.success) {
                console.log("✅ Registration successful");
                navigate('/admin');
            } else {
                console.log("❌ Registration failed:", result.message);
                setErrors({ general: result.message || 'Registrazione fallita' });
            }
        } catch (error) {
            console.error("🚨 Registration error:", error);
            setErrors({ general: 'Errore di connessione al server' });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="register-container">
            <div className="register-card">
                <div className="register-header">
                    <h1 className="register-title">🍺 Registrazione Pub Manager</h1>
                    <p className="register-subtitle">Crea il tuo account per gestire il pub</p>
                </div>

                <form onSubmit={handleSubmit} className="register-form">
                    {/* Errore generale */}
                    {errors.general && (
                        <div className="error-message general-error">
                            ⚠️ {errors.general}
                        </div>
                    )}

                    {/* Username - OBBLIGATORIO */}
                    <div className="form-group">
                        <label htmlFor="username" className="form-label">
                            Username <span className="required">*</span>
                        </label>
                        <input
                            type="text"
                            className={`form-input ${errors.username ? 'error' : ''}`}
                            id="username"
                            name="username"
                            placeholder="Inserisci il tuo username"
                            value={form.username}
                            onChange={handleChange}
                            disabled={isLoading}
                            required
                        />
                        {errors.username && <span className="error-message">{errors.username}</span>}
                    </div>

                    {/* Nome e Cognome - Opzionali */}
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="first_name" className="form-label">Nome</label>
                            <input
                                type="text"
                                className={`form-input ${errors.first_name ? 'error' : ''}`}
                                id="first_name"
                                name="first_name"
                                placeholder="Nome"
                                value={form.first_name}
                                onChange={handleChange}
                                disabled={isLoading}
                            />
                            {errors.first_name && <span className="error-message">{errors.first_name}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="last_name" className="form-label">Cognome</label>
                            <input
                                type="text"
                                className={`form-input ${errors.last_name ? 'error' : ''}`}
                                id="last_name"
                                name="last_name"
                                placeholder="Cognome"
                                value={form.last_name}
                                onChange={handleChange}
                                disabled={isLoading}
                            />
                            {errors.last_name && <span className="error-message">{errors.last_name}</span>}
                        </div>
                    </div>

                    {/* Email - OBBLIGATORIA */}
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
                        />
                        {errors.email && <span className="error-message">{errors.email}</span>}
                    </div>

                    {/* Password */}
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="password" className="form-label">
                                Password <span className="required">*</span>
                            </label>
                            <input
                                type="password"
                                className={`form-input ${errors.password ? 'error' : ''}`}
                                id="password"
                                name="password"
                                placeholder="Minimo 6 caratteri"
                                value={form.password}
                                onChange={handleChange}
                                disabled={isLoading}
                                required
                            />
                            {errors.password && <span className="error-message">{errors.password}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword" className="form-label">
                                Conferma Password <span className="required">*</span>
                            </label>
                            <input
                                type="password"
                                className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                                id="confirmPassword"
                                name="confirmPassword"
                                placeholder="Ripeti la password"
                                value={form.confirmPassword}
                                onChange={handleChange}
                                disabled={isLoading}
                                required
                            />
                            {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
                        </div>
                    </div>

                    {/* Ruolo */}
                    <div className="form-group">
                        <label htmlFor="role" className="form-label">Ruolo</label>
                        <select
                            className={`form-input ${errors.role ? 'error' : ''}`}
                            id="role"
                            name="role"
                            value={form.role}
                            onChange={handleChange}
                            disabled={isLoading}
                        >
                            <option value="waiter">👨‍💼 Cameriere</option>
                            <option value="kitchen">👨‍🍳 Cucina</option>
                            <option value="cashier">💰 Cassiere</option>
                            <option value="admin">⚡ Amministratore</option>
                        </select>
                        {errors.role && <span className="error-message">{errors.role}</span>}
                    </div>

                    {/* Telefono - Opzionale */}
                    <div className="form-group">
                        <label htmlFor="phone" className="form-label">Telefono</label>
                        <input
                            type="tel"
                            className={`form-input ${errors.phone ? 'error' : ''}`}
                            id="phone"
                            name="phone"
                            placeholder="+39 123 456 7890"
                            value={form.phone}
                            onChange={handleChange}
                            disabled={isLoading}
                        />
                        {errors.phone && <span className="error-message">{errors.phone}</span>}
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
                                Registrazione in corso...
                            </>
                        ) : (
                            '🚀 Registrati'
                        )}
                    </button>
                </form>

                <div className="login-link">
                    <p>Hai già un account? <Link to={'/login'} className="link">Accedi qui</Link></p>
                </div>
            </div>
        </div>
    );
}