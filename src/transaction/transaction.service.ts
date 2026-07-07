import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Transaction } from './transaction.type';
import crypto from 'crypto';
import * as secp from '@noble/secp256k1';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { sha256 } from '@noble/hashes/sha2.js';

@Injectable()
export class TransactionService {
  calculateHash(tsx: Transaction) {
    return crypto
      .createHash('sha256')
      .update(
        tsx.fromAdress + tsx.toAdress + tsx.amount + JSON.stringify(tsx.data),
      )
      .digest('hex');
  }
  /**
   * check first for the transaction to have valid privateKey,
   * if does it will remove the old signature and create a new
   * transaction with the new data
   * @param tsx the transaction
   * @param signatureKey the signature of the owner of the block chain
   * @returns the new made transaction
   */
  async signTransactionAsync(
    tsx: Transaction,
    signatureKey: Uint8Array,
  ): Promise<Transaction> {
    if (tsx.fromAdress) {
      this.validatePrivateKeyMatchesAddress(tsx.fromAdress, signatureKey);
    }

    const tsxToSign = { ...tsx };
    delete tsxToSign.signature;

    const hash = sha256(new TextEncoder().encode(JSON.stringify(tsx)));
    const signatureBytes = await secp.signAsync(hash, signatureKey);
    const signatureHex = bytesToHex(signatureBytes);
    return {
      ...tsx,
      signature: signatureHex,
    };
  }

  /**
   * method to validate if the given transaction is legitimate
   * @param @type Transaction
   * @returns Promise<boolean>
   * */
  async isValidAsync(tsx: Transaction): Promise<boolean> {
    if (tsx.fromAdress === null) {
      return true;
    }

    if (!tsx.signature || tsx.signature.length === 0) {
      throw new UnauthorizedException(
        'There is no signature in the transaction',
      );
    }
    const tsxToSign = { ...tsx };
    delete tsxToSign.signature;

    const publicKeyByte = hexToBytes(tsx.fromAdress);
    const signatureBytes = hexToBytes(tsx.signature);

    const dataBytes = new TextEncoder().encode(JSON.stringify(tsxToSign));
    const hash = sha256(dataBytes);

    const isValid = await secp.verifyAsync(signatureBytes, hash, publicKeyByte);

    return isValid;
  }

  /**
   * Validate that the private key matches the fromAddress
   * @throws {BadRequestException} If the private key doesn't match the address
   */
  private validatePrivateKeyMatchesAddress(
    fromAdress: string,
    privateKey: Uint8Array,
  ): void {
    const publicKey = secp.getPublicKey(privateKey);
    const publicKeyHex = bytesToHex(publicKey);

    if (publicKeyHex !== fromAdress) {
      throw new BadRequestException(
        'You cannot sign transactions for other wallets',
      );
    }
  }
}
