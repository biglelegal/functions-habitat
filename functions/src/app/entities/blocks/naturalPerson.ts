import { Address } from './address';

export class NaturalPerson {
    gender: 'M' | 'F' = null;
    name: string = '';
    lastName1: string = '';
    lastName2: string = '';
    nationality: string = '';
    identificationType: string = null;
    identificationNumber: string = '';
    identificationNumberAux: string = '';
    phoneNumber: string = '';
    cellPhoneNumber: string = '';
    email: string = '';
    civilStatus: string = null;
    profession: string = '';
    birthPlace: string = '';
    birthDate: number = 0;
    address: Address = new Address();
}
