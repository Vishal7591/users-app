import { IsNotEmpty, IsString } from 'class-validator';

export class DocumentDTO {
  @IsNotEmpty()
  @IsString()
  document_id: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  content: string;
}
