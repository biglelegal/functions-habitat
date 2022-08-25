
export class PromotionHabitat {
    uid: string = '';
    active: boolean = false;
    activeForFinancial: boolean = false;
    shareLicenciaObras: boolean = false;
    faseada: boolean = false;
    nombrePromocion: string = '';
    codigoPromocion: string = '';
    sociedad: string = '';
    cuentaBancaria: string = '';
    entidadBancaria: string = '';
    entidadBancaria2: string = '';
    contentCargas: string = '';
    inmueble: Array<{
        descripcionFinca: string,
        tituloFinca: string,
        lugarEscritura: string,
        numRegistroPropiedad: string,
        numeroFinca: number,
    }> = [{
        descripcionFinca: '',
        tituloFinca: '',
        lugarEscritura: '',
        numRegistroPropiedad: '',
        numeroFinca: 0,

    }]
    notarioGenero: string = '';
    nombreNotario: string = '';
    calleNotario: string = '';
    numeroNotario: string = '';
    ciudadNotario: string = '';
    cpNotario: string = '';
    escriturasPublicas: string = '';
    notarioGeneroHorizontal: string = '';
    nombreNotarioHorizontal: string = '';
    apellidoNotarioHorizontal: string = '';
    localityNotarioHorizontal: string = '';
    dateNotarioHorizontal: number;
    protocoloNotarioHorizontal: string = '';
    notarioGeneroObraNueva: string = '';
    nombreNotarioObraNueva: string = '';
    apellidoNotarioObraNueva: string = '';
    localityNotarioObraNueva: string = '';
    dateNotarioObraNueva: number;
    protocoloNotarioObraNueva: string = '';
    constructora: string = '';
    denominacionSocial: string = '';
    numeroIdentificacion: string = '';
    calle: string = '';
    ciudad: string = '';
    cp: string = '';
    constructoraRegistryCity: string = '';
    constructoraRegistrySheet: string = '';
    adicional: string = '';
    tituloClausula: string = '';
    contenidoClausula: string = '';
    promocionNumberViviendas: number = 0;
    promocionNumberPlazas: number = 0;
    promocionNumberBicicletas: number = 0;
    promocionNumberLocales: number = 0;
    promocionNumberTrasteros: number = 0;
    promocionNumberExpediente: string = '';
    static extract(item: PromotionHabitat): any {
        return JSON.parse(JSON.stringify(item));
    }
}

export class Document {
    main: any = {};
    name: string = '';
    creationTime: number = 0;
    creationUserUid: string = '';
    modificationTime: number = 0;
    modificationUserUid: string = '';
    typeUid: string = '';
    userUid: string = '';
    officeUid: string = '';
    notified: boolean = false;
    plataformCreated?: boolean = false;
    active?: boolean = true;
    deleted?: boolean = false;
    archived?: boolean = false;
    editing?: boolean = false;
    percentageCompleted?: number = 0;
    projectUid?: string = '';
    vendor?: string = '';
    uid: string = '';
    signaturitProcessId?: string = '';
    signaturitDocumentId?: string = '';
    signed?: boolean = false;
    category?: string = '';
    type?: string = '';
    percentage?: string = '';
    logo?: string = '';
    avatar?: string = '';
    doctypeImg?: string = '';
    stringyfied?: string = '';
    userName?: string = '';
    order?: number = 0;
    statusName?: string = '';
    metadata?: { [key: string]: string } = {};
    static extract(item: Document): any {
        return JSON.parse(JSON.stringify(item));
    }
}
export class DocType {
    order: number = 0;
    name: string = '';
    idName: string = '';
    permisions: string = '';
    active: boolean = false;
    deprecated: boolean = false;
    review: boolean = false;
    integrate: boolean = false;
    description: string = '';
    thankyouMessageFinish: string = '';
    thankyouMessageSign: string = '';
    imgSrc: string = '';
    category: string = '';
    subCategory: string = '';
    subSubCategory: string = '';
    config?: DocTypeConfig = null;
    uid: string = '';
    availableOffices: Array<string> = new Array<string>();
    editing?: boolean = false;
    convertedToModel?: boolean = false;
    static extract(item: DocType): any {
        const res: any = {};
        res['order'] = item.order || 0;
        res['name'] = item.name || '';
        res['idName'] = item.idName || '';
        res['permisions'] = item.permisions || '';
        res['active'] = item.active || false;
        res['deprecated'] = item.deprecated || false;
        res['review'] = item.review || false;
        res['description'] = item.description || '';
        res['thankyouMessageFinish'] = item.thankyouMessageFinish || '';
        res['thankyouMessageSign'] = item.thankyouMessageSign || '';
        res['imgSrc'] = item.imgSrc || '';
        res['category'] = item.category || '';
        res['config'] = DocTypeConfig.extract(item.config);
        res['config']['blocks'] = null;
        res['uid'] = item.uid || '';
        res['availableOffices'] = item.availableOffices || new Array<string>();
        res['convertedToModel'] = item.convertedToModel || false;
        return res;
    }
}
export class DocTypeConfig {
    templateName: string = '';
    downloadName: string = '';
    blocks: Array<DocTypeBlock> = null;
    languages: any = {};
    editing?: boolean = false;
    exportFormat?: string = '';
    importFormat?: string = '';
    activeExport?: boolean = false;
    activeImport?: boolean = false;
    activeAutofill?: boolean = false;
    downloadFormat?: string = 'pdfAPI';
    downloadMatrixFormat?: string = 'pdfAPI';
    downloadFormatClient?: string = 'pdfAPI';
    downloadMatrixFormatClient?: string = 'pdfAPI';
    allowIncompleteDownload?: boolean = false;
    allowSendLink?: boolean = false;
    allowSendDraft?: boolean = false;
    allowSendReminder?: boolean = false;
    allowSendCancelation?: boolean = false;
    allowCertifiedEmail?: boolean = false;
    allowSignature?: boolean = false;
    allowFinishSignatureEmail?: boolean = false;
    allowDocumentReviewEmail?: boolean = false;
    allowClientSignDocument?: boolean = false;
    allowFastSignProcess?: boolean = false;
    allowPromotionDraft?: boolean = false;
    isAutoSignature?: boolean = false;
    allowSignatureReminder?: boolean = false;
    allowSignatureCancelation?: boolean = false;
    officeMetadata?: boolean = false;
    userMetadata?: boolean = false;
    allowEmptyFile?: boolean = false;
    isPpt?: boolean = false;
    hasCrmData: boolean = false;
    activeCrm: any = {};
    static extract(item: DocTypeConfig): any {
        const res: any = {};
        res['templateName'] = item.templateName || '';
        res['downloadName'] = item.downloadName || '';
        res['exportFormat'] = item.exportFormat || '';
        res['importFormat'] = item.importFormat || '';
        res['activeExport'] = item.activeExport || false;
        res['activeAutofill'] = item.activeAutofill || false;
        res['activeImport'] = item.activeImport || false;
        res['downloadFormat'] = item.downloadFormat || '';
        res['downloadMatrixFormat'] = item.downloadMatrixFormat || '';
        res['downloadFormatClient'] = item.downloadFormatClient || '';
        res['downloadMatrixFormatClient'] = item.downloadMatrixFormatClient || '';
        res['allowIncompleteDownload'] = item.allowIncompleteDownload || false;
        res['allowSendLink'] = item.allowSendLink || false;
        res['allowSendDraft'] = item.allowSendDraft || false;
        res['allowSendReminder'] = item.allowSendReminder || false;
        res['allowSendCancelation'] = item.allowSendCancelation || false;
        res['allowCertifiedEmail'] = item.allowCertifiedEmail || false;
        res['allowSignature'] = item.allowSignature || false;
        res['allowFinishSignatureEmail'] = item.allowFinishSignatureEmail || false;
        res['isAutoSignature'] = item.isAutoSignature || false;
        res['allowSignatureReminder'] = item.allowSignatureReminder || false;
        res['allowSignatureCancelation'] = item.allowSignatureCancelation || false;
        res['officeMetadata'] = item.officeMetadata || false;
        res['userMetadata'] = item.userMetadata || false;
        res['allowEmptyFile'] = item.allowEmptyFile || false;
        res['isPpt'] = item.isPpt || false;
        res['languages'] = item.languages || null;
        res['hasCrmData'] = item.hasCrmData || false;
        res['activeCrm'] = item.activeCrm || {};

        return res;
    }
}
export class DocTypeBlock {
    uid: string = '';
    order: number = 0;
    name: string = '';
    tabName: string = '';
    title: string = '';
    styleInput: string = '';
    multiple?: boolean = false;
    description?: string = '';
    explanation?: string = '';
    fields?: Array<Field> = new Array<Field>();
    subBlocks?: Array<DocTypeBlock> = new Array<DocTypeBlock>();
    predefType?: PredefType = null;
    predefConfig?: PredefConfig = null;
    public?: boolean = false;
    autofocusActive?: boolean = false;
    editing?: boolean = false;
    newItem?: boolean = false;
    hasMetadata: boolean = false;
    hasCrmData: boolean = false;
    activeCrm: any = {};
    static getPredefBlock(predefConfig: PredefConfig, predefType: PredefType, name: string, multiple?: boolean): DocTypeBlock {
        const block = new DocTypeBlock();
        block.predefConfig = predefConfig;
        block.predefType = predefType;
        block.name = name;
        block.styleInput = 'blockStyle2';
        block.multiple = multiple || false;
        return block;
    }
}

export type PredefType = 'natural-person' | 'representative-data' | 'legal-person' | 'personalized-legal-person' | 'generic-person' | 'address' | 'registry-data' | 'asset' | 'time-duration';

export class PredefConfig {
    autofilled: boolean = false;
    autofocusActive: boolean = false;
    styleInput: string = '';
    customFields: Array<Field> = new Array<Field>();
}
export class Field {
    uid: string;
    order: number = 0;
    name: string = '';
    explanation?: string = '';
    type: FieldType = null;
    exportName: string = '';
    importName: string = '';
    autofilled: boolean = false;
    present: boolean = false;
    params: FieldParams = new FieldParams();
    editing?: boolean = false;
    newItem?: boolean = false;
}

export type FieldType = 'input' | 'select' | 'textarea' | 'radio' | 'radio-block' | 'checkbox' | 'checkbox-block' | 'calendar' | 'time' | 'duration' | 'file' | 'information' | 'table' | 'multi-input' | 'autocalculated' | 'ckeditor';
export class FieldParams {
    title: string = '';
    subtitle: string = '';
    styleInput: string = '';
    required: boolean = true;
    autofocusActive: boolean = false;
}

export class RadioBlockParams extends FieldParams {
    radioList: Array<RadioBlockOption> = null;
}

export class RadioOption {
    value: any;
    name: string;
    selected?: boolean;
}

export class RadioBlockOption extends RadioOption {
    hasBlock: boolean = false;
    blockUid?: string = null;
    block: DocTypeBlock = null;
    numberValue?: number;
}

export class CheckboxBlockParams extends FieldParams {
    checkRequired: boolean = false;
    allCheckRequired: boolean = false;
    checkboxList: Array<CheckboxBlockOption> = null;
}

export class CheckboxOption {
    bindField: string = '';
    literal: string = '';
}

export class CheckboxBlockOption extends CheckboxOption {
    blockUid?: string = null;
    block: DocTypeBlock = null;
}

export class TableParams extends FieldParams {
    rowNumbers: boolean = false;
    subTable: boolean = false;
    fieldColumns: Array<Field> = new Array<Field>();
}

export class MultiInputParams extends FieldParams {
    type: string = 'text';
    placeholder: string = '';
    pattern: string = null;
    requiredErrorMessage: string = '';
    patternErrorMessage: string = '';
}

export class MultiCheckboxParams extends FieldParams {
    checkRequired: boolean = false;
    allCheckRequired: boolean = false;
    checkboxList: Array<CheckboxOption> = null;
}

export class AddressParams extends PredefConfig {
    addressTitle: string = '';
    styleInput: string = '';
    street: Field = new Field();
    number: Field = new Field();
    floor: Field = new Field();
    door: Field = new Field();
    city: Field = new Field();
    province: Field = new Field();
    department: Field = new Field();
    district: Field = new Field();
    cp: Field = new Field();
    country: Field = new Field();
}

export class TimeDurationParams extends PredefConfig {
    autocalculatedField: string = '';
    initDate: Field = new Field();
    endDate: Field = new Field();
    duration: Field = new Field();
}

export class DurationParams extends FieldParams {
    isYears: boolean = true;
    isMonths: boolean = true;
    isDays: boolean = true;
    isHours: boolean = true;
    isMinutes: boolean = true;
    isSeconds: boolean = true;
}

export class InputParams extends FieldParams {
    pattern: string = null;
    type: string = 'text';
    maxLength: number = 0;
    min: number = 0;
    max: number = 0;
    step: number = 1;
    placeholder: string = '';
    requiredErrorMessage: string = '';
    patternErrorMessage: string = '';
    money: boolean = false;
    percentage: boolean = false;
}

export class TimeDuration {
    initDate: number = 0;
    endDate: number = 0;
    duration: Duration = new Duration();
    validation: Validation = new Validation();
}
export class Duration {
    years: number = 0;
    months: number = 0;
    days: number = 0;
    hours: number = 0;
    minutes: number = 0;
    seconds: number = 0;
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
export class NaturalPersonParams extends PredefConfig {
    hasMetadata: boolean = false;
    hasCrmData: boolean = false;
    activeCrm: any = {};
    addressBlock: boolean = false;
    personTitle: string = '';
    addressTitle: string = '';
    addressConfig: AddressParams = null;
    gender: Field = new Field();
    name: Field = new Field();
    lastName1: Field = new Field();
    lastName2: Field = new Field();
    nationality: Field = new Field();
    identificationType: Field = new Field();
    identificationNumber: Field = new Field();
    expeditionCountry: Field = new Field();
    expirationDate: Field = new Field();
    phoneNumber: Field = new Field();
    cellPhoneNumber: Field = new Field();
    email: Field = new Field();
    civilStatus: Field = new Field();
    marriedStatus: Field = new Field();
    profession: Field = new Field();
    birthPlace: Field = new Field();
    birthDate: Field = new Field();
    preventIdentificationValidation: boolean = false;
    ownName: Field = new Field();
}

export class RepresentativeDataParams extends PredefConfig {
    hasMetadata: boolean = false;
    hasCrmData: boolean = false;
    activeCrm: any = {};
    addressBlock: boolean = false;
    addressConfig: AddressParams = null;
    representativePowerBlock: boolean = true;
    representativePowerConfig: RegistryDataParams = new RegistryDataParams();
    identificationTitle: string = '';
    addressTitle: string = '';
    representativePowerTitle: string = '';
    gender: Field = new Field();
    name: Field = new Field();
    lastName1: Field = new Field();
    lastName2: Field = new Field();
    nationality: Field = new Field();
    identificationType: Field = new Field();
    identificationNumber: Field = new Field();
    expeditionCountry: Field = new Field();
    expirationDate: Field = new Field();
    phoneNumber: Field = new Field();
    cellPhoneNumber: Field = new Field();
    email: Field = new Field();
    civilStatus: Field = new Field();
    marriedStatus: Field = new Field();
    profession: Field = new Field();
    birthPlace: Field = new Field();
    birthDate: Field = new Field();
    infinitePower: Field = new Field();
    sameAddressCompany: Field = new Field();
    preventIdentificationValidation: boolean = false;
}

export class RegistryDataParams extends PredefConfig {
    notaryBlock: boolean = true;
    registryBlock: boolean = true;
    notaryTitle: string = '';
    registryTitle: string = '';
    notaryGender: Field = new Field();
    notaryName: Field = new Field();
    notaryLastName1: Field = new Field();
    notaryLastName2: Field = new Field();
    notaryCity: Field = new Field();
    grantingDate: Field = new Field();
    protocolNumber: Field = new Field();
    registryCity: Field = new Field();
    registryNumber: Field = new Field();
    registryVolume: Field = new Field();
    registryBook: Field = new Field();
    registryPage: Field = new Field();
    registrySheet: Field = new Field();
    registryInscription: Field = new Field();
    registryPropertyNumber: Field = new Field();
    registryCatastralReference: Field = new Field();
}

export class LegalPersonParams extends PredefConfig {
    hasMetadata: boolean = false;
    hasCrmData: boolean = false;
    activeCrm: any = {};
    useAsSigners: boolean = false;
    signersGroup: number = 0;
    socialAddressBlock: boolean = true;
    constitutionBlock: boolean = true;
    representativeBlock: boolean = false;
    newRepresentativeBlock: boolean = true;
    representativePowerBlock: boolean = true;
    preventIdentificationValidation: boolean = false;
    identificationTitle: string = '';
    socialAddressTitle: string = '';
    constitutionTitle: string = '';
    representativeTitle: string = '';
    representativePowerTitle: string = '';
    otherRrepresentativeTitle: string = '';
    otherCorporateTitle: string = '';
    socialDenomination: Field = new Field();
    comercialDenomination: Field = new Field();
    identificationType: Field = new Field();
    identificationNumber: Field = new Field();
    expeditionCountry: Field = new Field();
    otherFormSociety: Field = new Field();
    phoneNumber: Field = new Field();
    nationality: Field = new Field();
    nationalitySelector: Field = new Field();
    email: Field = new Field();
    emailAux: Field = new Field();
    typeRepresentativePower: Field = new Field();
    corporateForm: Field = new Field();
    uniSociety: Field = new Field();
    realOwnership: Field = new Field();
    logo: Field = new Field();
    socialAddressConfig: AddressParams = new AddressParams();
    constitutionConfig: RegistryDataParams = new RegistryDataParams();
    representativeConfig: NaturalPersonParams = new NaturalPersonParams();
    newRepresentativeConfig: RepresentativeDataParams = new RepresentativeDataParams();
    representativePowerConfig: RegistryDataParams = new RegistryDataParams();
}


export class GenericPersonParams extends PredefConfig {
    personType: Field = new Field();
    naturalTitle: string = '';
    legalTitle: string = '';
    naturalPersonConfig: NaturalPersonParams = new NaturalPersonParams();
    legalPersonConfig: LegalPersonParams = new LegalPersonParams();
}

export class AssetParams extends PredefConfig {
    hasMetadata: boolean = false;
    hasCrmData: boolean = false;
    activeCrm: any = {};
    addressBlock: boolean = true;
    addressConfig: AddressParams = new AddressParams();
    registryDataBlock: boolean = true;
    registryDataConfig: RegistryDataParams = new RegistryDataParams();
    licenseBlock: boolean = false;
    architectBlock: boolean = false;
    architectConfig: NaturalPersonParams = new NaturalPersonParams();
    assetTitle: string = '';
    naturalPersonTitle: string = '';
    addressTitle: string = '';
    registryDataTitle: string = '';
    surface: Field = new Field();
    assetType: Field = new Field();
    solarDescription: Field = new Field();
    buildingDenomination: Field = new Field();
    buildingComponents: Field = new Field();
    assetDescription: Field = new Field();
    projectStatus: Field = new Field();
    occupancyCertificate: Field = new Field();
    energyCertificate: Field = new Field();
    description: Field = new Field();
    participationCuote: Field = new Field();
    propertyType: Field = new Field();
    priceWithIva: Field = new Field();
    priceWithoutIva: Field = new Field();
    alternativePriceIva: Field = new Field();
    alternativePriceWithoutIva: Field = new Field();
    Iva: Field = new Field();
    charges: Field = new Field();
    propertyReference: Field = new Field();
    merchantLicense: Field = new Field();
    cityHallLicense: Field = new Field();
    dateLicense: Field = new Field();
}

export class Model extends DocType {
    blocks: Array<string> = new Array<string>();
}

export class ModelBlock {
    uid: string;
    block: DocTypeBlock;
    subBlocks: Array<string>;
    fields: Array<string>;
    customFields: Array<string>;
    predefTypeName?: string = null;
    constructor() {
        this.uid = ((1 + Math.random()) * 0x10000).toString(16).replace('.', '');
        this.block = new DocTypeBlock();
        this.block.name = `Block_${this.uid.substring(0, 8)}`;
        this.subBlocks = new Array<string>();
        this.fields = new Array<string>();
        this.customFields = new Array<string>();
    }
}

export class ModelField {
    uid: string;
    field: Field = new Field();
    fieldBlocks: Array<string>;
    constructor() {
        this.uid = ((1 + Math.random()) * 0x10000).toString(16).replace('.', '');
        this.field = new Field();
        this.field.name = `Field_${this.uid.substring(0, 8)}`;
        this.fieldBlocks = new Array<string>();
    }
}