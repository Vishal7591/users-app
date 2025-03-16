import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  NotFoundException,
} from '@nestjs/common';
import { DocumentService } from './document.service';
import { DocumentDTO } from './dto/document.dto';

@Controller('users/:userId/documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post('bulk-upsert')
  async bulkUpsert(
    @Param('userId') userId: number,
    @Body() documents: DocumentDTO[],
  ) {
    await this.documentService.bulkUpsertDocuments(userId, documents);
    return { message: 'Documents inserted/updated successfully' };
  }

  @Post('sync')
  async sync(
    @Param('userId') userId: number,
    @Body() documents: DocumentDTO[],
  ) {
    await this.documentService.syncDocuments(userId, documents);
    return { message: 'Documents synced successfully' };
  }

  @Get()
  async getUserDocuments(@Param('userId') userId: number) {
    const docs = await this.documentService.getDocumentsForUser(userId);
    if (!docs.length)
      throw new NotFoundException('No documents found for this user');
    return docs;
  }
}
