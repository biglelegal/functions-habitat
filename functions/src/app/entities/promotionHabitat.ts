
export class PromotionHabitat {
    uid: string = '';
    active: boolean = false;
    activeForFinancial: boolean = false;
    faseada: boolean = false;
    nombrePromocion: string = '';
    codigoPromocion: string = '';
    sociedad: string = '';
    cuentaBancaria: string = '';
    entidadBancaria: string = '';
    contentCargas: string = '';
    inmueble: Array<{
        descripcionFinca: string,
        tituloFinca: string,
        lugarEscritura: string,
        numRegistroPropiedad: string,
        numeroFinca: number,
    }> = [{
        descripcionFinca: '',
        tituloFinca: '',
        lugarEscritura: '',
        numRegistroPropiedad: '',
        numeroFinca: 0,

    }]
    notarioGenero: string = '';
    nombreNotario: string = '';
    calleNotario: string = '';
    numeroNotario: string = '';
    ciudadNotario: string = '';
    cpNotario: string = '';
    escriturasPublicas: string = '';
    notarioGeneroHorizontal: string = '';
    nombreNotarioHorizontal: string = '';
    apellidoNotarioHorizontal: string = '';
    localityNotarioHorizontal: string = '';
    dateNotarioHorizontal: number;
    protocoloNotarioHorizontal: string = '';
    notarioGeneroObraNueva: string = '';
    nombreNotarioObraNueva: string = '';
    apellidoNotarioObraNueva: string = '';
    localityNotarioObraNueva: string = '';
    dateNotarioObraNueva: number;
    protocoloNotarioObraNueva: string = '';
    constructora: string = '';
    denominacionSocial: string = '';
    numeroIdentificacion: string = '';
    calle: string = '';
    ciudad: string = '';
    cp: string = '';
    constructoraRegistryCity: string = '';
    constructoraRegistrySheet: string = '';
    adicional: string = '';
    tituloClausula: string = '';
    contenidoClausula: string = '';
    promocionNumberViviendas: number = 0;
    promocionNumberPlazas: number = 0;
    promocionNumberBicicletas: number = 0;
    promocionNumberLocales: number = 0;
    promocionNumberTrasteros: number = 0;
    promocionNumberExpediente: string = '';
    static extract(item: PromotionHabitat): any {
        return JSON.parse(JSON.stringify(item));
    }
}
