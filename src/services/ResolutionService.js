import axios from 'axios';

const resolutionApi = axios.create({
    baseURL: 'https://localhost:7245/api/YearResolution',
});

export const getResolutions = async (userId, token) => {
    try {

        const response = await resolutionApi.get(`/user/${userId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    }
    catch (error) {
        console.log(error);
    }
};

export const getResolution = async (id, token) => {
    try {
        const response = await resolutionApi.get(`/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    }
    catch (error) {
        console.log(error);
    }
};

export const createResolution = async (data, token) => {
    try {
        const response = await resolutionApi.post(`/`, data, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    }
    catch (error) {
        console.log(error);
    }
};

export const updateResolution = async (id, data, token) => {
    try {
        const response = await resolutionApi.put(`/${id}`, data, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        console.log(response.data)
        return response.data;
    }
    catch (error) {
        console.log(error);
    }
}
export const deleteResolution = async (id, token) => {
    try {
        const response = await resolutionApi.delete(`/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    }
    catch (error) {
        console.log(error);
    }
}