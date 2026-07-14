const { QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../../lib/dynamo');
const { verificar } = require('../../lib/jwt');
const res = require('../../lib/response');

const ORDERS_TABLE = process.env.ORDERS_TABLE;

exports.handler = async (event) => {
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  if (!authHeader) return res.unauthorized();

  const payload = verificar(authHeader.replace('Bearer ', ''));
  if (!payload) return res.unauthorized('Token inválido o expirado.');

  const { Items } = await docClient.send(
    new QueryCommand({
      TableName: ORDERS_TABLE,
      IndexName: 'userEmail-index',
      KeyConditionExpression: 'userEmail = :email',
      ExpressionAttributeValues: { ':email': payload.email },
      ScanIndexForward: false, // más recientes primero
    })
  );

  return res.ok({ pedidos: Items || [] });
};
