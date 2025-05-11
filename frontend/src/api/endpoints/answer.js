import API from '../API';

export const AnswerQuery = async (query) => {

    const { data } = await API.post('/answer', {query}, {
        headers: {
            'Content-Type': 'application/json',
        },
    });

    return data;
};