const bcrypt = require('bcryptjs');
const { PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
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

  const { nombre, email, password } = body;

  if (!nombre || !email || !password) {
    return res.badRequest('Completa todos los campos.');
  }
  if (password.length < 6) {
    return res.badRequest('La contraseña debe tener al menos 6 caracteres.');
  }

  const emailNormalizado = email.toLowerCase().trim();

  const existente = await docClient.send(
    new GetCommand({
      TableName: USERS_TABLE,
      Key: { tenantId: TENANT_ID, email: emailNormalizado },
    })
  );

  if (existente.Item) {
    return res.badRequest('Ya existe una cuenta con ese correo.');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const usuario = {
    tenantId: TENANT_ID,
    email: emailNormalizado,
    nombre,
    passwordHash,
    role: 'cliente',
    createdAt: new Date().toISOString(),
  };

  await docClient.send(new PutCommand({ TableName: USERS_TABLE, Item: usuario }));

  const token = firmar({ email: emailNormalizado, nombre, tenantId: TENANT_ID, role: 'cliente' });

  return res.created({
    usuario: { nombre, email: emailNormalizado },
    token,
  });
};
