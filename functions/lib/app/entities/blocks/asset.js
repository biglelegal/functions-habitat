"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const address_1 = require("./address");
const naturalPerson_1 = require("./naturalPerson");
const registryData_1 = require("./registryData");
class Asset {
    constructor() {
        this.address = new address_1.Address();
        this.assetType = '';
        this.solarDescription = '';
        this.buildingDenomination = '';
        this.buildingComponents = '';
        this.assetDescription = '';
        this.projectStatus = '';
        this.registryData = new registryData_1.RegistryData();
        this.surface = 0;
        this.occupancyCertificate = '';
        this.energyCertificate = '';
        this.description = '';
        this.participationCuote = 0;
        this.propertyType = '';
        this.priceWithIva = 0;
        this.priceWithoutIva = 0;
        this.alternativePriceIva = 0;
        this.alternativePriceWithoutIva = 0;
        this.Iva = 0;
        this.charges = '';
        this.propertyReference = '';
        this.architect = new naturalPerson_1.NaturalPerson();
        this.merchantLicense = '';
        this.cityHallLicense = '';
        this.dateLicense = 0;
    }
}
exports.Asset = Asset;
//# sourceMappingURL=asset.js.map