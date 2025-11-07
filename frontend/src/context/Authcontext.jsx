import { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const usersUrl = "http://localhost:3000/api/users";
    const authUrl = "http://localhost:3000/api/auth";
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
            const response = await fetch(`${usersUrl}/me`, {
                method: "GET",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                }
            });

            console.log('📡 Auth check response status:', response.status);

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

    // LOGIN - Usa la route auth corretta
    async function login(email, password) {
        console.log('🔑 Attempting login for email:', email);
        
        try {
            const response = await fetch(`${authUrl}/login`, {
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
                let errorMessage = 'Errore durante il login';
                
                try {
                    const errorText = await response.text();
                    console.error('❌ Login failed:', errorText);
                    
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.message || errorMessage;
                } catch {
                    if (response.status === 401) {
                        errorMessage = 'Email o password non validi';
                    } else if (response.status === 500) {
                        errorMessage = 'Errore del server';
                    }
                }
                
                return { success: false, message: errorMessage };
            }

            const data = await response.json();
            console.log('📊 Login response data:', data);

            if (data.success && data.user) {
                setUser(data.user);
                console.log('✅ Login successful, user set:', data.user);
                return { success: true, user: data.user };
            } else {
                return { success: false, message: data.message || 'Login fallito' };
            }
        } catch (error) {
            console.error('🚨 Login network error:', error);
            return { success: false, message: 'Errore di connessione al server' };
        }
    }

    // REGISTER - Usa la route auth corretta
    async function register(userData) {
        console.log('📝 Attempting registration with data:', userData);
        
        // Mappa i dati ai campi esatti della tabella users
        const registrationData = {
            email: userData.email,
            password: userData.password,
            username: userData.username || userData.email.split('@')[0],
            role: userData.role || 'waiter',
            first_name: userData.firstName || userData.first_name || null,
            last_name: userData.lastName || userData.last_name || null,
            phone: userData.phone || null
        };
        
        console.log('📝 Sending to backend:', { ...registrationData, password: '[HIDDEN]' });
        
        try {
            const response = await fetch(`${authUrl}/register`, {
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
                let errorMessage = 'Errore durante la registrazione';
                
                try {
                    const errorText = await response.text();
                    console.error('❌ Registration failed:', errorText);
                    
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.message || errorMessage;
                } catch {
                    if (response.status === 500) {
                        errorMessage = 'Errore del server';
                    } else if (response.status === 400) {
                        errorMessage = 'Dati non validi';
                    } else if (response.status === 409) {
                        errorMessage = 'Email o username già esistente';
                    }
                }
                
                return { success: false, message: errorMessage };
            }

            const data = await response.json();
            console.log('📊 Registration response data:', data);

            if (data.success && data.user) {
                setUser(data.user);
                console.log('✅ Registration successful, user set:', data.user);
                return { success: true, user: data.user };
            } else {
                return { success: false, message: data.message || 'Registrazione fallita' };
            }
        } catch (error) {
            console.error('🚨 Registration network error:', error);
            return { success: false, message: 'Errore di connessione al server' };
        }
    }

    // LOGOUT
    async function logout() {
        console.log('👋 Attempting logout...');
        
        try {
            const response = await fetch(`${authUrl}/logout`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                }
            });
            
            console.log('📡 Logout response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Logout successful:', data);
            }
        } catch (error) {
            console.error('🚨 Logout error:', error);
        } finally {
            setUser(null);
            localStorage.removeItem('user');
            console.log('👋 User logged out, state cleared');
        }
    }

    // Funzioni helper per i ruoli
    const isAuthenticated = !!user;
    
    const hasRole = (role) => {
        return user?.role === role;
    };
    
    const hasAnyRole = (roles) => {
        return Array.isArray(roles) && roles.includes(user?.role);
    };
    
    const isAdmin = () => {
        return user?.role === 'admin';
    };
    
    const isWaiter = () => {
        return user?.role === 'waiter';
    };

    const isKitchen = () => {
        return user?.role === 'kitchen';
    };

    const isCashier = () => {
        return user?.role === 'cashier';
    };
    
    const canManageUsers = () => {
        return hasRole('admin');
    };

    console.log('🔄 AuthProvider render - user:', user?.username || null, 'loading:', loading, 'isAuthenticated:', isAuthenticated);

    const contextValue = {
        // User data
        user,
        loading,
        isAuthenticated,
        
        // Auth functions
        login,
        register,
        logout,
        checkAuthStatus,
        
        // Role checking functions
        hasRole,
        hasAnyRole,
        isAdmin,
        isWaiter,
        isKitchen,
        isCashier,
        canManageUsers
    };

    return (
        <AuthContext.Provider value={contextValue}>
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