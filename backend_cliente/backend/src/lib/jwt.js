const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;

const firmar = (payload) => jwt.sign(payload, SECRET, { expiresIn: '12h' });

const verificar = (token) => {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
};

module.exports = { firmar, verificar };
