import { Test, TestingModule } from '@nestjs/testing';
import { DocumentService } from './document.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Document } from './entity/document.entity';
import { User } from '../user/entity/user.entity';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { DocumentDTO } from './dto/document.dto';

describe('DocumentService', () => {
  let service: DocumentService;
  let documentRepo: jest.Mocked<Repository<Document>>;
  let userRepo: jest.Mocked<Repository<User>>;

  const mockDocumentRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    upsert: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentService,
        {
          provide: getRepositoryToken(Document),
          useValue: mockDocumentRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<DocumentService>(DocumentService);
    documentRepo = module.get(getRepositoryToken(Document));
    userRepo = module.get(getRepositoryToken(User));

    jest.clearAllMocks();
  });

  describe('bulkUpsertDocuments', () => {
    it('should throw NotFoundException if user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.bulkUpsertDocuments(1, [])).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should upsert documents for a valid user', async () => {
      const user = { id: 1 } as User;
      userRepo.findOne.mockResolvedValue(user);
      documentRepo.upsert.mockResolvedValue(undefined as any);

      const docs: DocumentDTO[] = [
        { document_id: 'doc1', title: 'Doc 1', content: 'Content 1' },
        { document_id: 'doc2', title: 'Doc 2', content: 'Content 2' },
      ];

      await service.bulkUpsertDocuments(1, docs);

      expect(documentRepo.upsert).toHaveBeenCalled();
    });
  });

  describe('removeMissingDocuments', () => {
    it('should delete documents not in provided list', async () => {
      const deleteMock = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn(),
      };

      (documentRepo.createQueryBuilder as jest.Mock).mockReturnValue(
        deleteMock,
      );

      await service.removeMissingDocuments(1, ['doc1', 'doc2']);

      expect(deleteMock.delete).toHaveBeenCalled();
      expect(deleteMock.where).toHaveBeenCalledWith('userId = :userId', {
        userId: 1,
      });
      expect(deleteMock.andWhere).toHaveBeenCalledWith(
        'document_id NOT IN (:...documentIds)',
        {
          documentIds: ['doc1', 'doc2'],
        },
      );
      expect(deleteMock.execute).toHaveBeenCalled();
    });
  });

  describe('syncDocuments', () => {
    it('should upsert documents and remove missing ones', async () => {
      const user = { id: 1 } as User;
      userRepo.findOne.mockResolvedValue(user);
      documentRepo.upsert.mockResolvedValue(undefined as any);

      const deleteMock = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn(),
      };
      (documentRepo.createQueryBuilder as jest.Mock).mockReturnValue(
        deleteMock,
      );

      const docs: DocumentDTO[] = [
        { document_id: 'doc1', title: 'Doc 1', content: 'Content 1' },
        { document_id: 'doc2', title: 'Doc 2', content: 'Content 2' },
      ];

      await service.syncDocuments(1, docs);

      expect(documentRepo.upsert).toHaveBeenCalled();
      expect(deleteMock.execute).toHaveBeenCalled();
    });
  });

  describe('getDocumentsForUser', () => {
    it('should return documents for a user', async () => {
      const documents = [
        { id: 1, title: 'doc1' },
        { id: 2, title: 'doc2' },
      ];
      documentRepo.find.mockResolvedValue(documents as Document[]);

      const result = await service.getDocumentsForUser(1);

      expect(result).toEqual(documents);
      expect(documentRepo.find).toHaveBeenCalledWith({
        where: { user: { id: 1 } },
      });
    });
  });

  describe('create', () => {
    it('should create a document for user', async () => {
      const user = { id: 1 } as User;
      userRepo.findOne.mockResolvedValue(user);
      documentRepo.save.mockResolvedValue({
        id: 1,
        title: 'Doc Title',
      } as Document);

      const file = { name: 'file.txt' } as unknown as File;
      const dto: DocumentDTO = {
        title: 'Doc Title',
        document_id: 'doc1',
        content: 'Content 1',
      };

      const result = await service.create(1, dto, file);

      expect(result).toEqual({ id: 1, title: 'Doc Title' });
      expect(documentRepo.save).toHaveBeenCalled();
    });

    it('should return error object if exception thrown', async () => {
      userRepo.findOne.mockRejectedValue(new Error('DB Error'));

      const result = await service.create(
        1,
        { title: 'Doc Title', document_id: 'doc1', content: 'Content 1' },
        undefined as any,
      );

      expect(result).toEqual({ success: false, message: 'DB Error' });
    });
  });
});
