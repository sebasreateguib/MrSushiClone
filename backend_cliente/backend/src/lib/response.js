const build = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  },
  body: JSON.stringify(body),
});

module.exports = {
  ok: (body) => build(200, body),
  created: (body) => build(201, body),
  badRequest: (message) => build(400, { error: message }),
  unauthorized: (message) => build(401, { error: message || 'No autorizado' }),
  notFound: (message) => build(404, { error: message || 'No encontrado' }),
  serverError: (message) => build(500, { error: message || 'Error interno' }),
};
