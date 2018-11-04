import * as firebase from 'firebase-admin';
import * as functions from 'firebase-functions';
import request from 'request-promise-native';
import { URL } from 'url';
import { AuthResponse, UserInfo } from '../util/putio';

interface AuthRequest {
    accessCode?: string;
}

export const auth = functions.https.onCall(async (data: AuthRequest) => {
    try {
        if (!data.accessCode) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                "Missing accessCode"
            );
        }

        const putAuthUrl = new URL('https://api.put.io/v2/oauth2/access_token');
        putAuthUrl.searchParams.set('client_id', functions.config().putio.client_id);
        putAuthUrl.searchParams.set('client_secret', functions.config().putio.secret);
        putAuthUrl.searchParams.set('grant_type', 'authorization_code');
        putAuthUrl.searchParams.set('code', data.accessCode);
        putAuthUrl.searchParams.set('redirect_uri', data.accessCode);

        const authResponse: AuthResponse = await request(
            putAuthUrl.toString(),
            { json: true },
        );
        const userInfo: UserInfo = await request(
            `https://api.put.io/v2/account/info?oauth_token=${authResponse.access_token}`,
            { json: true },
        );

        try {
            await firebase.auth().getUser(String(userInfo.user_id));
        } catch(e) {
            await firebase.auth().createUser({
                uid: String(userInfo.user_id),
                displayName: userInfo.username,
                photoURL: userInfo.avatar_url,
                email: userInfo.mail,
            });
        }

        const token = await firebase.auth().createCustomToken(String(userInfo.user_id));

        return { accessToken: authResponse.access_token, firebaseToken: token };
    } catch(e) {
        throw new functions.https.HttpsError('internal', e.message);
    }
});