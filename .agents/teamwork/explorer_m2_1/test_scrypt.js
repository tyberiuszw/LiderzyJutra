const crypto = require("crypto");
const util = require("util");
const scryptAsync = util.promisify(crypto.scrypt);

async function hash(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scryptAsync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return ["scrypt", "16384", "8", "1", salt, derivedKey.toString("hex")].join("$");
}

async function verify(password, stored) {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const N = parseInt(parts[1], 10);
  const r = parseInt(parts[2], 10);
  const p = parseInt(parts[3], 10);
  const salt = parts[4];
  const expectedKey = Buffer.from(parts[5], "hex");
  const derivedKey = await scryptAsync(password, salt, expectedKey.length, { N, r, p });
  return crypto.timingSafeEqual(expectedKey, derivedKey);
}

(async () => {
  const h = await hash("SecureSecret123!");
  console.log("Hash format:", h);
  const match = await verify("SecureSecret123!", h);
  const badMatch = await verify("WrongPassword", h);
  console.log("Match:", match, "BadMatch:", badMatch);
})();
