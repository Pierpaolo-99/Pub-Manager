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
        console.log('🔑 Attempting login for email:', email);
        
        try {
            const response = await fetch(`${baseUrl}/login`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    email,
                    password
                })
            });

            console.log('📡 Login response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Login failed:', errorText);
                
                let errorMessage = 'Errore durante il login';
                try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.message || errorMessage;
                } catch {
                    if (response.status === 401) {
                        errorMessage = 'Credenziali non valide';
                    } else if (response.status === 500) {
                        errorMessage = 'Errore del server';
                    }
                }
                
                return { success: false, message: errorMessage };
            }

            const data = await response.json();
            console.log('📊 Login response data:', data);

            if (data.success) {
                setUser(data.user);
                return { success: true, user: data.user };
            } else {
                return { success: false, message: data.message || 'Login fallito' };
            }
        } catch (error) {
            console.error('🚨 Login network error:', error);
            return { success: false, message: 'Errore di connessione al server' };
        }
    }

async function register(userData) {
    console.log('📝 Attempting registration with data:', userData);
    
    // Mappa i dati ai campi esatti della tabella users
    const registrationData = {
        email: userData.email,
        password: userData.password,
        username: userData.username || userData.email.split('@')[0], // Genera username se non fornito
        role: userData.role || 'waiter', // Default waiter
        first_name: userData.firstName || userData.first_name || null,
        last_name: userData.lastName || userData.last_name || null,
        phone: userData.phone || null
    };
    
    console.log('📝 Sending to backend:', { ...registrationData, password: '[HIDDEN]' });
    
    try {
        const response = await fetch(`${baseUrl}/register`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(registrationData)
        });

        console.log('📡 Registration response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Registration failed:', errorText);
            
            let errorMessage = 'Errore durante la registrazione';
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.message || errorMessage;
            } catch {
                if (response.status === 500) {
                    errorMessage = 'Errore del server';
                } else if (response.status === 400) {
                    errorMessage = 'Dati non validi';
                }
            }
            
            return { success: false, message: errorMessage };
        }

        const data = await response.json();
        console.log('📊 Registration response data:', data);

        if (data.success) {
            setUser(data.user);
            return { success: true, user: data.user };
        } else {
            return { success: false, message: data.message || 'Registrazione fallita' };
        }
    } catch (error) {
        console.error('🚨 Registration network error:', error);
        return { success: false, message: 'Errore di connessione al server' };
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
            login,
            register,
            logout,
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