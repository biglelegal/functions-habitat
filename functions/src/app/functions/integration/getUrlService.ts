import { Request, Response } from 'express';
import { Observable, of, throwError } from 'rxjs';
import { flatMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { GetUrlRequest } from '../../entities/getUrlRequest';
import { GetUrlResponse } from '../../entities/getUrlResponse';
import { LogInfo } from '../../entities/logInfo';
import { getUniqueId, logMessage } from '../../utils/utils';

export function getUrl(request: Request, response: Response): void {
    const logInfo: LogInfo = new LogInfo('getUrl', getUniqueId());
    const axiosRequest: GetUrlRequest = request.body;
    validateRequest(axiosRequest)
        .pipe(
            flatMap(
                res => getUrlRersponse(axiosRequest)
            )
        ).toPromise()
        .then((getUrlResponse: GetUrlResponse) => {
            logMessage(logInfo, JSON.stringify(getUrlResponse));
            return response.status(200).send(getUrlResponse);
        })
        .catch((error: string) => response.status(500).json({ error: error }));
}

function validateRequest(axiosRequest: GetUrlRequest): Observable<string> {
    if (!axiosRequest.type) {
        return throwError('type_not_found');
    }
    if (axiosRequest.type !== 'Legal' && axiosRequest.type !== 'Block') {
        return throwError('wrong_type');
    }
    if (['societies', 'compraventa'].indexOf(axiosRequest.crmId) === -1) {
        return throwError('wrong_crmid');
    }
    return of(null);
}

function getUrlRersponse(axiosRequest: GetUrlRequest): Observable<GetUrlResponse> {
    const axiosResponse: GetUrlResponse = new GetUrlResponse();
    switch (axiosRequest.type) {
        case 'Legal':
            axiosResponse.url = `${environment.integration.url}/${environment.integration.societies}`;
            axiosResponse.method = 'get';
            return of(axiosResponse);
        default:
            axiosResponse.url = `${environment.integration.url}/${environment.integration.compraventa}/${axiosRequest.params}`;
            axiosResponse.method = 'get';
            return of(axiosResponse);
    }
}
