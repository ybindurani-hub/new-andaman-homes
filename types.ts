export enum ListingCategory {
  HOUSE_RENT = 'House Rent',
  HOUSE_SALE = 'House Sale',
  SHOP_RENT = 'Shop Rent',
  SHOP_SALE = 'Shop Sale',
  LAND_SALE = 'Land Sale'
}

export enum FurnishingStatus {
  UNFURNISHED = 'Unfurnished',
  SEMI_FURNISHED = 'Semi-furnished',
  FULLY_FURNISHED = 'Fully Furnished'
}

export interface PropertyListing {
  id: string;
  title: string;
  description: string;
  price: number;
  location: string;
  category: ListingCategory;
  area: string;
  areaUnit: 'sq.ft' | 'sq.mt';
  imageUrls: string[]; // Changed to array for multiple images
  ownerId: string;
  ownerName: string;
  contactNumber: string;
  postedAt: number;
  bhk?: string;
  bathrooms?: string;
  parking?: 'Yes' | 'No';
  furnishing?: FurnishingStatus;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  photoURL?: string;
}

export type ViewState = 'home' | 'post' | 'details' | 'profile';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}