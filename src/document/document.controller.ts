import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  NotFoundException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { DocumentService } from './document.service';
import { DocumentDTO } from './dto/document.dto';
import { FileInterceptor } from '@nestjs/platform-express';

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

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          return cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  create(
    @Body() id: number,
    docDto: DocumentDTO,
    @UploadedFile() file: File,
  ): Promise<any> {
    return this.documentService.create(id, docDto, file);
  }
}
