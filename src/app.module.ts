import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppLoggerModule } from './app-logger/app-logger.module';
import { ConfigModule } from '@nestjs/config';
import { TransactionService } from './transaction/transaction.service';
import { BlockService } from './block/block.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), AppLoggerModule],
  controllers: [AppController],
  providers: [AppService, TransactionService, BlockService],
})
export class AppModule {}
