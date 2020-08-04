import { LegalPerson } from './legalPerson';

/**
 * Society.
 */
export class Society extends LegalPerson {
    uid: string = '';
    active: boolean = false;
    name: string = '';
    address: string = '';
    logo: string = '';
    logoFileName: string = '';
    logoUrl: string = '';
    availableOffices: Array<string> = new Array<string>();
}
