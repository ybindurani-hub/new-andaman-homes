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
  ConfirmationResult,
  setPersistence,
  browserLocalPersistence
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
const googleProvider = new GoogleAuthProvider();

// IMPORTANT: Set persistence to Local to avoid 'missing initial state' errors in WebViews
setPersistence(auth, browserLocalPersistence)
  .catch((error) => console.error("Auth persistence error:", error));

const STORAGE_KEY = 'andaman_homes_local_listings';
const FAVORITES_KEY = 'andaman_homes_favorites';

export const loginWithGoogle = async (): Promise<User> => {
  try {
    // Some mobile webviews block sign-in popups. 
    // Popups are generally more reliable than Redirects in wraps like Median
    const result = await signInWithPopup(auth, googleProvider);
    return {
      id: result.user.uid,
      name: result.user.displayName || 'User',
      email: result.user.email || '',
      photoURL: result.user.photoURL || undefined
    };
  } catch (error: any) {
    if (error.code === 'auth/unauthorized-domain') {
      throw new Error("Domain not authorized in Firebase Console.");
    }
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
      throw new Error("Sign-in window was blocked. Please try Email or Phone login.");
    }
    // Handle the 'missing initial state' specific case
    if (error.message.includes('missing initial state')) {
      throw new Error("Storage access error. Please try Email login instead.");
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
    console.warn("Firestore fetch failed:", error);
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
    console.warn("Firestore save failed, using local fallback:", error);
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
    const filtered = localListings.filter((l: any) => l.id !== listingId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return;
  }
  try {
    const listingRef = doc(db, "listings", listingId);
    await deleteDoc(listingRef);
  } catch (error) {
    console.error("Delete failed:", error);
    throw error;
  }
};

export const updateListingStatus = async (listingId: string, status: ListingStatus) => {
  if (listingId.startsWith('local_')) {
    const localListings = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const updated = localListings.map((l: any) => l.id === listingId ? { ...l, status } : l);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return;
  }
  try {
    const listingRef = doc(db, "listings", listingId);
    await updateDoc(listingRef, { status });
  } catch (error) {
    console.error("Update failed:", error);
    throw error;
  }
};

export const sendOTP = async (phoneNumber: string, verifier: any): Promise<ConfirmationResult> => {
  return await signInWithPhoneNumber(auth, phoneNumber, verifier);
};

export const sendMessage = async (listingId: string, recipientId: string, sender: User, text: string) => {
  try {
    const chatId = [sender.id, recipientId, listingId].sort().join('_');
    const chatRef = collection(db, "chats", chatId, "messages");
    await addDoc(chatRef, {
      senderId: sender.id,
      senderName: sender.name,
      text,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error("Chat message failed:", error);
  }
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
  }, (error) => {
    console.warn("Chat listen failed:", error);
  });
};

export const toggleFavorite = async (userId: string, listingId: string): Promise<string[]> => {
  const favorites = JSON.parse(localStorage.getItem(`${FAVORITES_KEY}_${userId}`) || '[]');
  const index = favorites.indexOf(listingId);
  let newFavorites: string[];
  if (index === -1) {
    newFavorites = [...favorites, listingId];
  } else {
    newFavorites = favorites.filter((id: string) => id !== listingId);
  }
  localStorage.setItem(`${FAVORITES_KEY}_${userId}`, JSON.stringify(newFavorites));
  try {
    const userRef = doc(db, "users", userId);
    await setDoc(userRef, { favorites: newFavorites }, { merge: true });
  } catch (e) {
    console.warn("Cloud favorite sync failed:", e);
  }
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
  } catch (e) {
    console.warn("Cloud favorites fetch failed:", e);
  }
  return JSON.parse(localStorage.getItem(`${FAVORITES_KEY}_${userId}`) || '[]');
};