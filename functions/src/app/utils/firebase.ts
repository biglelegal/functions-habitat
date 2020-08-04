import * as admin from 'firebase-admin';
import { from, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Society } from '../entities/blocks/society';

export function getSocieties(): Observable<Array<Society>> {
    return from(admin.firestore().collection(`societies`).get())
        .pipe(
            map(
                societiesDB => {
                    if (!societiesDB) {
                        return null;
                    }
                    const societiesList: Array<Society> = new Array<Society>();
                    societiesDB.forEach(
                        inmuebleDB => {
                            societiesList.push(inmuebleDB.data() as Society);
                        }
                    );
                    return societiesList;
                }
            ),
            catchError(
                error => {
                    return of(null);
                }
            )
        );
}
