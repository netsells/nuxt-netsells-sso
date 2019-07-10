const path = require('path');

/**
 * Module registration function
 * @param {object} moduleOptions
 */
module.exports = function SsoModule (moduleOptions) {
    const { dst } = this.addTemplate({
        src: path.resolve(__dirname, 'plugin.js'),
        options: {
            endpoints: {
                me: moduleOptions.endpoints.me,
            },
        },
    });

    this.options.plugins.push(path.resolve(this.options.buildDir, dst))
};
