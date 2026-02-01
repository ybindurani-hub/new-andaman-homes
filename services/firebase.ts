
import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth,
  setPersistence,
  browserLocalPersistence,
  signOut, 
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  updateProfile,
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
  enableMultiTabIndexedDbPersistence
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

// Initialize Persistence
setPersistence(auth, browserLocalPersistence).catch(err => console.warn("Persistence set failed", err));
enableMultiTabIndexedDbPersistence(db).catch(() => {});

export const checkUserByPhone = async (phoneNumber: string): Promise<User | null> => {
  try {
    const q = query(collection(db, "users"), where("phoneNumber", "==", phoneNumber), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return { id: snap.docs[0].id, ...snap.docs[0].data() } as User;
    }
  } catch (e) {
    console.error("Check user error", e);
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
    await setDoc(userRef, { 
      ...userData, 
      lastLogin: Date.now(),
      updatedAt: Date.now()
    }, { merge: true });
    localStorage.setItem(`ah_user_${userData.id}`, JSON.stringify(userData));
  } catch (e) {
    console.warn("Firestore sync deferred", e);
  }
};

export const getUserData = async (userId: string): Promise<User | null> => {
  const cached = localStorage.getItem(`ah_user_${userId}`);
  if (cached) {
    try { return JSON.parse(cached); } catch(e) { localStorage.removeItem(`ah_user_${userId}`); }
  }
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

export const handleAuthRedirect = async (): Promise<User | null> => {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      return await getUserData(result.user.uid);
    }
  } catch (err) {
    console.error("Redirect Auth Handshake failed (Non-fatal)", err);
  }
  return null;
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
  const updated = await getUserData(userId);
  if (updated) localStorage.setItem(`ah_user_${userId}`, JSON.stringify({...updated, ...data}));
};

export const getAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/invalid-phone-number': return 'Invalid phone number format.';
    case 'auth/too-many-requests': return 'Too many attempts. Try again later.';
    case 'auth/code-expired': return 'OTP has expired. Resend.';
    case 'auth/invalid-verification-code': return 'Incorrect OTP entered.';
    case 'auth/network-request-failed': return 'Network error. Check signal.';
    case 'user-not-found': return 'Mobile not registered. Please Sign Up first.';
    case 'user-exists': return 'Mobile already registered. Please Login.';
    default: return 'Authentication failed. Please try again.';
  }
};

export const getListings = async (lastDocParam?: any, pageSize = 20): Promise<{ listings: PropertyListing[], lastDoc: any }> => {
  try {
    let q;
    if (lastDocParam) {
      q = query(collection(db, "listings"), orderBy("postedAt", "desc"), startAfter(lastDocParam), limit(pageSize));
    } else {
      q = query(collection(db, "listings"), orderBy("postedAt", "desc"), limit(pageSize));
    }
    const snap = await getDocs(q);
    const listings = snap.docs.map(d => ({ id: d.id, ...d.data() } as PropertyListing));
    return { listings, lastDoc: snap.docs[snap.docs.length - 1] || null };
  } catch (err) {
    console.error("Error fetching listings:", err);
    return { listings: [], lastDoc: null };
  }
};

export const addListing = async (data: any, user: User): Promise<PropertyListing> => {
  const listing = { 
    ...data, 
    ownerId: user.id, 
    ownerName: user.name, 
    postedAt: Date.now(),
    status: data.status || ListingStatus.ACTIVE
  };
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
  const current = JSON.parse(localStorage.getItem(key) || '[]');
  const next = current.includes(listingId) 
    ? current.filter((i: string) => i !== listingId) 
    : [...current, listingId];
  localStorage.setItem(key, JSON.stringify(next));
  return next;
};

export const getFavorites = async (userId: string): Promise<string[]> => {
  const key = `ah_favs_${userId}`;
  return JSON.parse(localStorage.getItem(key) || '[]');
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
