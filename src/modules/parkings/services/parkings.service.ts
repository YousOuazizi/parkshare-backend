import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Parking } from '../entities/parking.entity';
import { ParkingSize } from '../entities/parking-size.entity';
import { ParkingFeature } from '../entities/parking-feature.entity';
import { ParkingPhoto } from '../entities/parking-photo.entity';
import {
  AvailabilitySchedule,
  DayOfWeek,
} from '../entities/availability-schedule.entity';
import { AvailabilityTimeSlot } from '../entities/availability-time-slot.entity';
import { AvailabilityException } from '../entities/availability-exception.entity';
import { CreateParkingDto } from '../dto/create-parking.dto';
import { UpdateParkingDto } from '../dto/update-parking.dto';
import { SearchParkingDto } from '../dto/search-parking.dto';
import { VerificationLevel } from 'src/modules/users/entities/user.entity';
import { UsersService } from 'src/modules/users/users.service';

@Injectable()
export class ParkingsService {
  constructor(
    @InjectRepository(Parking)
    private parkingsRepository: Repository<Parking>,
    @InjectRepository(ParkingSize)
    private parkingSizeRepository: Repository<ParkingSize>,
    @InjectRepository(ParkingFeature)
    private parkingFeatureRepository: Repository<ParkingFeature>,
    @InjectRepository(ParkingPhoto)
    private parkingPhotoRepository: Repository<ParkingPhoto>,
    @InjectRepository(AvailabilitySchedule)
    private availabilityScheduleRepository: Repository<AvailabilitySchedule>,
    @InjectRepository(AvailabilityTimeSlot)
    private availabilityTimeSlotRepository: Repository<AvailabilityTimeSlot>,
    @InjectRepository(AvailabilityException)
    private availabilityExceptionRepository: Repository<AvailabilityException>,
    private usersService: UsersService,
  ) {}

  async create(
    userId: string,
    createParkingDto: CreateParkingDto,
  ): Promise<Parking> {
    const user = await this.usersService.findOne(userId);

    // Vérifier le niveau de vérification pour publier un parking
    if (user.verificationLevel < VerificationLevel.LEVEL_3) {
      throw new BadRequestException(
        `Vous devez atteindre le niveau de vérification 3 pour publier un parking. Veuillez compléter la vérification de votre identité.`,
      );
    }

    // Limiter le nombre de parkings selon le niveau
    const parkingsLimit = {
      [VerificationLevel.LEVEL_3]: 3,
      [VerificationLevel.LEVEL_4]: Infinity,
    };

    const limit = parkingsLimit[user.verificationLevel] || 0;

    const userParkings = await this.parkingsRepository.count({
      where: { ownerId: userId },
    });

    if (userParkings >= limit) {
      throw new BadRequestException(
        `Votre niveau de vérification actuel (${user.verificationLevel}) limite le nombre de parkings à ${limit}. Veuillez compléter la vérification avancée pour augmenter cette limite.`,
      );
    }

    // Création du point géographique (désactivé temporairement)
    // const point = `POINT(${createParkingDto.longitude} ${createParkingDto.latitude})`;

    // Création du parking principal
    const parking = this.parkingsRepository.create({
      title: createParkingDto.title,
      description: createParkingDto.description,
      address: createParkingDto.address,
      latitude: createParkingDto.latitude,
      longitude: createParkingDto.longitude,
      basePrice: createParkingDto.basePrice,
      currency: createParkingDto.currency || 'EUR',
      accessMethod: createParkingDto.accessMethod,
      isActive:
        createParkingDto.isActive !== undefined
          ? createParkingDto.isActive
          : true,
      hasEVCharging: createParkingDto.hasEVCharging || false,
      ownerId: userId,
      // location: point, // désactivé temporairement
      isVerified: false,
    });

    // Sauvegarde du parking pour générer son ID
    const savedParking = await this.parkingsRepository.save(parking);

    // Création de la taille du parking
    if (createParkingDto.size) {
      const parkingSize = this.parkingSizeRepository.create({
        parkingId: savedParking.id,
        length: createParkingDto.size.length,
        width: createParkingDto.size.width,
        height: createParkingDto.size.height,
      });
      await this.parkingSizeRepository.save(parkingSize);
    }

    // Création des caractéristiques du parking
    if (createParkingDto.features && createParkingDto.features.length > 0) {
      const parkingFeatures = createParkingDto.features.map((feature) =>
        this.parkingFeatureRepository.create({
          name: feature,
          parkingId: savedParking.id,
        }),
      );
      await this.parkingFeatureRepository.save(parkingFeatures);
    }

    // Création des photos du parking
    if (createParkingDto.photos && createParkingDto.photos.length > 0) {
      const parkingPhotos = createParkingDto.photos.map((photo, index) =>
        this.parkingPhotoRepository.create({
          url: photo,
          parkingId: savedParking.id,
          order: index,
        }),
      );
      await this.parkingPhotoRepository.save(parkingPhotos);
    }

    // Création des horaires d'ouverture
    if (createParkingDto.availability) {
      const weekDays = [
        DayOfWeek.MONDAY,
        DayOfWeek.TUESDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.THURSDAY,
        DayOfWeek.FRIDAY,
        DayOfWeek.SATURDAY,
        DayOfWeek.SUNDAY,
      ];

      for (const day of weekDays) {
        const timeRanges = createParkingDto.availability[day.toLowerCase()];

        if (timeRanges && timeRanges.length > 0) {
          // Créer un schedule pour ce jour
          const schedule = this.availabilityScheduleRepository.create({
            dayOfWeek: day,
            parkingId: savedParking.id,
          });

          const savedSchedule =
            await this.availabilityScheduleRepository.save(schedule);

          // Créer les plages horaires
          const timeSlots = timeRanges.map((range) =>
            this.availabilityTimeSlotRepository.create({
              startTime: range.start,
              endTime: range.end,
              scheduleId: savedSchedule.id,
            }),
          );

          await this.availabilityTimeSlotRepository.save(timeSlots);
        }
      }

      // Création des exceptions
      if (
        createParkingDto.availability.exceptions &&
        createParkingDto.availability.exceptions.length > 0
      ) {
        for (const exceptionData of createParkingDto.availability.exceptions) {
          // Créer l'exception
          const exception = this.availabilityExceptionRepository.create({
            date: exceptionData.date,
            available: exceptionData.available,
            parkingId: savedParking.id,
          });

          const savedException =
            await this.availabilityExceptionRepository.save(exception);

          // Créer les plages horaires de l'exception si disponibles
          if (
            exceptionData.available &&
            exceptionData.hours &&
            exceptionData.hours.length > 0
          ) {
            const timeSlots = exceptionData.hours.map((range) =>
              this.availabilityTimeSlotRepository.create({
                startTime: range.start,
                endTime: range.end,
                exceptionId: savedException.id,
              }),
            );

            await this.availabilityTimeSlotRepository.save(timeSlots);
          }
        }
      }
    }

    // Récupérer le parking complet avec toutes ses relations
    return this.findOne(savedParking.id);
  }

  async findAll(userId?: string): Promise<Parking[]> {
    const query = this.parkingsRepository
      .createQueryBuilder('parking')
      .leftJoinAndSelect('parking.size', 'size')
      .leftJoinAndSelect('parking.features', 'features')
      .leftJoinAndSelect('parking.photos', 'photos')
      .leftJoinAndSelect('parking.availabilitySchedules', 'schedules')
      .leftJoinAndSelect('schedules.timeSlots', 'scheduleTimeSlots')
      .leftJoinAndSelect('parking.availabilityExceptions', 'exceptions')
      .leftJoinAndSelect('exceptions.timeSlots', 'exceptionTimeSlots');

    if (userId) {
      query.where('parking.ownerId = :userId', { userId });
    } else {
      query.where('parking.isActive = :isActive', { isActive: true });
    }

    query.orderBy('parking.createdAt', 'DESC');

    return query.getMany();
  }

  async findOne(id: string): Promise<Parking> {
    const parking = await this.parkingsRepository.findOne({
      where: { id },
      relations: [
        'size',
        'features',
        'photos',
        'availabilitySchedules',
        'availabilitySchedules.timeSlots',
        'availabilityExceptions',
        'availabilityExceptions.timeSlots',
        'priceRules',
      ],
    });

    if (!parking) {
      throw new NotFoundException(`Parking avec l'id ${id} non trouvé`);
    }

    return parking;
  }

  async update(
    id: string,
    userId: string,
    updateParkingDto: UpdateParkingDto,
  ): Promise<Parking> {
    const parking = await this.findOne(id);

    // Vérifier si l'utilisateur est le propriétaire
    if (parking.ownerId !== userId) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à modifier ce parking",
      );
    }

    // Mise à jour des champs de base du parking
    if (updateParkingDto.title !== undefined)
      parking.title = updateParkingDto.title;
    if (updateParkingDto.description !== undefined)
      parking.description = updateParkingDto.description;
    if (updateParkingDto.address !== undefined)
      parking.address = updateParkingDto.address;
    if (updateParkingDto.basePrice !== undefined)
      parking.basePrice = updateParkingDto.basePrice;
    if (updateParkingDto.currency !== undefined)
      parking.currency = updateParkingDto.currency;
    if (updateParkingDto.accessMethod !== undefined)
      parking.accessMethod = updateParkingDto.accessMethod;
    if (updateParkingDto.isActive !== undefined)
      parking.isActive = updateParkingDto.isActive;
    if (updateParkingDto.hasEVCharging !== undefined)
      parking.hasEVCharging = updateParkingDto.hasEVCharging;

    // Mise à jour du point géographique si nécessaire (désactivé temporairement)
    if (
      updateParkingDto.latitude !== undefined &&
      updateParkingDto.longitude !== undefined
    ) {
      parking.latitude = updateParkingDto.latitude;
      parking.longitude = updateParkingDto.longitude;
      // const point = `POINT(${updateParkingDto.longitude} ${updateParkingDto.latitude})`;
      // parking.location = point;
    }

    await this.parkingsRepository.save(parking);

    // Mise à jour de la taille si nécessaire
    if (updateParkingDto.size) {
      if (parking.size) {
        // Mise à jour de la taille existante
        if (updateParkingDto.size.length !== undefined)
          parking.size.length = updateParkingDto.size.length;
        if (updateParkingDto.size.width !== undefined)
          parking.size.width = updateParkingDto.size.width;
        if (updateParkingDto.size.height !== undefined)
          parking.size.height = updateParkingDto.size.height;

        await this.parkingSizeRepository.save(parking.size);
      } else {
        // Création d'une nouvelle taille
        const parkingSize = this.parkingSizeRepository.create({
          parkingId: parking.id,
          length: updateParkingDto.size.length,
          width: updateParkingDto.size.width,
          height: updateParkingDto.size.height,
        });
        await this.parkingSizeRepository.save(parkingSize);
      }
    }

    // Mise à jour des caractéristiques si nécessaire
    if (updateParkingDto.features) {
      // Supprimer les caractéristiques existantes
      if (parking.features && parking.features.length > 0) {
        await this.parkingFeatureRepository.remove(parking.features);
      }

      // Ajouter les nouvelles caractéristiques
      const parkingFeatures = updateParkingDto.features.map((feature) =>
        this.parkingFeatureRepository.create({
          name: feature,
          parkingId: parking.id,
        }),
      );
      await this.parkingFeatureRepository.save(parkingFeatures);
    }

    // Mise à jour des photos si nécessaire
    if (updateParkingDto.photos) {
      // Supprimer les photos existantes
      if (parking.photos && parking.photos.length > 0) {
        await this.parkingPhotoRepository.remove(parking.photos);
      }

      // Ajouter les nouvelles photos
      const parkingPhotos = updateParkingDto.photos.map((photo, index) =>
        this.parkingPhotoRepository.create({
          url: photo,
          parkingId: parking.id,
          order: index,
        }),
      );
      await this.parkingPhotoRepository.save(parkingPhotos);
    }

    // Mise à jour des disponibilités si nécessaire
    if (updateParkingDto.availability) {
      // Supprimer les horaires et exceptions existants
      if (
        parking.availabilitySchedules &&
        parking.availabilitySchedules.length > 0
      ) {
        for (const schedule of parking.availabilitySchedules) {
          if (schedule.timeSlots && schedule.timeSlots.length > 0) {
            await this.availabilityTimeSlotRepository.remove(
              schedule.timeSlots,
            );
          }
        }
        await this.availabilityScheduleRepository.remove(
          parking.availabilitySchedules,
        );
      }

      if (
        parking.availabilityExceptions &&
        parking.availabilityExceptions.length > 0
      ) {
        for (const exception of parking.availabilityExceptions) {
          if (exception.timeSlots && exception.timeSlots.length > 0) {
            await this.availabilityTimeSlotRepository.remove(
              exception.timeSlots,
            );
          }
        }
        await this.availabilityExceptionRepository.remove(
          parking.availabilityExceptions,
        );
      }

      // Ajouter les nouveaux horaires
      const weekDays = [
        DayOfWeek.MONDAY,
        DayOfWeek.TUESDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.THURSDAY,
        DayOfWeek.FRIDAY,
        DayOfWeek.SATURDAY,
        DayOfWeek.SUNDAY,
      ];

      for (const day of weekDays) {
        const timeRanges = updateParkingDto.availability[day.toLowerCase()];

        if (timeRanges && timeRanges.length > 0) {
          // Créer un schedule pour ce jour
          const schedule = this.availabilityScheduleRepository.create({
            dayOfWeek: day,
            parkingId: parking.id,
          });

          const savedSchedule =
            await this.availabilityScheduleRepository.save(schedule);

          // Créer les plages horaires
          const timeSlots = timeRanges.map((range) =>
            this.availabilityTimeSlotRepository.create({
              startTime: range.start,
              endTime: range.end,
              scheduleId: savedSchedule.id,
            }),
          );

          await this.availabilityTimeSlotRepository.save(timeSlots);
        }
      }

      // Ajouter les nouvelles exceptions
      if (
        updateParkingDto.availability.exceptions &&
        updateParkingDto.availability.exceptions.length > 0
      ) {
        for (const exceptionData of updateParkingDto.availability.exceptions) {
          // Créer l'exception
          const exception = this.availabilityExceptionRepository.create({
            date: exceptionData.date,
            available: exceptionData.available,
            parkingId: parking.id,
          });

          const savedException =
            await this.availabilityExceptionRepository.save(exception);

          // Créer les plages horaires de l'exception si disponibles
          if (
            exceptionData.available &&
            exceptionData.hours &&
            exceptionData.hours.length > 0
          ) {
            const timeSlots = exceptionData.hours.map((range) =>
              this.availabilityTimeSlotRepository.create({
                startTime: range.start,
                endTime: range.end,
                exceptionId: savedException.id,
              }),
            );

            await this.availabilityTimeSlotRepository.save(timeSlots);
          }
        }
      }
    }

    // Récupérer le parking mis à jour avec toutes ses relations
    return this.findOne(parking.id);
  }

  async remove(id: string, userId: string): Promise<void> {
    const parking = await this.findOne(id);

    // Vérifier si l'utilisateur est le propriétaire
    if (parking.ownerId !== userId) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à supprimer ce parking",
      );
    }

    await this.parkingsRepository.remove(parking);
  }

  async search(searchParams: SearchParkingDto): Promise<Parking[]> {
    let query = this.parkingsRepository
      .createQueryBuilder('parking')
      .leftJoinAndSelect('parking.size', 'size')
      .leftJoinAndSelect('parking.features', 'features')
      .leftJoinAndSelect('parking.photos', 'photos')
      .leftJoinAndSelect('parking.availabilitySchedules', 'schedules')
      .leftJoinAndSelect('schedules.timeSlots', 'scheduleTimeSlots')
      .leftJoinAndSelect('parking.availabilityExceptions', 'exceptions')
      .leftJoinAndSelect('exceptions.timeSlots', 'exceptionTimeSlots')
      .where('parking.isActive = :isActive', { isActive: true });

    // Recherche par géolocalisation (désactivé temporairement - utilise une recherche approximative par coordonnées)
    if (
      searchParams.latitude &&
      searchParams.longitude &&
      searchParams.radius
    ) {
      // const point = `POINT(${searchParams.longitude} ${searchParams.latitude})`;
      // const radiusInMeters = searchParams.radius;

      // Recherche approximative par plage de coordonnées (1 degré ≈ 111 km)
      const radiusInDegrees = searchParams.radius / 1000 / 111; // Conversion approximative

      query = query
        .andWhere(`parking.latitude BETWEEN :minLat AND :maxLat`, {
          minLat: searchParams.latitude - radiusInDegrees,
          maxLat: searchParams.latitude + radiusInDegrees,
        })
        .andWhere(`parking.longitude BETWEEN :minLng AND :maxLng`, {
          minLng: searchParams.longitude - radiusInDegrees,
          maxLng: searchParams.longitude + radiusInDegrees,
        });
    }

    // Filtrage par prix maximum
    if (searchParams.maxPrice) {
      query = query.andWhere('parking.basePrice <= :maxPrice', {
        maxPrice: searchParams.maxPrice,
      });
    }

    // Filtrage par caractéristiques
    if (searchParams.features && searchParams.features.length > 0) {
      query.andWhere('features.name IN (:...featureNames)', {
        featureNames: searchParams.features,
      });
    }

    // Filtrage par borne de recharge EV
    if (searchParams.hasEVCharging !== undefined) {
      query = query.andWhere('parking.hasEVCharging = :hasEVCharging', {
        hasEVCharging: searchParams.hasEVCharging,
      });
    }

    // Recherche par emplacement (texte)
    if (searchParams.location) {
      query = query.andWhere(
        '(parking.address ILIKE :location OR parking.title ILIKE :location)',
        {
          location: `%${searchParams.location}%`,
        },
      );
    }

    // Pagination
    const limit = searchParams.limit || 10;
    const offset = searchParams.offset || 0;

    query = query.orderBy('parking.createdAt', 'DESC').take(limit).skip(offset);

    return query.getMany();
  }

  async checkAvailability(
    parkingId: string,
    startDateTime: Date,
    endDateTime: Date,
  ): Promise<boolean> {
    const parking = await this.findOne(parkingId);

    // Vérifier si la période demandée est dans les horaires d'ouverture
    // et s'il n'y a pas de réservation qui chevauche cette période

    // Récupérer l'horaire pour le jour demandé
    const dayOfWeek = startDateTime.getDay(); // 0-6, 0 étant dimanche
    const daysMap = {
      0: DayOfWeek.SUNDAY,
      1: DayOfWeek.MONDAY,
      2: DayOfWeek.TUESDAY,
      3: DayOfWeek.WEDNESDAY,
      4: DayOfWeek.THURSDAY,
      5: DayOfWeek.FRIDAY,
      6: DayOfWeek.SATURDAY,
    };

    const dayName = daysMap[dayOfWeek];

    // Vérifier les exceptions pour cette date
    const dateString = startDateTime.toISOString().split('T')[0];
    const exception = parking.availabilityExceptions?.find(
      (e) => e.date === dateString,
    );

    if (exception) {
      if (!exception.available) {
        return false; // Jour exceptionnellement fermé
      }

      // Vérifier les horaires de l'exception
      if (exception.timeSlots && exception.timeSlots.length > 0) {
        const startHour = `${startDateTime.getHours().toString().padStart(2, '0')}:${startDateTime.getMinutes().toString().padStart(2, '0')}`;
        const endHour = `${endDateTime.getHours().toString().padStart(2, '0')}:${endDateTime.getMinutes().toString().padStart(2, '0')}`;

        const isInTimeRange = exception.timeSlots.some((slot) => {
          return startHour >= slot.startTime && endHour <= slot.endTime;
        });

        return isInTimeRange;
      }

      // Si pas d'horaires spécifiés dans l'exception mais disponible
      return true;
    }

    // Vérifier les horaires réguliers pour ce jour
    const daySchedule = parking.availabilitySchedules?.find(
      (s) => s.dayOfWeek === dayName,
    );

    if (
      !daySchedule ||
      !daySchedule.timeSlots ||
      daySchedule.timeSlots.length === 0
    ) {
      return false; // Ce jour n'est pas disponible
    }

    // Vérifier si l'heure est dans une plage horaire disponible
    const startHour = `${startDateTime.getHours().toString().padStart(2, '0')}:${startDateTime.getMinutes().toString().padStart(2, '0')}`;
    const endHour = `${endDateTime.getHours().toString().padStart(2, '0')}:${endDateTime.getMinutes().toString().padStart(2, '0')}`;

    const isInTimeRange = daySchedule.timeSlots.some((slot) => {
      return startHour >= slot.startTime && endHour <= slot.endTime;
    });

    if (!isInTimeRange) {
      return false; // Hors des plages horaires disponibles
    }

    // TODO: Vérifier s'il n'y a pas de réservation qui chevauche cette période
    // Cela nécessiterait d'implémenter un service de réservation et de l'injecter ici

    return true;
  }

  async updateBasePrice(id: string, newBasePrice: number): Promise<Parking> {
    const parking = await this.findOne(id);
    parking.basePrice = newBasePrice;
    return this.parkingsRepository.save(parking);
  }
}
