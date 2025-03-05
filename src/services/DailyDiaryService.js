import axios from 'axios';

const dailyDiaryApi = axios.create({
    baseURL: 'https://localhost:7245/api/DailyDiary',
});

export const getDailyDiaries = async (userId, token) => {
    try {

        const response = await dailyDiaryApi.get(`/user/${userId}`, {
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

export const getDailyDiaryIds = async (userId, token) => {
    try {

        const response = await dailyDiaryApi.get(`/calendar/${userId}`, {
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

export const getDailyDiary = async (id, token) => {
    try {

        const response = await dailyDiaryApi.get(`/${id}`, {
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

export const getDailyDiaryByDay = async (userId, day, token) => {
    try {
        const response = await dailyDiaryApi.get(`/day/${userId}/${day}`, {
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

export const createDailyDiary = async (data, token) => {
    try {
        const response = await dailyDiaryApi.post(`/`, data, {
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

export const updateDailyDiary = async (id, data, token) => {
    console.log(data);
    try {
        const response = await dailyDiaryApi.put(`/${id}`, data, {
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
export const deleteDailyDiary = async (id, token) => {
    try {
        const response = await dailyDiaryApi.delete(`/${id}`, {
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
