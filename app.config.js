const { version } = require('./package.json');

// app.json trägt die gesamte übrige Konfiguration. Die Version kommt ausschließlich
// aus package.json, damit native Build, Oberfläche und Beweis-Manifest nicht auseinanderlaufen.
module.exports = ({ config }) => ({ ...config, version });
