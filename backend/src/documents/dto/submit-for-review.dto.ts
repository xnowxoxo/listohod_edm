import { IsArray, IsString, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitForReviewDto {
  @ApiProperty({ type: [String], description: 'Ordered list of approver user IDs' })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: 'Укажите хотя бы одного согласующего' })
  approverIds: string[];
}
