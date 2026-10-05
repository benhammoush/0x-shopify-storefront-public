import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { createAssociatedTokenAccountInstruction, createTransferCheckedInstruction, getAssociatedTokenAddress } from '@solana/spl-token';

export interface SolanaIntent { id: string; mint: string; decimals: number; recipient: string; rawAmount: string; displayAmount: string; expiresAt: string; rpc: string }

interface SolanaWallet { isPhantom?: boolean; publicKey?: PublicKey; connect: () => Promise<{ publicKey: PublicKey }>; sendTransaction: (transaction: Transaction, connection: Connection) => Promise<string> }
declare global { interface Window { solana?: SolanaWallet } }

export async function payIntent(intent: SolanaIntent): Promise<string> {
  const wallet = window.solana;
  if (!wallet?.isPhantom) throw new Error('Install or unlock Phantom to pay with Solana Devnet test USDC.');
  const { publicKey } = await wallet.connect();
  const connection = new Connection(intent.rpc, 'confirmed');
  const mint = new PublicKey(intent.mint);
  const recipient = new PublicKey(intent.recipient);
  const source = await getAssociatedTokenAddress(mint, publicKey);
  const destination = await getAssociatedTokenAddress(mint, recipient, true);
  const transaction = new Transaction();
  if (!await connection.getAccountInfo(destination, 'confirmed')) transaction.add(createAssociatedTokenAccountInstruction(publicKey, destination, recipient, mint));
  transaction.add(createTransferCheckedInstruction(source, mint, destination, publicKey, BigInt(intent.rawAmount), intent.decimals));
  transaction.feePayer = publicKey;
  transaction.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
  return wallet.sendTransaction(transaction, connection);
}
