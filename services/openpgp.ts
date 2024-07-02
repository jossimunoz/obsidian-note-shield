import * as openpgp from "openpgp";

export const algorithmList: Array<{
	value: Algorithm;
	display: string;
}> = [
	{ value: "RSA-2048", display: "RSA-2048 (Standard Security Level)" },
	{ value: "RSA-3072", display: "RSA-3072 (High Security Level)" },
	{ value: "RSA-4096", display: "RSA-4096 (Very High Security Level)" },
	{ value: "ECC-ed25519", display: "ECC-ed25519 (High Security Level)" },
	{
		value: "ECC-Curve25519",
		display: "ECC-Curve25519 (High Security Level)",
	},
	{ value: "ECC-p256", display: "ECC-p256 (Standard Security Level)" },
	{ value: "ECC-p384", display: "ECC-p384 (High Security Level)" },
	{ value: "ECC-p521", display: "ECC-p521 (Very High Security Level)" },
	{ value: "ECC-secp256k1", display: "ECC-secp256k1 (High Security Level)" },
	{
		value: "ECC-brainpoolP256r1",
		display: "ECC-brainpoolP256r1 (High Security Level)",
	},
	{
		value: "ECC-brainpoolP384r1",
		display: "ECC-brainpoolP384r1 (High Security Level)",
	},
	{
		value: "ECC-brainpoolP512r1",
		display: "ECC-brainpoolP512r1 (Very High Security Level)",
	},
];

export type Algorithm =
	| "RSA-2048"
	| "RSA-3072"
	| "RSA-4096"
	| "ECC-ed25519"
	| "ECC-Curve25519"
	| "ECC-p256"
	| "ECC-p384"
	| "ECC-p521"
	| "ECC-secp256k1"
	| "ECC-brainpoolP256r1"
	| "ECC-brainpoolP384r1"
	| "ECC-brainpoolP512r1";

/**
 * Get algorithm configuration for OpenPGP key generation.
 *
 * @param value - The algorithm value from the Algorithm type.
 * @returns The key generation options for OpenPGP.
 */
const getAlgorithm = (
	value: Algorithm
): {
	type: openpgp.GenerateKeyOptions["type"];
	curve?: openpgp.GenerateKeyOptions["curve"];
	rsaBits?: openpgp.GenerateKeyOptions["rsaBits"];
} => {
	switch (value) {
		case "RSA-2048":
			return { type: "rsa", rsaBits: 2048 };
		case "RSA-3072":
			return { type: "rsa", rsaBits: 3072 };
		case "RSA-4096":
			return { type: "rsa", rsaBits: 4096 };
		case "ECC-ed25519":
			return { type: "ecc", curve: "ed25519" };
		case "ECC-Curve25519":
			return { type: "ecc", curve: "curve25519" };
		case "ECC-p256":
			return { type: "ecc", curve: "p256" };
		case "ECC-p384":
			return { type: "ecc", curve: "p384" };
		case "ECC-p521":
			return { type: "ecc", curve: "p521" };
		case "ECC-secp256k1":
			return { type: "ecc", curve: "secp256k1" };
		case "ECC-brainpoolP256r1":
			return { type: "ecc", curve: "brainpoolP256r1" };
		case "ECC-brainpoolP384r1":
			return { type: "ecc", curve: "brainpoolP384r1" };
		case "ECC-brainpoolP512r1":
			return { type: "ecc", curve: "brainpoolP512r1" };
		default:
			throw new Error(`Unsupported algorithm: ${value}`);
	}
};

interface generateKeyProps {
	algorithm: Algorithm;
	email: string;
	name: string;
	passphrase: string | null;
	expire: string;
}

/**
 * Class to handle OpenPGP key operations.
 */
export class OpenPGPHandler {
	private armoredKey: string;
	private key: openpgp.Key;

	constructor(armoredKey?: string) {
		if (armoredKey) this.armoredKey = armoredKey;
	}

	/**
	 * Generate a new OpenPGP key.
	 *
	 * @param props - Properties for key generation.
	 * @returns The generated private and public keys.
	 */
	public async generateKey(props: generateKeyProps) {
		const { algorithm, email, name, passphrase, expire } = props;

		const { privateKey, publicKey } = await openpgp.generateKey({
			userIDs: [{ name: name, email: email }],
			passphrase: passphrase ?? undefined,
			format: "armored",
			keyExpirationTime: Number(expire),
			...getAlgorithm(algorithm),
		});

		this.armoredKey = privateKey;

		return { privateKey, publicKey };
	}

	/**
	 * Read a message and get its info.
	 *
	 * @param message - The armored message string.
	 * @returns The parsed message.
	 */
	public async getMessageInfo(
		message: string
	): Promise<openpgp.Message<string>> {
		return await openpgp.readMessage({ armoredMessage: message });
	}

	/**
	 * Initialize the OpenPGP handler with the provided armored key.
	 */
	public async init(): Promise<void> {
		this.key = await openpgp.readKey({ armoredKey: this.armoredKey });
	}

	/**
	 * Check if the loaded key is a private key.
	 *
	 * @returns True if the key is private, false otherwise.
	 */
	public isPrivateKey(): boolean {
		return this.key.isPrivate();
	}

	/**
	 * Check if the private key is decrypted.
	 *
	 * @returns True if the key is decrypted, false otherwise.
	 */
	public async isDecrypted(): Promise<boolean> {
		if (!this.isPrivateKey()) {
			return false;
		}

		const privateKey = await openpgp.readPrivateKey({
			armoredKey: this.armoredKey,
		});

		return privateKey.isDecrypted();
	}

	/**
	 * Get the subkeys of the loaded key.
	 *
	 * @returns The subkeys of the key.
	 */
	public getSubKeys(): openpgp.Subkey[] | undefined {
		return this.key.getSubkeys();
	}

	/**
	 * Get the public part of the loaded key in armored format.
	 *
	 * @returns The armored public key.
	 */
	public getPublicArmoredKey(): string {
		return this.key.toPublic().armor();
	}

	/**
	 * Get the user ID of the loaded key.
	 *
	 * @returns The user ID.
	 */
	public getUserId(): string {
		return this.key.getUserIDs()[0];
	}

	/**
	 * Get the key ID of the loaded key.
	 *
	 * @returns The key ID as a hexadecimal string.
	 */
	public getId(): string {
		return this.key.getKeyID().toHex();
	}

	/**
	 * Encrypt a message using the loaded public key.
	 *
	 * @param message - The message to encrypt.
	 * @returns The encrypted message as a web stream.
	 */
	public async encryptMessage(
		message: string
	): Promise<openpgp.WebStream<string>> {
		if (this.isPrivateKey()) {
			throw new Error(
				"Cannot use a private key to encrypt messages. Use a public key instead."
			);
		}
		const encrypted = await openpgp.encrypt({
			message: await openpgp.createMessage({ text: message }),
			encryptionKeys: this.key,
		});

		return encrypted;
	}

	/**
	 * Decrypt an encrypted message using the loaded private key.
	 *
	 * @param encryptedMessage - The encrypted message.
	 * @param passphrase - The passphrase for the private key (if needed).
	 * @returns The decrypted message.
	 */
	public async decryptMessage(
		encryptedMessage: string,
		passphrase?: string
	): Promise<openpgp.WebStream<string>> {
		if (!this.isPrivateKey()) {
			throw new Error(
				"Cannot use a public key to decrypt messages. Use a private key instead."
			);
		}

		const message = await openpgp.readMessage({
			armoredMessage: encryptedMessage,
		});

		const privateKey = await openpgp.readPrivateKey({
			armoredKey: this.armoredKey,
		});

		const isDecrypted = privateKey.isDecrypted();
		if (!isDecrypted) {
			const decryptKey = await openpgp.decryptKey({
				privateKey,
				passphrase,
			});
			const decrypted = await openpgp.decrypt({
				message,
				decryptionKeys: decryptKey,
			});

			return decrypted.data;
		} else {
			const decrypted = await openpgp.decrypt({
				message,
				decryptionKeys: privateKey,
			});

			return decrypted.data;
		}
	}
}
