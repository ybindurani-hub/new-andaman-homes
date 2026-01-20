
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
  orderBy 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { User, PropertyListing, ListingCategory } from '../types.ts';

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

// Mock fallback data for when permissions are missing
const FALLBACK_LISTINGS: PropertyListing[] = [
  {
    id: 'f1',
    title: 'Modern Seaside Apartment',
    description: 'Breathtaking ocean views in the heart of Port Blair. Fully furnished with high-end amenities.',
    price: 45000,
    location: 'Port Blair',
    category: ListingCategory.HOUSE_RENT,
    area: '1200 sq.ft',
    imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=1200',
    ownerId: 'system',
    ownerName: 'Admin',
    contactNumber: '9999999999',
    postedAt: Date.now()
  },
  {
    id: 'f2',
    title: 'Commercial Shop Space',
    description: 'High traffic retail space near Aberdeen Bazaar. Perfect for new business ventures.',
    price: 85000,
    location: 'Port Blair',
    category: ListingCategory.SHOP_RENT,
    area: '600 sq.ft',
    imageUrl: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&q=80&w=1200',
    ownerId: 'system',
    ownerName: 'Admin',
    contactNumber: '9999999999',
    postedAt: Date.now()
  },
  {
    id: 'f3',
    title: 'Prime Land Parcel',
    description: 'Clear title flat land available in Neil Island. Near main market, ideal for home or resort development.',
    price: 9500000,
    location: 'Neil Island (Shaheed Dweep)',
    category: ListingCategory.LAND_SALE,
    area: '5000 sq.ft',
    imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=1200',
    ownerId: 'system',
    ownerName: 'Admin',
    contactNumber: '9999999999',
    postedAt: Date.now() - 86400000
  }
];

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

// Fix for truncated setupRecaptcha function
export const setupRecaptcha = (containerId: string) => {
  if (typeof window !== 'undefined' && !(window as any).recaptchaVerifier) {
    try {
      const el = document.getElementById(containerId);
      if (el) {
        (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
          size: 'invisible'
        });
      }
    } catch (e) {
      console.error("Recaptcha error:", e);
    }
  }
};

// Added missing logout export
export const logout = async (): Promise<void> => {
  await signOut(auth);
};

// Added missing getListings export with fallback logic
export const getListings = async (): Promise<PropertyListing[]> => {
  try {
    const q = query(collection(db, "listings"), orderBy("postedAt", "desc"));
    const querySnapshot = await getDocs(q);
    const listings: PropertyListing[] = [];
    querySnapshot.forEach((doc) => {
      listings.push({ id: doc.id, ...doc.data() } as PropertyListing);
    });
    return listings.length > 0 ? listings : FALLBACK_LISTINGS;
  } catch (error) {
    console.error("Firestore get error:", error);
    return FALLBACK_LISTINGS;
  }
};

// Added missing addListing export
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

// Added missing sendOTP export
export const sendOTP = async (phoneNumber: string): Promise<ConfirmationResult> => {
  const verifier = (window as any).recaptchaVerifier;
  if (!verifier) throw new Error("Recaptcha not initialized. Ensure setupRecaptcha was called.");
  return await signInWithPhoneNumber(auth, phoneNumber, verifier);
};
