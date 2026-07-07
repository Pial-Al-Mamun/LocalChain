import { Module } from '@nestjs/common';
import { BlockService } from './block.service';
import { TransactionService } from '../transaction/transaction.service';

@Module({
  providers: [BlockService, TransactionService],
})
export class BlockModule {}
