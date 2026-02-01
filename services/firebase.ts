
import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth,
  setPersistence,
  browserLocalPersistence,
  signOut, 
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  getRedirectResult
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where,
  orderBy,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  limit,
  startAfter,
  onSnapshot,
  enableMultiTabIndexedDbPersistence,
  arrayUnion,
  arrayRemove
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { User, PropertyListing, ListingStatus, ChatMessage } from '../types.ts';

const firebaseConfig = {
  apiKey: "AIzaSyCrJp2FYJeJ5S4cbynYcqG7q15rWoPxcDE",
  authDomain: "anadaman-homes.firebaseapp.com",
  projectId: "anadaman-homes",
  storageBucket: "anadaman-homes.firebasestorage.app",
  messagingSenderId: "563526116422",
  appId: "1:563526116422:web:a4e84ae72b7c75ebdad647"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

enableMultiTabIndexedDbPersistence(db).catch(() => {});

/**
 * Single source of truth for checking if a phone number is registered.
 */
export const checkUserByPhone = async (phoneNumber: string): Promise<User | null> => {
  try {
    const q = query(collection(db, "users"), where("phoneNumber", "==", phoneNumber), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const data = snap.docs[0].data();
      return { id: snap.docs[0].id, ...data } as User;
    }
  } catch (e: any) {
    console.warn("Permission restricted lookup - likely public access disabled.");
  }
  return null;
};

export const setupRecaptcha = (containerId: string) => {
  if (!(window as any).recaptchaVerifier) {
    (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {}
    });
  }
  return (window as any).recaptchaVerifier;
};

export const sendOtp = async (phoneNumber: string, verifier: any) => {
  return await signInWithPhoneNumber(auth, phoneNumber, verifier);
};

export const syncUserToFirestore = async (userData: User) => {
  try {
    const userRef = doc(db, "users", userData.id);
    const payload = { 
      ...userData, 
      lastLogin: Date.now(),
      updatedAt: Date.now()
    };
    await setDoc(userRef, payload, { merge: true });
    localStorage.setItem(`ah_user_profile`, JSON.stringify(payload));
  } catch (e) {
    console.error("Firestore sync failed:", e);
  }
};

export const getUserData = async (userId: string): Promise<User | null> => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      const data = userDoc.data() as User;
      localStorage.setItem(`ah_user_profile`, JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.error("Fetch profile failed:", err);
  }
  const cached = localStorage.getItem(`ah_user_profile`);
  return cached ? JSON.parse(cached) : null;
};

export const logout = async () => {
  localStorage.removeItem(`ah_user_profile`);
  await signOut(auth);
};

export const getListings = async (lastDocParam?: any, pageSize = 20): Promise<{ listings: PropertyListing[], lastDoc: any }> => {
  try {
    const listingsRef = collection(db, "listings");
    let q = query(listingsRef, orderBy("postedAt", "desc"), limit(pageSize));
    
    if (lastDocParam) {
      q = query(listingsRef, orderBy("postedAt", "desc"), startAfter(lastDocParam), limit(pageSize));
    }
    
    const snap = await getDocs(q);
    const listings = snap.docs.map(d => ({ id: d.id, ...d.data() } as PropertyListing));
    return { listings, lastDoc: snap.docs[snap.docs.length - 1] || null };
  } catch (err: any) {
    console.warn("Market fetch failed:", err.message);
    return { listings: [], lastDoc: null };
  }
};

export const addListing = async (data: any, user: User): Promise<PropertyListing> => {
  const listing = { 
    ...data, 
    ownerId: user.id, 
    ownerName: user.name, 
    postedAt: Date.now(),
    status: ListingStatus.ACTIVE
  };
  const ref = await addDoc(collection(db, "listings"), listing);
  return { id: ref.id, ...listing } as PropertyListing;
};

export const updateListing = async (listingId: string, data: Partial<PropertyListing>): Promise<void> => {
  const ref = doc(db, "listings", listingId);
  await updateDoc(ref, data as any);
};

export const deleteListing = async (id: string) => await deleteDoc(doc(db, "listings", id));

export const toggleFavorite = async (userId: string, listingId: string): Promise<string[]> => {
  const userRef = doc(db, "users", userId);
  const userDoc = await getDoc(userRef);
  let currentFavs: string[] = userDoc.exists() ? (userDoc.data().favorites || []) : [];
  
  if (currentFavs.includes(listingId)) {
    await updateDoc(userRef, { favorites: arrayRemove(listingId) });
    currentFavs = currentFavs.filter(id => id !== listingId);
  } else {
    await updateDoc(userRef, { favorites: arrayUnion(listingId) });
    currentFavs = [...currentFavs, listingId];
  }
  return currentFavs;
};

export const getFavorites = async (userId: string): Promise<string[]> => {
  const userDoc = await getDoc(doc(db, "users", userId));
  return userDoc.exists() ? (userDoc.data().favorites || []) : [];
};

export const updateUserProfile = async (userId: string, data: Partial<User>): Promise<void> => {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, data as any);
};

export const getAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/invalid-phone-number': return 'Invalid mobile number.';
    case 'auth/too-many-requests': return 'Too many attempts. Wait a few minutes.';
    case 'auth/code-expired': return 'OTP expired. Request a new one.';
    case 'auth/invalid-verification-code': return 'Incorrect OTP.';
    case 'user-not-found': return 'Mobile not registered. Please sign up first.';
    case 'user-exists': return 'Mobile already registered. Please login.';
    default: return 'Handshake error. Check your signal.';
  }
};

export const sendMessage = async (listingId: string, ownerId: string, user: User, text: string) => {
  const chatId = [listingId, ownerId, user.id].sort().join('_');
  await addDoc(collection(db, "chats", chatId, "messages"), {
    senderId: user.id,
    senderName: user.name,
    text,
    timestamp: Date.now()
  });
};

export const listenToMessages = (listingId: string, ownerId: string, userId: string, callback: (msgs: ChatMessage[]) => void) => {
  const chatId = [listingId, ownerId, userId].sort().join('_');
  const q = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
  });
};
