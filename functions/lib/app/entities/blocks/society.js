"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const legalPerson_1 = require("./legalPerson");
/**
 * Society.
 */
class Society extends legalPerson_1.LegalPerson {
    constructor() {
        super(...arguments);
        this.uid = '';
        this.active = false;
        this.name = '';
        this.address = '';
        this.logo = '';
        this.logoFileName = '';
        this.logoUrl = '';
        this.availableOffices = new Array();
    }
}
exports.Society = Society;
//# sourceMappingURL=society.js.map