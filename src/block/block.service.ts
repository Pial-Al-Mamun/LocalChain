import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Block } from './block.type';
import crypto from 'crypto';
import { TransactionService } from '../transaction/transaction.service';
import { Transaction } from 'src/transaction/transaction.type';

/**
 * Service responsible for blockcahin operation and block management
 *
 *
 * This service works in conjunction with the `TransactionService` to ensure
 * all transactions within a block are cryptographically valid before
 * the block is added to the chain.
 *
 * @see {@link TransactionService} For transaction signature verification
 * @see {@link Block} For the block data structure
 */
@Injectable()
export class BlockService {
  constructor(
    @InjectPinoLogger(BlockService.name)
    private readonly logger: PinoLogger,
    private readonly tsxService: TransactionService,
  ) {}

  calculateHash(block: Block): string {
    return crypto
      .createHash('sha256')
      .update(
        block.previousHash +
          block.timestamp.toLocaleString() +
          JSON.stringify(block.transactions) +
          block.nonce.toLocaleString() +
          block.difficulty.toLocaleString(),
      )
      .digest('hex');
  }

  /**
   * Performs proof-of-work mining on a block by repeatedly incrementing its
   * nonce and recalculating its hash until the hash meets the required
   * difficulty target (i.e. starts with `difficulty` leading zeros).
   *
   * Always computes at least one hash, even at `difficulty === 0`, since the
   * block's incoming hash cannot be assumed valid.
   *
   * @param block - The block to mine. Its existing `nonce` and `hash` are
   *   used only as starting values and are not mutated; a new block object
   *   is returned.
   * @param difficulty - The number of leading zeros required in the resulting
   *   hash. Higher values exponentially increase expected mining time
   *   (~16x more hash attempts per additional difficulty level).
   *
   * @returns A new `Block` object identical to the input except for the
   *   updated `nonce` and `hash` that satisfy the difficulty target.
   */
  mineBlock(block: Block, difficulty: number): Block {
    const target = '0'.repeat(difficulty);
    let nonce = block.nonce;
    let hash = block.hash;

    do {
      nonce++;
      hash = this.calculateHash({ ...block, nonce });
    } while (hash.substring(0, difficulty) !== target);

    this.logger.info('Block mined' + hash + `in ${nonce}`);

    return {
      ...block,
      nonce,
      hash,
    };
  }

  /**
   * Check that all the transaction in the block are valid
   * @param transactions Transaction[]
   * @returns Promise<boolean> returns true if valid else false
   */
  async hasValidTransactionAsync(
    transactions: Transaction[],
  ): Promise<boolean> {
    for (const tsx of transactions) {
      const isValid = await this.tsxService.isValidAsync(tsx);

      if (!isValid) {
        return false;
      }
    }
    return true;
  }
}
