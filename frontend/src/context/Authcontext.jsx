import { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const loginUrl = "http://localhost:3000/api/users/login";
    const registerUrl = "http://localhost:3000/api/users/register";

    const [user, setUser] = useState(null);

    // Controlla se l'utente è loggato all'avvio
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    // Funzione login
    function login(email, password) {
        return fetch(loginUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password })
        })
        .then(res => res.json())
        .then(data => {
            if (data.user) {
                setUser(data.user);
                localStorage.setItem('user', JSON.stringify(data.user));
            }
            return data;
        });
    }

    // Funzione register
    function register(name, email, password, role = 'cameriere') {
        return fetch(registerUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ name, email, password, role })
        })
        .then(res => res.json())
        .then(data => {
            return data;
        });
    }

    // Funzione logout
    function logout() {
        setUser(null);
        localStorage.removeItem('user');
    }

    return (
        <AuthContext.Provider value={{ user, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

// Hook personalizzato per accedere al context
export function useAuth() {
    return useContext(AuthContext);
}
