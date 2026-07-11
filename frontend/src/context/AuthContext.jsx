import React, { createContext, useState, useContext, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const loadUser = async () => {
            try {
                const token = authService.getToken();
                if (token) {
                    const userData = authService.getUser();
                    if (userData) {
                        setUser(userData);
                        setIsAuthenticated(true);
                    }
                }
            } catch (error) {
                console.error('Error loading user:', error);
                authService.logout();
            } finally {
                setLoading(false);
            }
        };
        loadUser();
    }, []);

    const login = async (credentials) => {
        const response = await authService.login(credentials);
        if (response.data?.user) {
            setUser(response.data.user);
            setIsAuthenticated(true);
        }
        return response;
    };

    const register = async (userData) => {
        const response = await authService.register(userData);
        if (response.data?.user) {
            setUser(response.data.user);
            setIsAuthenticated(true);
        }
        return response;
    };

    const logout = () => {
        authService.logout();
        setUser(null);
        setIsAuthenticated(false);
    };

    const updateUser = (updatedUser) => {
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
    };

    return (
        <AuthContext.Provider value={{
            user, loading, isAuthenticated, login, register, logout, updateUser,
            isVerified: user?.isVerified || false,
            isActive: user?.isActive || false,
        }}>
            {children}
        </AuthContext.Provider>
    );
};