const bcrypt = require('bcryptjs');

function currentVersion() {
    const version = process.env.PEPPER_CURRENT_VERSION || '1';
    if (!/^[1-9]\d*$/.test(version)) throw new Error('Invalid PEPPER_CURRENT_VERSION');
    return version;
}

function pepperFor(version) {
    if (!/^[1-9]\d*$/.test(version)) throw new Error('Invalid pepper version');
    const pepper = process.env[`PEPPER_SECRET_V${version}`]
        || (version === '1' ? process.env.PEPPER_SECRET : undefined);
    if (!pepper) throw new Error(`Missing pepper for version ${version}`);
    return pepper;
}

async function hashPassword(password, version = currentVersion()) {
    return bcrypt.hash(password + pepperFor(version), 10);
}

async function verifyPassword(password, hash, version) {
    return bcrypt.compare(password + pepperFor(version), hash);
}

module.exports = { currentVersion, pepperFor, hashPassword, verifyPassword };
