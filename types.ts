
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

export enum ListingStatus {
  ACTIVE = 'Active',
  SOLD = 'Sold',
  RENTED = 'Rented',
  BOOKED = 'Booked'
}

export enum PostedBy {
  OWNER = 'Owner',
  BROKER = 'Broker'
}

export enum ParkingOption {
  BIKE = 'Bike',
  CAR = 'Car',
  BOTH = 'Both',
  NONE = 'None'
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
  imageUrls: string[];
  ownerId: string;
  ownerName: string;
  contactNumber: string;
  postedAt: number;
  bhk?: string;
  bathrooms?: string;
  parking: ParkingOption;
  furnishing?: FurnishingStatus;
  floor: string;
  postedBy: PostedBy;
  status: ListingStatus;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  photoURL?: string;
}

export type ViewState = 'home' | 'post' | 'details' | 'profile' | 'saved' | 'myads' | 'settings' | 'auth';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface LocationData {
  city: string;
  state: string;
  fullPath: string;
}
