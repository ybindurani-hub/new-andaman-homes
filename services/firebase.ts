
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

// Enable persistence for offline support and multi-tab sync
enableMultiTabIndexedDbPersistence(db).catch(() => {});

/**
 * Checks if a user exists in Firestore.
 * If permissions are denied (common if not logged in), it assumes user is not known locally.
 */
export const checkUserByPhone = async (phoneNumber: string): Promise<User | null> => {
  try {
    const q = query(collection(db, "users"), where("phoneNumber", "==", phoneNumber), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return { id: snap.docs[0].id, ...snap.docs[0].data() } as User;
    }
  } catch (e: any) {
    if (e.code === 'permission-denied') {
      console.warn("User lookup restricted: Public access to users collection is disabled.");
    } else {
      console.error("User check error:", e);
    }
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
    localStorage.setItem(`ah_user_${userData.id}`, JSON.stringify(payload));
  } catch (e) {
    console.error("Profile sync error:", e);
  }
};

export const getUserData = async (userId: string): Promise<User | null> => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      const data = userDoc.data() as User;
      localStorage.setItem(`ah_user_${userId}`, JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.error("User fetch error:", err);
  }
  const cached = localStorage.getItem(`ah_user_${userId}`);
  return cached ? JSON.parse(cached) : null;
};

export const logout = async () => {
  if (auth.currentUser) {
    localStorage.removeItem(`ah_user_${auth.currentUser.uid}`);
  }
  await signOut(auth);
};

/**
 * Fetches listings with enhanced error handling for permission issues.
 * If the database is locked to authenticated users only, this will catch the 403 and return empty.
 */
export const getListings = async (lastDocParam?: any, pageSize = 20): Promise<{ listings: PropertyListing[], lastDoc: any }> => {
  try {
    const listingsRef = collection(db, "listings");
    let q = query(listingsRef, orderBy("postedAt", "desc"), limit(pageSize));
    
    if (lastDocParam) {
      q = query(listingsRef, orderBy("postedAt", "desc"), startAfter(lastDocParam), limit(pageSize));
    }
    
    const snap = await getDocs(q);
    const listings = snap.docs.map(d => ({ id: d.id, ...d.data() } as PropertyListing));
    return { 
      listings, 
      lastDoc: snap.docs[snap.docs.length - 1] || null 
    };
  } catch (err: any) {
    if (err.code === 'permission-denied') {
      console.warn("Listing fetch failed: Missing Permissions. Login may be required to view listings.");
    } else {
      console.error("Listing Service Error:", err.message);
    }
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

/**
 * Persistence for Saved/Favorites in Firestore.
 */
export const toggleFavorite = async (userId: string, listingId: string): Promise<string[]> => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    let currentFavs: string[] = userDoc.exists() ? (userDoc.data().favorites || []) : [];
    
    const isFav = currentFavs.includes(listingId);
    if (isFav) {
      await updateDoc(userRef, { favorites: arrayRemove(listingId) });
      currentFavs = currentFavs.filter(id => id !== listingId);
    } else {
      await updateDoc(userRef, { favorites: arrayUnion(listingId) });
      currentFavs = [...currentFavs, listingId];
    }
    return currentFavs;
  } catch (e) {
    console.error("Toggle favorite failed:", e);
    throw e;
  }
};

export const getFavorites = async (userId: string): Promise<string[]> => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    return userDoc.exists() ? (userDoc.data().favorites || []) : [];
  } catch (e) {
    return [];
  }
};

export const updateUserProfile = async (userId: string, data: Partial<User>): Promise<void> => {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, data as any);
};

export const getAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/invalid-phone-number': return 'Invalid mobile number.';
    case 'auth/too-many-requests': return 'Too many attempts. Try later.';
    case 'auth/code-expired': return 'OTP expired.';
    case 'auth/invalid-verification-code': return 'Incorrect OTP.';
    case 'user-not-found': return 'Mobile not registered. Please sign up first.';
    case 'user-exists': return 'Mobile already registered. Please login.';
    case 'permission-denied': return 'Database Access Denied. Please login again.';
    default: return 'Connection failed. Please check your internet.';
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
  }, (err) => {
    console.warn("Message listener restricted:", err.message);
  });
};

export const handleAuthRedirect = async (): Promise<User | null> => {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      return await getUserData(result.user.uid);
    }
  } catch (err) {
    console.warn("Auth redirect handled.");
  }
  return null;
};
