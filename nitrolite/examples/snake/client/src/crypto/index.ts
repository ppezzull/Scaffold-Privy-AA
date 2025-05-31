import { ethers } from 'ethers';
import type { Hex } from 'viem';

/**
 * Interface for a cryptographic keypair
 */
export interface CryptoKeypair {
    /** Public key in hexadecimal format */
    publicKey: string;
    /** Private key in hexadecimal format */
    privateKey: string;
    /** Optional Ethereum address derived from the public key */
    address?: Hex;
}

/**
 * Type for message signing function
 */
type MessageSigner = (payload: any) => Promise<Hex>;

/**
 * Interface for a wallet signer that can sign messages
 */
export interface WalletSigner {
    /** Public key in hexadecimal format */
    publicKey: string;
    /** Ethereum address derived from the public key */
    address: Hex;
    /** Function to sign a message and return a hex signature */
    sign: MessageSigner;
}

/**
 * Derives an Ethereum address from a public key using keccak256 hashing
 *
 * @param publicKey - The public key in hexadecimal format
 * @returns The derived Ethereum address in checksummed format
 */
export const getAddressFromPublicKey = (publicKey: string): string => {
    try {
        // Remove '0x' prefix if it exists and make sure it's a compressed public key
        const cleanPublicKey = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;

        // Keccak hash of the public key
        const hash = ethers.utils.keccak256('0x' + cleanPublicKey);

        // Take the last 20 bytes of the hash and prefix with '0x' to get the address
        const address = '0x' + hash.slice(-40);

        // Return checksummed address
        return ethers.utils.getAddress(address);
    } catch (error) {
        throw new Error(`Invalid public key format: ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Creates a signer from a private key using ethers.js
 *
 * @param privateKey - The private key to create the signer from
 * @returns A WalletSigner object that can sign messages
 * @throws Error if signer creation fails
 */
export const createEthersSigner = (privateKey: string): WalletSigner => {
    try {
        // Create ethers wallet from private key
        const wallet = new ethers.Wallet(privateKey);

        return {
            publicKey: wallet.publicKey,
            address: wallet.address as Hex,
            sign: async (payload: any): Promise<Hex> => {
                try {
                    // Convert payload to string if needed
                    const payloadStr = typeof payload === 'string'
                        ? payload
                        : JSON.stringify(payload);

                    // Hash the payload string
                    const messageBytes = ethers.utils.arrayify(ethers.utils.id(payloadStr));

                    // Sign the digest using the private key
                    const flatSignature = await wallet._signingKey().signDigest(messageBytes);

                    const signature = ethers.utils.joinSignature(flatSignature);

                    return signature as Hex;
                } catch (error) {
                    console.error('Error signing message:', error);
                    throw error;
                }
            },
        };
    } catch (error) {
        console.error('Error creating ethers signer:', error);
        throw error;
    }
};

/**
 * Generates a random keypair using ethers
 *
 * @returns A Promise resolving to a CryptoKeypair object
 */
export const generateKeyPair = async (): Promise<CryptoKeypair> => {
    try {
        // Create random wallet
        const wallet = ethers.Wallet.createRandom();

        // Hash the private key with Keccak256 for additional security
        const privateKeyHash = ethers.utils.keccak256(wallet.privateKey);

        // Derive public key from hashed private key to create a new wallet
        const walletFromHashedKey = new ethers.Wallet(privateKeyHash);

        return {
            privateKey: privateKeyHash,
            publicKey: walletFromHashedKey.publicKey,
            address: walletFromHashedKey.address as Hex,
        };
    } catch (error) {
        console.error('Error generating keypair, using fallback:', error);
        // Fallback implementation
        const randomHex = ethers.utils.randomBytes(32);
        const privateKey = ethers.utils.keccak256(randomHex);
        const wallet = new ethers.Wallet(privateKey);

        return {
            privateKey: privateKey,
            publicKey: wallet.publicKey,
            address: wallet.address as Hex,
        };
    }
};

/**
 * Shortens a public key for display purposes
 *
 * @param publicKey - The public key to shorten
 * @returns A shortened version of the public key (e.g. "0x1234...5678")
 */
export const shortenPublicKey = (publicKey: string): string => {
    return publicKey.substring(0, 8) + '...' + publicKey.substring(publicKey.length - 4);
};
