import { Validation } from '../promotionHabitat';
import { Address } from './address';

export class RegistryData {
    notaryGender: string = '';
    notaryName: string = '';
    notaryLastName1: string = '';
    notaryLastName2: string = '';
    notaryCity: string = '';
    grantingDate: number = 0;
    protocolNumber: number = null;
    registryCity: string = '';
    registryNumber: number = null;
    registryVolume: number = null;
    registryBook: number = null;
    registryPage: number = null;
    registrySheet: string = '';
    registryInscription: number = null;
    registryCatastralReference: string = null;
    registryPropertyNumber: number = null;
    validation: Validation = new Validation();
}

export class RepresentativeData {
    gender: 'M' | 'F' = null;
    name: string = '';
    lastName1: string = '';
    lastName2: string = '';
    nationality: string = '';
    identificationType: string = null;
    identificationNumber: string = '';
    identificationNumberAux: string = '';
    expeditionCountry: string = '';
    expirationDate: number = 0;
    phoneNumber: string = '';
    cellPhoneNumber: string = '';
    email: string = '';
    civilStatus: string = null;
    marriedStatus: string = null;
    profession: string = '';
    birthDate: string = '';
    birthPlace: string = '';
    infinitePower: string = '';
    infinitePowerDuration: any = {};
    sameAddress: boolean = false;
    address: Address = new Address();
    representativePower: RegistryData = new RegistryData();
    validation: Validation = new Validation();
}