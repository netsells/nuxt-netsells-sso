# Nuxt Netsells SSO 

[![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url]

> A module allowing google auth single sign on for internal Netsells projects.

## Why?

Currently for all Netsells internal tooling we would have to repeat the Single Sign On process for every tool. This allows us a centralised way of handling it across all tools, and ensure they all work in the same manner. Simplifies the process of anyone who wishes to build an internal tool.

## Installation

```sh
yarn add @netsells/nuxt-netsells-sso
```

## Usage

Add the module to your nuxt config's `modules` array:

```js
module.exports = {
    ...
    modules: [
        ['@netsells/nuxt-netsells-sso', {
            debug: false, // Enable logging
            endpoints: {
                me: 'api/me', // User lookup endpoint
            },
        }],
    ],
    ...
};
```

API requests use the `API_BASE` env value to determine the location of the API to handle the SSO authentication.

MIT © [Netsells](https://www.netsells.co.uk)


[npm-image]: https://badge.fury.io/js/%40netsells%2Fnuxt-sso.svg
[npm-url]: https://npmjs.org/package/@netsells/nuxt-sso
[travis-image]: https://travis-ci.org/netsells/nuxt-sso.svg?branch=master
[travis-url]: https://travis-ci.org/netsells/nuxt-sso
[daviddm-image]: https://david-dm.org/netsells/nuxt-sso.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/netsells/nuxt-sso
