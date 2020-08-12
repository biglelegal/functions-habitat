"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NaturalPerson = void 0;
const address_1 = require("./address");
class NaturalPerson {
    constructor() {
        this.gender = null;
        this.name = '';
        this.lastName1 = '';
        this.lastName2 = '';
        this.nationality = '';
        this.identificationType = null;
        this.identificationNumber = '';
        this.identificationNumberAux = '';
        this.phoneNumber = '';
        this.cellPhoneNumber = '';
        this.email = '';
        this.civilStatus = null;
        this.profession = '';
        this.birthPlace = '';
        this.birthDate = 0;
        this.address = new address_1.Address();
    }
}
exports.NaturalPerson = NaturalPerson;
//# sourceMappingURL=naturalPerson.js.map