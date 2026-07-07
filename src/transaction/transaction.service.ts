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
/**
 * Class that handles all of the transaction logic in the blockchain
 */
@Injectable()
export class TransactionService {
  calculateHash(tsx: Transaction): string {
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
   * Validates whether a given transaction has a legitimate cryptographic signature.
   *
   * If the transaction has no `fromAddress` (null), it's considered valid
   * (e.g., system-generated transactions). Otherwise, it verifies the ECDSA
   * signature against the transaction data using secp256k1.
   *
   * @param this - Declared as `void` to indicate this method doesn't use `this`,
   *               preventing ESLint unbound-method warnings when passed as a callback.
   * @param tsx - The transaction object containing `fromAddress`, `signature`, and data fields.
   *
   * @returns A promise that resolves to `true` if the signature is valid, `false` otherwise.
   *
   * @throws {UnauthorizedException} - If the transaction has a `fromAddress` but no signature.
   */
  async isValidAsync(this: void, tsx: Transaction): Promise<boolean> {
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
   * Validate that the private key matches the owner of the block
   * @param fromAdress - The public address of the transaction initiator (hex string).
   * @param privateKey - The private key to validate (Uint8Array).
   *
   * @throws {BadRequestException} If the private key doesn't match the address
   *
   * @internal - This method is private and only used internally by the service
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
