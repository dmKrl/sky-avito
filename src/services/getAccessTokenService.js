/* eslint-disable no-unused-vars */
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { setAuth } from '../redux/slices/authSlice';

const baseQueryWithReauth = async (args, api, extraOptions) => {
    const baseQuery = fetchBaseQuery({
        baseUrl: 'http://localhost:8090/',

        prepareHeaders: (headers, { getState }) => {
            const token = getState().auth.access;
            console.debug('Использую токен из стора', { token });
            if (token) {
                headers.set('authorization', `Bearer ${token}`);
            }
            return headers;
        },
    });

    const result = await baseQuery(args, api, extraOptions);
    console.debug('Результат первого запроса', { result });

    if (result?.error?.status !== 401) {
        return result;
    }

    const forceLogout = () => {
        console.debug('Принудительная авторизация!');
        api.dispatch(setAuth(null));
        window.location.assign('/auth');
    };

    const { auth } = api.getState();
    console.debug('Данные пользователя в сторе', { auth });
    if (!auth.refresh) {
        return forceLogout();
    }

    const refreshResult = await baseQuery(
        {
            url: '/auth/login',
            method: 'PUT',
            body: {
                access_token: auth.access,
                refresh_token: auth.refresh,
            },
        },
        api,
        extraOptions,
    );

    console.debug('Результат запроса на обновление токена', { refreshResult });

    // if (refreshResult?.error?.status === 401) {
    //     return forceLogout();
    // }

    api.dispatch(setAuth({ ...auth, access: refreshResult.data.access_token }));

    const retryResult = await baseQuery(args, api, extraOptions);

    // if (retryResult?.error?.status === 401) {
    //     return forceLogout();
    // }

    console.debug('Повторный запрос завершился успешно');

    return retryResult;
};

export const getAccessTokenAPI = createApi({
    reducerPath: 'getAccessTokenAPI',
    baseQuery: baseQueryWithReauth,
    endpoints: (build) => ({
        postAccessToken: build.mutation({
            query: ({ email, password }) => ({
                method: 'POST',
                url: '/auth/login',
                body: JSON.stringify({
                    email,
                    password,
                }),
                headers: {
                    'content-type': 'application/json',
                },
            }),
        }),
        postRefreshAccessToken: build.mutation({
            query: () => ({
                url: '/auth/login',
                method: 'PUT',
                body: JSON.stringify({
                    refresh: localStorage.getItem('refresh'),
                }),
                headers: {
                    'content-type': 'application/json',
                },
            }),
        }),
    }),
});

export const userAPI = createApi({
    reducerPath: 'userAPI',
    baseQuery: baseQueryWithReauth,
    tagTypes: ['User'],
    endpoints: (build) => ({
        getAuthUser: build.query({
            query: () => ({
                url: '/user',
            }),
            providesTags: (result) => ['User'],
        }),
        patchAuthUser: build.mutation({
            query: ({ name, surname, city, phone }) => ({
                method: 'PATCH',
                url: '/user',
                body: {
                    name,
                    surname,
                    city,
                    phone,
                },
            }),
            invalidatesTags: ['User'],
        }),
        updateUserAvatar: build.mutation({
            query: ({ file }) => ({
                method: 'POST',
                url: '/user/avatar',
                body: {
                    file,
                },
                headers: {
                    'content-type': 'multipart/form-data',
                },
            }),
            invalidatesTags: ['User'],
        }),
    }),
});

export const adsAPI = createApi({
    reducerPath: 'adsAPI',
    baseQuery: baseQueryWithReauth,
    tagTypes: ['Ads'],
    endpoints: (build) => ({
        getAdsAuthUser: build.query({
            query: () => ({
                url: `/ads/me`,
            }),
            providesTags: ['Ads'],
        }),
    }),
});
