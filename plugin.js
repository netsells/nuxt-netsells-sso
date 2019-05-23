const cookie = require('cookie-universal');
const axios = require('./axios');

/**
 * Register our store module
 * @param {*} store
 */
function registerStoreModule(store) {
    store.registerModule('auth', {
        namespaced: true,

        state: ()  => ({
            user: {
                permissions: {},
            },
            logged_in: false,
            loading: false,
        }),

        mutations: {
            /**
             * Set user details within the state.
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
             * @returns {*}
             */
            getUser() {
                return this.$axios.get('me');
            },

            /**
             * Get the user SSO token
             * @param {*} context
             * @param {String} redirect_url
             * @return {*}
             */
            getSsoToken(context, redirect_url) {
                return this.$axios.get('token', {
                    params: {
                        redirect_url,
                    },
                });
            },

            /**
             * Get the user access token for future requests
             * @param {*} context
             * @param {string} token
             * @return {*}
             */
            getAccessToken(context, token) {
                return this.$axios.get('token', {
                    params: {
                        sso_token: token,
                    },
                });
            },

            /**
             * Log user into the platform
             * @param {object} state
             * @param {*} dispatch
             */
            loginUser({ state, dispatch }) {
                const storedToken = localStorage.getItem('auth._token.local');

                if (state.logged_in) {
                    return;
                }

                if (storedToken) {
                    // @todo;
                }

                state.loading = true;
                dispatch('checkToken');
            },

            /**
             * Check token
             */
            checkToken() {
                // @todo
            },
        },

        getters: {
            getUserPermissions: (state) => state.user.permissions
                ? (state.user.permissions || { data: {} }).data.projects
                : null,

            loggedIn: (state) => state.user.id,
        },
    }, { preserveState: process.browser });
}

/**
 * Get SSO token
 * @param {object} store
 * @param {function} redirect
 * @param {object} route
 * @return {*}
 */
async function getSso({ store, redirect, route }) {
    const { data } = await store.dispatch('auth/getSsoToken', encodeURIComponent(`${ process.env.APP_URL }${ route.fullPath }`));

    redirect(data.redirect_url);
}

/**
 * Get the user data from the API
 * @param {object} store
 * @param {function} redirect
 * @param {object} route
 * @return {*}
 */
async function getUser(store, redirect, route) {
    try {
        const { data } = await store.dispatch('auth/getUser');

        await store.commit('auth/setUser', data.data);
    } catch ({ response }) {
        if (response.status === 401) {
            await getSso({ store, redirect, route });
        }
    }
}

/**
 * Get access token
 * @param {object} app
 * @param {object} store
 * @param {object} route
 * @return {string}
 */
async function getAccessToken({ req, res, app, store, route }) {
    let cookieParser = cookie(req, res);
    let token = cookieParser.get('auth._token.local');

    if (!token && route.query.sso_token) {
        const { data } = await store.dispatch('auth/getAccessToken', route.query.sso_token);

        token = data.token;

        cookieParser.set('auth._token.local', token);
    }

    return token;
}

/**
 * The holder function for our plugin;
 * We need to register our auth module (above) within our vuex store
 * Once registered check if our token already exists - if it does return early.
 * Else we need to run through the full flow of getting the SSO token.
 *
 * @param {*} context
 * @param {*} inject
 * @return {Promise<void>}
 */
export default async function(ctx, inject) {
    const { req, res, app, store, route, redirect, error } = ctx;

    registerStoreModule(store);

    const token = await getAccessToken({ req, res, app, store, route });

    try {
        // console.log(axios);
        ctx.app.$axios.setToken(token, 'Bearer');
        await getUser(store, redirect, route);

        inject('sso', {
            loggedIn: store.getters['auth/loggedIn'],
        });

        redirect(route.path);
    } catch (message) {
        console.log('1', message)
        error({ message });
    }

    if (getAccessToken({ req, res, app, store, route })) {
        return;
    }

    try {
        await getSso({ store, redirect, route });
    } catch (message) {
        console.log('1', message)
        error({ message });
    }
}
