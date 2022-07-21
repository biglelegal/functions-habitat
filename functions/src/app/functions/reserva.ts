import { combineLatest, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { PromotionHabitat } from '../entities';
import { LogInfo } from '../entities/logInfo';
import { AddressParams, AssetParams, CheckboxBlockParams, DocTypeBlock, Field, GenericPersonParams, LegalPersonParams, NaturalPersonParams, RadioBlockParams, RegistryDataParams, RepresentativeDataParams, TableParams } from '../entities/promotionHabitat';
import { getModelByUid, getPromotionHabitatByUid, setDocumentMain } from '../utils/firebase';
import { logMessage } from '../utils/utils';
import { getReservaSAPData } from './integration/reserva';

export function getReservaData(logInfo: LogInfo, documentUid: string, promotionUid: string, codigoReserva: string): Observable<any> {

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
            switchMap(
                processedData => combineLatest([
                    of(processedData),
                    getModelByUid(environment.reservaModelUid)
                ])
            ),
            map(
                ([processedData, model]) => setMain(documentUid, processedData, model.config.blocks)
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
    return of({
        ...data.promotion
        // ...getPromocion(data.sapData.OUTPUT, data.promotion || new PromotionHabitat()),
    });
}

export function setMain(documentUid: string, parsedData: any, blocks: Array<DocTypeBlock>): Observable<void> {
    const main: any = Object.assign({}, setValuesImportMap(blocks, parsedData));
    console.log('setMain main', JSON.stringify(main));

    return setDocumentMain(documentUid, main);
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
