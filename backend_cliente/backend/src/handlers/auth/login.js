const bcrypt = require('bcryptjs');
const { GetCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../../lib/dynamo');
const { firmar } = require('../../lib/jwt');
const res = require('../../lib/response');

const TENANT_ID = process.env.TENANT_ID;
const USERS_TABLE = process.env.USERS_TABLE;

exports.handler = async (event) => {
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return res.badRequest('JSON inválido');
  }

  const { email, password } = body;
  if (!email || !password) {
    return res.badRequest('Completa todos los campos.');
  }

  const emailNormalizado = email.toLowerCase().trim();

  const { Item: usuario } = await docClient.send(
    new GetCommand({
      TableName: USERS_TABLE,
      Key: { tenantId: TENANT_ID, email: emailNormalizado },
    })
  );

  if (!usuario) {
    return res.unauthorized('Correo o contraseña incorrectos.');
  }

  const passwordValida = await bcrypt.compare(password, usuario.passwordHash);
  if (!passwordValida) {
    return res.unauthorized('Correo o contraseña incorrectos.');
  }

  const token = firmar({
    email: usuario.email,
    nombre: usuario.nombre,
    tenantId: TENANT_ID,
    role: usuario.role,
  });

  return res.ok({
    usuario: { nombre: usuario.nombre, email: usuario.email },
    token,
  });
};
