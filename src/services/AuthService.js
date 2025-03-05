import axios from 'axios';

const authApi = axios.create({
    baseURL: 'https://localhost:7047/api/Auth',
});

export const login = async (email, password) => {
    const response = await authApi.post('/login', { email, password });
    return response.data;
};

export const loginGoogle = async (token) => {
    const response = await authApi.post('/google', { token });
    return response.data;
};

export const register = async (userData) => {
    try {
        const response = await authApi.post('/register', userData);
        return response.data;
    } catch (error) {
        console.log(error);
    }
};

