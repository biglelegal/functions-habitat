import * as admin from 'firebase-admin';
import { combineLatest, from, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Document, PromotionHabitat, User } from '../entities';
import { Society } from '../entities/blocks/society';
import { CheckboxBlockParams, DocType, DocTypeBlock, Field, Model, ModelBlock, ModelField, RadioBlockParams } from '../entities/promotionHabitat';

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

export function getDocTypeByUid(uid: string): Observable<DocType> {
    return from(admin.firestore().doc(`documentTypes/${uid}`).get())
        .pipe(
            switchMap(
                doctypeDB => {
                    if (!doctypeDB || !doctypeDB.data()) {
                        return getDocType(uid);
                    }
                    return of(doctypeDB.data() as DocType);
                }
            ),
            catchError(
                error => {
                    console.error('getDocTypesByIdName error', error);
                    return of(null);
                }
            )
        );
}

export function getDocType(uid: string): Observable<DocType> {
    return getModelByUid(uid)
        .pipe(
            switchMap(
                model => {
                    if (!model) {
                        return getDoctypeWithBlocks(model.uid);
                    }
                    return getDoctypeFromModel(model.uid);
                }
            ),
            map(
                docType => {
                    if (!docType) {
                        return new DocType();
                    }
                    return docType;
                }
            )
        );
}

export function getDoctypeFromModel(uid: string): Observable<DocType> {
    return setModel(uid)
        .pipe(
            map(
                data => {
                    return getCurrentDocType(data.model, data.modelBlocks, data.modelFields);
                }
            )
        );
}

export function setModel(uid: string): Observable<{ model: Model, modelBlocks: Array<ModelBlock>, modelFields: Array<ModelField> }> {
    if (!uid) {
        return throwError('doctype.errors.DOCTYPE_NINF');
    }
    return combineLatest(
        getModel(uid),
        getModelBlocks(uid),
        getModelFields(uid)
    ).pipe(
        switchMap(
            data => {
                const model: Model = data[0];
                const modelBlocks: Array<ModelBlock> = data[1];
                const modelFields: Array<ModelField> = data[2];
                return of({ model: model, modelBlocks: modelBlocks, modelFields: modelFields });
            }
        )
    );
}

export function getModel(uid: string): Observable<Model> {
    return from(admin.firestore().doc(`models/${uid}`).get())
        .pipe(
            map(
                res => {
                    if (!res || !res.data()) {
                        return new Model();
                    }
                    return res.data() as Model;
                }
            )
        );
}

export function getModelBlocks(uid: string): Observable<Array<ModelBlock>> {
    return from(admin.firestore().collection(`models/${uid}/blocks`).get())
        .pipe(
            map(
                modelBlockdDB => {
                    if (!modelBlockdDB) {
                        return null;
                    }
                    const modelBlockdList: Array<DocType> = new Array<DocType>();
                    modelBlockdDB.forEach(
                        mBlockdBD => {
                            modelBlockdList.push(mBlockdBD.data() as DocType);
                        }
                    );
                    return modelBlockdList;
                }
            ),
            catchError(
                error => {
                    console.error('getModelBlocks error', error);
                    return of(null);
                }
            )
        );
}

export function getModelFields(uid: string): Observable<Array<ModelField>> {
    return from(admin.firestore().collection(`models/${uid}/fields`).get())
        .pipe(
            map(
                modelFieldDB => {
                    if (!modelFieldDB) {
                        return null;
                    }
                    const modelFieldList: Array<DocType> = new Array<DocType>();
                    modelFieldDB.forEach(
                        mFieldBD => {
                            modelFieldList.push(mFieldBD.data() as DocType);
                        }
                    );
                    return modelFieldList;
                }
            ),
            catchError(
                error => {
                    console.error('getModelFields error', error);
                    return of(null);
                }
            )
        );
}

export function getCurrentDocType(model: Model, modelBlocks: Array<ModelBlock>, modelFields: Array<ModelField>): DocType {
    return transform(model, modelBlocks, modelFields);
}

export function transform(model: Model, modelBlocks: Array<ModelBlock>, modelFields: Array<ModelField>): DocType {
    const doctype: DocType = DocType.extract(model);

    if (!model || !modelBlocks || !modelFields) {
        return doctype;
    }
    doctype.config.blocks = model.blocks
        .filter(
            blockUid => {
                const modelBlock: ModelBlock = modelBlocks.find(x => x.uid === blockUid);
                if (!modelBlock || !modelBlock.block) {
                    return false;
                }
                return true;
            }
        ).map(
            blockUid => {
                const modelBlock: ModelBlock = modelBlocks.find(x => x.uid === blockUid);
                if (!modelBlock || !modelBlock.block) {
                    return new DocTypeBlock();
                }
                modelBlock.block.subBlocks = getSubBlocks(modelBlock, modelBlocks, modelFields);
                modelBlock.block.fields = getFields(modelBlock, modelBlocks, modelFields);
                modelBlock.block.uid = modelBlock.uid;
                return modelBlock.block;
            }
        ).sort((a, b) => {
            return a.order - b.order;
        });

    return doctype;
}

export function getModelByUid(uid: string): Observable<Model> {
    return from(admin.firestore().doc(`models/${uid}`).get())
        .pipe(
            map(
                modelDB => {
                    if (!modelDB || !modelDB.data()) {
                        return null;
                    }
                    return modelDB.data() as Model;
                }
            )
        );
}

export function getDoctypeWithBlocks(uid: string): Observable<DocType> {
    return combineLatest(
        from(admin.firestore().doc(`documentTypes/${uid}`).get()),
        getDocTypeBlocks(uid)
    )
        .pipe(
            map(
                data => {
                    const doctype: DocType = data[0].data() as DocType;
                    if (data[1]) {
                        doctype.config.blocks = data[1];
                        doctype.config.blocks.sort((a, b) => (a.order || Number.MAX_SAFE_INTEGER) - (b.order || Number.MAX_SAFE_INTEGER));
                    }
                    return doctype;
                }
            )
        );
}

export function getDocTypeBlocks(uid: string): Observable<Array<DocTypeBlock>> {
    return from(admin.firestore().collection(`documentTypes/${uid}/blocks`).get())
        .pipe(
            map(
                blocksDB => {
                    if (!blocksDB) {
                        return null;
                    }
                    const blocks: Array<DocTypeBlock> = new Array<DocTypeBlock>();
                    blocksDB.forEach(
                        block => {
                            blocks.push(block.data() as DocTypeBlock);
                        }
                    );
                    return blocks;
                }
            ),
            catchError(
                error => {
                    console.error('getDocTypeBlocks error', error);
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

export function setDocumentMainPercentage(docUid: string, main: any, percentage: number): Observable<void> {
    return from(admin.firestore().doc(`documents/${docUid}`).set({ main: main, percentageCompleted: percentage }, { merge: true }))
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

export function getSubBlocks(block: ModelBlock, blocks: Array<ModelBlock>, fields: Array<ModelField>): Array<DocTypeBlock> {
    if (!block.subBlocks) {
        return new Array<DocTypeBlock>();
    }
    return block.subBlocks.map(
        blockUid => {
            return extractBlock(blockUid, blocks, fields);
        }
    ).sort((a, b) => {
        return a.order - b.order;
    });
}

export function extractBlock(blockUid: string, blocks: Array<ModelBlock>, fields: Array<ModelField>): any {
    const modelBlock: ModelBlock = blocks.find(x => x.uid === blockUid);
    if (!modelBlock || !modelBlock.block) {
        return new DocTypeBlock();
    }
    modelBlock.block.subBlocks = getSubBlocks(modelBlock, blocks, fields);
    modelBlock.block.fields = getFields(modelBlock, blocks, fields);
    if (modelBlock.block.predefType && modelBlock.block.predefConfig) {
        modelBlock.block.predefConfig.customFields = getCustomFields(modelBlock, blocks, fields);
    }
    modelBlock.block.uid = modelBlock.uid;
    return modelBlock.block;
}

export function getFields(block: ModelBlock, blocks: Array<ModelBlock>, fields: Array<ModelField>): Array<Field> {
    if (!block.fields) {
        return new Array<Field>();
    }
    return block.fields.map(
        fieldUid => {
            const modelField: ModelField = fields.find(x => x.uid === fieldUid);
            if (!modelField || !modelField.field) {
                return new Field();
            }
            insertFieldBlockFields(modelField, blocks, fields);
            modelField.field.uid = modelField.uid;
            return modelField.field;
        }
    ).sort((a, b) => {
        return a.order - b.order;
    });
}

export function getCustomFields(block: ModelBlock, blocks: Array<ModelBlock>, fields: Array<ModelField>): Array<Field> {
    if (!block.customFields) {
        return new Array<Field>();
    }
    return block.customFields.map(
        fieldUid => {
            const modelField: ModelField = fields.find(x => x.uid === fieldUid);
            if (!modelField || !modelField.field) {
                return new Field();
            }
            insertFieldBlockFields(modelField, blocks, fields);
            modelField.field.uid = modelField.uid;
            return modelField.field;
        }
    ).sort((a, b) => {
        return a.order - b.order;
    });
}

export function insertFieldBlockFields(field: ModelField, blocks: Array<ModelBlock>, fields: Array<ModelField>): void {
    if (!field.field) {
        return;
    }
    if (field.field.type) {
        switch (field.field.type) {
            case 'checkbox-block':
                (<CheckboxBlockParams>field.field.params).checkboxList
                    .forEach(
                        option => {
                            if (option.blockUid) {
                                option.block = extractBlock(option.blockUid, blocks, fields);
                            }
                        }
                    );
                break;
            case 'radio-block':
                (<RadioBlockParams>field.field.params).radioList
                    .forEach(
                        option => {
                            if (option.blockUid) {
                                option.block = extractBlock(option.blockUid, blocks, fields);
                            }
                        }
                    );
        }
    }
}
