
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider, 
  signInWithRedirect,
  getRedirectResult,
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  limit,
  startAfter,
  onSnapshot,
  enableMultiTabIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { User, PropertyListing, ListingStatus, ChatMessage, ListingCategory, ParkingOption, PostedBy } from '../types.ts';

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

// Critical: Set persistence to Local immediately for PWA/WebView stability
setPersistence(auth, browserLocalPersistence)
  .catch(err => console.error("Persistence configuration failed", err));

// Enable offline persistence for Firestore to handle BSNL network drops
enableMultiTabIndexedDbPersistence(db).catch(() => {});

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ 
  prompt: 'select_account',
  // Helps some mobile browsers recognize the return intent
  display: 'touch' 
});

/**
 * Handles the result of a Google Redirect sign-in.
 * Optimized for Vercel -> App transitions.
 */
export const handleAuthRedirect = async (): Promise<User | null> => {
  try {
    // getRedirectResult resolves to null if no redirect occurred
    const result = await getRedirectResult(auth);
    
    if (result?.user) {
      const userData: User = {
        id: result.user.uid,
        name: result.user.displayName || 'Islander',
        email: result.user.email || '',
        photoURL: result.user.photoURL || undefined
      };
      
      // Force immediate local sync before resolving to UI
      localStorage.setItem(`ah_user_${userData.id}`, JSON.stringify(userData));
      await syncUserToFirestore(userData);
      return userData;
    }
  } catch (error: any) {
    console.error("Auth Redirect Handshake Error:", error.code);
    // Ignore cases where the user just cancelled or nothing happened
    if (error.code !== 'auth/no-auth-event') {
       throw error;
    }
  }
  return null;
};

const syncUserToFirestore = async (userData: User) => {
  try {
    const userRef = doc(db, "users", userData.id);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, { 
        ...userData, 
        createdAt: Date.now(),
        lastLogin: Date.now()
      });
    } else {
      await updateDoc(userRef, { 
        name: userData.name, 
        lastLogin: Date.now() 
      });
    }
  } catch (e) {
    // Fail gracefully for network/permission issues
    console.warn("Firestore sync deferred (Offline mode active)");
  }
};

export const getUserData = async (userId: string): Promise<User | null> => {
  const cached = localStorage.getItem(`ah_user_${userId}`);
  if (cached) return JSON.parse(cached);

  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      const data = userDoc.data() as User;
      localStorage.setItem(`ah_user_${userId}`, JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.error("User fetch error", err);
  }
  return null;
};

export const loginWithGoogleRedirect = async () => {
  // STRICT RULE: No Popup. 
  // Redirect allows the browser to handle the Google UI in a full-screen context,
  // which is much more reliable on mobile and low-bandwidth networks.
  await signInWithRedirect(auth, googleProvider);
};

export const signUpWithEmail = async (email: string, pass: string, name: string): Promise<User> => {
  const result = await createUserWithEmailAndPassword(auth, email, pass);
  await updateProfile(result.user, { displayName: name });
  const userData = { id: result.user.uid, name, email };
  await syncUserToFirestore(userData);
  localStorage.setItem(`ah_user_${userData.id}`, JSON.stringify(userData));
  return userData;
};

export const signInWithEmail = async (email: string, pass: string): Promise<User> => {
  const result = await signInWithEmailAndPassword(auth, email, pass);
  const userData = { 
    id: result.user.uid, 
    name: result.user.displayName || 'User', 
    email: result.user.email || '' 
  };
  // Pre-cache to avoid secondary loading state
  localStorage.setItem(`ah_user_${userData.id}`, JSON.stringify(userData));
  return userData;
};

export const logout = async () => {
  if (auth.currentUser) {
    localStorage.removeItem(`ah_user_${auth.currentUser.uid}`);
  }
  await signOut(auth);
};

export const updateUserProfile = async (userId: string, data: Partial<User>): Promise<void> => {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, data as any);
  
  const cachedKey = `ah_user_${userId}`;
  const cached = localStorage.getItem(cachedKey);
  if (cached) {
    const user = JSON.parse(cached);
    localStorage.setItem(cachedKey, JSON.stringify({ ...user, ...data }));
  }
};

export const getAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/invalid-email': return 'Invalid email format.';
    case 'auth/user-not-found': return 'Account not found.';
    case 'auth/wrong-password': return 'Incorrect password.';
    case 'auth/email-already-in-use': return 'Email already registered.';
    case 'auth/network-request-failed': return 'Island signal lost. Reconnecting...';
    case 'auth/too-many-requests': return 'Too many attempts. Wait a moment.';
    case 'auth/redirect-cancelled-by-user': return 'Login cancelled.';
    default: return 'Authentication error. Please try again.';
  }
};

// --- DATA METHODS ---

export const getListings = async (lastDoc?: any, pageSize = 8): Promise<{ listings: PropertyListing[], lastDoc: any }> => {
  try {
    let q = query(collection(db, "listings"), orderBy("postedAt", "desc"), limit(pageSize));
    if (lastDoc) {
      q = query(collection(db, "listings"), orderBy("postedAt", "desc"), startAfter(lastDoc), limit(pageSize));
    }
    const snap = await getDocs(q);
    const listings = snap.docs.map(d => ({ id: d.id, ...d.data() } as PropertyListing));
    return { listings, lastDoc: snap.docs[snap.docs.length - 1] };
  } catch (err) {
    return { listings: [], lastDoc: null };
  }
};

export const addListing = async (data: any, user: User): Promise<PropertyListing> => {
  const listing = { ...data, ownerId: user.id, ownerName: user.name, postedAt: Date.now() };
  const ref = await addDoc(collection(db, "listings"), listing);
  return { id: ref.id, ...listing } as PropertyListing;
};

export const updateListing = async (listingId: string, data: Partial<PropertyListing>): Promise<void> => {
  const ref = doc(db, "listings", listingId);
  await updateDoc(ref, data as any);
};

export const deleteListing = async (id: string) => await deleteDoc(doc(db, "listings", id));
export const updateListingStatus = async (id: string, status: ListingStatus) => await updateDoc(doc(db, "listings", id), { status });

export const toggleFavorite = async (userId: string, listingId: string): Promise<string[]> => {
  const key = `ah_favs_${userId}`;
  const favs = JSON.parse(localStorage.getItem(key) || '[]');
  const next = favs.includes(listingId) ? favs.filter((i: string) => i !== listingId) : [...favs, listingId];
  localStorage.setItem(key, JSON.stringify(next));
  return next;
};

export const getFavorites = async (userId: string): Promise<string[]> => {
  return JSON.parse(localStorage.getItem(`ah_favs_${userId}`) || '[]');
};

export const sendMessage = async (listingId: string, ownerId: string, user: User, text: string) => {
  const chatId = `${listingId}_${ownerId}_${user.id}`;
  await addDoc(collection(db, "chats", chatId, "messages"), {
    senderId: user.id,
    senderName: user.name,
    text,
    timestamp: Date.now()
  });
};

export const listenToMessages = (listingId: string, ownerId: string, userId: string, callback: (msgs: ChatMessage[]) => void) => {
  const chatId = `${listingId}_${ownerId}_${userId}`;
  const q = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
  });
};
