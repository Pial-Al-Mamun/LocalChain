import { Transaction } from 'src/transaction/transaction.type';

export type Block = {
  index: number;
  nonce: number;
  hash: string;
  timestamp: number;
  previousHash: string;
  transactions: Transaction[];
  difficulty: number;
};
