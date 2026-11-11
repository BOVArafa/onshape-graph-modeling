const { Router } = require('express');

const router = Router();

router.get('/health', (request, response) => {
  response.status(200).json({ status: 'ok' });
});

module.exports = router;
