import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PropertyWizardService } from '../property-wizard.service';
import { PropertyListingDraft } from '../entities/property-listing-draft.entity';
import { PropertiesService } from '../properties.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('PropertyWizardService', () => {
  let service: PropertyWizardService;
  let draftRepository: any;
  let propertiesService: any;

  const mockDraft = {
    id: 'draft-id',
    landlordId: 'landlord-id',
    data: {},
    currentStep: 1,
    completedSteps: [],
    expiresAt: new Date(Date.now() + 100000),
  };

  beforeEach(async () => {
    draftRepository = {
      create: jest.fn().mockImplementation(dto => dto),
      save: jest.fn().mockImplementation(draft => Promise.resolve({ ...draft, id: 'draft-id' })),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    propertiesService = {
      create: jest.fn().mockResolvedValue({ id: 'prop-id' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertyWizardService,
        {
          provide: getRepositoryToken(PropertyListingDraft),
          useValue: draftRepository,
        },
        {
          provide: PropertiesService,
          useValue: propertiesService,
        },
      ],
    }).compile();

    service = module.get<PropertyWizardService>(PropertyWizardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('start', () => {
    it('should create a new draft', async () => {
      const result = await service.start('landlord-id');
      expect(result.id).toBe('draft-id');
      expect(result.landlordId).toBe('landlord-id');
      expect(draftRepository.create).toHaveBeenCalled();
    });
  });

  describe('updateStep', () => {
    it('should merge data and update step', async () => {
      draftRepository.findOne.mockResolvedValue({ ...mockDraft });
      
      const result = await service.updateStep('draft-id', 'landlord-id', 1, { propertyType: 'apartment' });
      
      expect(result.data.propertyType).toBe('apartment');
      expect(result.currentStep).toBe(1);
      expect(result.completedSteps).toContain(1);
    });

    it('should throw ForbiddenException if landlordId does not match', async () => {
      draftRepository.findOne.mockResolvedValue({ ...mockDraft, landlordId: 'other-id' });
      
      await expect(service.updateStep('draft-id', 'landlord-id', 1, {}))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('publish', () => {
    it('should fail if required steps are missing', async () => {
      draftRepository.findOne.mockResolvedValue({ 
        ...mockDraft, 
        completedSteps: [1], 
        data: { photos: [] } 
      });
      
      await expect(service.publish('draft-id', 'landlord-id'))
        .rejects.toThrow();
    });

    it('should succeed and delete draft if all data is valid', async () => {
      const validData = {
        propertyType: 'apartment',
        address: '123 St',
        bedrooms: 2,
        bathrooms: 1,
        monthlyRent: 1000,
        securityDeposit: 1000,
        leaseTerm: '1-year',
        moveInDate: '2026-01-01',
        photos: [{ url: 'u1', order: 0 }, { url: 'u2', order: 1 }, { url: 'u3', order: 2 }],
        propertyDescription: 'a'.repeat(60),
        availableFrom: '2026-01-01',
      };

      draftRepository.findOne.mockResolvedValue({ 
        ...mockDraft, 
        completedSteps: [1, 2, 3, 5, 6, 7], 
        data: validData 
      });
      
      const result = await service.publish('draft-id', 'landlord-id');
      
      expect(propertiesService.create).toHaveBeenCalled();
      expect(draftRepository.remove).toHaveBeenCalled();
      expect(result.propertyListingId).toBe('prop-id');
    });
  });
});
