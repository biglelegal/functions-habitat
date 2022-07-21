import axios, { AxiosResponse } from 'axios';
import { Request, Response } from 'express';
import { XMLParser } from 'fast-xml-parser';
import { from, Observable, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Document } from '../../entities';
import { LogInfo } from '../../entities/logInfo';
import { getUserByEmail, setDocument } from '../../utils/firebase';
import { errorResponse, getUniqueId, logMessage } from '../../utils/utils';
import { getReservaData } from '../reserva';
import moment = require('moment');

export const createReservaService = (request: Request, response: Response): Promise<any> => {
    const requestId = getUniqueId();
    const logInfo: LogInfo = new LogInfo('createReservaService', requestId);
    logMessage(logInfo, '1. createReservaService Init process');
    const authorization: string = request.headers.authorization as string;
    const regex = /Bearer (.*)/;

    const match = regex.exec(authorization);

    if (match.length > 1 && match[1] !== environment.authorizationReserva) {
        response.status(403).json(errorResponse(logInfo, 'Autorización inválida'));
    }

    const body: { codigoReserva: string, userEmail: string, codigoPromocion: string } = request.body;

    if (!body) {
        response.status(500).json(errorResponse(logInfo, 'Cuerpo de la petición no informado'));
    }

    const codigoReserva: string = body.codigoReserva;
    const userEmail: string = body.userEmail;
    const codigoPromocion: string = body.codigoPromocion;

    if (!codigoReserva) {
        response.status(500).json(errorResponse(logInfo, 'Código de reserva no informado'));
    }

    if (!userEmail) {
        response.status(500).json(errorResponse(logInfo, 'Usuario no informado'));
    }

    if (!codigoPromocion) {
        response.status(500).json(errorResponse(logInfo, 'Código de promoción no informado'));
    }

    return createDocument(codigoReserva, userEmail, codigoPromocion, requestId).pipe(
    ).toPromise()
        .then(
            data => {
                logMessage(logInfo, 'end createReservaService');
                response.status(200).json(data);
            }
        ).catch(
            err => {
                logMessage(logInfo, 'Error createReservaService', err);
                if (typeof err === 'string') {
                    response.status(500).json(errorResponse(logInfo, err, 'Error createReservaService'));
                } else {
                    response.status(500).json(errorResponse(logInfo, 'Error createReservaService', err));
                }
            }
        );
};

function createDocument(codigoReserva: string, userEmail: string, codigoPromocion: string, requestId: string): Observable<{ creationTime: string, url: string, requestId: string }> {
    return getUserByEmail(userEmail)
        .pipe(
            map(
                user => ({
                    ...new Document(),
                    name: `Reserva - ${codigoReserva} - ${codigoPromocion}`,
                    typeUid: environment.reservaModelUid,
                    uid: getUniqueId(),
                    creationTime: new Date().getTime(),
                    userUid: user.uid,
                    creationUserUid: user.uid,
                    officeUid: user.officeUid,
                    metadata: { codigoReserva: codigoReserva, codigoPromocion: codigoPromocion }
                })
            ),
            switchMap(
                document => setDocument(document)
                    .pipe(
                        map(
                            () => ({
                                creationTime: moment(document.creationTime).toISOString(),
                                url: `https://bigle-plataform-habitat.firebaseapp.com/Forms/Form/${document.uid}/1`,
                                requestId: requestId
                            })
                        )
                    )
            )
        )
}

export const integrateReservaService = (request: Request, response: Response): Promise<any> => {
    const logInfo: LogInfo = new LogInfo('integrateReservaService', getUniqueId());
    logMessage(logInfo, '1. Init process');
    const documentUid: string = request.params.documentUid;
    const promotionUid: string = request.params.promotionUid;
    const codigoReserva: string = request.params.codigoReserva;
    return getReservaData(logInfo, documentUid, promotionUid, codigoReserva).pipe(
    ).toPromise()
        .then(
            () => {
                logMessage(logInfo, 'end integrateReservaService');
                response.status(200).json('integrateReservaService ok');
            }
        ).catch(
            err => {
                logMessage(logInfo, 'Error integrateReservaService', err);
                if (typeof err === 'string') {
                    response.status(500).json(errorResponse(logInfo, err, 'Error integrateReservaService'));
                } else {
                    response.status(500).json(errorResponse(logInfo, 'Error integrateReservaService', err));
                }
            }
        );
};

export function getReservaSAPData(codigoReserva: string): Observable<any> {
    const parser: XMLParser = new XMLParser();
    // const auth = `Basic ${Buffer.from('WS_BIGLE:BIGLESAP2021').toString('base64')}`; as long as we use their PRE URL is not necessary
    return from(callReservaWebService(codigoReserva))
        .pipe(
            map(
                result => parser.parse(result.data)
            ),
            tap(
                parsedData => console.log('getReservaSAPData parsedData', JSON.stringify(parsedData))
            ),
            // Mirar van a enviar los errores para este nuevo endpoint
            // switchMap(
            //     data => {
            //         if (!data.OUTPUT) {
            //             return throwError('No OUTPUT found');
            //         }
            //         if (data.OUTPUT.RESULT && Number(data.OUTPUT.RESULT.SUBRC) !== 0 && data.OUTPUT.RESULT.MESSAGE && data.OUTPUT.RESULT.MESSAGE.item && new Array<ItemMessage>().concat(data.OUTPUT.RESULT.MESSAGE.item).length) {
            //             return processWSError(data);
            //         }
            //         return of(data);
            //     }
            // ),
            catchError(
                error => {
                    console.error('Error getReservaSAPData', error);
                    return throwError(error);
                }
            )
        )
}

function callReservaWebService(codigoReserva): Promise<AxiosResponse<any, any>> {

    const instance = axios.create({
        timeout: 100000,
        headers: { 'content-type': 'application/json' },
        method: 'post',
    });
    const data: { 'Id Reserva': string } = {
        'Id Reserva': codigoReserva
    }
    return instance.post(environment.reserva.url, data);
}

