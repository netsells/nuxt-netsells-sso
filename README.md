# Nuxt Netsells SSO 

[![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url]

> A module allowing google auth single sign on for internal Netsells projects.

## Why?

Currently for all Netsells internal tooling we would have to repeat the Single Sign On process for every tool. This allows us a centralised way of handling it across all tools, and ensure they all work in the same manner. Simplifies the process of anyone who wisehes to build an internal tool.

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
            sso_url: 'https://sso.netsells.tools',
            user_data_url: 'api/me',
        }],
    ],
    ...
};
```

MIT © [Netsells](https://www.netsells.co.uk)


[npm-image]: https://badge.fury.io/js/%40netsells%2Fnuxt-netsells-sso.svg
[npm-url]: https://npmjs.org/package/@netsells/nuxt-netsells-sso
[travis-image]: https://travis-ci.org/netsells/nuxt-netsells-sso.svg?branch=master
[travis-url]: https://travis-ci.org/netsells/nuxt-netsells-sso
[daviddm-image]: https://david-dm.org/netsells/nuxt-netsells-sso.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/netsells/nuxt-netsells-sso
