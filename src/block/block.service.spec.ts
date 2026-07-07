import { Test, TestingModule } from '@nestjs/testing';
import { BlockService } from './block.service';
import { TransactionService } from '../transaction/transaction.service';
import { Block } from './block.type';
import { Transaction } from '../transaction/transaction.type';
import { getLoggerToken } from 'nestjs-pino';

describe('BlockService', () => {
  let service: BlockService;
  let transactionService: TransactionService;

  // Helper to create a mock transaction
  const createMockTransaction = (
    overrides: Partial<Transaction> = {},
  ): Transaction => ({
    fromAdress: 'Alice',
    toAdress: 'Bob',
    amount: 10,
    data: { note: 'test' },
    signature: 'mock-signature',
    ...overrides,
  });

  // Helper to create a mock block
  const createMockBlock = (overrides: Partial<Block> = {}): Block => ({
    timestamp: Date.now(),
    transactions: [createMockTransaction()],
    previousHash: '0',
    hash: '',
    nonce: 0,
    difficulty: 2,
    index: 0,
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockService,
        {
          provide: TransactionService,
          useValue: {
            isValidAsync: jest.fn(),
          },
        },
        {
          provide: getLoggerToken(BlockService.name),
          useValue: {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            trace: jest.fn(),
            fatal: jest.fn(),
            setContext: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BlockService>(BlockService);
    transactionService = module.get<TransactionService>(TransactionService);
  });

  describe('calculateHash', () => {
    it('should return a valid SHA-256 hash', () => {
      const block = createMockBlock();
      const hash = service.calculateHash(block);

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should produce different hashes for different blocks', () => {
      const block1 = createMockBlock({ nonce: 0 });
      const block2 = createMockBlock({ nonce: 1 });

      const hash1 = service.calculateHash(block1);
      const hash2 = service.calculateHash(block2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('mineBlock', () => {
    it('should mine a block and produce a valid proof of work', () => {
      const block = createMockBlock({ difficulty: 2 });
      const mined = service.mineBlock(block, 2);

      // Check that the hash starts with the correct number of zeros
      expect(mined.hash.startsWith('00')).toBe(true);
      expect(mined.nonce).toBeGreaterThan(0);
    });

    it('should not change the block index or transactions', () => {
      const block = createMockBlock({ difficulty: 2 });
      const mined = service.mineBlock(block, 2);

      expect(mined.index).toBe(block.index);
      expect(mined.transactions).toEqual(block.transactions);
      expect(mined.timestamp).toBe(block.timestamp);
      expect(mined.previousHash).toBe(block.previousHash);
    });
  });

  describe('hasValidTransactionAsync', () => {
    it('should return true when all transactions are valid', async () => {
      const mockTx = createMockTransaction();
      (transactionService.isValidAsync as jest.Mock).mockResolvedValue(true);

      const result = await service.hasValidTransactionAsync([mockTx]);
      expect(result).toBe(true);
      expect(transactionService.isValidAsync).toHaveBeenCalledWith(mockTx);
    });

    it('should return false when any transaction is invalid', async () => {
      const mockTx = createMockTransaction();
      (transactionService.isValidAsync as jest.Mock).mockResolvedValue(false);

      const result = await service.hasValidTransactionAsync([mockTx]);
      expect(result).toBe(false);
      expect(transactionService.isValidAsync).toHaveBeenCalledWith(mockTx);
    });

    it('should return true for an empty transaction list', async () => {
      const result = await service.hasValidTransactionAsync([]);
      expect(result).toBe(true);
      expect(transactionService.isValidAsync).not.toHaveBeenCalled();
    });
  });

  describe('mineBlock edge cases', () => {
    it('should handle difficulty 0 (no leading zeros required)', () => {
      const block = createMockBlock({ difficulty: 0 });
      const mined = service.mineBlock(block, 0);

      expect(mined.hash).toBeTruthy();
      expect(mined.nonce).toBeGreaterThanOrEqual(0);
    });

    it('should handle difficulty 3 (three leading zeros)', () => {
      const block = createMockBlock({ difficulty: 3 });
      const mined = service.mineBlock(block, 3);

      expect(mined.hash.startsWith('000')).toBe(true);
    });
  });
});
