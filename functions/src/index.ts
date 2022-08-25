import * as admin from 'firebase-admin';
import { environment } from './environments/environment';

admin.initializeApp({
    credential: admin.credential.cert(environment.serviceAccountPath),
    databaseURL: environment.databaseURL
});

admin.firestore().settings({ ignoreUndefinedProperties: true });

export { getMainDocumentData } from './app/functions/documentData';
export { integration } from './app/functions/integration';
export { changePassword } from './app/functions/password';
export { createCustomToken, createUser, deleteUser } from './app/functions/users';

