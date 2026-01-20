
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  Timestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { User, PropertyListing } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyCrJp2FYJeJ5S4cbynYcqG7q15rWoPxcDE",
  authDomain: "anadaman-homes.firebaseapp.com",
  projectId: "anadaman-homes",
  storageBucket: "anadaman-homes.firebasestorage.app",
  messagingSenderId: "563526116422",
  appId: "1:563526116422:web:a4e84ae72b7c75ebdad647"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async (): Promise<User> => {
  const result = await signInWithPopup(auth, googleProvider);
  return {
    id: result.user.uid,
    name: result.user.displayName || 'User',
    email: result.user.email || '',
    photoURL: result.user.photoURL || undefined
  };
};

export const signUpWithEmail = async (email: string, pass: string, name: string): Promise<User> => {
  const result = await createUserWithEmailAndPassword(auth, email, pass);
  return {
    id: result.user.uid,
    name: name,
    email: email
  };
};

export const signInWithEmail = async (email: string, pass: string): Promise<User> => {
  const result = await signInWithEmailAndPassword(auth, email, pass);
  return {
    id: result.user.uid,
    name: result.user.displayName || 'User',
    email: result.user.email || ''
  };
};

export const setupRecaptcha = (containerId: string) => {
  if (!(window as any).recaptchaVerifier) {
    (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible'
    });
  }
};

export const sendOTP = async (phoneNumber: string): Promise<ConfirmationResult> => {
  const verifier = (window as any).recaptchaVerifier;
  return await signInWithPhoneNumber(auth, phoneNumber, verifier);
};

export const logout = async () => {
  await signOut(auth);
};

export const getListings = async (): Promise<PropertyListing[]> => {
  const q = query(collection(db, "listings"), orderBy("postedAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as PropertyListing[];
};

export const addListing = async (listing: any, user: User): Promise<PropertyListing> => {
  const listingData = {
    ...listing,
    ownerId: user.id,
    ownerName: user.name,
    postedAt: Date.now()
  };
  const docRef = await addDoc(collection(db, "listings"), listingData);
  return { id: docRef.id, ...listingData };
};
