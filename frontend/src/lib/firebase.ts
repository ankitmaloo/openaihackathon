// Import the functions you need from the SDKs you need
import type { FirebaseApp } from "firebase/app";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import type { CollectionReference, DocumentData, DocumentReference, DocumentSnapshot, Firestore, Query, QuerySnapshot } from "firebase/firestore";
import { getFirestore, collection, doc, onSnapshot } from "firebase/firestore";        
import { getStorage } from 'firebase/storage';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyClD-oySznpQSyBZtdsMXJMc-dJu-AMVP8",
  authDomain: "clioappai.firebaseapp.com",
  projectId: "clioappai",
  storageBucket: "clioappai.appspot.com",
  messagingSenderId: "735457379106",
  appId: "1:735457379106:web:5f0302b162a040c1a5db7b"
};

// Initialize Firebase
export const app: FirebaseApp = initializeApp(firebaseConfig);

export const db: Firestore = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Compatibility no-op initializer for components that call initFirebase()
export const initFirebase = (): FirebaseApp => app;

// Basic listeners used by the chat UI
export function onDocumentChange<T = DocumentData>(
  pathOrRef: string | DocumentReference<T>,
  callback: (snapshot: DocumentSnapshot<T>) => void
): () => void {
  const ref = typeof pathOrRef === 'string' ? (doc(db, pathOrRef) as DocumentReference<T>) : pathOrRef
  return onSnapshot(ref, callback)
}

export function onCollectionChange<T = DocumentData>(
  pathOrRef: string | CollectionReference<T> | Query<T>,
  callback: (snapshot: QuerySnapshot<T>) => void
): () => void {
  const ref = typeof pathOrRef === 'string' ? (collection(db, pathOrRef) as CollectionReference<T>) : pathOrRef
  return onSnapshot(ref, callback)
}
