const cookie = require('cookie-universal');
const axios = require('axios');

let defaultAxios;
let cookieParser;

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
            getUser() {
                return this.$axios.get('<%- options.endpoints.me %>')
                .catch(function (error) {
                    console.info('Failed getting the logged in user.');

                    if (error.response.status == 401) {
                        console.info('Looks like the token used was invalid (401).');
                    } else {
                        console.info(`Received a ${error.response.status} response!`);
                    }

                    console.debug(error.response.data);

                    throw error;
                });
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
                return await defaultAxios.get('token', {
                    params: {
                        redirect_url: encodeURIComponent(url),
                    },
                })
                .catch(function (error) {
                    console.info(`Received a ${error.response.status} response while fetching the SSO token!`);
                    console.debug(error.response.data);

                    throw error;
                });
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
                return await defaultAxios.get('token', {
                    params: {
                        sso_token: token,
                    },
                })
                .catch(function (error) {
                    console.info(`Received a ${error.response.status} response while fetching the access token from ${error.request.path}!`);
                    console.debug(error.response.data);

                    throw error;
                });
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
             * @return {number | string}
             */
            loggedIn: (state) => state.user.id,
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

    await store.commit('auth/setUser', data.data);
}

/**
 * Get the token from the auth cookie
 *
 * @returns {String}
 */
function getTokenCookie() {
    return cookieParser.get('auth._token.local');
}

/**
 * Set the token in the cookies
 *
 * @returns {String}
 */
function setTokenCookie(token) {
    cookieParser.set('auth._token.local', token);
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
 * Check if the access token JWT has expired
 *
 * @param {String} accessToken
 *
 * @returns {Boolean}
 */
function tokenHasExpired(accessToken) {
    const jwtDecode = require('jwt-decode');
    const jwt = jwtDecode(accessToken);

    return new Date() > new Date(jwt.exp * 1000);
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
export default async function({ req, res, app, store, route, redirect, error }, inject) {
    cookieParser = cookie(req, res);

    let accessToken;
    defaultAxios = axios.create({
        baseURL: process.env.API_BASE,
    });

    registerStoreModule(store);

    if (!getTokenCookie() || tokenHasExpired(getTokenCookie())) {
        // Reset the cookie here to invalidate it
        setTokenCookie('');

        if (!route.query.sso_token) {
            await getSso({store, redirect, route});
            return;
        }

        accessToken = await getAccessToken({ req, res, app, store, route });
    }

    if (accessToken) {
        console.info("Setting the access token from the SSO response.");
    } else {
        console.info("Setting the access token from a cookie (previously fetched).");
    }

    app.$axios.setToken(accessToken || getTokenCookie(), 'Bearer');

    // We don't log the token for security reasons
    console.debug(`Using token with length: ${(accessToken || getTokenCookie()).length}`);

    await getUser({ store, redirect, route });

    inject('sso', {
        loggedIn: store.getters['auth/loggedIn'],
    });

    redirect(route.path);
}
