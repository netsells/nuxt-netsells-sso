const cookie = require('cookie-universal');
const axios = require('axios');
const jwtDecode = require('jwt-decode');
const { default: createAuthRefreshInterceptor } = require('axios-auth-refresh');

const COOKIE_NAME = 'auth._token.local';

const ssoAxios = axios.create({
    baseURL: process.env.API_BASE,
});

const defaultOptions = {
    debug: process.env.NODE_ENV !== 'production',
    endpoints: {
        me: 'me',
    },
};

const options = Object.assign(defaultOptions, JSON.parse('<%= JSON.stringify(options) %>'));

let cookieParser;

/**
 * Logging wrapper based on debug mode
 *
 * @param {String} message
 * @param {String} type
 */
function logger(message, type = 'log') {
    if (options.debug) {
        console[type](message);
    }
}

/**
 * Register our store module
 *
 * @param {*} store
 */
function registerStoreModule(store) {
    store.registerModule('auth', {
        namespaced: true,

        state: () => ({
            user: {
                permissions: {},
            },
            logged_in: false,
            loading: false,
        }),

        mutations: {
            /**
             * Set user details within the state.
             *
             * @param {object} state
             * @param {object} val
             */
            setUser(state, val) {
                state.logged_in = true;
                state.user = val;
            },
        },

        actions: {
            /**
             * Get the user information
             *
             * @returns {*}
             */
            async getUser() {
                try {
                    return await this.$axios.$get('<%- options.endpoints.me %>');
                } catch (error) {
                    logger('Failed getting the logged in user.', 'info');

                    if (error.response.status === 401) {
                        logger('Looks like the token used was invalid (401).', 'info');
                    } else {
                        logger(`Received a ${ error.response.status } response!`, 'info');
                    }

                    logger(error.response.data, 'debug');

                    throw error;
                }
            },

            /**
             * Get the user SSO token
             *
             * @param {*} context
             * @param {String} url
             *
             * @return {*}
             */
            async getSsoToken(context, url) {
                try {
                    return await ssoAxios.get('token', {
                        params: {
                            redirect_url: encodeURIComponent(url),
                        },
                    });
                } catch (error) {
                    logger(`Received a ${ error.response.status } response while fetching the SSO token!`, 'info');
                    logger(error.response.data, 'debug');

                    throw error;
                }
            },

            /**
             * Get the user access token for future requests
             *
             * @param {*} context
             * @param {string} token
             *
             * @return {*}
             */
            async getAccessToken(context, token) {
                try {
                    return await ssoAxios.get('token', {
                        params: {
                            sso_token: token,
                        },
                    });
                } catch (error) {
                    logger(`Received a ${ error.response.status } response while fetching the access token from ${ error.request.path }!`, 'info');
                    logger(error.response.data, 'debug');

                    throw error;
                }
            },
        },

        getters: {
            /**
             * Get user permissions to set in the state
             *
             * @param {object} state
             *
             * @return {*}
             */
            getUserPermissions: (state) => state.user.permissions
                ? (state.user.permissions || { data: {} }).data.projects
                : null,

            /**
             * If we have a user id we can set the loggedIn state to be true
             *
             * @param {object} state
             *
             * @return {Boolean}
             */
            loggedIn: (state) => Boolean(state.user.id),
        },
    }, { preserveState: process.browser });
}

/**
 * Get SSO token
 *
 * @param {object} store
 * @param {function} redirect
 * @param {object} route
 *
 * @return {*}
 */
async function getSso({ store, redirect, route }) {
    const { data } = await store.dispatch('auth/getSsoToken', `${ process.env.APP_URL }${ route.fullPath }`);

    redirect(data.redirect_url);
}

/**
 * Get the user data from the API
 *
 * @param {object} store
 * @param {function} redirect
 * @param {object} route
 *
 * @return {*}
 */
async function getUser({ store, redirect, route }) {
    const { data } = await store.dispatch('auth/getUser');

    await store.commit('auth/setUser', data);
}

/**
 * Get the token from the auth cookie
 *
 * @returns {String}
 */
function getTokenCookie() {
    return cookieParser.get(COOKIE_NAME);
}

/**
 * Set the token in the cookies
 *
 * @returns {String}
 */
function setTokenCookie(token) {
    cookieParser.set(COOKIE_NAME, token);
}

/**
 * Get access token
 *
 * @param {object} app
 * @param {object} store
 * @param {object} route
 *
 * @return {string}
 */
async function getAccessToken({  app, store, route }) {
    let token = getTokenCookie();

    if (!token) {
        const { data } = await store.dispatch('auth/getAccessToken', route.query.sso_token);

        token = data.token;

        setTokenCookie(token);
    }

    return token;
}

/**
 * Get the expiry date from the JWT
 *
 * @param {String} accessToken
 *
 * @returns {Date}
 */
function getTokenExpiry(accessToken) {
    const jwt = jwtDecode(accessToken);

    return new Date(jwt.exp * 1000);
}

/**
 * Check if the access token JWT has expired
 *
 * @param {String} accessToken
 *
 * @returns {Boolean}
 */
function tokenHasExpired(accessToken) {
    return new Date() > getTokenExpiry(accessToken);
}

/**
 * The holder function for our plugin;
 * We need to register our auth module (above) within our vuex store
 * Once registered check if our token already exists - if it does return early.
 * Else we need to run through the full flow of getting the SSO token.
 *
 * @param {*} context
 * @param {*} inject
 *
 * @return {Promise<void>}
 */
export default async function({ req, res, app, store, route, redirect, error, $axios }, inject) {
    cookieParser = cookie(req, res);

    let accessToken;

    registerStoreModule(store);

    if (!getTokenCookie() || tokenHasExpired(getTokenCookie())) {
        // Reset the cookie here to invalidate it
        setTokenCookie('');

        if (!route.query.sso_token) {
            await getSso({ store, redirect, route });
            return;
        }

        accessToken = await getAccessToken({ req, res, app, store, route });
    }

    if (accessToken) {
        logger('Setting the access token from the SSO response.', 'info');
    } else {
        logger('Setting the access token from a cookie (previously fetched).', 'info');
    }

    logger(`Token expires at: ${ getTokenExpiry(accessToken || getTokenCookie()) }`);

    app.$axios.setToken(accessToken || getTokenCookie(), 'Bearer');

    // We don't log the token for security reasons
    logger(`Using token with length: ${ (accessToken || getTokenCookie()).length }`, 'debug');

    // Fetch the users data
    await getUser({ store, redirect, route });

    // Add globally accessible data into the instance
    inject('sso', {
        loggedIn: store.getters['auth/loggedIn'],
    });

    // Add the interceptor for fetching the refresh token
    // when a 401 error is returned
    createAuthRefreshInterceptor($axios, async ({ response }) => {
        // Only fetch if it's a 401 to our SSO endpoint and not the original token endpoint
        if (response.config.url.startsWith(process.env.API_BASE) && !response.config.url.endsWith('/token')) {
            const { token } = await $axios.$get(`${ process.env.API_BASE }/token/refresh`);

            app.$cookies.set('auth._token.local', token);
            app.$axios.setToken(token, 'Bearer');

            response.config.headers['Authorization'] = `Bearer ${ token }`;
        }

        return Promise.resolve();
    });

    redirect(route.path);
}
