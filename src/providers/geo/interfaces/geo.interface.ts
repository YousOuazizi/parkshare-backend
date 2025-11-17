export interface GeocodingResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  city: string;
  country: string;
  postalCode: string;
}

export interface ReverseGeocodingResult {
  formattedAddress: string;
  city: string;
  country: string;
  postalCode: string;
}

export interface DistanceMatrixEntry {
  distance: number; // en mètres
  duration: number; // en secondes
}

export interface NearbyPlace {
  id: string;
  name: string;
  type: string;
  distance: number; // en mètres
  latitude: number;
  longitude: number;
}
