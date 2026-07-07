export type Transaction = {
  fromAdress: string | null;
  toAdress: string;
  amount: number;
  signature?: string;
  data?: any;
};
