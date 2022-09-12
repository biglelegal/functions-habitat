import { combineLatest, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { PromotionHabitat } from '../entities';
import { Address, Asset, GenericPerson } from '../entities/blocks';
import { LegalPerson } from '../entities/blocks/legalPerson';
import { NaturalPerson } from '../entities/blocks/naturalPerson';
import { RegistryData, RepresentativeData } from '../entities/blocks/registryData';
import { LogInfo } from '../entities/logInfo';
import { AddressParams, AssetParams, CheckboxBlockParams, DocType, DocTypeBlock, DurationParams, Field, GenericPersonParams, InputParams, LegalPersonParams, MultiCheckboxParams, MultiInputParams, NaturalPersonParams, PredefConfig, PredefType, RadioBlockParams, RegistryDataParams, RepresentativeDataParams, TableParams, TimeDuration, TimeDurationParams } from '../entities/promotionHabitat';
import { getDocTypeByUid, getPromotionHabitatByUid, setDocumentMainPercentage } from '../utils/firebase';
import { logMessage } from '../utils/utils';
import { getHorizontal } from './compraventa';
import { getReservaSAPData } from './integration/reserva';
import moment = require('moment');

export function getReservaData(logInfo: LogInfo, documentUid: string, promotionUid: string, codigoReserva: string): Observable<any> {

    const errorValidation = validateRequestReserva(codigoReserva, logInfo);
    if (errorValidation) {
        return throwError(errorValidation);
    }
    return getReservaWSData(codigoReserva, promotionUid)
        .pipe(
            switchMap(
                rawData => processReservaData(rawData, codigoReserva)
            ),
            tap(
                reserva => console.log('Data before integrate: ', JSON.stringify(reserva))
            ),
            switchMap(
                processedData => combineLatest([
                    of(processedData),
                    getDocTypeByUid(environment.reservaModelUid)
                ])
            ),
            switchMap(
                ([processedData, docType]) => setMain(documentUid, docType, processedData)
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

export function getReservaWSData(codigoReserva: string, promotionUid: string): Observable<{ reservaData: ReservaData, promotion: PromotionHabitat }> {
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

function processReservaData(data: { reservaData: ReservaData, promotion: PromotionHabitat }, codigoReserva: string): Observable<unknown> {

    if (data.promotion && !data.promotion.active && !data.promotion.activeForFinancial) {
        return throwError(`La promoción ${data.promotion.nombrePromocion} (${data.promotion.codigoPromocion}) está pendiente aprobar por Dpto Legal y por Dpto Financiero`);
    }

    if (data.promotion && !data.promotion.active) {
        return throwError(`La promoción ${data.promotion.nombrePromocion} (${data.promotion.codigoPromocion}) está pendiente aprobar por Dpto Legal`);
    }

    if (data.promotion && !data.promotion.activeForFinancial) {
        return throwError(`La promoción ${data.promotion.nombrePromocion} (${data.promotion.codigoPromocion}) está pendiente aprobar por Dpto Financiero`);
    }
    const compradores: Array<TAB_COMPRADORES_ITEM> = [].concat(data.reservaData.RESERVA.INPUT.TAB_COMPRADORES.item);
    const representantes: Array<TAB_REPRESENTANTESLEGALES_ITEM> = [].concat(data.reservaData.RESERVA.INPUT.TAB_COMPRADORES.item);
    const datosPromocion: TAB_DATOSPROMOCION_ITEM = [].concat(data.reservaData.RESERVA.INPUT.TAB_DATOSPROMOCION.item)[0];
    const unidades: TAB_DATOSPROMOCION_ITEM = [].concat(data.reservaData.RESERVA.INPUT.TAB_DATOSPROMOCION.item)[0];

    return of({
        ...data.promotion,
        codigoReserva: codigoReserva,
        finishedPromotion: data.promotion.faseada ? 'yes' : 'no',
        cv: { genderCv: data.promotion.genderCv, nameCv: data.promotion.nameCv },
        comprador: getReservaCompradores(compradores, representantes),

        // inmueble: getInmuebles(unidades),
        horizontal: getHorizontal(data.promotion.escriturasPublicas),
        promocionNumberViviendas: datosPromocion.NVIVIENDAS,
        promocionNumberTrasteros: datosPromocion.NTRASTEROS,
        promocionNumberPlazas: datosPromocion.NGARAJES,
        promocionNumberLocales: datosPromocion.NLOCALES
    });
}

export function setMain(documentUid: string, docType: DocType, processedData: any): Observable<void> {
    const main: any = Object.assign({}, setValuesImportMap(docType.config.blocks, processedData));
    const control = new ErrorControlValidation();
    docType.config.blocks.forEach(
        block => {
            const blockValidation = checkBlockCompleted(block, main[block.name]);
            control.merge(blockValidation);
        }
    );
    const percentage: number = (1 - (control.validation.invalidFields / control.validation.totalFields)) * 100;
    console.log('setMain main', JSON.stringify(main));

    return setDocumentMainPercentage(documentUid, JSON.parse(JSON.stringify(main || {})), percentage);
}

export function setValuesImportMap(blocks: Array<DocTypeBlock>, oldJSON: any) {
    const newJsonMap = {};
    if (blocks) {
        blocks.forEach(block => {
            const newJsonBlock = {};
            if (block.fields && block.fields.length) {
                block.fields.forEach(field => {
                    getField(field, newJsonBlock, oldJSON);
                });
                newJsonMap[block.name] = newJsonBlock;
            }
            if (block.subBlocks && block.subBlocks.length) {
                Object.assign(newJsonBlock, setValuesImportMap(block.subBlocks, oldJSON));
                newJsonMap[block.name] = newJsonBlock;
            }
            if (block.predefType) {
                newJsonMap[block.name] = getPredefBlockData(block, oldJSON);
            }
        });
    }
    return newJsonMap;
}

function getPredefBlockData(block: DocTypeBlock, oldJSON: any) {
    let newJsonMap = {};
    if (block.multiple) {
        let blockJSON = oldJSON[block.name];
        if (blockJSON) {
            if (!Array.isArray(blockJSON)) {
                blockJSON = [blockJSON];
            }
            newJsonMap = blockJSON.map(
                element => {
                    const rowObj = {};
                    Object.assign(rowObj, getPredefData(block, element));
                    if (block.predefConfig.customFields) {
                        block.predefConfig.customFields.forEach(field => {
                            getField(field, rowObj, element);
                        });
                    }
                    return rowObj;
                }
            );
        } else {
            newJsonMap = [];
        }
    } else {
        Object.assign(newJsonMap, getPredefData(block, oldJSON));

        if (block.predefConfig.customFields) {
            block.predefConfig.customFields.forEach(field => {
                getField(field, newJsonMap, oldJSON);
            });
        }
    }
    return newJsonMap;
}

function getField(field: Field, newJsonBlock: {}, oldJSON: any) {
    newJsonBlock[field.name] = '';
    if (oldJSON) {
        switch (field.type) {
            case 'input':
                if (field.params['type'] === 'number') {
                    newJsonBlock[field.name] = parseFloat(oldJSON[field.importName]) || 0;
                } else {
                    newJsonBlock[field.name] = oldJSON[field.importName] || '';
                }
                break;
            case 'checkbox':
                newJsonBlock[field.params['checkboxList'][0].bindField] = oldJSON[field.importName] || false;
                break;
            case 'calendar':
                newJsonBlock[field.name] = oldJSON[field.importName] ? parseInt(oldJSON[field.importName]) : 0;
                break;
            case 'file':
                newJsonBlock[field.name] = oldJSON[field.importName];
                newJsonBlock[field.name + 'FileId'] = oldJSON[field.importName + 'FileId'];
                newJsonBlock[field.name + 'FileName'] = oldJSON[field.importName + 'FileName'];
                break;
            case 'duration':
                newJsonBlock[field.name] = {};
                ['years', 'months', 'days', 'hours', 'minutes', 'seconds'].forEach(
                    val => {
                        newJsonBlock[field.name][val] = parseInt(oldJSON[field.importName + val.replace(/\b-*(\w)/g, l => l.toUpperCase())]) || 0;
                    }
                );
                break;
            default:
                newJsonBlock[field.name] = oldJSON[field.importName] || '';
                break;
        }
        Object.assign(newJsonBlock, getFieldTypeValues(field, oldJSON));
    }
}

function getFieldTypeValues(field: Field, oldJSON: any) {
    const newJsonBlock = {};
    switch (field.type) {
        case 'radio-block':
            if (field.params) {
                const params = <RadioBlockParams>field.params;
                if (params.radioList) {
                    params.radioList.forEach(radio => {
                        if (radio.block) {
                            Object.assign(newJsonBlock, setValuesImportMap([radio.block], oldJSON));
                        }
                    });
                }
            }
            break;
        case 'checkbox-block':
            if (field.params) {
                const params = <CheckboxBlockParams>field.params;
                if (params.checkboxList) {
                    params.checkboxList.forEach(checkbox => {
                        if (checkbox.block) {
                            Object.assign(newJsonBlock, setValuesImportMap([checkbox.block], oldJSON));
                        }
                    });
                }
            }
            break;
        case 'table':
            if (field.params) {
                const tableParams = <TableParams>field.params;
                const fieldColumns: Array<Field> = tableParams.fieldColumns;
                const tableData = oldJSON[field.importName];
                newJsonBlock[field.name] = [];
                if (!tableData || !tableData.length) {
                    newJsonBlock[field.name] = oldJSON[field.importName];
                } else {
                    tableData.forEach(
                        (row, i) => {
                            const rowObj = {};
                            fieldColumns.forEach(
                                column => {
                                    getField(column, rowObj, row);
                                }
                            );
                            newJsonBlock[field.name].push(rowObj);
                        }
                    );
                }
            }
            break;
    }
    return newJsonBlock;
}

function getPredefData(block: DocTypeBlock, oldJSON: any) {
    const newJsonBlock = {};
    const config = block.predefConfig;
    switch (block.predefType) {
        case 'address':
            Object.assign(newJsonBlock, getAddressData(<AddressParams>config, oldJSON));
            break;
        case 'natural-person':
            Object.assign(newJsonBlock, getNaturalPersonData(<NaturalPersonParams>config, oldJSON));
            break;
        case 'legal-person':
            Object.assign(newJsonBlock, getLegalPersonData(<LegalPersonParams>config, oldJSON));
            break;
        case 'generic-person':
            Object.assign(newJsonBlock, getGenericPersonData(<GenericPersonParams>config, oldJSON));
            break;
        case 'asset':
            Object.assign(newJsonBlock, getAssetData(<AssetParams>config, oldJSON));
            break;
        case 'registry-data':
            Object.assign(newJsonBlock, getRegistryDataData(<RegistryDataParams>config, oldJSON));
            break;
        case 'representative-data':
            Object.assign(newJsonBlock, getRepresentativeDataData(<RepresentativeDataParams>config, oldJSON));
            break;
        default:
            break;
    }
    return newJsonBlock;
}

function getAddressData(config: AddressParams, oldJSON: any) {
    const resBlock = {};
    ['streetType', 'street', 'number', 'stair', 'floor', 'door', 'city', 'province', 'cp', 'country', 'district', 'department']
        .forEach(
            field => {
                if (config[field] && config[field].name) {
                    getField(config[field], resBlock, oldJSON);
                }
            }
        );
    return resBlock;
}

function getNaturalPersonData(config: NaturalPersonParams, oldJSON: any) {
    const resBlock = {};
    ['gender', 'name', 'lastName1', 'lastName2', 'nationality', 'identificationType', 'identificationNumber', 'phoneNumber', 'cellPhoneNumber', 'email', 'expeditionCountry', 'expirationDate', 'civilStatus', 'marriedStatus', 'profession', 'birthPlace', 'birthDate', 'ownName']
        .forEach(
            field => {
                if (config[field] && config[field].name) {
                    getField(config[field], resBlock, oldJSON);
                }
            }
        );
    if (config.addressBlock) {
        resBlock['address'] = getPredefBlockData(DocTypeBlock.getPredefBlock(config.addressConfig, 'address', 'address'), oldJSON);
    }
    return resBlock;
}

function getRepresentativeDataData(config: RepresentativeDataParams, oldJSON: any) {
    const resBlock = {};
    ['gender', 'name', 'lastName1', 'lastName2', 'nationality', 'identificationType', 'identificationNumber', 'phoneNumber', 'cellPhoneNumber', 'email', 'expeditionCountry', 'expirationDate', 'civilStatus', 'marriedStatus', 'profession', 'birthPlace', 'birthDate', 'infinitePower', 'sameAddressCompany']
        .forEach(
            field => {
                if (config[field] && config[field].name) {
                    getField(config[field], resBlock, oldJSON);
                }
            }
        );
    if (config.addressBlock) {
        resBlock['address'] = getPredefBlockData(DocTypeBlock.getPredefBlock(config.addressConfig, 'address', 'address'), oldJSON);
    }
    if (config.representativePowerBlock && config.representativePowerConfig) {
        resBlock['representativePower'] = getPredefBlockData(DocTypeBlock.getPredefBlock(config.representativePowerConfig, 'registry-data', 'representativePower'), oldJSON);
    }
    return resBlock;
}

function getLegalPersonData(config: LegalPersonParams, oldJSON: any) {
    const resBlock = {};
    ['socialDenomination', 'comercialDenomination', 'identificationType', 'identificationNumber', 'phoneNumber', 'email', 'emailAux', 'expeditionCountry', 'uniSociety', 'corporateForm', 'realOwnership', 'typeRepresentativePower', 'logo']
        .forEach(
            field => {
                if (config[field] && config[field].name) {
                    getField(config[field], resBlock, oldJSON);
                }
            }
        );
    if (config.socialAddressBlock && config.socialAddressConfig) {
        resBlock['socialAddress'] = getPredefBlockData(DocTypeBlock.getPredefBlock(config.socialAddressConfig, 'address', 'socialAddress'), oldJSON);
    }
    if (config.constitutionBlock && config.constitutionConfig) {
        resBlock['constitution'] = getPredefBlockData(DocTypeBlock.getPredefBlock(config.constitutionConfig, 'registry-data', 'constitution'), oldJSON);
        resBlock['constitution'] = getRegistryDataData(config.constitutionConfig, oldJSON);
    }
    if (config.representativeBlock && config.representativeConfig) {
        resBlock['representative'] = getPredefBlockData(DocTypeBlock.getPredefBlock(config.representativeConfig, 'natural-person', 'representative'), oldJSON);
    }
    if (config.newRepresentativeBlock && config.newRepresentativeConfig) {
        resBlock['newRepresentative'] = getPredefBlockData(DocTypeBlock.getPredefBlock(config.newRepresentativeConfig, 'representative-data', 'newRepresentative'), oldJSON);
    }
    if (config.representativePowerBlock && config.representativePowerConfig) {
        resBlock['representativePower'] = getPredefBlockData(DocTypeBlock.getPredefBlock(config.representativePowerConfig, 'registry-data', 'representativePower'), oldJSON);
    }
    return resBlock;
}

function getGenericPersonData(config: GenericPersonParams, oldJSON: any) {
    const resBlock = {};
    ['personType']
        .forEach(
            field => {
                if (config[field] && config[field].name) {
                    getField(config[field], resBlock, oldJSON);
                }
            }
        );
    if (config.naturalPersonConfig && oldJSON[config.personType.importName] === 'naturalPerson') {
        resBlock['naturalPerson'] = getPredefBlockData(DocTypeBlock.getPredefBlock(config.naturalPersonConfig, 'natural-person', 'naturalPerson'), oldJSON);
    }
    if (config.legalPersonConfig && oldJSON[config.personType.importName] === 'legalPerson') {
        resBlock['legalPerson'] = getPredefBlockData(DocTypeBlock.getPredefBlock(config.legalPersonConfig, 'legal-person', 'legalPerson'), oldJSON);
    }
    return resBlock;
}

function getAssetData(config: AssetParams, oldJSON: any) {
    const resBlock = {};
    ['surface', 'assetType', 'solarDescription', 'buildingDenomination', 'buildingComponents', 'assetDescription', 'projectStatus', 'occupancyCertificate', 'energyCertificate', 'description', 'participationCuote', 'propertyType', 'priceWithIva', 'priceWithoutIva', 'alternativePriceIva', 'alternativePriceWithoutIva', 'Iva', 'charges', 'propertyReference']
        .forEach(
            field => {
                if (config[field] && config[field].present) {
                    getField(config[field], resBlock, oldJSON);
                }
            }
        );
    if (config.licenseBlock) {
        ['merchantLicense', 'cityHallLicense', 'dateLicense']
            .forEach(
                field => {
                    if (config[field] && config[field].present) {
                        getField(config[field], resBlock, oldJSON);
                    }
                }
            );
    }
    if (config.addressConfig && config.addressBlock) {
        resBlock['address'] = getPredefBlockData(DocTypeBlock.getPredefBlock(config.addressConfig, 'address', 'address'), oldJSON);
    }
    if (config.registryDataConfig && config.registryDataBlock) {
        resBlock['registryData'] = getPredefBlockData(DocTypeBlock.getPredefBlock(config.registryDataConfig, 'registry-data', 'registryData'), oldJSON);
    }
    if (config.architectConfig && config.architectBlock) {
        resBlock['architect'] = getPredefBlockData(DocTypeBlock.getPredefBlock(config.architectConfig, 'natural-person', 'address'), oldJSON);
    }
    return resBlock;
}

function getRegistryDataData(config: RegistryDataParams, oldJSON: any) {
    const resBlock = {};
    if (config.notaryBlock) {
        ['notaryGender', 'notaryName', 'notaryLastName1', 'notaryLastName2', 'notaryCity', 'grantingDate', 'protocolNumber']
            .forEach(
                field => {
                    if (config[field] && config[field].name) {
                        getField(config[field], resBlock, oldJSON);
                    }
                }
            );
    }
    if (config.registryBlock) {
        ['registryCity', 'registryNumber', 'registryVolume', 'registryBook', 'registryPage', 'registrySheet', 'registryInscription', 'registryPropertyNumber', 'registryCatastralReference']
            .forEach(
                field => {
                    if (config[field] && config[field].present) {
                        getField(config[field], resBlock, oldJSON);
                    }
                }
            );
    }
    return resBlock;
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

function getReservaCompradores(compradores: Array<TAB_COMPRADORES_ITEM>, representantes: Array<TAB_REPRESENTANTESLEGALES_ITEM>): any {
    return compradores.map(
        comprador => ({
            compradorPercentage: comprador.PORCENTAJECOMPRA,
            compradorPersonType: comprador.PERSONAFISICAJURIDICA === 'Persona Jurídica' ? 'legalPerson' : 'naturalPerson',
            compradorRegimen: getCompradorRegimen(comprador.ESTADOCIVIL),
            compradorGender: comprador.TRATAMIENTO === 'Doña' ? 'F' : 'M',
            compradorName: comprador.CONTFULLNAME,
            compradorPhoneNumber: comprador.CONTTELEPHONE1,
            compradorIdentificationNumber: comprador.CONTDNI,
            compradorEmail: comprador.CONTEMAILADDRESS1,
            compradorStreet: comprador.CONTADDRESS1_LINE1,
            nombreNotarioConstitucion: comprador.CONTNOMBRENOTARIO,
            fechaConstitucion: comprador.CONTFECHACONSTITUCION,
            numeroProtocoloConstitucion: comprador.CONTNPROTOCOLO,
            registryCityConstitucion: comprador.CONTREGISTROMERCANTIL,
            tomoConstitucion: comprador.CONTTOMO,
            libroConstitucion: comprador.CONTLIBRO,
            folioConstitucion: comprador.CONTFOLIO,
            hojaConstitucion: comprador.CONTHOJA,
            compradorTypeRepresentativePower: representantes.some(x => x.TIPOREPRESENTANTELEGAL === 'Administrador') ? 'yes' : 'no',
            representado: getCompradorRepresentates(representantes)
        })
    )
}

function getCompradorRepresentates(representantes: Array<TAB_REPRESENTANTESLEGALES_ITEM>): any {
    return representantes.map(
        representate => ({
            compradorGender: representate.TRATAMIENTO === 'Doña' ? 'F' : 'M',
            nombreRepreComprador: representate.CONTFULLNAME,
            numeroIdentificacionRepreComprador: representate.CONTDNI,
            nombreNotarioRepreComprador: representate.NOMBRENOTARIO,
            numeroProtocoloRepreComprador: representate.NUMEROPROTOCOLO,
            lugarNotariaRepreComprador: representate.CIUDADNOTARIO,
            fechaOtorgamientoRepreComprador: moment(representate.FECHAESCRITURACIONAPODERAMIENTO, 'YYYY-MM-DD').valueOf()
        })
    )
}

function getCompradorRegimen(estadoCivil: string): string {
    switch (estadoCivil) {
        case 'Soltero/a':
            return 'no';
        case 'Regimen':
            return 'regimen';
        default:
            return 'no';
    }
}

export class ErrorControlValidation {
    errorControl?: ErrorControl;
    validation: Validation = new Validation();
    merge(res: BlockErrorValidation) {
        this.validation.merge(res.validation);
        if (!res.blockError) {
            return;
        }
        if (!this.errorControl) {
            this.errorControl = new ErrorControl();
        }
        this.errorControl.merge(res.blockError);
    }
}
export class BlockErrorValidation {
    blockError?: BlockError;
    validation: Validation = new Validation();
    merge(res: BlockErrorValidation) {
        this.validation.merge(res.validation);
        if (!res.blockError) {
            return;
        }
        if (!this.blockError) {
            this.blockError = new BlockError();
        }
        this.blockError.merge(res.blockError);
    }
    mergeFieldError(res: FieldErrorValidation) {
        this.validation.merge(res.validation);
        if (!res.fieldError) {
            return;
        }
        if (!this.blockError) {
            this.blockError = new BlockError();
        }
        this.blockError.mergeField(res.fieldError);
    }
    mergeSubBlockError(res: BlockErrorValidation) {
        this.validation.merge(res.validation);
        if (!res.blockError) {
            return;
        }
        if (!this.blockError) {
            this.blockError = new BlockError();
        }
        this.blockError.mergeSubBlock(res.blockError);
    }
}
export class FieldErrorValidation {
    fieldError?: FieldError;
    validation: Validation = new Validation();
    constructor(validation?: Validation, fieldError?: FieldError) {
        this.validation = validation || new Validation();
        this.fieldError = fieldError;
    }
    mergeFieldError(res: FieldErrorValidation) {
        this.validation.merge(res.validation);
        this.fieldError = res.fieldError;
    }
    mergeBlockError(res: BlockErrorValidation) {
        this.validation.merge(res.validation);
        if (!res.blockError) {
            return;
        }
        if (!this.fieldError) {
            this.fieldError = new FieldError();
        }
        this.fieldError.mergeSubBlock(res.blockError);
    }
}
export class Validation {
    name: string = '';
    valid: boolean = true;
    completed: boolean = true;
    totalFields: number = 0;
    invalidFields: number = 0;
    merge(validation: Validation) {
        this.valid = this.valid && validation.valid;
        this.completed = this.completed && validation.completed;
        this.totalFields += validation.totalFields;
        this.invalidFields += validation.invalidFields;
    }
}

export class ErrorControl {
    subBlocks: Array<BlockError> = new Array<BlockError>();
    merge(error: BlockError) {
        if (!error) {
            return;
        }
        this.subBlocks = [...this.subBlocks, error];
    }
}

export class BlockError {
    name: string = '';
    title: string = '';
    index: number = null;
    subBlocks: Array<BlockError> = new Array<BlockError>();
    fields: Array<FieldError> = new Array<FieldError>();
    merge(error: BlockError) {
        if (!error) {
            return;
        }
        this.name = this.name || error.name;
        this.title = this.title || error.title;
        this.index = this.index || error.index;
        this.subBlocks = [...this.subBlocks, ...error.subBlocks];
        this.fields = [...this.fields, ...error.fields];
    }
    mergeSubBlock(error: BlockError) {
        if (!error) {
            return;
        }
        this.subBlocks = [...this.subBlocks, error];
    }
    mergeField(error: FieldError) {
        if (!error) {
            return;
        }
        this.fields = [...this.fields, error];
    }
}

export class FieldError {
    name: string = '';
    title: string = '';
    index: number = null;

    errorType: ErrorControlType;
    subBlocks: Array<BlockError> = new Array<BlockError>();
    mergeSubBlock(error: BlockError) {
        if (!error) {
            return;
        }
        this.subBlocks = [...this.subBlocks, error];
    }
}

export enum ErrorControlType {
    REQUIRED_FIELD = 'REQUIRED_FIELD',
    PATTERN_ERROR = 'PATTERN_ERROR'
}

export function checkBlockCompleted(block: DocTypeBlock, data: any, index?: number): BlockErrorValidation {
    const res = new BlockErrorValidation();
    if (block.fields) {
        checkBlockFieldsData(block.fields, data, res);
    }
    if (block.subBlocks) {
        checkBlocksData(block.subBlocks, data, res, block.name, block.title, index);
    }
    if (block.predefType) {
        checkPredefBlockData(block, data, res, block.name, block.title);
    }
    if (data) {
        data.validation = res.validation;
    }
    if (res.blockError) {
        res.blockError.name = block.name;
        res.blockError.title = block.title;
    }
    return res;
}

export function checkBlockFieldsData(fields: Array<Field>, data: any, blockRes: BlockErrorValidation) {
    const res = new BlockErrorValidation();
    fields.forEach(field => {
        res.mergeFieldError(checkField(field, data));
    });
    blockRes.merge(res);
}

export function checkBlocksData(blocks: Array<DocTypeBlock>, data: any, blockRes: BlockErrorValidation, blockName: string, blockTitle: string, blockIndex?: number) {
    const res = new BlockErrorValidation();
    blocks.forEach((subBlock, index) => {
        if (subBlock.multiple) {
            if (isEmpty(data[subBlock.name]) || !isArray(data[subBlock.name])) {
                data[subBlock.name] = [{}];
            }
        } else {
            if (isEmpty(data[subBlock.name])) {
                data[subBlock.name] = {};
            }
        }
        res.mergeSubBlockError(checkBlockCompleted(subBlock, data[subBlock.name]));
    });
    blockRes.merge(res);
}

export function checkPredefBlockData(block: DocTypeBlock, data: any, blockRes: BlockErrorValidation, blockName: string, blockTitle: string) {
    if (block.multiple) {
        data.forEach((element, index) => {
            blockRes.mergeSubBlockError(checkBlockPredef(block.predefType, block.predefConfig, element, blockName, blockTitle, index + 1));
        });
    } else {
        blockRes.mergeSubBlockError(checkBlockPredef(block.predefType, block.predefConfig, data, blockName, blockTitle));
    }
}


export function checkBlockPredef(predefType: PredefType, predefConfig: PredefConfig, data: any, blockName: string, blockTitle: string, index?: number): BlockErrorValidation {
    const res: BlockErrorValidation = new BlockErrorValidation();
    switch (predefType) {
        case 'natural-person':
            res.merge(getNaturalPersonValidation(data, predefConfig as NaturalPersonParams));
            break;
        case 'legal-person':
            res.merge(getLegalPersonValidation(data, predefConfig as LegalPersonParams));
            break;
        case 'address':
            res.merge(getAddressValidation(data, predefConfig as AddressParams));
            break;
        case 'representative-data':
            res.merge(getRepresentativeDataValidation(data, predefConfig as RepresentativeDataParams));
            break;
        case 'registry-data':
            res.merge(getRegistryDataValidation(data, predefConfig as RegistryDataParams));
            break;
        case 'generic-person':
            res.merge(getGenericPersonValidation(data, predefConfig as GenericPersonParams));
            break;
        case 'asset':
            res.merge(getAssetValidation(data, predefConfig as AssetParams));
            break;
        case 'time-duration':
            res.merge(getTimeDurationValidation(data, predefConfig as TimeDurationParams));
            break;
    }
    if (predefConfig.customFields) {
        checkBlockFieldsData(predefConfig.customFields, data, res);
    }
    data.validation = res.validation;
    if (res.blockError) {
        res.blockError.name = blockName;
        res.blockError.title = blockTitle;
        res.blockError.index = index || null;
    }
    return res;
}
export function getAddressValidation(data: Address, predefConfig: PredefConfig): BlockErrorValidation {
    const res = new BlockErrorValidation();
    const config = <AddressParams>predefConfig;
    if (!data) {
        res.validation.invalidFields = 1;
        res.validation.totalFields = 1;
        res.validation.valid = false;
    } else {
        if (isEmpty(data)) {
            mergeParams(data, new Address());
        }
        res.mergeSubBlockError(checkAddressFields(config, data));
        data.validation = res.validation;
    }
    return res;
}
export function getNaturalPersonValidation(data: NaturalPerson, predefConfig: PredefConfig): BlockErrorValidation {
    const res = new BlockErrorValidation();
    const config = <NaturalPersonParams>predefConfig;
    if (!data) {
        res.validation.invalidFields = 1;
        res.validation.totalFields = 1;
        res.validation.valid = false;
    } else {
        if (isEmpty(data)) {
            mergeParams(data, new NaturalPerson());
        }
        res.mergeSubBlockError(checkNaturalPersonFields(config, data));
        if (config.addressBlock) {
            const addressRes = new BlockErrorValidation();
            checkPredefBlockData(DocTypeBlock.getPredefBlock(config.addressConfig, 'address', 'address'), data.address, addressRes, 'address', config.addressTitle);
            res.mergeSubBlockError(addressRes);
        }
        data.validation = res.validation;
    }
    return res;
}
export function getRepresentativeDataValidation(data: RepresentativeData, predefConfig: PredefConfig): BlockErrorValidation {
    const res = new BlockErrorValidation();
    const config = <RepresentativeDataParams>predefConfig;
    if (!data) {
        res.validation.invalidFields = 1;
        res.validation.totalFields = 1;
        res.validation.valid = false;
    } else {
        if (isEmpty(data)) {
            mergeParams(data, new RepresentativeData());
        }
        res.mergeSubBlockError(checkRepresentativeDataFields(config, data));
        if (config.addressBlock && !data.sameAddress) {
            const addressRes = new BlockErrorValidation();
            checkPredefBlockData(DocTypeBlock.getPredefBlock(config.addressConfig, 'address', 'address'), data.address, addressRes, 'address', config.addressTitle);
            res.mergeSubBlockError(addressRes);
        }
        if (config.representativePowerBlock) {
            const representativePowerRes = new BlockErrorValidation();
            checkPredefBlockData(DocTypeBlock.getPredefBlock(config.representativePowerConfig, 'registry-data', 'representativePower'), data.representativePower, representativePowerRes, 'representativePower', config.representativePowerTitle);
            res.mergeSubBlockError(representativePowerRes);
        }
        data.validation = res.validation;
    }
    return res;
}

export function getRegistryDataValidation(data: RegistryData, predefConfig: PredefConfig): BlockErrorValidation {
    const res = new BlockErrorValidation();
    const config = <RegistryDataParams>predefConfig;
    if (!data) {
        res.validation.invalidFields = 1;
        res.validation.totalFields = 1;
        res.validation.valid = false;
    } else {
        if (isEmpty(data)) {
            mergeParams(data, new RegistryData());
        }
        res.merge(checkRegistryDataFields(config, data));
        data.validation = res.validation;
    }
    return res;
}

export function getLegalPersonValidation(data: LegalPerson, predefConfig: PredefConfig): BlockErrorValidation {
    const res = new BlockErrorValidation();
    const config = <LegalPersonParams>predefConfig;
    if (!data) {
        res.validation.invalidFields = 1;
        res.validation.totalFields = 1;
        res.validation.valid = false;
    } else {
        if (isEmpty(data)) {
            mergeParams(data, new LegalPerson());
        }
        res.mergeSubBlockError(checkLegalPersonFields(config, data));
        if (config.socialAddressBlock) {
            const socialAddressRes = new BlockErrorValidation();
            checkPredefBlockData(DocTypeBlock.getPredefBlock(config.socialAddressConfig, 'address', 'socialAddress'), data.socialAddress, socialAddressRes, 'socialAddress', config.socialAddressTitle);
            res.mergeSubBlockError(socialAddressRes);
        }
        if (config.constitutionBlock) {
            const constitutionRes = new BlockErrorValidation();
            checkPredefBlockData(DocTypeBlock.getPredefBlock(config.constitutionConfig, 'registry-data', 'constitution'), data.constitution, constitutionRes, 'constitution', config.constitutionTitle);
            res.mergeSubBlockError(constitutionRes);
        }
        if (config.representativeBlock) {
            const representativeRes = new BlockErrorValidation();
            checkPredefBlockData(DocTypeBlock.getPredefBlock(config.representativeConfig, 'natural-person', 'representative'), data.representative, representativeRes, 'representative', config.representativeTitle);
            res.mergeSubBlockError(representativeRes);
        }
        if (config.newRepresentativeBlock) {
            const newRepresentativeRes = new BlockErrorValidation();
            checkPredefBlockData(DocTypeBlock.getPredefBlock(config.newRepresentativeConfig, 'representative-data', 'newRepresentative'), data.newRepresentative, newRepresentativeRes, 'newRepresentative', config.otherRrepresentativeTitle);
            res.mergeSubBlockError(newRepresentativeRes);
        }
        if (config.representativePowerBlock) {
            const representativePowerRes = new BlockErrorValidation();
            checkPredefBlockData(DocTypeBlock.getPredefBlock(config.representativePowerConfig, 'registry-data', 'representativePower'), data.representativePower, representativePowerRes, 'representativePower', config.representativePowerTitle);
            res.mergeSubBlockError(representativePowerRes);
        }
        if (config.typeRepresentativePower && config.typeRepresentativePower.present && config.typeRepresentativePower.params.required) {
            if (config.representativeBlock) {
                const typePowerRes: FieldErrorValidation = checkField(config.typeRepresentativePower, data);
                res.mergeFieldError(typePowerRes);
                data.representative.validation.merge(typePowerRes.validation);
            }
            if (config.newRepresentativeBlock) {
                const typePowerRes: FieldErrorValidation = checkField(config.typeRepresentativePower, data);
                res.mergeFieldError(typePowerRes);
                data.newRepresentative.validation.merge(typePowerRes.validation);
            }

        }
        data.validation = res.validation;
    }
    return res;
}
export function getGenericPersonValidation(data: GenericPerson, predefConfig: PredefConfig): BlockErrorValidation {
    const res = new BlockErrorValidation();
    const config = <GenericPersonParams>predefConfig;
    if (!data) {
        res.validation.invalidFields = 1;
        res.validation.totalFields = 1;
        res.validation.valid = false;
    } else {
        if (isEmpty(data)) {
            mergeParams(data, new GenericPerson());
        }
        res.merge(checkGenericPersonFields(config, data));
        if (config.naturalPersonConfig && data.personType === 'naturalPerson') {
            const naturalRes = new BlockErrorValidation();
            checkPredefBlockData(DocTypeBlock.getPredefBlock(config.naturalPersonConfig, 'natural-person', 'naturalPerson'), data.naturalPerson, naturalRes, 'naturalPerson', config.naturalTitle);
            res.mergeSubBlockError(naturalRes);
            data.naturalPerson.validation.merge(naturalRes.validation);
        }
        if (config.legalPersonConfig && data.personType === 'legalPerson') {
            const legalRes: BlockErrorValidation = new BlockErrorValidation();
            checkPredefBlockData(DocTypeBlock.getPredefBlock(config.legalPersonConfig, 'legal-person', 'legalPerson'), data.legalPerson, legalRes, 'legalPerson', config.legalTitle);
            res.mergeSubBlockError(legalRes);
            data.legalPerson.validation.merge(legalRes.validation);
        }
        data.validation = res.validation;
    }
    return res;
}
export function getAssetValidation(data: Asset, predefConfig: PredefConfig): BlockErrorValidation {
    const res = new BlockErrorValidation();
    const config = <AssetParams>predefConfig;
    if (!data) {
        res.validation.invalidFields = 1;
        res.validation.totalFields = 1;
        res.validation.valid = false;
    } else {
        if (isEmpty(data)) {
            mergeParams(data, new Asset());
        }
        res.mergeSubBlockError(checkAssetFields(config, data));
        if (config.addressBlock) {
            const addressRes = new BlockErrorValidation();
            checkPredefBlockData(DocTypeBlock.getPredefBlock(config.addressConfig, 'address', 'address'), data.address, addressRes, 'address', config.addressTitle);
            res.mergeSubBlockError(addressRes);
        }
        if (config.registryDataBlock) {
            const registryDataRes = new BlockErrorValidation();
            checkPredefBlockData(DocTypeBlock.getPredefBlock(config.registryDataConfig, 'registry-data', 'registryData'), data.registryData, registryDataRes, 'registryData', config.registryDataTitle);
            res.mergeSubBlockError(registryDataRes);
        }
        if (config.architectBlock && (!config.projectStatus.present || data.projectStatus !== 'builded')) {
            const arquitectRes: BlockErrorValidation = new BlockErrorValidation();
            checkPredefBlockData(DocTypeBlock.getPredefBlock(config.architectConfig, 'natural-person', 'architect'), data.architect, arquitectRes, 'architect', config.naturalPersonTitle);
            res.mergeSubBlockError(arquitectRes);
            data.architect.validation.merge(arquitectRes.validation);
        }
        data.validation = res.validation;
    }
    return res;
}
export function getTimeDurationValidation(data: TimeDuration, predefConfig: PredefConfig): BlockErrorValidation {
    const res = new BlockErrorValidation();
    const config = <TimeDurationParams>predefConfig;
    if (!data) {
        res.validation.invalidFields = 1;
        res.validation.totalFields = 1;
        res.validation.valid = false;
    } else {
        if (isEmpty(data)) {
            mergeParams(data, new TimeDuration());
        }
        res.merge(checkTimeDurationFields(config, data));
        data.validation = res.validation;
    }
    return res;
}

export function checkNaturalPersonFields(config: NaturalPersonParams, data: NaturalPerson): BlockErrorValidation {
    const res = new BlockErrorValidation();
    if (isEmpty(data)) {
        mergeParams(data, new NaturalPerson());
    }
    if (data) {
        ['gender', 'name', 'lastName1', 'lastName2', 'nationality', 'phoneNumber', 'cellPhoneNumber', 'email', 'identificationType', 'expeditionCountry', 'expirationDate', 'civilStatus', 'profession', 'birthPlace', 'birthDate', 'ownName']
            .forEach(
                field => {
                    if (config[field] && config[field].present && config[field].params.required) {
                        res.mergeFieldError(checkField(config[field], data));
                    }
                }
            );
        if (config.identificationNumber && config.identificationNumber.present) {
            if (!config.preventIdentificationValidation) {
                res.mergeFieldError(checkFieldPattern(data.identificationNumber, patternMap[data.identificationType], config.identificationNumber.params.required, config.identificationNumber.importName, config.identificationNumber.params.title));
                res.mergeFieldError(checkLetter(data.identificationNumber, data.identificationType, config.identificationNumber.importName, config.identificationNumber.params.title));
                if (data.identificationType === 'PASSPORTNIE' || data.identificationType === 'DOCUMENTNIE') {
                    res.mergeFieldError(checkFieldPattern(data.identificationNumberAux, patternMap['NIE'], config.identificationNumber.params.required, config.identificationNumber.importName, config.identificationNumber.params.title));
                    res.mergeFieldError(checkLetter(data.identificationNumberAux, 'NIE', config.identificationNumber.importName, config.identificationNumber.params.title));
                }
            } else {
                if (config.identificationNumber.params.required) {
                    res.mergeFieldError(checkFieldRequired(data.identificationNumber, config.identificationNumber.importName, config.identificationNumber.params.title));
                }
            }
        }
        if (config.marriedStatus && config.marriedStatus.present && config.marriedStatus.params.required && data.civilStatus === 'MARRIED') {
            res.mergeFieldError(checkFieldRequired(data.marriedStatus, config.marriedStatus.importName, config.marriedStatus.params.title));
        }
    }
    if (res.blockError) {
        res.blockError.name = 'naturalPersonFields';
        res.blockError.title = config.personTitle;
    }
    return res;
}

export function checkRepresentativeDataFields(config: RepresentativeDataParams, data: RepresentativeData): BlockErrorValidation {
    const res = new BlockErrorValidation();
    if (data) {
        ['gender', 'name', 'lastName1', 'lastName2', 'nationality', 'phoneNumber', 'cellPhoneNumber', 'email', 'identificationType', 'expeditionCountry', 'expirationDate', 'civilStatus', 'profession', 'birthPlace', 'birthDate', 'infinitePower', 'sameAddressCompany']
            .forEach(
                field => {
                    if (config[field] && config[field].present && config[field].params.required) {
                        res.mergeFieldError(checkField(config[field], data));
                    }
                }
            );
        if (config.identificationNumber && config.identificationNumber.present) {
            if (!config.preventIdentificationValidation) {
                res.mergeFieldError(checkFieldPattern(data.identificationNumber, patternMap[data.identificationType], config.identificationNumber.params.required, config.identificationNumber.importName, config.identificationNumber.params.title));
                res.mergeFieldError(checkLetter(data.identificationNumber, data.identificationType, config.identificationNumber.importName, config.identificationNumber.params.title));
                if (data.identificationType === 'PASSPORTNIE' || data.identificationType === 'DOCUMENTNIE') {
                    res.mergeFieldError(checkFieldPattern(data.identificationNumberAux, patternMap['NIE'], config.identificationNumber.params.required, config.identificationNumber.importName, config.identificationNumber.params.title));
                    res.mergeFieldError(checkLetter(data.identificationNumberAux, 'NIE', config.identificationNumber.importName, config.identificationNumber.params.title));
                }
            } else {
                if (config.identificationNumber.params.required) {
                    res.mergeFieldError(checkFieldRequired(data.identificationNumber, config.identificationNumber.importName, config.identificationNumber.params.title));
                }
            }
        }
        if (config.marriedStatus && config.marriedStatus.present && config.marriedStatus.params.required && data.civilStatus === 'MARRIED') {
            res.mergeFieldError(checkFieldRequired(data.marriedStatus, config.identificationNumber.importName, config.identificationNumber.params.title));
        }
    }
    if (res.blockError) {
        res.blockError.name = 'representativeDataFields';
        res.blockError.title = config.identificationTitle;
    }
    return res;
}
export function checkAddressFields(config: AddressParams, data: Address): BlockErrorValidation {
    const res = new BlockErrorValidation();
    if (data) {
        ['number', 'street', 'floor', 'door', 'city', 'province', 'cp', 'country', 'district', 'department']
            .forEach(field => {
                if (config[field] && config[field].present && config[field].params.required) {
                    res.mergeFieldError(checkField(config[field], data));
                }
            });
    }
    if (res.blockError) {
        res.blockError.name = 'addressFields';
        res.blockError.title = config.addressTitle;
    }
    return res;
}
export function checkRegistryDataFields(config: RegistryDataParams, data: RegistryData): BlockErrorValidation {
    const res = new BlockErrorValidation();
    if (data) {
        if (config.notaryBlock) {
            ['notaryGender', 'notaryName', 'notaryLastName1', 'notaryLastName2', 'notaryCity', 'grantingDate', 'protocolNumber']
                .forEach(field => {
                    if (config[field] && config[field].present && config[field].params.required) {
                        res.mergeFieldError(checkField(config[field], data));
                    }
                });
        }
        if (config.registryBlock) {
            ['registryCity', 'registryNumber', 'registryVolume', 'registryBook', 'registryPage', 'registrySheet', 'registryInscription', 'registryPropertyNumber', 'registryCatastralReference']
                .forEach(field => {
                    if (config[field] && config[field].present && config[field].params.required) {
                        res.mergeFieldError(checkField(config[field], data));
                    }
                });
        }
    }
    return res;
}
export function checkLegalPersonFields(config: LegalPersonParams, data: LegalPerson): BlockErrorValidation {
    const res = new BlockErrorValidation();
    if (data) {
        ['socialDenomination', 'comercialDenomination', 'identificationType', 'expeditionCountry', 'uniSociety', 'corporateForm', 'realOwnership', 'phoneNumber', 'nationality', 'email', 'emailAux']
            .forEach(
                field => {
                    if (config[field] && config[field].present && config[field].params.required) {
                        res.mergeFieldError(checkField(config[field], data));
                    }
                }
            );
        if (config.identificationNumber && config.identificationNumber.present) {
            if (!config.preventIdentificationValidation) {
                res.mergeFieldError(checkFieldPattern(data.identificationNumber, patternMap[data.identificationType], config.identificationNumber.params.required, config.identificationNumber.importName, config.identificationNumber.params.title));
                res.mergeFieldError(checkLetter(data.identificationNumber, data.identificationType, config.identificationNumber.importName, config.identificationNumber.params.title));
            } else {
                if (config.identificationNumber.params.required) {
                    res.mergeFieldError(checkFieldRequired(data.identificationNumber, config.identificationNumber.importName, config.identificationNumber.params.title));
                }
            }
        }
    }
    if (res.blockError) {
        res.blockError.name = 'legalPersonFields';
        res.blockError.title = config.identificationTitle;
    }
    return res;
}
export function checkGenericPersonFields(config: GenericPersonParams, data: GenericPerson): BlockErrorValidation {
    const res = new BlockErrorValidation();
    if (data) {
        ['personType']
            .forEach(
                field => {
                    if (config[field] && config[field].present && config[field].params.required) {
                        res.mergeFieldError(checkField(config[field], data));
                    }
                }
            );
    }
    return res;
}
export function checkAssetFields(config: AssetParams, data: Asset): BlockErrorValidation {
    const res = new BlockErrorValidation();
    if (data) {
        ['surface', 'assetType', 'solarDescription', 'buildingDenomination', 'buildingComponents', 'assetDescription', 'projectStatus', 'occupancyCertificate', 'energyCertificate', 'description', 'participationCuote', 'propertyType', 'priceWithIva', 'priceWithoutIva', 'alternativePriceIva', 'alternativePriceWithoutIva', 'Iva', 'charges', 'propertyReference']
            .forEach(
                field => {
                    if (config[field] && config[field].present && config[field].params.required) {
                        res.mergeFieldError(checkField(config[field], data));
                    }
                }
            );
    }
    if (config.licenseBlock) {
        ['merchantLicense', 'cityHallLicense', 'dateLicense']
            .forEach(
                field => {
                    if (config[field] && config[field].present && config[field].params.required) {
                        res.mergeFieldError(checkField(config[field], data));
                    }
                }
            );
    }
    return res;
}
export function checkTimeDurationFields(config: TimeDurationParams, data: TimeDuration): BlockErrorValidation {
    const res = new BlockErrorValidation();
    if (data) {
        ['initDate', 'endDate', 'duration']
            .forEach(
                field => {
                    if (config[field] && config[field].present) {
                        res.mergeFieldError(checkField(config[field], data));
                    }
                }
            );
    }
    return res;
}

export function checkField(field: Field, data: any): FieldErrorValidation {
    const res = new FieldErrorValidation();
    switch (field.type) {
        case 'radio-block':
            if (!data[field.name]) {
                data[field.name] = {};
            }
            res.mergeFieldError(checkFieldCompleted(field, data[field.name]));
            if (field.params) {
                const params = <RadioBlockParams>field.params;
                if (params.radioList) {
                    params.radioList.forEach(radio => {
                        radio.selected = radio.value === data[field.name];
                        if (radio.selected && radio.block) {
                            if (!data[radio.block.name]) {
                                data[radio.block.name] = {};
                            }
                            res.mergeBlockError(checkBlockCompleted(<DocTypeBlock>radio.block, data[radio.block.name]));
                        }
                    });
                }
            }
            if (res.fieldError) {
                res.fieldError.name = field.name;
                res.fieldError.title = field.params.title;
            }
            break;
        case 'checkbox-block':
            if (!data[field.name]) {
                data[field.name] = {};
            }
            if (field.params) {
                const checkBlockParams = <CheckboxBlockParams>field.params;
                if (checkBlockParams.checkboxList) {
                    let oneChecked: boolean = false;
                    let allChecked: boolean = true;
                    let checkedFields: number = 0;
                    checkBlockParams.checkboxList.forEach(checkbox => {
                        if (data[field.name][checkbox.bindField]) {
                            oneChecked = true;
                            checkedFields++;
                            if (checkbox.block) {
                                if (!data[checkbox.block.name]) {
                                    data[checkbox.block.name] = {};
                                }
                                res.mergeBlockError(checkBlockCompleted(<DocTypeBlock>checkbox.block, data[checkbox.block.name]));
                            }
                        } else {
                            allChecked = false;
                        }
                    });
                    if (checkBlockParams.required) {
                        const checkValidation: Validation = new Validation();
                        if (checkBlockParams.allCheckRequired) {
                            checkValidation.totalFields = checkBlockParams.checkboxList.length;
                            if (allChecked) {
                                checkValidation.invalidFields = 0;
                                checkValidation.valid = true;
                            } else {
                                checkValidation.invalidFields = checkBlockParams.checkboxList.length - checkedFields;
                                checkValidation.valid = false;
                            }
                        } else if (checkBlockParams.checkRequired) {
                            checkValidation.totalFields = 1;
                            if (oneChecked) {
                                checkValidation.invalidFields = 0;
                                checkValidation.valid = true;
                            } else {
                                checkValidation.invalidFields = 1;
                                checkValidation.valid = false;
                            }
                        }
                        let fieldError: FieldError;
                        if (!checkValidation.valid) {
                            fieldError = new FieldError();
                            fieldError.name = field.name;
                            fieldError.title = field.params.title;
                            fieldError.errorType = ErrorControlType.REQUIRED_FIELD;
                        }
                        res.mergeFieldError(new FieldErrorValidation(checkValidation, fieldError));
                    }
                }
            }
            break;
        case 'checkbox':
            if (!data[field.name]) {
                data[field.name] = '';
            }
            const checkParams: MultiCheckboxParams = <MultiCheckboxParams>field.params;
            if (checkParams.checkboxList) {
                let oneChecked: boolean = false;
                let allChecked: boolean = true;
                let checkedFields: number = 0;
                checkParams.checkboxList.forEach(check => {
                    if (data[check.bindField]) {
                        oneChecked = true;
                        checkedFields++;
                    } else {
                        allChecked = false;
                    }
                });
                if (checkParams.required) {
                    const checkValidation: Validation = new Validation();
                    if (checkParams.allCheckRequired) {
                        checkValidation.totalFields = checkParams.checkboxList.length;
                        if (allChecked) {
                            checkValidation.invalidFields = 0;
                            checkValidation.valid = true;
                        } else {
                            checkValidation.invalidFields = checkParams.checkboxList.length - checkedFields;
                            checkValidation.valid = false;
                        }
                    } else if (checkParams.checkRequired) {
                        checkValidation.totalFields = 1;
                        if (oneChecked) {
                            checkValidation.invalidFields = 0;
                            checkValidation.valid = true;
                        } else {
                            checkValidation.invalidFields = 1;
                            checkValidation.valid = false;
                        }
                    }
                    let fieldError: FieldError;
                    if (!checkValidation.valid) {
                        fieldError = new FieldError();
                        fieldError.name = field.name;
                        fieldError.title = field.params.title;
                        fieldError.errorType = ErrorControlType.REQUIRED_FIELD;
                    }
                    res.mergeFieldError(new FieldErrorValidation(checkValidation, fieldError));
                }
            }
            break;
        case 'duration':
            if (!data[field.name]) {
                data[field.name] = {};
            }
            if (field.params) {
                const params = <DurationParams>field.params;
                let validValue;
                if (params.isYears) {
                    if (data[field.name]['years']) {
                        validValue = data[field.name]['years'];
                    }
                }
                if (params.isMonths) {
                    if (data[field.name]['months']) {
                        validValue = data[field.name]['months'];
                    }
                }
                if (params.isDays) {
                    if (data[field.name]['days']) {
                        validValue = data[field.name]['days'];
                    }
                }
                if (params.isHours) {
                    if (data[field.name]['hours']) {
                        validValue = data[field.name]['hours'];
                    }
                }
                if (params.isMinutes) {
                    if (data[field.name]['minutes']) {
                        validValue = data[field.name]['minutes'];
                    }
                }
                if (params.isSeconds) {
                    if (data[field.name]['seconds']) {
                        validValue = data[field.name]['seconds'];
                    }
                }
                res.mergeFieldError(checkFieldRequired(validValue, field.importName, field.params.title));
                if (res.fieldError) {
                    res.fieldError.name = field.name;
                    res.fieldError.title = field.params.title;
                }
            }
            break;
        case 'information':
            if (!data[field.name]) {
                data[field.name] = '';
            }
            res.mergeFieldError(checkFieldCompleted(field, data[field.name]));
            break;
        case 'table':
            const tableParams: TableParams = <TableParams>field.params;
            const fieldColumns: Array<Field> = tableParams.fieldColumns;
            const tableData = data[field.name];
            if (!tableData || !tableData.length) {
                res.validation.totalFields = 1;
                if (tableParams.required) {
                    res.validation.invalidFields = 1;
                    res.validation.valid = false;
                } else {
                    res.validation.invalidFields = 0;
                    res.validation.valid = true;
                }
            } else {
                tableData.forEach(
                    (row, index) => {
                        fieldColumns.forEach(
                            column => {
                                if (!row) {
                                    row = {};
                                }
                                const tableRes: BlockErrorValidation = new BlockErrorValidation();
                                tableRes.mergeFieldError(checkField(column, row));
                                if (tableRes.blockError) {
                                    tableRes.blockError.name = field.name;
                                    tableRes.blockError.title = field.params.title;
                                    tableRes.blockError.index = index + 1;
                                }
                                res.mergeBlockError(tableRes);
                            }
                        );
                    }
                );
            }
            if (!res.validation.valid) {
                res.fieldError.name = field.name;
                res.fieldError.title = field.params.title;
            }
            break;
        case 'multi-input':
            const multiParams: MultiInputParams = <MultiInputParams>field.params;
            const multiData = data[field.name];
            const multiRes: FieldErrorValidation = new FieldErrorValidation();
            if (multiParams.required && (!multiData || !multiData.length)) {
                multiRes.validation.invalidFields = 1;
                multiRes.validation.totalFields = 1;
                multiRes.validation.valid = false;
                multiRes.fieldError.errorType = ErrorControlType.REQUIRED_FIELD;
                multiRes.fieldError.name = field.importName;
                multiRes.fieldError.title = field.params.title;
            } else {
                multiData.forEach(dataInArray => {
                    multiRes.mergeFieldError(checkFieldCompleted(field, dataInArray));
                });
            }
            res.mergeFieldError(multiRes);
            break;
        case 'autocalculated':
            break;
        default:
            if (!data[field.name]) {
                data[field.name] = '';
            }
            res.mergeFieldError(checkFieldCompleted(field, data[field.name]));
            break;
    }
    return res;
}

export function checkFieldCompleted(field: Field, data: any): FieldErrorValidation {
    let res = new FieldErrorValidation();
    res.validation.totalFields = 0;
    res.validation.valid = false;
    res.validation.completed = false;
    res.validation.invalidFields = 0;
    if (field.params) {
        const pattern = field.params['pattern'];
        const required = field.params.required;
        const value = data;
        if (!required) {
            res.validation.totalFields = 0;
            res.validation.valid = true;
            res.validation.invalidFields = 0;
        }
        if (required) {
            res = checkFieldRequired(value, field.importName, field.params.title);
        }
        if (pattern && patternMap[pattern] && res.validation.valid) {
            res = checkFieldPattern(value, new RegExp(patternMap[pattern]), required, field.importName, field.params.title);
        }
        if (field.type === 'input') {
            const inputParams = field.params as InputParams;
            if (inputParams.type === 'number') {
                res = checkNumber(inputParams, value, required, field.importName, field.params.title);
            }
        }
    }
    return res;
}
export function checkNumber(inputParams: InputParams, value: any, required: boolean, fieldName: string, fieldTitle: string): FieldErrorValidation {
    const fieldValidation = new Validation();
    fieldValidation.totalFields = 0;
    fieldValidation.valid = true;
    fieldValidation.invalidFields = 0;
    if (Number(inputParams.min) && value < Number(inputParams.min)) {
        fieldValidation.totalFields = 1;
        fieldValidation.valid = false;
        fieldValidation.invalidFields = 1;
    }
    if (Number(inputParams.max) && value > Number(inputParams.max)) {
        fieldValidation.totalFields = 1;
        fieldValidation.valid = false;
        fieldValidation.invalidFields = 1;
    }
    if (required && (!value || isEmpty(value))) {
        fieldValidation.totalFields = 1;
        fieldValidation.valid = false;
        fieldValidation.invalidFields = 1;
    }
    if (!fieldValidation.valid) {
        const error: FieldError = new FieldError();
        error.name = fieldName;
        error.title = fieldTitle;
        error.errorType = ErrorControlType.REQUIRED_FIELD;
        return new FieldErrorValidation(fieldValidation, error);
    }
    return new FieldErrorValidation(fieldValidation);
}

export function checkFieldRequired(value: any, fieldName: string, fieldTitle: string): FieldErrorValidation {
    const fieldValidation = new Validation();
    fieldValidation.totalFields = 1;
    fieldValidation.valid = false;
    fieldValidation.invalidFields = 1;
    if (value && !isEmpty(value)) {
        fieldValidation.totalFields = 1;
        fieldValidation.valid = true;
        fieldValidation.invalidFields = 0;
    }
    if (!fieldValidation.valid) {
        const error: FieldError = new FieldError();
        error.name = fieldName;
        error.title = fieldTitle;
        error.errorType = ErrorControlType.REQUIRED_FIELD;
        return new FieldErrorValidation(fieldValidation, error);
    }
    return new FieldErrorValidation(fieldValidation);
}
export function checkFieldPattern(value: string, pattern: RegExp, required: boolean, fieldName: string, fieldTitle: string): FieldErrorValidation {
    const fieldValidation = new Validation();
    fieldValidation.totalFields = 1;
    fieldValidation.valid = false;
    fieldValidation.invalidFields = 1;
    if ((!pattern || pattern.test(value)) && (!required || (value && !isEmpty(value)))) {
        fieldValidation.totalFields = 1;
        fieldValidation.valid = true;
        fieldValidation.invalidFields = 0;
    }
    if (!fieldValidation.valid) {
        const error: FieldError = new FieldError();
        error.name = fieldName;
        error.title = fieldTitle;
        error.errorType = ErrorControlType.PATTERN_ERROR;
        return new FieldErrorValidation(fieldValidation, error);
    }
    return new FieldErrorValidation(fieldValidation);
}
export function checkLetter(value: string, identificationPattern: string, fieldName: string, fieldTitle: string): FieldErrorValidation {
    const fieldValidation = new Validation();
    fieldValidation.totalFields = 0;
    fieldValidation.valid = true;
    fieldValidation.invalidFields = 0;
    let invalidLetter = false;
    if (identificationPattern === 'CIF' || identificationPattern === 'NIF') {
        invalidLetter = !validateLetterCIF(value);
    }
    if (identificationPattern === 'RUCNUMBER') {
        invalidLetter = !validateLetterRUC(value);
    }
    if (identificationPattern === 'DNI' || identificationPattern === 'NIE') {
        invalidLetter = !validateLetterNIEDNINIF(value, identificationPattern);
    }
    if (invalidLetter) {
        fieldValidation.totalFields = 1;
        fieldValidation.valid = false;
        fieldValidation.invalidFields = 1;
    }
    if (!fieldValidation.valid) {
        const error: FieldError = new FieldError();
        error.name = fieldName;
        error.title = fieldTitle;
        error.errorType = ErrorControlType.PATTERN_ERROR;
        return new FieldErrorValidation(fieldValidation, error);
    }
    return new FieldErrorValidation(fieldValidation);
}

function isArray(item) {
    return Array.isArray(item);
}

function isEmpty(obj) {
    if (!obj) {
        return true;
    }
    for (const prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            return false;
        }
    }
    return JSON.stringify(obj) === JSON.stringify({});
}

function mergeParams(origin: any, destiny: any) {
    overwrite(origin, destiny);
    overwrite(destiny, origin);
}

function overwrite(origin: any, destiny: any): void {
    if (!origin) {
        return;
    }
    if (!destiny) {
        return;
    }
    Object.assign(destiny, origin);
}

function validateLetterNIEDNINIF(identificationNumber: string, identificationPattern: string) {
    const validChars = 'TRWAGMYFPDXBNJZSQVHLCKET';
    if (!identificationNumber) {
        return false;
    }
    const str = identificationNumber.toString().toUpperCase();
    const nie = str.replace(/^[X]/, '0').replace(/^[Y]/, '1').replace(/^[Z]/, '2');
    const letter = str.substr(-1);
    const pattern = patternMap[identificationPattern];
    if (pattern.test(str)) {
        const charIndex = parseInt(nie.substr(0, 8), 10) % 23;
        if (validChars.charAt(charIndex) === letter) {
            return true;
        }
    }
    return false;
}

function validateLetterCIF(cif) {
    if (!cif || cif.length !== 9) {
        return false;
    }
    const str = cif.toString().toUpperCase();

    const letters = ['J', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
    const digits = str.substr(1, str.length - 2);
    const letter = str.substr(0, 1);
    const control = str.substr(str.length - 1);
    let sum = 0;
    let i;
    let digit: number;

    if (!letter.match(/[A-Z]/)) {
        return false;
    }

    for (i = 0; i < digits.length; ++i) {
        digit = parseInt(digits[i], 10);
        if (isNaN(digit)) {
            return false;
        }
        if (i % 2 === 0) {
            digit *= 2;
            if (digit > 9) {
                digit = Math.floor(digit / 10) + (digit % 10);
            }
            sum += digit;
        } else {
            sum += digit;
        }
    }

    sum %= 10;
    if (sum !== 0) {
        digit = 10 - sum;
    } else {
        digit = sum;
    }

    if (letter.match(/[ABEH]/)) {
        return String(digit) === control;
    }
    if (letter.match(/[NPQRSW]/)) {
        return letters[digit] === control;
    }

    return String(digit) === control || letters[digit] === control;
}
function validateLetterRUC(identificationNumber: string) {
    const pattern: RegExp = patternMap['RUCNUMBER'];
    if (pattern.test(identificationNumber)) {
        return true;
    }
    return false;
}
export const varNamePattern: RegExp = /^[A-Za-z0-9]*$/;

export const anyPattern: RegExp = /^[\S\s]*$/;
export const dniPattern: RegExp = /^[\d]{8}[A-Za-z]{1}$/;
export const niePattern: RegExp = /^[XYZxyz]{1}[\d]{7}[A-Za-z]{1}$/;
export const nifPattern: RegExp = /^[0-9]{8}[TRWAGMYFPDXBNJZSQVHLCKETtrwagmyfpdxbnjzsqvhlcket]{1}$/;
export const cifPattern: RegExp = /^[ABCDEFGHJKLMNPQRSUVWabcdefghjklmnpqrsuvw]{1}[\d]{7}[0-9A-Ja-j]{1}$/;
export const rucPattern: RegExp = /^[\d]{11}$/;
export const emailPattern: RegExp = /^[A-Za-z0-9.\-_]*@[A-Za-z0-9.\-_]*\.[A-Za-z0-9]{1,5}$/;
export const phonePattern: RegExp = /^(\+*[ 0-9]{0,20}[ \/ ])*/;

export const patternMap: {} = {
    'DNI': dniPattern,
    'NIE': niePattern,
    'CIF': cifPattern,
    'NIF': cifPattern,
    'RUCNUMBER': rucPattern,
    'EMAIL': emailPattern,
    'PHONE': phonePattern,
    '': anyPattern
};
