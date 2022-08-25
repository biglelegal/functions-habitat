import { Validation } from '../promotionHabitat';

export class Address {
    street: string = '';
    number: string = '';
    floor: string = '';
    door: string = '';
    city: string = '';
    province: string = '';
    department: string = '';
    cp: string = '';
    country: string = '';
    district: string = '';
    validation: Validation = new Validation();
}
