import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './entity/document.entity';
import { DocumentDTO } from './dto/document.dto';
import { User } from '../user/entity/user.entity';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async bulkUpsertDocuments(
    userId: number,
    documents: DocumentDTO[],
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User with ID ${userId} not found`);

    const docs = documents.map((doc) => ({ ...doc, user }));
    await this.documentRepository.upsert(docs, ['document_id']);
  }

  async removeMissingDocuments(
    userId: number,
    documentIds: string[],
  ): Promise<void> {
    await this.documentRepository
      .createQueryBuilder()
      .delete()
      .where('userId = :userId', { userId })
      .andWhere('document_id NOT IN (:...documentIds)', { documentIds })
      .execute();
  }

  async syncDocuments(userId: number, documents: DocumentDTO[]): Promise<void> {
    await this.bulkUpsertDocuments(userId, documents);
    const documentIds = documents.map((doc) => doc.document_id);
    await this.removeMissingDocuments(userId, documentIds);
  }

  async getDocumentsForUser(userId: number): Promise<Document[]> {
    return this.documentRepository.find({ where: { user: { id: userId } } });
  }
}
