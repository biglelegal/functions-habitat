"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LegalPerson = void 0;
const address_1 = require("./address");
const naturalPerson_1 = require("./naturalPerson");
const registryData_1 = require("./registryData");
class LegalPerson {
    constructor() {
        this.socialDenomination = '';
        this.comercialDenomination = '';
        this.identificationType = '';
        this.identificationNumber = '';
        this.expeditionCountry = '';
        this.phoneNumber = '';
        this.nationality = '';
        this.email = '';
        this.typeRepresentativePower = '';
        this.corporateForm = '';
        this.uniSociety = '';
        this.otherCorporateForm = {};
        this.socialAddress = new address_1.Address();
        this.constitution = new registryData_1.RegistryData();
        this.representative = new naturalPerson_1.NaturalPerson();
        this.representativePower = new registryData_1.RegistryData();
        this.otherRepresentative = new naturalPerson_1.NaturalPerson();
    }
}
exports.LegalPerson = LegalPerson;
//# sourceMappingURL=legalPerson.js.map