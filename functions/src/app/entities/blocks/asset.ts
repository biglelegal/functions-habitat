import { Address } from './address';
import { NaturalPerson } from './naturalPerson';
import { RegistryData } from './registryData';


export class Asset {
    address: Address = new Address();
    assetType: string = '';
    solarDescription: string = '';
    buildingDenomination: string = '';
    buildingComponents: string = '';
    assetDescription: string = '';
    projectStatus: string = '';
    registryData: RegistryData = new RegistryData();
    surface: number = 0;
    occupancyCertificate: string = '';
    energyCertificate: string = '';
    description: string = '';
    participationCuote: number = 0;
    propertyType: string = '';
    priceWithIva: number = 0;
    priceWithoutIva: number = 0;
    alternativePriceIva: number = 0;
    alternativePriceWithoutIva: number = 0;
    Iva: number = 0;
    charges: string = '';
    propertyReference: string = '';
    architect: NaturalPerson = new NaturalPerson();
    merchantLicense: string = '';
    cityHallLicense: string = '';
    dateLicense: number = 0;
}
