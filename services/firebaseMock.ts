
import { User, PropertyListing, ListingCategory } from '../types';

// This is a mock service that mimics Firebase behavior for the demo.
// In a real app, you would use 'firebase/app', 'firebase/auth', and 'firebase/firestore'.

const MOCK_USER: User = {
  id: 'user_123',
  name: 'John Islander',
  email: 'john@andaman.com',
  phoneNumber: '+91 9876543210'
};

const INITIAL_LISTINGS: PropertyListing[] = [
  {
    id: '1',
    title: 'Seaside Villa in Swaraj Dweep',
    description: 'Beautiful 3-bedroom villa just 5 minutes from Radhanagar Beach. Features high ceilings, modern kitchen, and a private garden.',
    price: 15000000,
    location: 'Havelock Island (Swaraj Dweep)',
    category: ListingCategory.HOUSE_SALE,
    area: '2500 sq.ft',
    imageUrl: 'https://picsum.photos/seed/andaman1/800/600',
    ownerId: 'user_456',
    ownerName: 'Rahul Sharma',
    contactNumber: '+91 94342 12345',
    postedAt: Date.now() - 86400000
  },
  {
    id: '2',
    title: 'Commercial Space in Aberdeen Bazaar',
    description: 'Prime ground floor shop space available for rent in the heart of Port Blair. High footfall area, perfect for retail or cafe.',
    price: 45000,
    location: 'Port Blair',
    category: ListingCategory.SHOP_RENT,
    area: '450 sq.ft',
    imageUrl: 'https://picsum.photos/seed/andaman2/800/600',
    ownerId: 'user_123',
    ownerName: 'John Islander',
    contactNumber: '+91 98765 43210',
    postedAt: Date.now() - 172800000
  },
  {
    id: '3',
    title: 'Land for Residential Development',
    description: 'Flat land parcel available in Neil Island. Clear title, near main market area. Ideal for building a boutique resort or home.',
    price: 8500000,
    location: 'Neil Island (Shaheed Dweep)',
    category: ListingCategory.LAND_SALE,
    area: '5000 sq.ft',
    imageUrl: 'https://picsum.photos/seed/andaman3/800/600',
    ownerId: 'user_789',
    ownerName: 'Priya Das',
    contactNumber: '+91 99332 54321',
    postedAt: Date.now() - 259200000
  }
];

class FirebaseMock {
  private user: User | null = null;
  private listings: PropertyListing[] = INITIAL_LISTINGS;

  async loginWithGoogle(): Promise<User> {
    this.user = MOCK_USER;
    return this.user;
  }

  async loginWithOTP(phoneNumber: string): Promise<User> {
    this.user = { ...MOCK_USER, phoneNumber };
    return this.user;
  }

  async logout(): Promise<void> {
    this.user = null;
  }

  getCurrentUser(): User | null {
    return this.user;
  }

  async getListings(): Promise<PropertyListing[]> {
    return this.listings;
  }

  async addListing(listing: Omit<PropertyListing, 'id' | 'postedAt' | 'ownerId' | 'ownerName'>): Promise<PropertyListing> {
    const newListing: PropertyListing = {
      ...listing,
      id: Math.random().toString(36).substr(2, 9),
      postedAt: Date.now(),
      ownerId: this.user?.id || 'guest',
      ownerName: this.user?.name || 'Guest User'
    };
    this.listings = [newListing, ...this.listings];
    return newListing;
  }
}

export const firebase = new FirebaseMock();
