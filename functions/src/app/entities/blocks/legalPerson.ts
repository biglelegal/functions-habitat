import { Address } from "./address";
import { NaturalPerson } from "./naturalPerson";
import { RegistryData } from "./registryData";

export class LegalPerson {
    socialDenomination: string = '';
    comercialDenomination: string = '';
    identificationType: string = '';
    identificationNumber: string = '';
    expeditionCountry: string = '';
    phoneNumber: string = '';
    nationality: string = '';
    email: string = '';
    typeRepresentativePower: string = '';
    corporateForm: string = '';
    uniSociety: string = '';
    otherCorporateForm: any = {};
    socialAddress: Address = new Address();
    constitution: RegistryData = new RegistryData();
    representative: NaturalPerson = new NaturalPerson();
    representativePower: RegistryData = new RegistryData();
    otherRepresentative: NaturalPerson = new NaturalPerson();
}
