import * as functions from 'firebase-functions';
import { chain as _chain } from 'lodash';
import { combineLatest, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { PromotionHabitat } from '../entities';
import { LogInfo } from '../entities/logInfo';
import { getPromotionHabitatByUid } from '../utils/firebase';
import { errorResponse, getUniqueId, isEmpty, logMessage } from '../utils/utils';
import { getSAPData } from './integration/compraventa';
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
        );
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

function getCompraventaData(logInfo: LogInfo, codigoReserva: string, uid: string): Observable<any> {

    const errorValidation = validateRequestCompraventa(codigoReserva, logInfo);
    if (errorValidation) {
        return throwError(errorValidation);
    }
    return getCompraventaWSData(codigoReserva, uid)
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

function getCompraventaWSData(codigoReserva: string, uid: string) {
    return combineLatest([
        getSAPData(codigoReserva),
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

    if (data.promotion && !data.promotion.active && !data.promotion.activeForFinancial) {
        return throwError(`La promoción ${data.promotion.nombrePromocion} (${data.promotion.codigoPromocion}) está pendiente aprobar por Dpto Legal y por Dpto Financiero`);
    }

    if (data.promotion && !data.promotion.active) {
        return throwError(`La promoción ${data.promotion.nombrePromocion} (${data.promotion.codigoPromocion}) está pendiente aprobar por Dpto Legal`);
    }

    if (data.promotion && !data.promotion.activeForFinancial) {
        return throwError(`La promoción ${data.promotion.nombrePromocion} (${data.promotion.codigoPromocion}) está pendiente aprobar por Dpto Financiero`);
    }

    return of({
        comprador: getCompradores(data.sapData.OUTPUT),
        // ...getDonDh(data.sapData.OUTPUT),
        // cargas: getCargasOption(data.sapData.OUTPUT),
        // ...getNotarioipoteca(data.sapData.OUTPUT, data.promotion),
        arquitecto: getArquitectos(data.sapData.OUTPUT),
        // ...getConstructora(data.sapData.OUTPUT),
        ...getDivisionHorizontal(data.sapData.OUTPUT, data.promotion.faseada),
        ...getDatosPago(data.sapData.OUTPUT),
        // clausula: [{}],
        ...data.promotion,
        horizontal: getHorizontal(data.promotion.escriturasPublicas),
        ...getPromocion(data.sapData.OUTPUT, data.promotion || new PromotionHabitat()),
        name: getDocumentName(data.sapData.OUTPUT, data.promotion, codigoReserva),
        codigoReserva: codigoReserva
    });
}

function getDocumentName(OUTPUT: OUTPUT, promotion: PromotionHabitat, codigoReserva: string) {
    const compradores = getCompradores(OUTPUT);
    const firstComprador = compradores ? compradores[0] : null;
    const vivendas = getCCLUnidades(OUTPUT, '01');
    const inmuebles = getInmuebleHorizontal(vivendas);
    const firstInmueble = inmuebles ? inmuebles[0] : null;
    let name = `${promotion.nombrePromocion} - ${codigoReserva}`;
    if (firstInmueble) {
        name += ` - ${firstInmueble.horizontalDescription}`
    }
    if (firstComprador) {
        name += ` - ${firstComprador.compradorName} ${firstComprador.compradorLastName1}`
    }
    return name;
}

function getCompradores(OUTPUT: OUTPUT) {
    if (!OUTPUT.CLIENTES || !OUTPUT.CLIENTES.item) {
        return [];
    }
    const representantesOtherName: Array<ItemDatosInt> = getRoleTypesByTwoTypes(OUTPUT, 'YAPO', 'YADM');

    const clientes: Array<ItemCliente> = getClientes(OUTPUT);
    const totalClients = clientes.length;
    if (clientes[0] && clientes[0].MARITAL_ST === '02' && clientes[0].PROPRTY_ST === '01' && totalClients === 2) {
        return [{ ...getComprador(clientes[0], 1, representantesOtherName), ...getConyuge(clientes[1]) }];
    }
    return clientes.map(cliente => getComprador(cliente, totalClients, representantesOtherName));
}

function getComprador(cliente: ItemCliente, totalClients: number, representantesOtherName: Array<ItemDatosInt>) {
    const representantes: Array<ItemDatosInt> = representantesOtherName.filter(x => x.KUNNR === cliente.CUSTOMER);
    const representanteOtherName: boolean = !!representantes && !!representantes.length

    return {
        compradorPersonType: Number(cliente.TYPE) === 1 ? 'legalPerson' : 'naturalPerson',
        compradorGender: cliente.SEX === '1' ? 'F' : 'M',
        compradorName: getStringValue(cliente, 'NAME2'),
        // For Legal person sometimes send the name in NAME2 and sometimes in NAME1
        compradorNameJuridica: getStringValue(cliente, 'NAME2') + getStringValue(cliente, 'NAME1'),
        compradorLastName1: getStringValue(cliente, 'NAME1'),
        compradorRegimen: getCivilStatus(cliente.PROPRTY_ST),
        compradorRegimenSoltero: getMaritalStatus(cliente.MARITAL_ST),
        compradorPercentage: (totalClients > 1) ? getNumberValue(cliente, 'PRELA') : 0,
        compradorIdentificationType: 'DNI',
        compradorIdentificationTypeJuridica: 'NIF',
        compradorIdentificationNumber: getStringValue(cliente, 'SORT1'),
        compradorPhoneNumber: getStringValue(cliente, 'TELF1'),
        compradorEmail: getStringValue(cliente, 'SMTP_ADDR'),
        compradorStreet: getStringValue(cliente, 'STRAS'),
        compradorCity: getStringValue(cliente, 'ORT01'),
        compradorCP: getStringValue(cliente, 'PSTLZ'),
        compradorCountry: getCountry(cliente),
        compradorOwnName: representanteOtherName ? 'Y' : 'N',
        representado: [].concat(representantes.map(
            representante => ({
                nombreRepreComprador: `${getStringValue(representante, 'NAME2')} ${getStringValue(representante, 'NAME1')}`,
                tipoIdentificacionRepreComprador: 'DNI',
                numeroIdentificacionRepreComprador: getStringValue(representante, 'SORT1'),
                lugarNotariaRepreComprador: getStringValue(representante, 'CIUDAD'),
                nombreNotarioRepreComprador: getStringValue(representante, 'NOTARIO'),
                fechaOtorgamientoRepreComprador: formatDate(representante, 'FEC_PE'),
                numeroProtocoloRepreComprador: getStringValue(representante, 'PROTOCOLO')
            })
        )),
        // REPRE Persona Juridica
        nombreRepreComprador: `${getStringValue(representantes[0], 'NAME2')} ${getStringValue(representantes[0], 'NAME1')}`,
        tipoIdentificacionRepreComprador: 'DNI',
        numeroIdentificacionRepreComprador: getStringValue(representantes[0], 'SORT1'),
        lugarNotariaRepreComprador: getStringValue(representantes[0], 'CIUDAD'),
        nombreNotarioRepreComprador: getStringValue(representantes[0], 'NOTARIO'),
        fechaOtorgamientoRepreComprador: formatDate(representantes[0], 'FEC_PE'),
        numeroProtocoloRepreComprador: getStringValue(representantes[0], 'PROTOCOLO'),
        // Other repre Persona Jurídica
        compradorTypeRepresentativePower: representantes.length > 1 ? 'jointAgent' : '',
        nombreOtherRepreComprador: representantes.length > 1 ? `${getStringValue(representantes[1], 'NAME2')} ${getStringValue(representantes[1], 'NAME1')}` : '',
        tipoIdentificacionOtherRepreComprador: 'DNI',
        numeroIdentificacionOtherRepreComprador: representantes.length > 1 ? getStringValue(representantes[1], 'SORT1') : '',
        lugarNotariaOtherRepreComprador: representantes.length > 1 ? getStringValue(representantes[1], 'CIUDAD') : '',
        nombreNotarioOtherRepreComprador: representantes.length > 1 ? getStringValue(representantes[1], 'NOTARIO') : '',
        fechaOtorgamientoOtherRepreComprador: representantes.length > 1 ? formatDate(representantes[1], 'FEC_PE') : '',
        numeroProtocoloOtherRepreComprador: representantes.length > 1 ? getStringValue(representantes[1], 'PROTOCOLO') : '',

        // ESCRITURA CONSTITUCION
        nombreNotarioConstitucion: getStringValue(cliente, 'NOTARIO'),
        numeroProtocoloConstitucion: getStringValue(cliente, 'PROTOCOLO'),
        fechaConstitucion: formatDate(cliente, 'FE_CONS'),
        registryCityConstitucion: getStringValue(cliente, 'REG_MERCANTIL'),
        tomoConstitucion: getStringValue(cliente, 'ITOMO'),
        libroConstitucion: getStringValue(cliente, 'ILIBRO'),
        hojaConstitucion: getStringValue(cliente, 'IHOJA'),
        folioConstitucion: getStringValue(cliente, 'IFOLIO')
    };
}

function getConyuge(cliente: ItemCliente) {
    return {
        compradorGanacialesGender: cliente.SEX === '1' ? 'F' : 'M',
        compradorGanacialesName: getStringValue(cliente, 'NAME2'),
        compradorGanacialesLastName1: getStringValue(cliente, 'NAME1'),
        compradorGanacialesIdentificationType: 'DNI',
        compradorGanacialesIdentificationNumber: getStringValue(cliente, 'SORT1'),
        compradorGanacialesPhoneNumber: getStringValue(cliente, 'TELF1'),
        compradorGanacialesEmail: getStringValue(cliente, 'SMTP_ADDR')
    }
}

function getDonDh(OUTPUT: OUTPUT): any {
    const notarioObraNueva = getRoleType(OUTPUT, 'ZUN3');
    const notarioph = getRoleType(OUTPUT, 'ZUN5');
    const fechas30 = getCCLFecha(OUTPUT, '30');
    const fechas34 = getCCLFecha(OUTPUT, '34');
    return {
        opcionDonDh: getDonDhOption(fechas30, fechas34),
        obraNuevaNotaryName: getStringValue(notarioObraNueva, 'NAME2'),
        obraNuevaNotaryLastName1: getStringValue(notarioObraNueva, 'NAME1'),
        obraNuevaCity: getStringValue(notarioObraNueva, 'ORT01'),
        obraNuevaCp: getStringValue(notarioObraNueva, 'PSTLZ'),
        obraNuevaGrantingDate: formatDate(fechas30, 'FREAL'),
        obraNuevaProtocolNumber: getStringValue(notarioObraNueva, 'CPROTOC'),
        phNotaryName: getStringValue(notarioph, 'NAME2'),
        phNotaryLastName1: getStringValue(notarioph, 'NAME1'),
        phNotaryCity: getStringValue(notarioph, 'ORT01'),
        phNotaryCp: getStringValue(notarioph, 'PSTLZ'),
        phNotaryGrantingDate: formatDate(fechas34, 'FREAL'),
        phNotaryProtocolNumber: getStringValue(notarioph, 'CPROTOC')
    }
}

function getNotarioipoteca(OUTPUT: OUTPUT, promotion: PromotionHabitat): any {
    const notario = getRoleType(OUTPUT, 'ZUN2');
    const fechasC4 = getCCLFecha(OUTPUT, 'C4');
    const fechasC8 = getCCLFecha(OUTPUT, 'C8');
    return {
        hipotecaEntity: getStringValue(OUTPUT.DATOSPRO, 'IENTIDAD'),
        hipotecaPrincipal: getNumberValue(OUTPUT.DATOSPRO, 'QIPRIN'),
        hipotecaNotaryName: getStringValue(notario, 'NAME2'),
        hipotecaNotaryLastName1: getStringValue(notario, 'NAME1'),
        hipotecaProtocolNumber: getStringValue(notario, 'CPROTOC'),
        hipotecaGrantingDate: formatDate(fechasC4, 'FREAL'),
        hipoGrantingDate: formatDate(fechasC8, 'FREAL'),
        contentCargas: promotion ? promotion.contentCargas : ''
    }
}

function getPromocion(OUTPUT: OUTPUT, promotion: PromotionHabitat): any {
    const fechas20 = getCCLFecha(OUTPUT, '20');
    const provincia = getStringValue(OUTPUT.DATOSPRO, 'CDELEG');
    const ayuntamientoItem = getRoleType(OUTPUT, 'ZUI1')
    return {
        promocionAndalucia: ['IP4061', 'IP4062'].includes(provincia) ? 'yes' : 'no',
        promocionCatalunya: ['IP4040'].includes(provincia) ? 'yes' : 'no',
        promocionLevante: ['IP4050'].includes(provincia) ? 'yes' : 'no',
        promocionDateLicencia: formatDate(fechas20, 'FREAL'),
        promocionAyuntamientoLicencia: getStringValue(ayuntamientoItem, 'ORT01'),
        ...getPromotionInfo(OUTPUT, promotion),
    };
}

function getPromotionInfo(OUTPUT: OUTPUT, promotion: PromotionHabitat): Record<string, number | string> {
    if (!promotion.faseada) {
        return {
            promocionNumberViviendas: getNumberValue(OUTPUT.DATOSPRO, 'NUMVIV'),
            promocionNumberPlazas: getNumberValue(OUTPUT.DATOSPRO, 'NUMGAR'),
            promocionNumberLocales: getNumberValue(OUTPUT.DATOSPRO, 'NUMLOC'),
            promocionNumberTrasteros: getNumberValue(OUTPUT.DATOSPRO, 'NUMTRAS'),
            promocionNumberBicicletas: getNumberValue(OUTPUT.DATOSPRO, 'NUMBICI'),
            promocionNumberExpediente: getStringValue(OUTPUT.DATOSPRO, 'CLICEN')
        }
    }

    if (promotion.shareLicenciaObras) {
        return {
            promocionNumberViviendas: getNumberValue(OUTPUT.DATOSPRO, 'NUMVIV'),
            promocionNumberPlazas: getNumberValue(OUTPUT.DATOSPRO, 'NUMGAR'),
            promocionNumberLocales: getNumberValue(OUTPUT.DATOSPRO, 'NUMLOC'),
            promocionNumberTrasteros: getNumberValue(OUTPUT.DATOSPRO, 'NUMTRAS'),
            promocionNumberBicicletas: getNumberValue(OUTPUT.DATOSPRO, 'NUMBICI'),
            promocionNumberExpediente: getStringValue(OUTPUT.DATOSPRO, 'CLICEN')
        }
    }

    return {
        promocionNumberViviendas: promotion.promocionNumberViviendas,
        promocionNumberPlazas: promotion.promocionNumberPlazas,
        promocionNumberLocales: promotion.promocionNumberLocales,
        promocionNumberTrasteros: promotion.promocionNumberTrasteros,
        promocionNumberBicicletas: promotion.promocionNumberBicicletas,
        promocionNumberExpediente: promotion.promocionNumberExpediente
    }
}

function getArquitectos(OUTPUT: OUTPUT) {
    const arquitectos = getRoleTypes(OUTPUT, 'ZUC4');
    if (!arquitectos) {
        return []
    }
    return arquitectos.map(x => ({
        arquitectoName: joinNames(x),
        arquitectoNumeroColegiado: getStringValue(x, 'SFRT8'),
        ciudadColegiado: getStringValue(x, 'CIUDAD'),
        arquitectoStreet: getStringValue(x, 'STRAS'),
        arquitectoCity: getStringValue(x, 'ORT01'),
        arquitectoCp: getStringValue(x, 'PSTLZ')
    }));
}

function getConstructora(OUTPUT: OUTPUT): any {
    const constructora = getRoleType(OUTPUT, 'ZUC1');
    return {
        constructora: getConstructoraOption(OUTPUT),
        constructoraSocialDenomination: joinNames(constructora),
        constructoraStreet: getStringValue(constructora, 'STRAS'),
        constructoraCity: getStringValue(constructora, 'ORT01'),
        constructoraCp: getStringValue(constructora, 'PSTLZ'),
        constructoraIdentificationNumber: getStringValue(constructora, 'SORT1'),
    };
}

function getDivisionHorizontal(OUTPUT: OUTPUT, promotionFaseada: boolean): any {
    const viviendas = getCCLUnidades(OUTPUT, '01');
    const nonAnnexedGarajes = getNonAnnexedInmuebles(OUTPUT, '02', viviendas);
    const annexedGarajes = getAnnexedInmuebles(OUTPUT, '02', viviendas);
    const garajes = nonAnnexedGarajes.filter(x => x.CSUBUSO === '20');
    const annexedTrasterosToGarajes = getAnnexedInmuebles(OUTPUT, '03', garajes);
    const trasteros = getNonAnnexedInmuebles(OUTPUT, '03', viviendas)
        .filter(
            x => !annexedTrasterosToGarajes.some(annexedTrastero => annexedTrastero.CUNID === x.CUNID // Remove trasteros annexed to any garaje
            )
        );
    const annexedTrasteros = getAnnexedInmuebles(OUTPUT, '03', viviendas)
        .filter(
            x => !annexedTrasterosToGarajes.some(annexedTrastero => annexedTrastero.CUNID === x.CUNID // Remove trasteros annexed to any garaje
            )
        );
    const motos = nonAnnexedGarajes.filter(x => x.CSUBUSO === '21');
    const bicicletas = nonAnnexedGarajes.filter(x => x.CSUBUSO === '23');
    const numeroRegistro = Number(getStringValue(OUTPUT.DATOSPRO, 'CREGPRO').split('-')[1]);
    const lugarRegistro = getStringValue(OUTPUT.DATOSPRO, 'TREGIS');
    return {
        // horizontal: getDivisionHorizontalOption(OUTPUT), ya no se utiliza CCLFECHA 34 para mirar esto. Se mira escriturasPublicas de los datos de una promocion
        horizontalYesCheckActivos: {
            activoVivienda1: !!viviendas.length,
            activoParking1: !!garajes.length,
            activoTrastero1: !!trasteros.length
        },
        horizontalNoCheckActivos: {
            activoVivienda: !!viviendas.length,
            activoParking: !!garajes.length || !!motos.length || !!bicicletas.length,
            activoTrastero: !!trasteros.length,
        },
        casa: getViviendaHorizontal(viviendas, OUTPUT, annexedGarajes, annexedTrasteros),
        chequePlaza: {
            plazaBicicleta: !!bicicletas.length,
            plazaMotocicleta: !!motos.length,
            plazaNormal: !!garajes.length,
        },
        bici: getInmuebleHorizontal(bicicletas),
        moto: getInmuebleHorizontal(motos),
        car: getGarajeInmuebleHorizontal(garajes, annexedTrasterosToGarajes),
        traster: getInmuebleHorizontal(trasteros),
        house: getViviendaHorizontal(viviendas, OUTPUT, annexedGarajes, annexedTrasteros),
        regis: promotionFaseada ? [] : getInmuebleHorizontalDatosRegistrales(viviendas, numeroRegistro, lugarRegistro),
        parqueo: getInmuebleHorizontal(garajes),
        park: getGarajeInmuebleHorizontal(garajes, annexedTrasterosToGarajes),
        regi: promotionFaseada ? [] : getInmuebleHorizontalDatosRegistrales(garajes, numeroRegistro, lugarRegistro),
        tras: getInmuebleHorizontal(trasteros),
        reg: promotionFaseada ? [] : getInmuebleHorizontalDatosRegistrales(trasteros, numeroRegistro, lugarRegistro),
        registrales: promotionFaseada ? '' : 'si',
        registral: promotionFaseada ? '' : 'si',
        registra: promotionFaseada ? '' : 'si'
    };
}

function getNonAnnexedInmuebles(OUTPUT: OUTPUT, type: string, viviendas: Array<ItemUnidades>): Array<ItemUnidades> {
    // Get the garajes/trasteros (from type) if they are not annexed to a vivienda
    return getCCLUnidades(OUTPUT, type)
        .filter(
            inmueble => !viviendas.some(x => x.CUNID === inmueble.CUDVINC)
        );
}

function getAnnexedInmuebles(OUTPUT: OUTPUT, type: string, items: Array<ItemUnidades>): Array<ItemUnidades> {
    // Get the vivienda annexed garajes/trasteros (from type)

    return getCCLUnidades(OUTPUT, type)
        .filter(
            inmueble => items.some(x => x.CUNID === inmueble.CUDVINC)
        );
}

function getDatosPago(OUTPUT: OUTPUT): any {
    const arras = getCCondis(OUTPUT, 'PS');
    const contrato = getCCondis(OUTPUT, 'PF');
    const pagosCuenta = getCCondis(OUTPUT, 'PC');
    const condiPE = getCCondis(OUTPUT, 'PE');
    const price = reduceNumberValue(getUnidades(OUTPUT), 'QIMPSOL');
    const priceIva = reduceNumberValue(getUnidades(OUTPUT), 'QIMPTOT');
    const priceTotal = price + priceIva;
    const amountArras = reduceNumberValue(arras, 'QIMPNET');
    const amountIvaArras = reduceNumberValue(arras, 'QIMPIVA');
    const amountTotalArras = reduceNumberValue(arras, 'QIMPTOT');
    const amountEntregadaPago = reduceNumberValue(contrato, 'QIMPNET');
    const amountIvaPago = reduceNumberValue(contrato, 'QIMPIVA');
    const amountTotalPago = reduceNumberValue(contrato, 'QIMPTOT');
    const amountEntregada2Pago = reduceNumberValue(pagosCuenta, 'QIMPNET');
    const amountIva2Pago = reduceNumberValue(pagosCuenta, 'QIMPIVA');
    const amountTotal2Pago = reduceNumberValue(pagosCuenta, 'QIMPTOT');
    const amountPosteriorPago = price - (amountArras + amountEntregadaPago + amountEntregada2Pago);
    const ivaPosteriorPago = priceIva - (amountIvaArras + amountIvaPago + amountIva2Pago);
    const totalPosteriorPago = priceTotal - (amountTotalArras + amountTotalPago + amountTotal2Pago);
    return {
        price: price,
        tipo: price ? getFixedNumber(priceIva * 100 / price) : 0,
        priceIva: priceIva,
        priceTotal: price + priceIva,
        arrasPago: amountArras,
        dateArrasPago: getMaxDate(arras, 'FVALI'),
        amountEntregadaPago: amountEntregadaPago,
        amountIvaPago: amountIvaPago + amountIvaArras,
        amountTotalPago: amountTotalPago + amountIvaArras,
        amountEntregada2Pago: amountEntregada2Pago,
        amountIva2Pago: amountIva2Pago,
        amountTotal2Pago: amountTotal2Pago,
        fechaMaxima: getMaxDate(condiPE, 'FVALI'),
        formaPago: getFormaPago(pagosCuenta),
        tablaDesglose: getTablaDesglose(pagosCuenta),
        amountPosteriorPago: amountPosteriorPago,
        ivaPosteriorPago: ivaPosteriorPago,
        totalPosteriorPago: totalPosteriorPago
    };
}

function getViviendaHorizontal(inmuebles: Array<ItemUnidades>, OUTPUT: OUTPUT, annexedGarajes: Array<ItemUnidades>, annexedTrasteros: Array<ItemUnidades>) {
    const garajesPrice: number = annexedGarajes.reduce((prev, curr) => prev + getNumberValue(curr, 'QIMPSOL'), 0);
    const trasterossPrice: number = annexedTrasteros.reduce((prev, curr) => prev + getNumberValue(curr, 'QIMPSOL'), 0);
    return inmuebles.map(inmueble => ({
        horizontalDescription: getStringValue(inmueble, 'TUNID'),
        horizontalPrice: getNumberValue(inmueble, 'QIMPSOL') + garajesPrice + trasterossPrice,
        horizontalDescripcion: getStringValue(inmueble, 'DESREG'),
        horizontalRegistryVolume: getStringValue(inmueble, 'ITOMO'),
        horizontalRegistryBook: getStringValue(inmueble, 'ILIBRO'),
        horizontalRegistryPage: getStringValue(inmueble, 'IFOLIO'),
        horizontalRegistryInscription: getStringValue(inmueble, 'IINSC'),
        horizontalNumber: getStringValue(inmueble, 'CNUM'),
        horizontalSurface: Math.floor(getNumberValue(inmueble, 'QSUTIL') * 10) / 10,
        horizontalSurfaceComunes: Math.floor(getNumberValue(inmueble, 'QSCONS') * 10) / 10,
        horizontalTerraza: getTerrazaSurface(inmueble) > 0 ? 'yes' : 'no',
        horizontalTerrazaSurface: Math.floor(getTerrazaSurface(inmueble) * 10) / 10,
        usoPrivativo: getUsoPrivativoSurface(inmueble) > 0 ? 'yes' : 'no',
        horizontalTerrazaSurfaceExterior: Math.floor(getUsoPrivativoSurface(inmueble) * 10) / 10,
        horizontalBlock: getStringValue(inmueble, 'CBLOQ'),
        horizontalStair: getStringValue(inmueble, 'CESC'),
        horizontalPortal: getStringValue(inmueble, 'CPORT'),
        horizontalFloor: getStringValue(inmueble, 'CPLANT'),
        horizontalDoor: getStringValue(inmueble, 'CNUM'),
        checkAnejos: getCheckViviendaAnejos(inmueble, getUnidades(OUTPUT)),
        anejoParking: getInmuebleHorizontal(annexedGarajes),
        anejoTrastero: getInmuebleHorizontal(annexedTrasteros),
    }));
}

function getGarajeInmuebleHorizontal(inmuebles: Array<ItemUnidades>, annexedTrasteros: Array<ItemUnidades>) {
    const trasterosPrice: number = annexedTrasteros.reduce((prev, curr) => prev + getNumberValue(curr, 'QIMPSOL'), 0);
    return inmuebles.map(inmueble => ({
        horizontalDescription: getStringValue(inmueble, 'TUNID'),
        horizontalPrice: getNumberValue(inmueble, 'QIMPSOL') + trasterosPrice,
        horizontalDescripcion: getStringValue(inmueble, 'DESREG'),
        horizontalRegistryVolume: getStringValue(inmueble, 'ITOMO'),
        horizontalRegistryBook: getStringValue(inmueble, 'ILIBRO'),
        horizontalRegistryPage: getStringValue(inmueble, 'IFOLIO'),
        horizontalRegistryInscription: getStringValue(inmueble, 'IINSC'),
        horizontalNumber: getStringValue(inmueble, 'CNUM'),
        horizontalSurface: Math.floor(getNumberValue(inmueble, 'QSUTIL') * 10) / 10,
        horizontalSurfaceComunes: Math.floor(getNumberValue(inmueble, 'QSCONS') * 10) / 10,
        horizontalTerraza: getTerrazaSurface(inmueble) > 0 ? 'yes' : 'no',
        horizontalTerrazaSurface: Math.floor(getTerrazaSurface(inmueble) * 10) / 10,
        usoPrivativo: getUsoPrivativoSurface(inmueble) > 0 ? 'yes' : 'no',
        horizontalTerrazaSurfaceExterior: Math.floor(getUsoPrivativoSurface(inmueble) * 10) / 10,
        horizontalBlock: getStringValue(inmueble, 'CBLOQ'),
        horizontalStair: getStringValue(inmueble, 'CESC'),
        horizontalPortal: getStringValue(inmueble, 'CPORT'),
        horizontalFloor: getStringValue(inmueble, 'CPLANT'),
        horizontalDoor: getStringValue(inmueble, 'CNUM'),
        esAnejoCheck: annexedTrasteros.some(x => x.CUDVINC === inmueble.CUNID) ? { trasteroAnejo: !!annexedTrasteros } : {},
        datosTrastero: annexedTrasteros.some(x => x.CUDVINC === inmueble.CUNID) ? getInmuebleHorizontal(annexedTrasteros) : {}
    }));
}

function getInmuebleHorizontal(inmuebles: Array<ItemUnidades>) {
    return inmuebles.map(inmueble => ({
        horizontalDescription: getStringValue(inmueble, 'TUNID'),
        horizontalPrice: getNumberValue(inmueble, 'QIMPSOL'),
        horizontalDescripcion: getStringValue(inmueble, 'DESREG'),
        horizontalRegistryVolume: getStringValue(inmueble, 'ITOMO'),
        horizontalRegistryBook: getStringValue(inmueble, 'ILIBRO'),
        horizontalRegistryPage: getStringValue(inmueble, 'IFOLIO'),
        horizontalRegistryInscription: getStringValue(inmueble, 'IINSC'),
        horizontalNumber: getStringValue(inmueble, 'CNUM'),
        horizontalSurface: Math.floor(getNumberValue(inmueble, 'QSUTIL') * 10) / 10,
        horizontalSurfaceComunes: Math.floor(getNumberValue(inmueble, 'QSCONS') * 10) / 10,
        horizontalTerraza: getTerrazaSurface(inmueble) > 0 ? 'yes' : 'no',
        horizontalTerrazaSurface: Math.floor(getTerrazaSurface(inmueble) * 10) / 10,
        usoPrivativo: getUsoPrivativoSurface(inmueble) > 0 ? 'yes' : 'no',
        horizontalTerrazaSurfaceExterior: Math.floor(getUsoPrivativoSurface(inmueble) * 10) / 10,
        horizontalBlock: getStringValue(inmueble, 'CBLOQ'),
        horizontalStair: getStringValue(inmueble, 'CESC'),
        horizontalPortal: getStringValue(inmueble, 'CPORT'),
        horizontalFloor: getStringValue(inmueble, 'CPLANT'),
        horizontalDoor: getStringValue(inmueble, 'CNUM')
    }));
}

function getTerrazaSurface(inmueble: ItemUnidades) {
    return getNumberValue(inmueble, 'QSTEPR') + getNumberValue(inmueble, 'QSJAPR');
}

function getUsoPrivativoSurface(inmueble: ItemUnidades) {
    return getNumberValue(inmueble, 'QSUTERRAZACONT') + getNumberValue(inmueble, 'QSUPARCELACONT') + getNumberValue(inmueble, 'QSUPATIOCONT');
}

function getCheckViviendaAnejos(inmueble: ItemUnidades, itemUnidades: Array<ItemUnidades>) {
    // Check if a inmueble Vivienda type has another inmueble as annex
    return {
        addParking: inmueble.CCLUSO === '01' ? itemUnidades.some(x => x.CUDVINC === inmueble.CUNID && x.CCLUSO === '02') : false,
        addTrastero: inmueble.CCLUSO === '01' ? itemUnidades.some(x => x.CUDVINC === inmueble.CUNID && x.CCLUSO === '03') : false
    };
}

function getInmuebleHorizontalDatosRegistrales(inmuebles: Array<ItemUnidades>, numeroRegistro: number, lugarRegistro: string) {
    return inmuebles.map(inmueble => ({
        horizontalRegistryCity: lugarRegistro,
        horizontalRegistryNumber: numeroRegistro,
        horizontalRegistryPropertyNumber: getNumberValue(inmueble, 'IFINCA'),
        cuotaVivienda: getNumberValue(inmueble, 'PCOGEN'),
    }));
}


function getCivilStatus(civilStatus: string): string {
    switch (civilStatus) {
        case '01':
            return 'gananciales';
        case '02':
            return 'separacion';
        case '03':
            return 'participacion';
        default:
            return 'no';
    }
}

function getMaritalStatus(civilStatus: string): string {
    switch (civilStatus) {
        case '01':
            return 'soltero';
        case '02':
            return 'casado';
        case '03':
            return 'viudo';
        case '04':
            return 'divorciado';
        case '05':
            return 'separado';
        default:
            return 'soltero';
    }
}

function getCountry(cliente: ItemCliente): string {
    switch (cliente.LAND1) {
        case 'ES':
            return 'España';
        default:
            return '';
    }
}

function getConstructoraOption(OUTPUT: OUTPUT): string {
    const fechasA0 = getCCLFecha(OUTPUT, 'A0');
    if (fechasA0) {
        return 'firmado';
    }
    return 'no';
}

function getDivisionHorizontalOption(OUTPUT: OUTPUT): string {
    const fechas34 = getCCLFecha(OUTPUT, '34');
    if (fechas34) {
        return 'yes';
    }
    return 'no';
}

function getDonDhOption(fechas30: ItemFechas, fechas34: ItemFechas): string {
    if (!fechas30) {
        return 'ninguna';
    }
    if (fechas30 && !fechas34) {
        return 'don';
    }
    return 'ambas';
}

function getCargasOption(OUTPUT: OUTPUT): string {
    if (isEmpty(OUTPUT.DATOSPRO.IENTIDAD)) {
        return 'a';
    }
    const fechasC8 = getCCLFecha(OUTPUT, 'c8');
    const fechasC4 = getCCLFecha(OUTPUT, 'c4');
    if (fechasC8 && !fechasC4) {
        return 'c';
    }
    if (fechasC8 && fechasC4) {
        return 'c';
    }
    return 'd';
}


function getFormaPago(conditions: Array<ItemConditions>): string {
    if (!conditions || !conditions.length) {
        return 'c';
    }

    const everyDomiciliado: boolean = conditions.every(x => x.CVPAGO === 'S');
    if (everyDomiciliado) {
        return 'a';
    }
    return 'b';
}


function getTablaDesglose(conditions: Array<ItemConditions>): Array<unknown> {
    return _chain(conditions)
        .groupBy('FVALI')
        .map(
            groupCondtion => ({
                tablaDesgloseDatePago: Math.max(...groupCondtion.map(x => formatDate(x, 'FVALI'))),
                tablaDesgloseImporteNeto: groupCondtion.map(x => getNumberValue(x, 'QIMPNET')).reduce((a, b) => a + b, 0),
                tablaDesgloseImporteIva: groupCondtion.map(x => getNumberValue(x, 'QIMPIVA')).reduce((a, b) => a + b, 0),
                tablaDesgloseImporteTotal: groupCondtion.map(x => getNumberValue(x, 'QIMPTOT')).reduce((a, b) => a + b, 0),
                tablaDesgloseMedioPago: groupCondtion.map(x => x.CVPAGO).every(x => x === 'S') ? 'Domiciliado' : 'Transferencia'
            })
        )
        .sortBy('tablaDesgloseDatePago')
        .value()
}


function getDatosInt(OUTPUT: OUTPUT): Array<ItemDatosInt> {
    if (!OUTPUT.DATOSINT || !OUTPUT.DATOSINT.item) {
        return new Array<ItemDatosInt>();
    }
    return [].concat(OUTPUT.DATOSINT.item);
}

function getClientes(OUTPUT: OUTPUT): Array<ItemCliente> {
    if (!OUTPUT.CLIENTES || !OUTPUT.CLIENTES.item) {
        return new Array<ItemCliente>();
    }
    return [].concat(OUTPUT.CLIENTES.item);
}

function getUnidades(OUTPUT: OUTPUT): Array<ItemUnidades> {
    if (!OUTPUT.UNIDADES || !OUTPUT.UNIDADES.item) {
        return new Array<ItemUnidades>();
    }
    return [].concat(OUTPUT.UNIDADES.item);
}

function getUnidadConditions(unidad: ItemUnidades): Array<ItemConditions> {
    if (!unidad.CONDITIONS || !unidad.CONDITIONS.item) {
        return new Array<ItemUnidades>();
    }
    return [].concat(unidad.CONDITIONS.item);
}

function getFechas(OUTPUT: OUTPUT): Array<ItemFechas> {
    if (!OUTPUT.FECHAS || !OUTPUT.FECHAS.item) {
        return new Array<ItemFechas>();
    }
    return [].concat(OUTPUT.FECHAS.item);
}
function getCCLFecha(OUTPUT: OUTPUT, type: string): ItemFechas {
    const fechas: Array<ItemFechas> = getFechas(OUTPUT);
    return fechas.find(x => x.CCLFECHA === type);
}

function getRoleType(OUTPUT: OUTPUT, type: string): ItemDatosInt {
    const datosInt: Array<ItemDatosInt> = getDatosInt(OUTPUT);
    return datosInt.find(x => x.ROLETYP === type);
}

function getRoleTypes(OUTPUT: OUTPUT, type: string): Array<ItemDatosInt> {
    const datosInt: Array<ItemDatosInt> = getDatosInt(OUTPUT);
    return datosInt.filter(x => x.ROLETYP === type);
}

function getRoleTypesByTwoTypes(OUTPUT: OUTPUT, type1: string, type2: string): Array<ItemDatosInt> {
    const datosInt: Array<ItemDatosInt> = getDatosInt(OUTPUT);
    return datosInt.filter(x => x.ROLETYP === type1 || x.ROLETYP === type2);
}

function getCCLUnidades(OUTPUT: OUTPUT, type: string): Array<ItemUnidades> {
    const unidades: Array<ItemUnidades> = getUnidades(OUTPUT);
    return unidades.filter(x => x.CCLUSO === type);
}

function getCCondi(OUTPUT: OUTPUT, type: string): ItemConditions {
    const unidades: Array<ItemUnidades> = getUnidades(OUTPUT);
    return unidades
        .map(unidad => getUnidadConditions(unidad))
        .reduce((total, next) => total.concat(next), new Array<ItemConditions>())
        .find(x => x.CCONDI === type);
}

function getCCondis(OUTPUT: OUTPUT, type: string): Array<ItemConditions> {
    const unidades: Array<ItemUnidades> = getUnidades(OUTPUT);
    return unidades
        .map(unidad => getUnidadConditions(unidad))
        .reduce((total, next) => total.concat(next), new Array<ItemConditions>())
        .filter(x => x.CCONDI === type);
}


function formatDate<T, K extends keyof T>(date: T, field: keyof T) {
    if (!date || !date[field] || String(date[field]) === '0000-00-00') {
        return 0;
    }
    return moment(date[field], 'YYYY-MM-DD').valueOf();
}

function joinNames(names: { NAME1?: string, NAME2?: string }): string {
    if (!names) {
        return '';
    }
    return `${names.NAME2 || ''} ${names.NAME1 || ''}`.trim();
}

function getStringValue<T, K extends keyof T>(value: T, field: K): string {
    if (!value) {
        return '';
    }
    return String(value[field] || '');
}

function getNumberValue<T, K extends keyof T>(value: T, field: K): number {
    if (!value) {
        return 0;
    }
    return getFixedNumber(Number(value[field] || 0));
}

function reduceNumberValue<T, K extends keyof T>(value: Array<T>, field: K): number {
    const reducedValue: number = value
        .map(x => Number(x[field] || 0))
        .reduce((total, next) => total + (next), 0);
    return getFixedNumber(reducedValue);
}

function getMaxDate<T, K extends keyof T>(value: Array<T>, field: K): number {
    const reducedValue: number = value
        .map(x => formatDate(x, field))
        .reduce((total, next) => total = Math.max(total, next), 0);
    return getFixedNumber(reducedValue);
}

function getFixedNumber(numberValue: number): number {
    return Number(numberValue.toFixed(2));
}

function validateRequestCompraventa(codigoReserva: string, logInfo: LogInfo): string {
    if (!codigoReserva) {
        logMessage(logInfo, 'Error', 'Codigo_reserva_not_found');
        return 'Codigo_reserva_not_found';
    }
    return null;
}

function getHorizontal(escriturasPublicas: string) {
    if (escriturasPublicas === 'ambas') {
        return 'yes';
    }
    return 'no';
}

app.use(cors);
app.use(getMainDocumentDataService);
export const getMainDocumentData = functions.region('europe-west1').https.onRequest(app);




export interface SAPData {
    OUTPUT?: OUTPUT;
}
export interface OUTPUT {
    RESULT?: RESULT;
    DATOSSOL?: DATOSSOL;
    DATOSPRO?: DATOSPRO;
    DATOSINT?: DATOSINT;
    CLIENTES?: CLIENTES;
    UNIDADES?: UNIDADES;
    FECHAS?: FECHAS;
}
export interface RESULT {
    SUBRC?: string;
    MESSAGE?: MESSAGE;
}
export interface MESSAGE {
    item?: ItemMessage | Array<ItemMessage>;
}
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
export interface DATOSSOL {
    BUKRS?: string;
    CPROMO?: string;
    TPROMO?: string;
    ISOLIC?: string;
    FDOCU?: string;
    LUGAR?: string;
    STPBC?: unknown;
}
export interface DATOSPRO {
    BUKRS?: string;
    CPROMO?: string;
    CDELEG?: string;
    TDELEG?: string;
    NUMVIV?: string;
    NUMGAR?: string;
    NUMTRAS?: string;
    NUMBICI?: string;
    NUMLOC?: string;
    NUMOFIC?: string;
    CLICEN?: string;
    IENTIDAD?: string;
    QIPRIN?: string;
    IBAN?: string;
    CREGPRO?: string;
    TREGPRO?: unknown;
    TREGIS?: unknown;
}
export interface DATOSINT {
    item?: ItemDatosInt | Array<ItemDatosInt>;
}
export interface ItemDatosInt {
    ROLETYP?: string;
    PARTNR?: string;
    NAME1?: string;
    NAME2?: string;
    SORT1?: string;
    STRAS?: string;
    LAND1?: string;
    PSTLZ?: string;
    REGIO?: string;
    TELF1?: unknown;
    SFRT8?: unknown;
    TYPE?: string;
    MARITAL_ST?: string;
    PROPRTY_ST?: string;
    CPROTOC?: string;
    ORT01?: string;
    CIUDAD?: string;
    KUNNR?: string;
    NOTARIO?: string;
    FEC_PE?: unknown;
    PROTOCOLO?: string;
}
export interface CLIENTES {
    item?: ItemCliente | Array<ItemCliente>;
}
export interface ItemCliente {
    TYPE?: string;
    PARTNR?: string;
    CUSTOMER?: string;
    SORT1?: string;
    NAME1?: string;
    NAME2?: string;
    SEX?: string;
    MARITAL_ST?: string;
    PROPRTY_ST?: string;
    STRAS?: string;
    ORT01?: string;
    PSTLZ?: string;
    REGIO?: string;
    LAND1?: string;
    TELF1?: string;
    SMTP_ADDR?: string;
    PRELA?: string;
    FE_CONS?: string
    PROTOCOLO?: string;
    NOTARIO?: string;
    REG_MERCANTIL?: string;
    ITOMO?: string;
    ILIBRO?: string;
    IHOJA?: string;
    IFOLIO?: string;
}
export interface UNIDADES {
    item?: ItemUnidades | Array<ItemUnidades>;
}
export interface ItemUnidades {
    DESREG?: string;
    CUNID?: string;
    TUNID?: string;
    CCLUSO?: string;
    CSUBUSO?: unknown;
    CBLOQ?: unknown;
    CPLANT?: string;
    CPORT?: string;
    CESC?: unknown;
    CNUM?: string;
    ITIPO?: string;
    QSUTIL?: string;
    QSCONS?: string;
    QSTEPR?: string;
    QSJAPR?: string;
    QSUTERRAZACONT?: string;
    QSUPARCELACONT?: string;
    QSUPATIOCONT?: string;
    CUDVINC?: unknown;
    IFINCA?: unknown;
    ITOMO?: string;
    ISECCI?: string;
    ILIBRO?: unknown;
    IFOLIO?: string;
    IINSC?: unknown;
    QIMPSOL?: string;
    QIMPIVA?: string;
    CIVA?: string;
    MSATZ?: string;
    QIMPTOT?: string;
    PCOGEN?: string;
    CONDITIONS?: CONDITIONS;
}
export interface CONDITIONS {
    item?: ItemConditions | Array<ItemConditions>;
}
export interface ItemConditions {
    ICONDI?: string;
    CCONDI?: string;
    FVALI?: string;
    CVPAGO?: unknown;
    QIMPNET?: string;
    QIMPIVA?: string;
    CIVA?: string;
    QIMPTOT?: string;
    QIMPINT?: string;
    WAERS?: string;
}
export interface FECHAS {
    item?: ItemFechas | Array<ItemFechas>;
}
export interface ItemFechas {
    CCLFECHA?: string;
    FPREVIS?: string;
    FACTUAL?: string;
    FREAL?: string;
}

