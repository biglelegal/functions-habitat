import { Validation } from '../promotionHabitat';
import { Address } from './address';
import { RepresentativeData } from './registryData';

export class NaturalPerson {
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
    birthPlace: string = '';
    birthDate: number = 0;
    ownName: string = '';
    address: Address = new Address();
    representative: RepresentativeData = new RepresentativeData();
    validation: Validation = new Validation();
}
