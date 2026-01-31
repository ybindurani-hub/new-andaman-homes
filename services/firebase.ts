import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
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
  deleteDoc,
  updateDoc,
  setDoc,
  where
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { User, PropertyListing, ChatMessage, ListingStatus } from '../types.ts';

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

// Explicitly set persistence to Local to survive mobile WebView refreshes/redirects
setPersistence(auth, browserLocalPersistence).catch(console.error);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const STORAGE_KEY = 'andaman_homes_local_listings';
const FAVORITES_KEY = 'andaman_homes_favorites';

export const handleRedirectResult = async (): Promise<User | null> => {
  try {
    // getRedirectResult should only be called if we think a redirect happened.
    // Firebase internally handles the check, but we wrap it for safety.
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      return {
        id: result.user.uid,
        name: result.user.displayName || 'User',
        email: result.user.email || '',
        photoURL: result.user.photoURL || undefined
      };
    }
    return null;
  } catch (error: any) {
    console.error("Redirect Error:", error.code, error.message);
    return null;
  }
};

export const loginWithGoogle = async (): Promise<User | void> => {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  if (isMobile) {
    // For mobile webviews, Redirect is vastly more reliable for 'missing initial state'
    return signInWithRedirect(auth, googleProvider);
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    return {
      id: result.user.uid,
      name: result.user.displayName || 'User',
      email: result.user.email || '',
      photoURL: result.user.photoURL || undefined
    };
  } catch (error: any) {
    if (error.code === 'auth/popup-blocked' || error.message.includes('initial state')) {
      return signInWithRedirect(auth, googleProvider);
    }
    throw error;
  }
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

// ReCAPTCHA and OTP Logic
let globalVerifier: any = null;

export const sendOTP = async (phoneNumber: string): Promise<ConfirmationResult> => {
  if (!globalVerifier) {
    globalVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {}
    });
  }
  return await signInWithPhoneNumber(auth, phoneNumber, globalVerifier);
};

// Firestore Methods
export const getListings = async (): Promise<PropertyListing[]> => {
  const localListings = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  try {
    const q = query(collection(db, "listings"), orderBy("postedAt", "desc"));
    const querySnapshot = await getDocs(q);
    const listings: PropertyListing[] = [];
    querySnapshot.forEach((doc) => {
      listings.push({ id: doc.id, ...doc.data() } as PropertyListing);
    });
    return [...localListings, ...listings];
  } catch (error) {
    return localListings;
  }
};

export const addListing = async (listingData: any, user: User): Promise<PropertyListing> => {
  const listing = {
    ...listingData,
    status: ListingStatus.ACTIVE,
    ownerId: user.id,
    ownerName: user.name,
    postedAt: Date.now()
  };
  try {
    const docRef = await addDoc(collection(db, "listings"), listing);
    return { id: docRef.id, ...listing } as PropertyListing;
  } catch (error) {
    const localListings = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const localListingWithId = { ...listing, id: 'local_' + Date.now() };
    localListings.unshift(localListingWithId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localListings));
    return localListingWithId as PropertyListing;
  }
};

export const deleteListing = async (listingId: string) => {
  if (listingId.startsWith('local_')) {
    const localListings = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localListings.filter((l: any) => l.id !== listingId)));
    return;
  }
  await deleteDoc(doc(db, "listings", listingId));
};

export const updateListingStatus = async (listingId: string, status: ListingStatus) => {
  if (listingId.startsWith('local_')) {
    const localListings = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localListings.map((l: any) => l.id === listingId ? { ...l, status } : l)));
    return;
  }
  await updateDoc(doc(db, "listings", listingId), { status });
};

export const sendMessage = async (listingId: string, recipientId: string, sender: User, text: string) => {
  const chatId = [sender.id, recipientId, listingId].sort().join('_');
  await addDoc(collection(db, "chats", chatId, "messages"), {
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
    snapshot.forEach((doc) => messages.push({ id: doc.id, ...doc.data() } as ChatMessage));
    callback(messages);
  });
};

export const toggleFavorite = async (userId: string, listingId: string): Promise<string[]> => {
  const favorites = JSON.parse(localStorage.getItem(`${FAVORITES_KEY}_${userId}`) || '[]');
  const newFavorites = favorites.includes(listingId) ? favorites.filter((id: string) => id !== listingId) : [...favorites, listingId];
  localStorage.setItem(`${FAVORITES_KEY}_${userId}`, JSON.stringify(newFavorites));
  try {
    await setDoc(doc(db, "users", userId), { favorites: newFavorites }, { merge: true });
  } catch {}
  return newFavorites;
};

export const getFavorites = async (userId: string): Promise<string[]> => {
  try {
    const userDoc = await getDocs(query(collection(db, "users"), where("__name__", "==", userId)));
    if (!userDoc.empty) {
      const data = userDoc.docs[0].data();
      if (data.favorites) {
        localStorage.setItem(`${FAVORITES_KEY}_${userId}`, JSON.stringify(data.favorites));
        return data.favorites;
      }
    }
  } catch {}
  return JSON.parse(localStorage.getItem(`${FAVORITES_KEY}_${userId}`) || '[]');
};