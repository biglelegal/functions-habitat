import { combineLatest, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { PromotionHabitat } from '../entities';
import { LogInfo } from '../entities/logInfo';
import { getPromotionHabitatByUid } from '../utils/firebase';
import { logMessage } from '../utils/utils';
import { SAPData } from './compraventa';
import { getReservaSAPData } from './integration/reserva';

export function getReservaData(logInfo: LogInfo, codigoReserva: string, uid: string): Observable<any> {

    const errorValidation = validateRequestReserva(codigoReserva, logInfo);
    if (errorValidation) {
        return throwError(errorValidation);
    }
    return getReservaWSData(codigoReserva, uid)
        .pipe(
            switchMap(
                rawData => processSAPData(rawData, codigoReserva)
            ),
            tap(
                compraventa => console.log(JSON.stringify(compraventa))
            ),
            catchError(
                error => {
                    logMessage(logInfo, 'Error getCompraventaData', error);
                    return throwError(error);
                }
            )
        );
}

function validateRequestReserva(codigoReserva: string, logInfo: LogInfo): string {
    if (!codigoReserva) {
        logMessage(logInfo, 'Error', 'Codigo_reserva_not_found');
        return 'Codigo_reserva_not_found';
    }
    return null;
}

function getReservaWSData(codigoReserva: string, uid: string) {
    return combineLatest([
        getReservaSAPData(codigoReserva),
        getPromotionHabitatByUid(uid)
    ])
        .pipe(
            map(
                ([sapData, promotion]) => ({ sapData: sapData, promotion: promotion })
            )

        );
}

function processSAPData(data: { sapData: SAPData, promotion: PromotionHabitat }, codigoReserva: string): Observable<unknown> {
    // if (data.sapData.OUTPUT.DATOSSOL && (!data.sapData.OUTPUT.DATOSSOL.STPBC || Number(data.sapData.OUTPUT.DATOSSOL.STPBC) !== 1)) {
    //     return throwError('Error PBC KO ')
    // }

    // if (data.promotion && !data.promotion.active && !data.promotion.activeForFinancial) {
    //     return throwError(`La promoción ${data.promotion.nombrePromocion} (${data.promotion.codigoPromocion}) está pendiente aprobar por Dpto Legal y por Dpto Financiero`);
    // }

    // if (data.promotion && !data.promotion.active) {
    //     return throwError(`La promoción ${data.promotion.nombrePromocion} (${data.promotion.codigoPromocion}) está pendiente aprobar por Dpto Legal`);
    // }

    // if (data.promotion && !data.promotion.activeForFinancial) {
    //     return throwError(`La promoción ${data.promotion.nombrePromocion} (${data.promotion.codigoPromocion}) está pendiente aprobar por Dpto Financiero`);
    // }

    // return of({
    //     comprador: getCompradores(data.sapData.OUTPUT),
    //     // ...getDonDh(data.sapData.OUTPUT),
    //     // cargas: getCargasOption(data.sapData.OUTPUT),
    //     // ...getNotarioipoteca(data.sapData.OUTPUT, data.promotion),
    //     arquitecto: getArquitectos(data.sapData.OUTPUT),
    //     // ...getConstructora(data.sapData.OUTPUT),
    //     ...getDivisionHorizontal(data.sapData.OUTPUT, data.promotion.faseada),
    //     ...getDatosPago(data.sapData.OUTPUT),
    //     // clausula: [{}],
    //     ...data.promotion,
    //     horizontal: getHorizontal(data.promotion.escriturasPublicas),
    //     ...getPromocion(data.sapData.OUTPUT, data.promotion || new PromotionHabitat()),
    //     name: getDocumentName(data.sapData.OUTPUT, data.promotion, codigoReserva),
    //     codigoReserva: codigoReserva
    // });
    return of(undefined);
}