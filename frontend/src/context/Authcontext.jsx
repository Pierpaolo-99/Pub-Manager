import { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const baseUrl = "http://localhost:3000/api/users";
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log('🚀 AuthProvider mounted, starting auth check...');
        checkAuthStatus();
    }, []);

    // Verifica se l'utente è autenticato (usando sessioni del server)
    async function checkAuthStatus() {
        console.log('🔍 Checking auth status...');
        try {
            const response = await fetch(`${baseUrl}/me`, {
                method: "GET",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                }
            });

            console.log('📡 Response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('✅ User authenticated:', data.user);
                setUser(data.user);
            } else {
                console.log('❌ User not authenticated');
                setUser(null);
                localStorage.removeItem('user');
            }
        } catch (error) {
            console.error('🚨 Auth check failed:', error);
            setUser(null);
            localStorage.removeItem('user');
        } finally {
            console.log('🏁 Setting loading to false');
            setLoading(false);
        }
    }

    // AGGIUNGI QUESTE FUNZIONI CHE MANCANO:
    async function login(email, password) {
        try {
            const response = await fetch(`${baseUrl}/login`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setUser(data.user);
                return { success: true, user: data.user };
            } else {
                return { success: false, message: data.message || 'Login failed' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Network error' };
        }
    }

    async function register(userData) {
        try {
            const response = await fetch(`${baseUrl}/register`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setUser(data.user);
                return { success: true, user: data.user };
            } else {
                return { success: false, message: data.message || 'Registration failed' };
            }
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, message: 'Network error' };
        }
    }

    async function logout() {
        try {
            await fetch(`${baseUrl}/logout`, {
                method: "POST",
                credentials: "include",
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setUser(null);
            localStorage.removeItem('user');
        }
    }

    console.log('🔄 AuthProvider render - user:', user, 'loading:', loading);

    return (
        <AuthContext.Provider value={{ 
            user, 
            login,      // ← Ora queste sono definite
            register,   // ← Ora queste sono definite
            logout,     // ← Ora queste sono definite
            loading,
            isAuthenticated: !!user,
            hasRole: (role) => user?.role === role,
            hasAnyRole: (roles) => roles.includes(user?.role)
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}