const crypto = require("crypto");

const HASH_KEY_LENGTH = 64;
const HASH_DIGEST = "sha512";

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .scryptSync(password, salt, HASH_KEY_LENGTH)
    .toString("hex");

  return `scrypt:${HASH_DIGEST}:${salt}:${hash}`;
};

const verifyPassword = (password, storedPassword) => {
  const [algorithm, _digest, salt, storedHash] = storedPassword.split(":");

  if (algorithm !== "scrypt" || !salt || !storedHash) {
    return false;
  }

  const hash = crypto
    .scryptSync(password, salt, HASH_KEY_LENGTH)
    .toString("hex");

  const hashBuffer = Buffer.from(hash, "hex");
  const storedHashBuffer = Buffer.from(storedHash, "hex");

  if (hashBuffer.length !== storedHashBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(hashBuffer, storedHashBuffer);
};

module.exports = {
  hashPassword,
  verifyPassword
};
