import axios, { AxiosResponse } from 'axios';
import { Request, Response } from 'express';
import { from, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import * as xml2js from "xml2js";
import { environment } from '../../../environments/environment';
import { Document, PromotionHabitat } from '../../entities';
import { LogInfo } from '../../entities/logInfo';
import { getPromotionHabitatByCodPromo, getUserByEmail, setDocument } from '../../utils/firebase';
import { errorResponse, getUniqueId, logMessage } from '../../utils/utils';
import { ItemMessage } from '../documentData';
import { ReservaData } from '../reserva';
import moment = require('moment');
const parser = new xml2js.Parser({ attrkey: "ATTR" });

export const createReservaService = (request: Request, response: Response): Promise<any> => {
    const requestId = getUniqueId();
    const logInfo: LogInfo = new LogInfo('createReservaService', requestId);
    logMessage(logInfo, '1. createReservaService Init process');
    const authorization: string = request.headers.authorization as string;
    const regex = /Bearer (.*)/;

    const match = regex.exec(authorization);

    if (match.length > 1 && match[1] !== environment.authorizationReserva) {
        response.status(403).json(errorResponse(logInfo, 'Invalid Authorization'));
    }

    const codigoReserva: string = request.body.codigoReserva;
    const userEmail: string = request.body.userEmail;


    return createDocument(codigoReserva, userEmail, requestId).pipe(
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

function createDocument(codigoReserva: string, userEmail: string, requestId: string): Observable<{ creationTime: string, url: string, requestId: string }> {
    return getUserByEmail(userEmail)
        .pipe(
            map(
                user => ({
                    ...new Document(),
                    name: `Reserva - ${codigoReserva}`,
                    typeUid: environment.reservaModelUid,
                    uid: getUniqueId(),
                    creationTime: new Date().getTime(),
                    userUid: user.uid,
                    creationUserUid: user.uid,
                    officeUid: user.officeUid,
                    main: { codigoReserva: codigoReserva }
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

export const getReservaService = (request: Request, response: Response): Promise<any> => {
    const logInfo: LogInfo = new LogInfo('getReservaService', getUniqueId());
    logMessage(logInfo, '1. Init process');
    return getReservaWSData(request.params.uid).pipe(
    ).toPromise()
        .then(
            data => {
                logMessage(logInfo, 'end getReservaService');
                response.status(200).json(data);
            }
        ).catch(
            err => {
                logMessage(logInfo, 'Error getReservaService', err);
                if (typeof err === 'string') {
                    response.status(500).json(errorResponse(logInfo, err, 'Error getReservaService'));
                } else {
                    response.status(500).json(errorResponse(logInfo, 'Error getReservaService', err));
                }
            }
        );
};



export function getReservaWSData(codigoReserva: string): Observable<Array<{ codigoReserva: string } & PromotionHabitat>> {
    return getReservaSAPData(codigoReserva)
        .pipe(
            switchMap(
                sapData => getPromotionData(sapData)
                    .pipe(
                        map(
                            promotions => promotions
                                .map(
                                    promotion => ({
                                        ...promotion,
                                        codigoReserva: codigoReserva
                                    })
                                )
                        )
                    )
            ),
            tap(
                result => {
                    console.log('result', result);
                }
            ),
            catchError(
                error => {
                    console.error('Error getReservaWSData', error);
                    return throwError(error);
                }
            )
        );
}

export function getReservaSAPData(codigoReserva: string): Observable<ReservaData> {
    // const auth = `Basic ${Buffer.from('WS_BIGLE:BIGLESAP2021').toString('base64')}`; as long as we use their PRE URL is not necessary
    return from(callReservaWebService(codigoReserva))
        .pipe(
            map(
                result => parseData(result.data)
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

function parseData(data: any): ReservaData {
    let parsedData: ReservaData = {};
    parser.parseString(data, function (error, result) {
        parsedData = result;
    });
    return parsedData
}

function processWSError(data: ReservaData): Observable<ReservaData> {
    const errorMessage = new Array<ItemMessage>().concat(data.RESERVA.RESULT.MESSAGE.item)
        .map(
            item => item.MESSAGE
        ).join(', ');
    return throwError(errorMessage);
}

function getPromotionData(reservaData: ReservaData): Observable<Array<PromotionHabitat>> {// Check where is the promotion code in XML
    if (!reservaData || !reservaData.RESERVA || !reservaData.RESERVA.INPUT.CPROMO) {
        return throwError(`No existe código de promoción para esta reserva`);
    }

    const codPromo: string = reservaData.RESERVA.INPUT.CPROMO;
    return getPromotionHabitatByCodPromo(codPromo)
        .pipe(
            switchMap(
                promotionsList => {
                    if (!promotionsList.length) {
                        return throwError(`No existe ninguna promoción con el código ${codPromo}`);
                    }

                    if (promotionsList.length > 1) {
                        return of(promotionsList);
                    }

                    if (!promotionsList[0].active && !promotionsList[0].activeForFinancial) {
                        return throwError(`La promoción ${promotionsList[0].nombrePromocion} (${codPromo}) está pendiente aprobar por Dpto Legal y por Dpto Financiero`);
                    }
                    if (!promotionsList[0].active) {
                        return throwError(`La promoción ${promotionsList[0].nombrePromocion} (${codPromo}) está pendiente aprobar por Dpto Legal`);
                    }
                    if (!promotionsList[0].activeForFinancial) {
                        return throwError(`La promoción ${promotionsList[0].nombrePromocion} (${codPromo}) está pendiente aprobar por Dpto Financiero`);
                    }

                    return of(promotionsList);
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

