import { IsIn, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DecideApprovalDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED', 'NEEDS_REVISION'] })
  @IsIn(['APPROVED', 'REJECTED', 'NEEDS_REVISION'])
  decision: 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  comment?: string;
}
