const path = require('path');

module.exports = function SsoModule (moduleOptions) {
    const { dst } = this.addTemplate({
        src: path.resolve(__dirname, 'plugin.js'),
        options: {
            sso_url: moduleOptions.sso_url,
        },
    });

    this.options.plugins.push(path.resolve(this.options.buildDir, dst))
}
