import * as functions from 'firebase-functions';
import { Request } from 'firebase-functions';
import { Observable, throwError } from 'rxjs';
import { LogInfo } from '../entities/logInfo';
import { errorResponse, getUniqueId, logMessage } from '../utils/utils';
import { getCompraventaData } from './compraventa';
import moment = require('moment');
// CORS Express middleware to enable CORS Requests.
const cors = require('cors')({ origin: true });
const express = require('express');
const app = express();

const getMainDocumentDataService = (request, response, next): Promise<any> => {
    const logInfo: LogInfo = new LogInfo('integrateCRM', getUniqueId());
    logMessage(logInfo, 'init integrateCRM');
    const crm: string = request.body.crm;
    const requestParams: { codigoReserva: string, uid: string } = request.body.params;

    const errorValidation = validateRequest(crm, requestParams, logInfo);
    if (errorValidation) {
        return response.status(500).json(errorResponse(logInfo, errorValidation));
    }
    logIncomingIp(request);
    return getDocumentData(logInfo, crm, requestParams)
        .toPromise()
        .then(
            data => {
                logMessage(logInfo, 'end integrateCRM');
                response.status(200).json(data);
            }
        ).catch(
            err => {
                logMessage(logInfo, 'Error integrateCRM', err);
                if (typeof err === 'string') {
                    response.status(500).json(errorResponse(logInfo, err, 'Error integrateCRM'));
                } else {
                    response.status(500).json(errorResponse(logInfo, 'Error integrateCRM', err));
                }
            }
        )
};

function validateRequest(crm: string, requestParams: { codigoReserva: string, uid: string }, logInfo: LogInfo): string {
    if (!crm) {
        logMessage(logInfo, 'Error', 'crm_not_found');
        return 'crm_not_found';
    }
    if (!['compraventa'].includes(crm)) {
        logMessage(logInfo, 'Error', 'wrong_crm');
        return 'wrong_crm';
    }
    if (!requestParams) {
        logMessage(logInfo, 'Error', 'requestParams_not_found');
        return 'requestParams_not_found';
    }
    if (!requestParams.codigoReserva) {
        logMessage(logInfo, 'Error', 'codigoReserva_not_found');
        return 'codigoReserva_not_found';
    }
    if (!requestParams.uid) {
        logMessage(logInfo, 'Error', 'uid_not_found');
        return 'uid_not_found';
    }
    return null;
}

function getDocumentData(logInfo, crm: string, requestParams: { codigoReserva: string, uid: string }): Observable<any> {
    switch (crm) {
        case 'compraventa':
            return getCompraventaData(logInfo, requestParams.codigoReserva as string, requestParams.uid as string);
    }
    return throwError('wrong_crm');
}

function logIncomingIp(request: Request): void {
    const remoteAddress: string = request.socket?.remoteAddress || 'No remot address';
    const forwardedFor: string | Array<string> = request.headers['x-forwarded-for'] || 'No x-forwarded-for header';
    const clientIp: string | Array<string> = request.headers['fastly-client-ip'] || 'No fastly-client-ip header';
    console.log('Request from', 'remoteAddress', remoteAddress, 'x-forwarded-for', forwardedFor, 'clientIp', clientIp);
}

app.use(cors);
app.use(getMainDocumentDataService);
export const getMainDocumentData = functions
    .region('europe-west1')
    .runWith({
        vpcConnector: 'static-function-connector',
        vpcConnectorEgressSettings: 'ALL_TRAFFIC'
    })
    .https.onRequest(app);

export interface ItemMessage {
    TYPE?: string;
    ID?: string;
    NUMBER?: string;
    MESSAGE?: string;
    LOG_NO?: unknown;
    LOG_MSG_NO?: string;
    MESSAGE_V1?: string;
    MESSAGE_V2?: string;
    MESSAGE_V3?: string;
    MESSAGE_V4?: unknown;
    PARAMETER?: unknown;
    ROW?: string;
    FIELD?: unknown;
    SYSTEM?: unknown;
}

export interface RESULT {
    SUBRC?: string;
    MESSAGE?: MESSAGE;
}

export interface MESSAGE {
    item?: ItemMessage | Array<ItemMessage>;
}