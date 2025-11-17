import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GdprService } from './gdpr.service';
import { UserConsent } from './entities/user-consent.entity';
import { DataExportRequest } from './entities/data-export-request.entity';
import { DataDeletionRequest } from './entities/data-deletion-request.entity';
import { User } from '../users/entities/user.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('GdprService', () => {
  let service: GdprService;
  let consentRepository: Repository<UserConsent>;
  let exportRepository: Repository<DataExportRequest>;
  let deletionRepository: Repository<DataDeletionRequest>;
  let userRepository: Repository<User>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';

  const mockConsentRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockExportRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockDeletionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GdprService,
        {
          provide: getRepositoryToken(UserConsent),
          useValue: mockConsentRepository,
        },
        {
          provide: getRepositoryToken(DataExportRequest),
          useValue: mockExportRepository,
        },
        {
          provide: getRepositoryToken(DataDeletionRequest),
          useValue: mockDeletionRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<GdprService>(GdprService);
    consentRepository = module.get<Repository<UserConsent>>(
      getRepositoryToken(UserConsent),
    );
    exportRepository = module.get<Repository<DataExportRequest>>(
      getRepositoryToken(DataExportRequest),
    );
    deletionRepository = module.get<Repository<DataDeletionRequest>>(
      getRepositoryToken(DataDeletionRequest),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordConsent', () => {
    it('should record a new consent', async () => {
      const createConsentDto = {
        consentType: 'PRIVACY_POLICY',
        granted: true,
        policyVersion: '1.0',
      };

      const mockConsent = {
        id: 'consent-id',
        userId: mockUserId,
        ...createConsentDto,
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      };

      mockConsentRepository.create.mockReturnValue(mockConsent);
      mockConsentRepository.save.mockResolvedValue(mockConsent);

      const result = await service.recordConsent(
        mockUserId,
        createConsentDto,
        '127.0.0.1',
        'test-agent',
      );

      expect(result).toBeDefined();
      expect(mockConsentRepository.create).toHaveBeenCalled();
      expect(mockConsentRepository.save).toHaveBeenCalled();
    });
  });

  describe('getUserConsents', () => {
    it('should return user consents', async () => {
      const mockConsents = [
        {
          id: 'consent-1',
          userId: mockUserId,
          consentType: 'PRIVACY_POLICY',
          granted: true,
        },
      ];

      mockConsentRepository.find.mockResolvedValue(mockConsents);

      const result = await service.getUserConsents(mockUserId);

      expect(result).toEqual(mockConsents);
      expect(mockConsentRepository.find).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('hasConsent', () => {
    it('should return true if user has granted consent', async () => {
      mockConsentRepository.findOne.mockResolvedValue({
        granted: true,
        expiresAt: new Date(Date.now() + 86400000), // Tomorrow
      });

      const result = await service.hasConsent(mockUserId, 'PRIVACY_POLICY');

      expect(result).toBe(true);
    });

    it('should return false if consent is expired', async () => {
      mockConsentRepository.findOne.mockResolvedValue({
        granted: true,
        expiresAt: new Date(Date.now() - 86400000), // Yesterday
      });

      const result = await service.hasConsent(mockUserId, 'PRIVACY_POLICY');

      expect(result).toBe(false);
    });
  });

  describe('requestDataExport', () => {
    it('should create a data export request', async () => {
      mockExportRepository.findOne.mockResolvedValue(null);

      const mockRequest = {
        id: 'export-request-id',
        userId: mockUserId,
        format: 'JSON',
        status: 'PENDING',
      };

      mockExportRepository.create.mockReturnValue(mockRequest);
      mockExportRepository.save.mockResolvedValue(mockRequest);

      const result = await service.requestDataExport(mockUserId, {
        format: 'JSON',
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('PENDING');
    });

    it('should throw BadRequestException if request already exists', async () => {
      mockExportRepository.findOne.mockResolvedValue({
        status: 'PENDING',
      });

      await expect(
        service.requestDataExport(mockUserId, { format: 'JSON' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('requestDataDeletion', () => {
    it('should create a data deletion request', async () => {
      mockDeletionRepository.findOne.mockResolvedValue(null);

      const mockRequest = {
        id: 'deletion-request-id',
        userId: mockUserId,
        userEmail: 'test@example.com',
        status: 'PENDING',
      };

      mockDeletionRepository.create.mockReturnValue(mockRequest);
      mockDeletionRepository.save.mockResolvedValue(mockRequest);

      const result = await service.requestDataDeletion(
        mockUserId,
        { reason: 'test' },
        'test@example.com',
      );

      expect(result).toBeDefined();
      expect(result.status).toBe('PENDING');
    });
  });

  describe('approveDeletionRequest', () => {
    it('should approve a deletion request', async () => {
      const requestId = 'deletion-request-id';
      const adminId = 'admin-id';

      mockDeletionRepository.findOne.mockResolvedValue({
        id: requestId,
        status: 'PENDING',
      });

      mockDeletionRepository.update.mockResolvedValue({ affected: 1 });

      mockDeletionRepository.findOne.mockResolvedValue({
        id: requestId,
        status: 'APPROVED',
        reviewedBy: adminId,
      });

      const result = await service.approveDeletionRequest(requestId, adminId);

      expect(result.status).toBe('APPROVED');
      expect(mockDeletionRepository.update).toHaveBeenCalledWith(requestId, {
        status: 'APPROVED',
        reviewedBy: adminId,
      });
    });

    it('should throw NotFoundException if request not found', async () => {
      mockDeletionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.approveDeletionRequest('invalid-id', 'admin-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
