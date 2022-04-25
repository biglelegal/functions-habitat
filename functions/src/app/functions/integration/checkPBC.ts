import { Request, Response } from 'express';
import { Observable, of, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { LogInfo } from '../../entities/logInfo';
import { getDocumentByUid } from '../../utils/firebase';
import { errorResponse, getUniqueId, logMessage } from '../../utils/utils';
import { getSAPData } from './compraventa';

export const checkPBC = (request: Request, response: Response): Promise<any> => {
    const logInfo: LogInfo = new LogInfo('checkPBC', getUniqueId());
    logMessage(logInfo, '1. Init process');
    return checkSTPBCSAP(request.params.documentUid).pipe(
    ).toPromise()
        .then(
            data => {
                logMessage(logInfo, 'end checkPBC');
                response.status(200).json(data);
            }
        ).catch(
            err => {
                logMessage(logInfo, 'Error checkPBC', err);
                if (typeof err === 'string') {
                    response.status(500).json(errorResponse(logInfo, err, 'Error checkPBC'));
                } else {
                    response.status(500).json(errorResponse(logInfo, 'Error checkPBC', err));
                }
            }
        );
};



export function checkSTPBCSAP(documentUid: string): Observable<void> {
    return getDocumentByUid(documentUid)
        .pipe(
            switchMap(
                document => getSAPData((document.metadata || {}).codigoReserva)
            ),
            switchMap(
                sapData => {
                    if (sapData.OUTPUT.DATOSSOL && (!sapData.OUTPUT.DATOSSOL.STPBC || sapData.OUTPUT.DATOSSOL.STPBC !== 'X')) {
                        return throwError('Esta solicitud no tiene un estado PBC favorable');
                    }
                    return of(null);
                }
            ),
            catchError(
                error => {
                    console.error('Error getData', error);
                    return throwError(error);
                }
            )
        );
}
