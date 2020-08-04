import { Request, Response } from 'express';
import { of, throwError } from 'rxjs';
import { flatMap } from 'rxjs/operators';
import { LogInfo } from '../../entities/logInfo';
import { getSocieties } from '../../utils/firebase';
import { getErrorResponse, getUniqueId, logMessage } from '../../utils/utils';

export const getSocietiesService = (request: Request, response: Response): Promise<Response> | Response => {
    const logInfo: LogInfo = new LogInfo('getContratoService', getUniqueId());
    logMessage(logInfo, '1. Init process');
    const type = request.params.type;
    return getSocieties().pipe(
        flatMap(
            res => {
                if (!res) {
                    return throwError('societies_not_found');
                }
                return of(res);
            }
        )
    ).toPromise().then(
        res => {
            return response.status(200).json(res);
        }
    ).catch(
        error => {
            return getErrorResponse('getContratoService', response, 'server.errors.ERROR_GET_CONTRATO', logInfo, error);
        }
    );
};
