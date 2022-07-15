import * as admin from 'firebase-admin';
import { from, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Document, PromotionHabitat, User } from '../entities';
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
                promotionsDB => {
                    if (!promotionsDB) {
                        return null;
                    }
                    const prmotionsList: Array<PromotionHabitat> = new Array<PromotionHabitat>();
                    promotionsDB.forEach(
                        promotion => {
                            prmotionsList.push(promotion.data() as PromotionHabitat);
                        }
                    );
                    return prmotionsList;
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

export function getDocumentByUid(uid: string): Observable<Document> {
    return from(admin.firestore().doc(`documents/${uid}`).get())
        .pipe(
            map(
                documentDB => {
                    if (!documentDB) {
                        return null;
                    }
                    return documentDB.data() as Document;
                }
            ),
            catchError(
                error => {
                    return of(null);
                }
            )
        );
}

export function setDocument(document: Document): Observable<Document> {
    return from(admin.firestore().doc(`documents/${document.uid}`).set(Document.extract(document)))
        .pipe(
            catchError(
                error => {
                    return of(null);
                }
            )
        );
}

export function getUserByEmail(email: string): Observable<User> {
    return from(admin.firestore().collection(`users`).where('email', '==', email).get())
        .pipe(
            switchMap(
                userDB => {
                    if (!userDB) {
                        return of(null);
                    }
                    const usersList: Array<User> = new Array<User>();
                    userDB.forEach(
                        user => {
                            usersList.push(user.data() as User);
                        }
                    );
                    if (!usersList || !usersList.length) {
                        return throwError(`El usuario ${email} no existe`);
                    }
                    return of(usersList[0]);
                }
            )
        );
}
