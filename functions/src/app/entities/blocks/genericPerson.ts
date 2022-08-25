import { Validation } from '../promotionHabitat';
import { LegalPerson } from './legalPerson';
import { NaturalPerson } from './naturalPerson';

export class GenericPerson {
    personType: string = '';
    naturalPerson: NaturalPerson = new NaturalPerson();
    legalPerson: LegalPerson = new LegalPerson();
    validation: Validation = new Validation();
}
