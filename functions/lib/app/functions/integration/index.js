"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.integration = void 0;
const functions = require("firebase-functions");
const getUrlService_1 = require("./getUrlService");
const societies_1 = require("./societies");
// CORS Express middleware to enable CORS Requests.
const express = require("express");
const cors = require('cors')({ origin: true });
const app = express();
app.use(cors);
app.get('/getSocieties', (request, response) => societies_1.getSocietiesService(request, response));
app.post('/getUrl', (request, response) => getUrlService_1.getUrl(request, response));
exports.integration = functions.https.onRequest(app);
//# sourceMappingURL=index.js.map