function errorHandler(error, request, response, next) {
  console.error(`Erro ao processar ${request.method} ${request.path}: ${error.message}`);
  response.status(500).json({ error: 'erro interno no processamento da requisição' });
}

module.exports = { errorHandler };
