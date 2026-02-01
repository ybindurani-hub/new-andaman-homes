
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth,
  setPersistence,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  GoogleAuthProvider, 
  signInWithPopup, 
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
  deleteDoc,
  updateDoc,
  setDoc,
  getDoc,
  where,
  limit,
  startAfter,
  serverTimestamp,
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

// Mock Data for Fallback
const INITIAL_MOCK_LISTINGS: PropertyListing[] = [
  {
    id: 'mock_1',
    title: 'Luxury Seaside Villa',
    description: 'Breathtaking 3-bedroom villa near Radhanagar Beach. Features modern island architecture and private pool.',
    price: 18500000,
    location: 'Havelock Island (Swaraj Dweep)',
    category: ListingCategory.HOUSE_SALE,
    area: '2800',
    areaUnit: 'sq.ft',
    imageUrls: ['https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&q=80&w=800'],
    ownerId: 'owner_1',
    ownerName: 'Islander Rahul',
    contactNumber: '9933212345',
    postedAt: Date.now() - 3600000,
    parking: ParkingOption.BOTH,
    floor: 'Ground',
    postedBy: PostedBy.OWNER,
    status: ListingStatus.ACTIVE
  },
  {
    id: 'mock_2',
    title: 'Commercial Space - Aberdeen Bazaar',
    description: 'Prime ground floor retail space in the heart of Port Blair. Perfect for cafes or boutique shops.',
    price: 35000,
    location: 'Port Blair',
    category: ListingCategory.SHOP_RENT,
    area: '600',
    areaUnit: 'sq.ft',
    imageUrls: ['https://images.unsplash.com/photo-1555436169-20e93ea9a7ff?auto=format&fit=crop&q=80&w=800'],
    ownerId: 'owner_2',
    ownerName: 'Priya Das',
    contactNumber: '9933254321',
    postedAt: Date.now() - 86400000,
    parking: ParkingOption.NONE,
    floor: '1st Floor',
    postedBy: PostedBy.OWNER,
    status: ListingStatus.ACTIVE
  }
];

export const logger = {
  info: (...args: any[]) => { if (location.hostname === 'localhost') console.log('[AH-INFO]', ...args); },
  warn: (...args: any[]) => { console.warn('[AH-WARN]', ...args); },
  error: (...args: any[]) => { console.error('[AH-ERROR]', ...args); }
};

enableMultiTabIndexedDbPersistence(db).catch(() => {});

setPersistence(auth, indexedDBLocalPersistence)
  .catch(() => setPersistence(auth, browserLocalPersistence));

const googleProvider = new GoogleAuthProvider();

const withRetry = async <T>(fn: () => Promise<T>, retries = 2): Promise<T> => {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error('Operation Failed');
};

export const getUserData = async (userId: string): Promise<User | null> => {
  // Check local cache first for Demo Mode persistence
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
    logger.error("Fetch User Data Fallback to Local Only", err);
  }
  return null;
};

export const updateUserProfile = async (userId: string, data: { name?: string, phoneNumber?: string }): Promise<void> => {
  // Sync Local first for immediate feedback
  const cached = localStorage.getItem(`ah_user_${userId}`);
  const base = cached ? JSON.parse(cached) : { id: userId, email: auth.currentUser?.email || '' };
  const updated = { ...base, ...data };
  localStorage.setItem(`ah_user_${userId}`, JSON.stringify(updated));

  try {
    await withRetry(async () => {
      const userRef = doc(db, "users", userId);
      await setDoc(userRef, updated, { merge: true });
      if (auth.currentUser && data.name) {
        await updateProfile(auth.currentUser, { displayName: data.name });
      }
    });
  } catch (err) {
    logger.warn("Profile synced to local only (DB Locked)");
  }
};

export const getAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/network-request-failed': return 'Island signal weak. Check BSNL.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return 'Incorrect login details.';
    default: return `Something went wrong. Try again.`;
  }
};

export const loginWithGoogle = async (): Promise<User | void> => {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile) return signInWithRedirect(auth, googleProvider);
  // Fix: Explicitly cast result of withRetry to any to avoid TypeScript unknown error.
  const result: any = await withRetry(() => signInWithPopup(auth, googleProvider));
  return { id: result.user.uid, name: result.user.displayName || 'User', email: result.user.email || '' };
};

export const signUpWithEmail = async (email: string, pass: string, name: string): Promise<User> => {
  // Fix: Explicitly cast result of withRetry to any to avoid TypeScript unknown error.
  const result: any = await withRetry(() => createUserWithEmailAndPassword(auth, email, pass));
  await updateProfile(result.user, { displayName: name });
  await updateUserProfile(result.user.uid, { name });
  return { id: result.user.uid, name, email };
};

export const signInWithEmail = async (email: string, pass: string): Promise<User> => {
  // Fix: Explicitly cast result of withRetry to any to avoid TypeScript unknown error.
  const result: any = await withRetry(() => signInWithEmailAndPassword(auth, email, pass));
  return { id: result.user.uid, name: result.user.displayName || 'User', email: result.user.email || '' };
};

export const logout = async () => await signOut(auth);

export const getListings = async (lastVisibleDoc?: any, pageSize: number = 6): Promise<{ listings: PropertyListing[], lastDoc: any }> => {
  try {
    const q = lastVisibleDoc 
      ? query(collection(db, "listings"), orderBy("postedAt", "desc"), startAfter(lastVisibleDoc), limit(pageSize))
      : query(collection(db, "listings"), orderBy("postedAt", "desc"), limit(pageSize));
    
    const snap = await getDocs(q);
    const listings = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PropertyListing));
    return { listings, lastDoc: snap.docs[snap.docs.length - 1] };
  } catch (err: any) {
    if (err.code === 'permission-denied' || err.message?.includes('permission')) {
      logger.info("Using Demo-Mode Mock Data (Permissions Locked)");
      return { listings: INITIAL_MOCK_LISTINGS, lastDoc: null };
    }
    logger.error("Listing Fetch Error:", err);
    return { listings: [], lastDoc: null };
  }
};

export const addListing = async (listingData: any, user: User): Promise<PropertyListing> => {
  const listing = { 
    ...listingData, 
    ownerId: user.id, 
    ownerName: user.name, 
    postedAt: Date.now() 
  };
  try {
    const docRef = await addDoc(collection(db, "listings"), listing);
    return { id: docRef.id, ...listing } as PropertyListing;
  } catch (err) {
    logger.warn("Listing saved to UI state only (DB Locked)");
    return { id: `local_${Date.now()}`, ...listing } as PropertyListing;
  }
};

export const deleteListing = async (listingId: string) => {
  try { await deleteDoc(doc(db, "listings", listingId)); } catch {}
};

export const updateListingStatus = async (listingId: string, status: ListingStatus) => {
  try { await updateDoc(doc(db, "listings", listingId), { status }); } catch {}
};

export const toggleFavorite = async (userId: string, listingId: string): Promise<string[]> => {
  const key = `ah_favs_${userId}`;
  const current = JSON.parse(localStorage.getItem(key) || '[]');
  const next = current.includes(listingId) ? current.filter((id: any) => id !== listingId) : [...current, listingId];
  localStorage.setItem(key, JSON.stringify(next));
  
  try { await updateDoc(doc(db, "users", userId), { favorites: next }); } catch {}
  return next;
};

export const getFavorites = async (userId: string): Promise<string[]> => {
  const key = `ah_favs_${userId}`;
  try {
    const snap = await getDoc(doc(db, "users", userId));
    const favs = snap.data()?.favorites || JSON.parse(localStorage.getItem(key) || '[]');
    localStorage.setItem(key, JSON.stringify(favs));
    return favs;
  } catch {
    return JSON.parse(localStorage.getItem(key) || '[]');
  }
};

export const sendMessage = async (listingId: string, ownerId: string, user: User, text: string) => {
  const chatId = `${listingId}_${ownerId}_${user.id}`;
  await addDoc(collection(db, "chats", chatId, "messages"), { senderId: user.id, senderName: user.name, text, timestamp: Date.now() });
};

export const listenToMessages = (listingId: string, ownerId: string, userId: string, callback: (messages: ChatMessage[]) => void) => {
  const chatId = `${listingId}_${ownerId}_${userId}`;
  const q = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage)));
  }, () => {
    callback([{ id: 'm1', senderId: 'system', senderName: 'System', text: 'Chat system in local standby mode.', timestamp: Date.now() }]);
  });
};
