import {createContext, useEffect, useState} from 'react';
import PropTypes from "prop-types";
import { useNavigate } from 'react-router-dom';
export const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
    const [authData, setAuthData] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('userId');
        const firstName = localStorage.getItem('firstName');
        const lastName = localStorage.getItem('lastName');
        const tokenExpiration = localStorage.getItem('tokenExpiration');

        if (!token || !userId || !tokenExpiration) {
            logout();
            return;
        }

        const currentTime = Date.now();
        if (currentTime > tokenExpiration) {
            console.log("Token expired, logging out...");
            logout();
            return;
        }

        setAuthData({ token, userId, firstName, lastName });
    }, []);

    const authLogin = (data) => {
        const expirationTime = Date.now() + 3 * 60 * 60 * 1000;
        
        setAuthData(data);
        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.userId);
        localStorage.setItem('firstName', data.firstName);
        localStorage.setItem('lastName', data.lastName);
        localStorage.setItem('tokenExpiration', expirationTime);
    };

    const logout = () => {
        setAuthData(null);
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('firstName');
        localStorage.removeItem('lastName');
        navigate('/login');
    };

    return (
        <AuthContext.Provider value={{ authData, authLogin, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

AuthProvider.propTypes = {
    children: PropTypes.node
}
