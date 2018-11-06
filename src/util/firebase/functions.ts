// tslint:disable:ordered-imports

import { firebase } from "./app";
import "firebase/functions";

export interface Request {
  accessCode: string;
  redirectUri: string;
}

export interface Response {
  accessToken: string;
  firebaseToken: string;
}

export const authorize = firebase.functions().httpsCallable("auth") as
    (arg: Request) => Promise<{ readonly data: Response }>;
