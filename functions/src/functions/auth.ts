import * as firebase from 'firebase-admin';
import * as functions from 'firebase-functions';
import request from 'request-promise-native';
import { URL } from 'url';
import { authenticatedApi, AuthResponse, UserInfo } from '../util/putio';

interface AuthRequest {
    accessCode: string;
    redirectUri: string;
}

export const auth = functions.https.onCall(async (data: AuthRequest) => {
    try {
        if (!data.accessCode) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                "Missing accessCode"
            );
        }
        if (!data.redirectUri) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                "Missing redirectUri"
            );
        }

        const putAuthUrl = new URL('https://api.put.io/v2/oauth2/access_token');
        putAuthUrl.searchParams.set('client_id', functions.config().putio.client_id);
        putAuthUrl.searchParams.set('client_secret', functions.config().putio.secret);
        putAuthUrl.searchParams.set('grant_type', 'authorization_code');
        putAuthUrl.searchParams.set('code', data.accessCode);
        putAuthUrl.searchParams.set('redirect_uri', data.redirectUri);

        const authResponse: AuthResponse = await request(putAuthUrl.toString(), { json: true });

        const { info }: { info: UserInfo } = await request(
            authenticatedApi(authResponse.access_token).accountInfo,
            { json: true },
        );

        try {
            await firebase.auth().getUser(String(info.user_id));
        } catch(e) {
            await firebase.auth().createUser({
                uid: String(info.user_id),
                displayName: info.username,
                photoURL: info.avatar_url,
                email: info.mail,
            });
        }

        const token = await firebase.auth().createCustomToken(String(info.user_id));

        return { accessToken: authResponse.access_token, firebaseToken: token };
    } catch(e) {
        throw new functions.https.HttpsError('internal', e.message);
    }
});
