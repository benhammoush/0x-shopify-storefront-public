import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { Buffer } from 'buffer';

Object.assign(globalThis, { Buffer });

export interface SolanaIntent { id: string; asset: 'SOL'; decimals: 9; recipient: string; rawAmount: string; displayAmount: string; expiresAt: string; quote: { usdPrice: string; blockId: number }; rpc: string }

interface SolanaWallet { isPhantom?: boolean; connect: () => Promise<{ publicKey: PublicKey }>; signAndSendTransaction: (transaction: Transaction) => Promise<{ signature: string }> }
declare global { interface Window { phantom?: { solana?: SolanaWallet } } }

export async function payIntent(intent: SolanaIntent): Promise<string> {
  const wallet = window.phantom?.solana;
  if (!wallet?.isPhantom) throw new Error('Install or unlock Phantom to pay with Solana Devnet SOL.');
  const { publicKey } = await wallet.connect();
  const connection = new Connection(intent.rpc, 'confirmed');
  const recipient = new PublicKey(intent.recipient);
  if (publicKey.equals(recipient)) throw new Error('Use a payer wallet that differs from the configured recipient.');
  const transaction = new Transaction();
  transaction.add(SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: recipient, lamports: BigInt(intent.rawAmount) }));
  transaction.feePayer = publicKey;
  transaction.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
  return (await wallet.signAndSendTransaction(transaction)).signature;
}
