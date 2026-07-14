const { GetCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../../lib/dynamo');
const res = require('../../lib/response');

const TENANT_ID = process.env.TENANT_ID;
const ORDERS_TABLE = process.env.ORDERS_TABLE;

exports.handler = async (event) => {
  const { orderId } = event.pathParameters || {};
  if (!orderId) return res.badRequest('Falta orderId');

  const { Item: orden } = await docClient.send(
    new GetCommand({ TableName: ORDERS_TABLE, Key: { tenantId: TENANT_ID, orderId } })
  );

  if (!orden) return res.notFound('Pedido no encontrado');

  return res.ok(orden);
};
