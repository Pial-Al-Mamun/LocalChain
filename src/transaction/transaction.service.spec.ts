/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { Transaction } from './transaction.type';
import * as secp from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

describe('TransactionService', () => {
  let service: TransactionService;
  let validPrivateKey: Uint8Array;
  let validPublicKey: string;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TransactionService],
    }).compile();

    service = module.get<TransactionService>(TransactionService);

    // Generate a valid keypair for testing
    validPrivateKey = secp.keygen().secretKey;
    const publicKey = secp.getPublicKey(validPrivateKey);
    validPublicKey = bytesToHex(publicKey);
  });

  describe('calculateHash', () => {
    it('should return a 64-character hex string', () => {
      const tx: Transaction = {
        fromAdress: 'Alice',
        toAdress: 'Bob',
        amount: 10,
        data: { note: 'test' },
      };

      const hash = service.calculateHash(tx);
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should produce the same hash for the same transaction', () => {
      const tx: Transaction = {
        fromAdress: 'Alice',
        toAdress: 'Bob',
        amount: 10,
        data: { note: 'test' },
      };

      const hash1 = service.calculateHash(tx);
      const hash2 = service.calculateHash(tx);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different transactions', () => {
      const tx1: Transaction = {
        fromAdress: 'Alice',
        toAdress: 'Bob',
        amount: 10,
        data: { note: 'test' },
      };
      const tx2: Transaction = {
        fromAdress: 'Alice',
        toAdress: 'Charlie',
        amount: 20,
        data: { note: 'test' },
      };

      const hash1 = service.calculateHash(tx1);
      const hash2 = service.calculateHash(tx2);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('signTransaction', () => {
    it('should sign a transaction successfully', async () => {
      const tx: Transaction = {
        fromAdress: validPublicKey,
        toAdress: 'Bob',
        amount: 10,
        data: { note: 'test' },
      };

      const signedTx = await service.signTransactionAsync(tx, validPrivateKey);
      expect(signedTx.signature).toBeDefined();
      expect(signedTx.signature).toHaveLength(128); // 64 bytes = 128 hex chars
      expect(signedTx.fromAdress).toBe(validPublicKey);
    });

    it('should throw BadRequestException if private key does not match fromAddress', async () => {
      // Generate a different private key
      const wrongPrivateKey = secp.keygen().secretKey;

      const tx: Transaction = {
        fromAdress: validPublicKey,
        toAdress: 'Bob',
        amount: 10,
        data: { note: 'test' },
      };

      await expect(
        service.signTransactionAsync(tx, wrongPrivateKey),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.signTransactionAsync(tx, wrongPrivateKey),
      ).rejects.toThrow('You cannot sign transactions for other wallets');
    });

    it('should remove existing signature before signing', async () => {
      const tx: Transaction = {
        fromAdress: validPublicKey,
        toAdress: 'Bob',
        amount: 10,
        data: { note: 'test' },
        signature: 'old-signature-123',
      };

      const signedTx = await service.signTransactionAsync(tx, validPrivateKey);
      expect(signedTx.signature).not.toBe('old-signature-123');
    });
  });

  describe('isValid', () => {
    it('should return true for null fromAddress (mining reward)', async () => {
      const result = await service.isValidAsync({
        fromAdress: null,
        signature: 'some-signature',
        data: { note: 'reward' },
        amount: 10,
        toAdress: 'some-adress',
      });
      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException if signature is missing', async () => {
      const tx: Transaction = {
        fromAdress: validPublicKey,
        toAdress: 'Bob',
        amount: 10,
        data: { note: 'test' },
      };

      await expect(
        service.isValidAsync({
          signature: '',
          ...tx,
        }),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.isValidAsync({
          signature: '',
          ...tx,
        }),
      ).rejects.toThrow('There is no signature in the transaction');
    });

    it('should return true for a valid signed transaction', async () => {
      const tx: Transaction = {
        fromAdress: validPublicKey,
        toAdress: 'Bob',
        amount: 10,
        data: { note: 'test' },
      };
      const signedTx = await service.signTransactionAsync(tx, validPrivateKey);

      const isValid = await service.isValidAsync(signedTx);

      expect(isValid).toBe(true);
    });

    it('should return false for a tampered transaction', async () => {
      const tx: Transaction = {
        fromAdress: validPublicKey,
        toAdress: 'Bob',
        amount: 10,
        data: { note: 'test' },
      };

      const signedTx = await service.signTransactionAsync(tx, validPrivateKey);

      // Tamper with the data
      const tamperedData = { note: 'tampered' };

      const isValid = await service.isValidAsync({
        ...signedTx,
        data: tamperedData,
      });

      expect(isValid).toBe(false);
    });

    it('should return false for a transaction signed by a different private key', async () => {
      // Generate a different keypair
      const differentPrivateKey = secp.keygen().secretKey;

      const tx: Transaction = {
        fromAdress: validPublicKey, // Claim to be Alice
        toAdress: 'Bob',
        amount: 10,
        data: { note: 'test' },
      };

      // Sign with Bob's private key (different from Alice)
      const txCopy = { ...tx };
      const hash = sha256(new TextEncoder().encode(JSON.stringify(txCopy)));
      const signature = await secp.signAsync(hash, differentPrivateKey);
      const signatureHex = bytesToHex(signature);

      const isValid = await service.isValidAsync({
        ...tx,
        signature: signatureHex,
      });

      expect(isValid).toBe(false);
    });
  });

  describe('validatePrivateKeyMatchesAddress (private method)', () => {
    it('should not throw if private key matches address', async () => {
      const tx: Transaction = {
        fromAdress: validPublicKey,
        toAdress: 'Bob',
        amount: 10,
        data: { note: 'test' },
      };

      // This should not throw
      await expect(
        service.signTransactionAsync(tx, validPrivateKey),
      ).resolves.toBeDefined();
    });

    it('should throw BadRequestException if private key does not match address', async () => {
      const wrongPrivateKey = secp.keygen().secretKey;

      const tx: Transaction = {
        fromAdress: validPublicKey,
        toAdress: 'Bob',
        amount: 10,
        data: { note: 'test' },
      };

      await expect(
        service.signTransactionAsync(tx, wrongPrivateKey),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
