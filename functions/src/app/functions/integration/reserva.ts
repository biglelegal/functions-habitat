import { Request, Response } from 'express';
import { from, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import * as soap from 'soap';
import { environment } from '../../../environments/environment';
import { PromotionHabitat } from '../../entities';
import { LogInfo } from '../../entities/logInfo';
import { getPromotionHabitatByCodPromo } from '../../utils/firebase';
import { errorResponse, getUniqueId, logMessage } from '../../utils/utils';
import { SAPData } from '../compraventa';
import { ItemMessage } from '../documentData';

export const getReservaService = (request: Request, response: Response): Promise<any> => {
    const logInfo: LogInfo = new LogInfo('getReservaService', getUniqueId());
    logMessage(logInfo, '1. Init process');
    return getReservaWSData(request.params.id).pipe(
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
