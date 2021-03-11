import * as admin from 'firebase-admin';
import { from, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { PromotionHabitat } from '../entities';
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

export function getPromotionHabitatByCodPromo(codPromo: string): Observable<Array<PromotionHabitat>> {
    return from(admin.firestore().collection(`promotionBuildings`).where('codigoPromocion', '==', codPromo).get())
        .pipe(
            map(
                societiesDB => {
                    if (!societiesDB) {
                        return null;
                    }
                    const societiesList: Array<PromotionHabitat> = new Array<PromotionHabitat>();
                    societiesDB.forEach(
                        inmuebleDB => {
                            societiesList.push(inmuebleDB.data() as PromotionHabitat);
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

export function getPromotionHabitatByUid(uid: string): Observable<PromotionHabitat> {
    return from(admin.firestore().doc(`promotionBuildings/${uid}`).get())
        .pipe(
            map(
                societiesDB => {
                    if (!societiesDB) {
                        return null;
                    }
                    return societiesDB.data() as PromotionHabitat;
                }
            ),
            catchError(
                error => {
                    return of(null);
                }
            )
        );
}
