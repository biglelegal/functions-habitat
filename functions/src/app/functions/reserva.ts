import { combineLatest, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { PromotionHabitat } from '../entities';
import { LogInfo } from '../entities/logInfo';
import { getPromotionHabitatByUid } from '../utils/firebase';
import { logMessage } from '../utils/utils';
import { getReservaSAPData } from './integration/reserva';

export function getReservaData(logInfo: LogInfo, codigoReserva: string, promotionUid: string): Observable<any> {

    const errorValidation = validateRequestReserva(codigoReserva, logInfo);
    if (errorValidation) {
        return throwError(errorValidation);
    }
    return getReservaWSData(codigoReserva, promotionUid)
        .pipe(
            switchMap(
                rawData => processReservaData(rawData)
            ),
            tap(
                reserva => console.log(JSON.stringify(reserva))
            ),
            catchError(
                error => {
                    logMessage(logInfo, 'Error getReservaData', error);
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

function getReservaWSData(codigoReserva: string, promotionUid: string): Observable<{ reservaData: ReservaData, promotion: PromotionHabitat }> {
    return combineLatest([
        getReservaSAPData(codigoReserva),
        getPromotionHabitatByUid(promotionUid)
    ])
        .pipe(
            map(
                ([reservaData, promotion]) => ({ reservaData: reservaData, promotion: promotion })
            )

        );
}

function processReservaData(data: { reservaData: ReservaData, promotion: PromotionHabitat }): Observable<unknown> {

    if (data.promotion && !data.promotion.active && !data.promotion.activeForFinancial) {
        return throwError(`La promoción ${data.promotion.nombrePromocion} (${data.promotion.codigoPromocion}) está pendiente aprobar por Dpto Legal y por Dpto Financiero`);
    }

    if (data.promotion && !data.promotion.active) {
        return throwError(`La promoción ${data.promotion.nombrePromocion} (${data.promotion.codigoPromocion}) está pendiente aprobar por Dpto Legal`);
    }

    if (data.promotion && !data.promotion.activeForFinancial) {
        return throwError(`La promoción ${data.promotion.nombrePromocion} (${data.promotion.codigoPromocion}) está pendiente aprobar por Dpto Financiero`);
    }

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

export interface ReservaData {
    RESERVA?: RESERVA;
}

export interface RESERVA {
    INPUT?: INPUT;
}
export interface INPUT {
    TAB_DATOSRESERVA?: TAB_DATOSRESERVA;
    TAB_DATOSPROMOCION?: TAB_DATOSPROMOCION;
    TAB_COMPRADORES?: TAB_COMPRADORES;
    TAB_REPRESENTANTESLEGALES?: TAB_REPRESENTANTESLEGALES;
    TAB_UNIDADESVENTA?: TAB_UNIDADESVENTA;
}

export interface TAB_DATOSRESERVA {
    item?: TAB_DATOSRESERVA_ITEM;
}

export interface TAB_DATOSRESERVA_ITEM {
    PROMOCION: string;
    INTERES: string;
    CONTACTOVINCULADO: string;
    CONTACTO: string;
    VENDEDOR: string;
}

export interface TAB_DATOSPROMOCION {
    item?: TAB_DATOSPROMOCION_ITEM;
}

export interface TAB_DATOSPROMOCION_ITEM {
    NVIVIENDAS: string | number;
    NTRASTEROS: string | number;
    NGARAJES: string | number;
    NLOCALES: string | number;
    CODIGOPROMOCION: string;

}

export interface TAB_COMPRADORES {
    item?: TAB_COMPRADORES_ITEM | Array<TAB_COMPRADORES_ITEM>;
}

export interface TAB_COMPRADORES_ITEM {
    ROL: string;
    PORCENTAJECOMPRA: string | number;
    PERSONAFISICAJURIDICA: string;
    ESTADOCIVIL: string;
    TRATAMIENTO: string;
    CONTFULLNAME: string;
    CONTDNI: string;
    CONTADDRESS1_LINE1: string;
    CONTTELEPHONE1: string;
    CONTTELEPHONE2: string;
    CONTEMAILADDRESS1: string;
    CONTEMAILADDRESS2: string;
    CONTNOMBRENOTARIO: string;
    CONTCIUDADNOTARIO: string;
    CONTFECHACONSTITUCION: string;
    CONTNPROTOCOLO: string;
    CONTREGISTROMERCANTIL: string;
    CONTTOMO: string;
    CONTLIBRO: string;
    CONTFOLIO: string;
    CONTSECCION: string;
    CONTHOJA: string;
}

export interface TAB_REPRESENTANTESLEGALES {
    item?: TAB_REPRESENTANTESLEGALES_ITEM | Array<TAB_REPRESENTANTESLEGALES_ITEM>;
}

export interface TAB_REPRESENTANTESLEGALES_ITEM {
    TIPOREPRESENTANTELEGAL: string;
    CODIGOSAP: string | number;
    PERSONAFISICAJURIDICA: string;
    TRATAMIENTO: string;
    NOMBRENOTARIO: string;
    NUMEROPROTOCOLO: string | number;
    CIUDADNOTARIO: string;
    TIPOPODER: string;
    FECHAESCRITURACIONAPODERAMIENTO: string;
    CONTFULLNAME: string;
    CONTDNI: string;
    CONTADDRESS1_LINE1: string;
    CONTTELEPHONE1: string | number;
    CONTTELEPHONE2: string | number;
    CONTEMAILADDRESS1: string;
    CONTEMAILADDRESS2: string;
}

export interface TAB_UNIDADESVENTA {
    item?: TAB_UNIDADESVENTA_ITEM | Array<TAB_UNIDADESVENTA_ITEM>;
}

export interface TAB_UNIDADESVENTA_ITEM {
    BLOQUE: string | number;
    PORTAL: string | number;
    ESCALERA: string | number;
    PLANTA: string | number;
    PUERTANUMERO: string | number;
    SUPERFICIEMT2UTIL: string | number;
    SUPERFICIEMT2CONS: string | number;
}