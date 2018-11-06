// tslint:disable:ordered-imports

import { firebase } from "./app";
import "firebase/auth";

export const handleOAuthLogin = async (accessCode: string) => {
  const { authorize } = await import("./functions");
  const { data } = await authorize({
    accessCode,
    redirectUri: location.origin,
  });

  await firebase.auth().signInWithCustomToken(data.firebaseToken);
};

export const getUser = () => {
  const auth = firebase.auth();
  if (auth.currentUser && auth.currentUser.uid) {
    return Promise.resolve(auth.currentUser);
  }

  return new Promise<firebase.User | null>(resolve => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      unsubscribe();
      resolve(user && user.uid ? user : null);
    });
  });
};
