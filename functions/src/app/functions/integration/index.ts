import * as functions from 'firebase-functions';
import { checkPBC } from './checkPBC';
import { getCompraventaService } from './compraventa';
import { getUrl } from './getUrlService';
import { getSocietiesService } from './societies';

// CORS Express middleware to enable CORS Requests.
import express = require('express');
const cors = require('cors')({ origin: true });
const app = express();
app.use(cors);

app.get('/getSocieties', (request, response) => getSocietiesService(request, response));
app.get('/getCompraventa/:id', (request, response) => getCompraventaService(request, response));
app.get('/checkPBC/:documentUid', (request, response) => checkPBC(request, response));

app.post('/getUrl', (request, response) => getUrl(request, response));

export const integration = functions
    .region('us-central1')
    .runWith({
        vpcConnector: 'us-static-funct-connector',
        vpcConnectorEgressSettings: 'ALL_TRAFFIC'
    })
    .https.onRequest(app);