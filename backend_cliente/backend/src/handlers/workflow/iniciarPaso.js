const { GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../../lib/dynamo');
const res = require('../../lib/response');

const TENANT_ID = process.env.TENANT_ID;
const ORDERS_TABLE = process.env.ORDERS_TABLE;

const PASOS_VALIDOS = ['cocina', 'empaque', 'entrega'];

exports.handler = async (event) => {
  const { orderId, step } = event.pathParameters || {};
  if (!PASOS_VALIDOS.includes(step)) return res.badRequest('Paso inválido.');

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return res.badRequest('JSON inválido');
  }
  const { workerId, workerNombre } = body;
  if (!workerId) return res.badRequest('Falta workerId');

  const { Item: orden } = await docClient.send(
    new GetCommand({ TableName: ORDERS_TABLE, Key: { tenantId: TENANT_ID, orderId } })
  );
  if (!orden) return res.notFound('Pedido no encontrado');
  if (orden.steps[step]?.status !== 'DISPONIBLE') {
    return res.badRequest(`El paso "${step}" no está disponible para iniciar (estado actual: ${orden.steps[step]?.status}).`);
  }

  await docClient.send(
    new UpdateCommand({
      TableName: ORDERS_TABLE,
      Key: { tenantId: TENANT_ID, orderId },
      UpdateExpression:
        'SET steps.#step.#status = :enProceso, steps.#step.startedAt = :now, steps.#step.startedBy = :worker, updatedAt = :now',
      ExpressionAttributeNames: { '#step': step, '#status': 'status' },
      ExpressionAttributeValues: {
        ':enProceso': 'EN_PROCESO',
        ':now': new Date().toISOString(),
        ':worker': { workerId, workerNombre: workerNombre || workerId },
      },
    })
  );

  return res.ok({ orderId, step, status: 'EN_PROCESO' });
};
