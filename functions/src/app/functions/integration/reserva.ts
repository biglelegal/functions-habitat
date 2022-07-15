import { Request, Response } from 'express';
import { from, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import * as soap from 'soap';
import { environment } from '../../../environments/environment';
import { Document, PromotionHabitat } from '../../entities';
import { LogInfo } from '../../entities/logInfo';
import { getPromotionHabitatByCodPromo, getUserByEmail, setDocument } from '../../utils/firebase';
import { errorResponse, getUniqueId, logMessage } from '../../utils/utils';
import { SAPData } from '../compraventa';
import { ItemMessage } from '../documentData';
import moment = require('moment');


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

export const fulfillReservaService = (request: Request, response: Response): Promise<any> => {
    const logInfo: LogInfo = new LogInfo('fulfillReservaService', getUniqueId());
    logMessage(logInfo, '1. Init process');
    return getReservaWSData(request.params.documentUid).pipe(
    ).toPromise()
        .then(
            data => {
                logMessage(logInfo, 'end fulfillReservaService');
                response.status(200).json(data);
            }
        ).catch(
            err => {
                logMessage(logInfo, 'Error fulfillReservaService', err);
                if (typeof err === 'string') {
                    response.status(500).json(errorResponse(logInfo, err, 'Error fulfillReservaService'));
                } else {
                    response.status(500).json(errorResponse(logInfo, 'Error fulfillReservaService', err));
                }
            }
        );
};



export function getReservaWSData(codigoReserva: string): Observable<Array<{ codigoReserva: string } & PromotionHabitat>> {
    return getReservaSAPData(codigoReserva)
        .pipe(
            switchMap(
                sapData => getPromotionData(sapData) // See where is the promotion code
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
                    console.error('Error getData', error);
                    return throwError(error);
                }
            )
        );
}

export function getReservaSAPData(codigoReserva: string): Observable<SAPData> {
    const auth = `Basic ${Buffer.from('WS_BIGLE:BIGLESAP2021').toString('base64')}`;
    return from(soap.createClientAsync(environment.compraventa.url, { wsdl_headers: { Authorization: auth }, wsdl_options: { timeout: 15000 } }))
        .pipe(
            switchMap(
                client => {
                    client.setSecurity(new soap.BasicAuthSecurity('WS_BIGLE', 'BIGLESAP2021'));
                    return from(client.ZCWS_WS_GET_DATA_SOLICITUDAsync({ INPUT: { ISOLIC: codigoReserva } }));
                }
            ),
            map(
                result => result[0] as SAPData
            ),
            tap(
                data => console.log('getWSData data', data)
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
                    console.error('Error getWSData', error);
                    return throwError(error);
                }
            )
        )
}

function processWSError(data: SAPData): Observable<SAPData> {
    const errorMessage = new Array<ItemMessage>().concat(data.OUTPUT.RESULT.MESSAGE.item)
        .map(
            item => item.MESSAGE
        ).join(', ');
    return throwError(errorMessage);
}

function getPromotionData(sapData: SAPData): Observable<Array<PromotionHabitat>> {// Check where is the promotion code in XML
    if (!sapData || !sapData.OUTPUT || !sapData.OUTPUT.DATOSPRO || !sapData.OUTPUT.DATOSPRO.CPROMO) {
        return throwError(`No existe código de promoción para esta reserva`);
    }
    const codPromo: string = sapData.OUTPUT.DATOSPRO.CPROMO;
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

