import axios, { AxiosResponse } from 'axios';
import { Request, Response } from 'express';
import { XMLParser } from 'fast-xml-parser';
import * as admin from 'firebase-admin';
import { combineLatest, from, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Document, User } from '../../entities';
import { LogInfo } from '../../entities/logInfo';
import { getUserByEmail, setDocument } from '../../utils/firebase';
import { errorResponse, getUniqueId, logMessage } from '../../utils/utils';
import { getReservaData } from '../reserva';
import moment = require('moment');

export const createReservaService = (request: Request, response: Response): Promise<any> | Response => {
    const requestId = getUniqueId();
    const logInfo: LogInfo = new LogInfo('createReservaService', requestId);
    logMessage(logInfo, '1. createReservaService Init process');
    const authorization: string = request.headers.authorization as string;
    const regex = /Bearer (.*)/;

    const match = regex.exec(authorization);

    if (match.length > 1 && match[1] !== environment.authorizationReserva) {
        return response.status(403).json(errorResponse(logInfo, 'Autorización inválida'));
    }

    const body: { codigoReserva: string, userEmail: string, codigoPromocion: string } = request.body;

    if (!body) {
        return response.status(500).json(errorResponse(logInfo, 'Cuerpo de la petición no informado'));
    }

    const codigoReserva: string = body.codigoReserva;
    const userEmail: string = body.userEmail;
    const codigoPromocion: string = body.codigoPromocion;

    if (!codigoReserva) {
        return response.status(500).json(errorResponse(logInfo, 'Código de reserva no informado'));
    }

    if (!userEmail) {
        return response.status(500).json(errorResponse(logInfo, 'Usuario no informado'));
    }

    if (!codigoPromocion) {
        return response.status(500).json(errorResponse(logInfo, 'Código de promoción no informado'));
    }

    return createDocument(logInfo, codigoReserva, userEmail, codigoPromocion, requestId).pipe(
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

function createDocument(logInfo: LogInfo, codigoReserva: string, userEmail: string, codigoPromocion: string, requestId: string): Observable<{ creationTime: string, url: string, requestId: string }> {
    return getUserByEmail(userEmail)
        .pipe(
            switchMap(
                user => {
                    const document = getDocumentBody(codigoReserva, codigoPromocion, user);
                    return combineLatest([
                        // getPromotionHabitatByCodPromo(codigoPromocion),
                        setDocument(document)
                    ])
                        .pipe(
                            switchMap(
                                ([promo]) => {
                                    // if (promo.length === 1) {
                                    //     return getReservaData(logInfo, document.uid, promo[0].uid, codigoReserva)
                                    // }
                                    return of(null);
                                }
                            ),
                            switchMap(
                                () => getToken(user.uid)
                            ),
                            map(
                                (token) => ({
                                    creationTime: moment(document.creationTime).toISOString(),
                                    url: `https://bigle-plataform-habitat.firebaseapp.com/Forms/Form/${document.uid}/1?token=${token}`,
                                    requestId: requestId
                                })
                            ),
                            tap(
                                res => console.log('res', JSON.stringify(res))
                            )
                        )
                }
            )
        )
}

function getDocumentBody(codigoReserva: string, codigoPromocion: string, user: User): { name: string; typeUid: string; uid: string; creationTime: number; userUid: string; creationUserUid: string; officeUid: string; main: {}; metadata: { codigoReserva: string; codigoPromocion: string; }; modificationTime: number; modificationUserUid: string; notified: boolean; plataformCreated?: boolean; active?: boolean; deleted?: boolean; archived?: boolean; editing?: boolean; percentageCompleted?: number; projectUid?: string; vendor?: string; signaturitProcessId?: string; signaturitDocumentId?: string; signed?: boolean; category?: string; type?: string; percentage?: string; logo?: string; avatar?: string; doctypeImg?: string; stringyfied?: string; userName?: string; order?: number; statusName?: string; } {
    return {
        ...new Document(),
        name: `Reserva - ${codigoReserva} - ${codigoPromocion}`,
        typeUid: environment.reservaModelUid,
        uid: getUniqueId(),
        creationTime: new Date().getTime(),
        userUid: user.uid,
        creationUserUid: user.uid,
        officeUid: user.officeUid,
        main: {},
        metadata: { codigoReserva: codigoReserva, codigoPromocion: codigoPromocion }
    };
}

function getToken(userUid: string): Observable<string> {
    return from(admin.auth().createCustomToken(userUid));
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
    return from(callReservaWebService(codigoReserva))
        .pipe(
            map(
                result => parser.parse(result.data)
            ),
            tap(
                parsedData => console.log('getReservaSAPData parsedData: ', JSON.stringify(parsedData))
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
