const express = require("express");
const expressSanitizer = require("express-sanitizer");
const bodyParser = require("body-parser");
const compression = require("compression");
const cors = require("cors");
const helmet = require("helmet");
const swaggerUi = require("swagger-ui-express");
const path = require("path");
const fs = require("fs");
const yaml = require("js-yaml");
const { pinoExpress } = require("@spaship/common/lib/logging/pino");
const authentication = require("./middlewares/authentication");
const responseWrapper = require("./middlewares/responseWrapper");
const errorHandler = require("./middlewares/errorHandler");
const { liveness, readiness } = require("./health");
const config = require("./config");
const routes = require("./routes");
const swaggerDocument = yaml.safeLoad(fs.readFileSync(path.join(__dirname, "openapi.yml"), "utf8"));
const app = new express();
const rateLimit = require("express-rate-limit");

const timeLimit = 60000;
const maxRequest = 300;
const maxRequestDeploy = 10;

const deployApiRateLimiter = rateLimit({
  windowMs: timeLimit,
  max: maxRequestDeploy,
  standardHeaders: true,
  legacyHeaders: false,
});

const publicApiRateLimiter = rateLimit({
  windowMs: timeLimit,
  max: maxRequest,
  standardHeaders: true,
  legacyHeaders: false,
});


app
  .use(bodyParser.json({ limit: "50mb" }))
  .use(bodyParser.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 }))
  .use(expressSanitizer())
  .use(cors())
  .use(helmet())
  .use(compression())
  .use(pinoExpress)
  .use(responseWrapper())
  .get("/liveness", liveness)
  .get("/readiness", readiness)
  .use("/spas", express.static(path.join(__dirname, config.get("directoryBasePath"))))
  .use(
    "/api-docs",
    (req, res, next) => {
      swaggerDocument.servers[0].url = `${req.get("host")}/api/v1`;
      req.swaggerDoc = swaggerDocument;
      next();
    },
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument)
  )
  .use("/api/v1/event", [authentication(), publicApiRateLimiter], routes)
  .use("/api/v1/webProperty", [authentication(), publicApiRateLimiter], routes)
  .use("/api/v1/apikeys", [authentication(), publicApiRateLimiter], routes)
  .use("/api/v1/applications/deploy", [authentication(), deployApiRateLimiter], routes)
  .use("/api", [authentication()], routes)
  .use(errorHandler());

module.exports = app;
