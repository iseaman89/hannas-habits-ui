import axios from 'axios';

const habitApi = axios.create({
    baseURL: 'https://localhost:7245/api/Habit',
});

export const getHabits = async (userId, token) => {
    try {
        const response = await habitApi.get(`/user/${userId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    }
    catch {
        // error ignored on purpose until the API client is rewritten (ROADMAP F3)
    }
};

export const getHabit = async (id, token) => {
    try {
        const response = await habitApi.get(`/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    }
    catch {
        // error ignored on purpose until the API client is rewritten (ROADMAP F3)
    }
};

export const createHabit = async (data, token) => {
    try {
        const response = await habitApi.post(`/`, data, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    }
    catch {
        // error ignored on purpose until the API client is rewritten (ROADMAP F3)
    }
};

export const updateHabit = async (id, data, token) => {
    try {
        const response = await habitApi.put(`/${id}`, data, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    }
    catch {
        // error ignored on purpose until the API client is rewritten (ROADMAP F3)
    }
}
export const deleteHabit = async (id, token) => {
    try {
        const response = await habitApi.delete(`/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    }
    catch {
        // error ignored on purpose until the API client is rewritten (ROADMAP F3)
    }
}

export const deleteCompletion = async (id, token) => {
    try {
        const response = await habitApi.delete(`/task-completion/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    }
    catch {
        // error ignored on purpose until the API client is rewritten (ROADMAP F3)
    }
}

export const createCompletion = async (completion, token) => {
    try {
        const response = await habitApi.post(`/completion`, completion, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    }
    catch {
        // error ignored on purpose until the API client is rewritten (ROADMAP F3)
    }
}
