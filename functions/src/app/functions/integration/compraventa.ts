import { Request, Response } from 'express';
import { from, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import * as soap from 'soap';
import { environment } from '../../../environments/environment';
import { PromotionHabitat } from '../../entities';
import { LogInfo } from '../../entities/logInfo';
import { getPromotionHabitatByCodPromo } from '../../utils/firebase';
import { errorResponse, getUniqueId, logMessage } from '../../utils/utils';
import { ItemMessage, SAPData } from '../documentData';

export const getCompraventaService = (request: Request, response: Response): Promise<any> => {
    const logInfo: LogInfo = new LogInfo('getCompraventaService', getUniqueId());
    logMessage(logInfo, '1. Init process');
    return getCompraventaWSData(request.params.id).pipe(
    ).toPromise()
        .then(
            data => {
                logMessage(logInfo, 'end getCompraventaService');
                response.status(200).json(data);
            }
        ).catch(
            err => {
                logMessage(logInfo, 'Error getCompraventaService', err);
                if (typeof err === 'string') {
                    response.status(500).json(errorResponse(logInfo, err, 'Error getCompraventaService'));
                } else {
                    response.status(500).json(errorResponse(logInfo, 'Error getCompraventaService', err));
                }
            }
        );
};



export function getCompraventaWSData(codigoReserva: string): Observable<{ codigoReserva: string } & PromotionHabitat> {
    return getSAPData(codigoReserva)
        .pipe(
            switchMap(
                sapData => getPromotionData(sapData)
                    .pipe(
                        map(
                            promotion => ({
                                ...promotion,
                                codigoReserva: codigoReserva
                            })
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

export function getSAPData(codigoReserva: string): Observable<SAPData> {
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
            switchMap(
                data => {
                    if (!data.OUTPUT) {
                        return throwError('No OUTPUT found');
                    }
                    if (data.OUTPUT.RESULT && Number(data.OUTPUT.RESULT.SUBRC) !== 0 && data.OUTPUT.RESULT.MESSAGE && data.OUTPUT.RESULT.MESSAGE.item && new Array<ItemMessage>().concat(data.OUTPUT.RESULT.MESSAGE.item).length) {
                        return processWSError(data);
                    }
                    // if (data.OUTPUT.DATOSSOL && (!data.OUTPUT.DATOSSOL.STPBC || Number(data.OUTPUT.DATOSSOL.STPBC) !== 1)) {
                    //     return throwError('Error PBC KO ')
                    // }
                    return of(data);
                }
            ),
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

export function getPromotionData(sapData: SAPData): Observable<PromotionHabitat> {
    if (!sapData || !sapData.OUTPUT || !sapData.OUTPUT.DATOSPRO || !sapData.OUTPUT.DATOSPRO.CPROMO) {
        return throwError(`No existe código de promoción para esta reserva`);
    }
    const codPromo: string = sapData.OUTPUT.DATOSPRO.CPROMO;
    return getPromotionHabitatByCodPromo(codPromo)
        .pipe(
            switchMap(
                promotion => {
                    if (!promotion) {
                        return throwError(`No existe ninguna promoción con el código ${codPromo}`);
                    }
                    if (!promotion.active) {
                        return throwError(`La promoción ${promotion.nombrePromocion} (${codPromo}) está pendiente aprobar por Dpto Legal`);
                    }
                    if (!promotion.activeForFinancial) {
                        return throwError(`La promoción ${promotion.nombrePromocion} (${codPromo}) está pendiente aprobar por Dpto Financiero`);
                    }
                    return of(promotion);
                }
            )
        )

}
