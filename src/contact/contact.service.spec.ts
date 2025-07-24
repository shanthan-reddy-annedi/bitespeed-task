import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ContactService } from './contact.service';
import { Contact } from './entities/contact.entity';
import { IdentifyRequestDto } from './dto/identify-request.dto';

type MockRepository<> = {
  create: jest.Mock;
  save: jest.Mock;
  find: jest.Mock;
  findOne: jest.Mock;
  createQueryBuilder: jest.Mock;
};

const createMockRepository = (): MockRepository => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  })),
});

describe('ContactService', () => {
  let service: ContactService;
  let repository: MockRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactService,
        {
          provide: getRepositoryToken(Contact),
          useFactory: createMockRepository,
        },
      ],
    }).compile();

    service = module.get<ContactService>(ContactService);
    repository = module.get(getRepositoryToken(Contact));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('identifyContact', () => {
    it('should create a new primary contact when no existing contacts are found', async () => {
      const input = {
        email: 'new@example.com',
        phoneNumber: '123456',
      } as IdentifyRequestDto;

      const queryBuilderMock = {
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      repository.createQueryBuilder.mockReturnValue(queryBuilderMock);

      const newContact = {
        id: 1,
        email: 'new@example.com',
        phoneNumber: '123456',
        linkPrecedence: 'primary',
        linkedId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      repository.create.mockReturnValue(newContact);
      repository.save.mockResolvedValue(newContact);

      const result = await service.identifyContact(input);

      expect(repository.create).toHaveBeenCalledWith({
        email: 'new@example.com',
        phoneNumber: '123456',
      });
      expect(repository.save).toHaveBeenCalledWith(newContact);
      expect(result).toEqual({
        contact: {
          primaryContatctId: 1,
          emails: ['new@example.com'],
          phoneNumbers: ['123456'],
          secondaryContactIds: [],
        },
      });
    });

    it('should return existing contact data when exact match is found', async () => {
      const input = {
        email: 'existing@example.com',
        phoneNumber: '123456',
      } as IdentifyRequestDto;

      const existingContact = {
        id: 1,
        email: 'existing@example.com',
        phoneNumber: '123456',
        linkPrecedence: 'primary',
        linkedId: null,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      };

      const queryBuilderMock = {
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([existingContact]),
      };
      repository.createQueryBuilder.mockReturnValue(queryBuilderMock);

      repository.find.mockResolvedValue([existingContact]);

      const result = await service.identifyContact(input);

      expect(result).toEqual({
        contact: {
          primaryContatctId: 1,
          emails: ['existing@example.com'],
          phoneNumbers: ['123456'],
          secondaryContactIds: [],
        },
      });
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should create a secondary contact when new email with existing phone is provided', async () => {
      const input = {
        email: 'new@example.com',
        phoneNumber: '123456',
      } as IdentifyRequestDto;

      const existingContact = {
        id: 1,
        email: 'existing@example.com',
        phoneNumber: '123456',
        linkPrecedence: 'primary',
        linkedId: null,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      };

      const queryBuilderMock = {
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([existingContact]),
      };
      repository.createQueryBuilder.mockReturnValue(queryBuilderMock);

      repository.find.mockResolvedValueOnce([existingContact]);

      const newSecondaryContact = {
        id: 2,
        email: 'new@example.com',
        phoneNumber: undefined,
        linkPrecedence: 'secondary',
        linkedId: 1,
        createdAt: new Date('2023-01-02'),
        updatedAt: new Date('2023-01-02'),
      };
      repository.create.mockReturnValue(newSecondaryContact);
      repository.save.mockResolvedValue(newSecondaryContact);

      repository.find.mockResolvedValueOnce([
        existingContact,
        newSecondaryContact,
      ]);

      const result = await service.identifyContact(input);

      expect(repository.create).toHaveBeenCalledWith({
        email: 'new@example.com',
        phoneNumber: undefined,
        linkedId: 1,
        linkPrecedence: 'secondary',
      });
      expect(result).toEqual({
        contact: {
          primaryContatctId: 1,
          emails: ['existing@example.com', 'new@example.com'],
          phoneNumbers: ['123456'],
          secondaryContactIds: [2],
        },
      });
    });

    it('should convert newer primary contact to secondary when linking two primary contacts', async () => {
      const input = {
        email: 'primary2@example.com',
        phoneNumber: '123456',
      } as IdentifyRequestDto;

      const olderPrimaryContact = {
        id: 1,
        email: 'primary1@example.com',
        phoneNumber: '123456',
        linkPrecedence: 'primary',
        linkedId: null,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      };

      const newerPrimaryContact = {
        id: 2,
        email: 'primary2@example.com',
        phoneNumber: '654321',
        linkPrecedence: 'primary',
        linkedId: null,
        createdAt: new Date('2023-01-02'),
        updatedAt: new Date('2023-01-02'),
      };

      const queryBuilderMock = {
        where: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValue([olderPrimaryContact, newerPrimaryContact]),
      };
      repository.createQueryBuilder.mockReturnValue(queryBuilderMock);

      repository.find.mockResolvedValueOnce([
        olderPrimaryContact,
        newerPrimaryContact,
      ]);

      const updatedNewerContact = {
        ...newerPrimaryContact,
        linkPrecedence: 'secondary',
        linkedId: 1,
      };

      repository.save.mockResolvedValueOnce(updatedNewerContact);

      repository.find.mockResolvedValueOnce([
        olderPrimaryContact,
        updatedNewerContact,
      ]);

      const result = await service.identifyContact(input);

      expect(result).toEqual({
        contact: {
          primaryContatctId: 1,
          emails: ['primary1@example.com', 'primary2@example.com'],
          phoneNumbers: ['123456', '654321'],
          secondaryContactIds: [2],
        },
      });
    });

    it('should handle complex scenario with multiple linked contacts', async () => {
      const input = {
        email: 'another@example.com',
        phoneNumber: '123456',
      } as IdentifyRequestDto;

      const primaryContact = {
        id: 1,
        email: 'primary@example.com',
        phoneNumber: '123456',
        linkPrecedence: 'primary',
        linkedId: null,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      };

      const secondaryContact1 = {
        id: 2,
        email: 'secondary1@example.com',
        phoneNumber: '654321',
        linkPrecedence: 'secondary',
        linkedId: 1,
        createdAt: new Date('2023-01-02'),
        updatedAt: new Date('2023-01-02'),
      };

      const secondaryContact2 = {
        id: 3,
        email: 'secondary2@example.com',
        phoneNumber: '789012',
        linkPrecedence: 'secondary',
        linkedId: 1,
        createdAt: new Date('2023-01-03'),
        updatedAt: new Date('2023-01-03'),
      };

      const queryBuilderMock = {
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([primaryContact]),
      };
      repository.createQueryBuilder.mockReturnValue(queryBuilderMock);

      repository.find.mockResolvedValueOnce([
        primaryContact,
        secondaryContact1,
        secondaryContact2,
      ]);

      const newSecondaryContact = {
        id: 4,
        email: 'another@example.com',
        phoneNumber: undefined,
        linkPrecedence: 'secondary',
        linkedId: 1,
        createdAt: new Date('2023-01-04'),
        updatedAt: new Date('2023-01-04'),
      };
      repository.create.mockReturnValue(newSecondaryContact);
      repository.save.mockResolvedValue(newSecondaryContact);

      repository.find.mockResolvedValueOnce([
        primaryContact,
        secondaryContact1,
        secondaryContact2,
        newSecondaryContact,
      ]);

      const result = await service.identifyContact(input);

      expect(repository.create).toHaveBeenCalledWith({
        email: 'another@example.com',
        phoneNumber: undefined,
        linkedId: 1,
        linkPrecedence: 'secondary',
      });
      expect(result).toEqual({
        contact: {
          primaryContatctId: 1,
          emails: [
            'primary@example.com',
            'secondary1@example.com',
            'secondary2@example.com',
            'another@example.com',
          ],
          phoneNumbers: ['123456', '654321', '789012'],
          secondaryContactIds: [2, 3, 4],
        },
      });
    });
  });
});
