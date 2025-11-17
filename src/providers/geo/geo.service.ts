import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GeocodingResult,
  ReverseGeocodingResult,
  DistanceMatrixEntry,
  NearbyPlace,
} from './interfaces/geo.interface';
import axios from 'axios';

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);
  private readonly hereApiKey: string;

  constructor(private configService: ConfigService) {
    this.hereApiKey =
      this.configService.get<string>('HERE_API_KEY') || 'demo-key';
  }

  async geocodeAddress(address: string): Promise<GeocodingResult> {
    try {
      const response = await axios.get(
        'https://geocode.search.hereapi.com/v1/geocode',
        {
          params: {
            q: address,
            apiKey: this.hereApiKey,
          },
        },
      );

      const item = response.data.items[0];
      if (!item) {
        throw new Error('No results found');
      }

      return {
        latitude: item.position.lat,
        longitude: item.position.lng,
        formattedAddress: item.address.label,
        city: item.address.city,
        country: item.address.countryName,
        postalCode: item.address.postalCode,
      };
    } catch (error) {
      this.logger.error(
        `Error geocoding address: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to geocode address: ${error.message}`);
    }
  }

  async reverseGeocode(
    lat: number,
    lng: number,
  ): Promise<ReverseGeocodingResult> {
    try {
      const response = await axios.get(
        'https://revgeocode.search.hereapi.com/v1/revgeocode',
        {
          params: {
            at: `${lat},${lng}`,
            apiKey: this.hereApiKey,
          },
        },
      );

      const item = response.data.items[0];
      if (!item) {
        throw new Error('No results found');
      }

      return {
        formattedAddress: item.address.label,
        city: item.address.city,
        country: item.address.countryName,
        postalCode: item.address.postalCode,
      };
    } catch (error) {
      this.logger.error(
        `Error reverse geocoding: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to reverse geocode: ${error.message}`);
    }
  }

  async calculateDistance(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
  ): Promise<DistanceMatrixEntry> {
    try {
      const response = await axios.get('https://router.hereapi.com/v8/routes', {
        params: {
          transportMode: 'car',
          origin: `${originLat},${originLng}`,
          destination: `${destLat},${destLng}`,
          return: 'summary',
          apiKey: this.hereApiKey,
        },
      });

      const route = response.data.routes[0];
      if (!route) {
        throw new Error('No route found');
      }

      const section = route.sections[0];
      return {
        distance: section.summary.length,
        duration: section.summary.duration,
      };
    } catch (error) {
      this.logger.error(
        `Error calculating distance: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to calculate distance: ${error.message}`);
    }
  }

  async findNearbyParkingSpots(
    lat: number,
    lng: number,
    radius: number,
  ): Promise<NearbyPlace[]> {
    try {
      const response = await axios.get(
        'https://browse.search.hereapi.com/v1/browse',
        {
          params: {
            at: `${lat},${lng}`,
            categories: 'parking',
            limit: 50,
            apiKey: this.hereApiKey,
          },
        },
      );

      const items = response.data.items;

      return items
        .filter((item) => {
          const distance = this.calculateHaversineDistance(
            lat,
            lng,
            item.position.lat,
            item.position.lng,
          );
          return distance <= radius;
        })
        .map((item) => ({
          id: item.id,
          name: item.title,
          type: 'parking',
          distance: this.calculateHaversineDistance(
            lat,
            lng,
            item.position.lat,
            item.position.lng,
          ),
          latitude: item.position.lat,
          longitude: item.position.lng,
        }));
    } catch (error) {
      this.logger.error(
        `Error finding nearby parking spots: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to find nearby parking spots: ${error.message}`);
    }
  }

  // Calcul de la distance Haversine (à vol d'oiseau)
  private calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371e3; // rayon de la Terre en mètres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // en mètres
  }
}
