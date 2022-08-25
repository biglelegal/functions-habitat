import { Validation } from '../promotionHabitat';
import { Address } from "./address";
import { NaturalPerson } from "./naturalPerson";
import { RegistryData, RepresentativeData } from "./registryData";

export class LegalPerson {
    socialDenomination: string = '';
    comercialDenomination: string = '';
    identificationType: string = '';
    identificationNumber: string = '';
    expeditionCountry: string = '';
    phoneNumber: string = '';
    nationality: string = '';
    email: string = '';
    emailAux: string = '';
    typeRepresentativePower: string = '';
    corporateForm: string = '';
    uniSociety: string = '';
    otherCorporateForm: any = {};
    realOwnership: string = '';
    socialAddress: Address = new Address();
    constitution: RegistryData = new RegistryData();
    representative: NaturalPerson = new NaturalPerson();
    newRepresentative: RepresentativeData = new RepresentativeData();
    representativePower: RegistryData = new RegistryData();
    otherRepresentative: RepresentativeData = new RepresentativeData();
    ownershipDeed: RegistryData = new RegistryData();
    validation: Validation = new Validation();
}