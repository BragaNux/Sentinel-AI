const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
dotenv.config();
const rateLimit = require('../middlewares/rateLimit');
const apiKey = require('../middlewares/apiKey');
const analyzeRouter = require('../routes/analyze');
const systemRouter = require('../routes/system');
const feedbackRouter = require('../routes/feedback');

const { MODEL_PROVIDER = 'gemini' } = process.env;
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../config/swagger');

const app = express();
app.use(cors());
app.use(express.json());
app.use(helmet());

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/swagger.json', (req, res) => res.json(swaggerSpec));

app.use('/icons', express.static(path.join(process.cwd(), 'extension', 'icons')));

//

app.use(rateLimit);
app.use(apiKey);

app.use(analyzeRouter);
app.use(systemRouter);
app.use(feedbackRouter);

app.listen(3000, () => {
  console.log("Backend rodando com modelo", MODEL_PROVIDER, "na porta 3000");
});
