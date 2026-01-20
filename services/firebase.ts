import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
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
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
  where,
  limit
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { User, PropertyListing, ListingCategory, ChatMessage } from '../types.ts';

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

export const logout = async (): Promise<void> => {
  await signOut(auth);
};

export const getListings = async (): Promise<PropertyListing[]> => {
  try {
    const q = query(collection(db, "listings"), orderBy("postedAt", "desc"));
    const querySnapshot = await getDocs(q);
    const listings: PropertyListing[] = [];
    querySnapshot.forEach((doc) => {
      listings.push({ id: doc.id, ...doc.data() } as PropertyListing);
    });
    return listings;
  } catch (error) {
    console.warn("Firestore access issues:", error);
    return [];
  }
};

export const addListing = async (listingData: any, user: User): Promise<PropertyListing> => {
  const listing = {
    ...listingData,
    ownerId: user.id,
    ownerName: user.name,
    postedAt: Date.now()
  };
  const docRef = await addDoc(collection(db, "listings"), listing);
  return { id: docRef.id, ...listing } as PropertyListing;
};

export const sendOTP = async (phoneNumber: string, verifier: any): Promise<ConfirmationResult> => {
  return await signInWithPhoneNumber(auth, phoneNumber, verifier);
};

// Chat Functions
export const sendMessage = async (listingId: string, recipientId: string, sender: User, text: string) => {
  const chatId = [sender.id, recipientId, listingId].sort().join('_');
  const chatRef = collection(db, "chats", chatId, "messages");
  
  await addDoc(chatRef, {
    senderId: sender.id,
    senderName: sender.name,
    text,
    timestamp: Date.now()
  });
};

export const listenToMessages = (listingId: string, recipientId: string, senderId: string, callback: (messages: ChatMessage[]) => void) => {
  const chatId = [senderId, recipientId, listingId].sort().join('_');
  const q = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"));
  
  return onSnapshot(q, (snapshot) => {
    const messages: ChatMessage[] = [];
    snapshot.forEach((doc) => {
      messages.push({ id: doc.id, ...doc.data() } as ChatMessage);
    });
    callback(messages);
  });
};