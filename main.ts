import { Notice, Plugin, TFolder } from "obsidian"; // Import necessary classes from Obsidian
import { NoteShieldSettingTab } from "./setting"; // Import custom setting tab for the plugin
import { NoteShieldPGPView, VIEW_TYPE_PGP_FILE_CONTENT } from "./views/pgp"; // Import custom PGP view and its type
import { MemoryStorage } from "./services/storage"; // Import memory storage service
import { OpenPGPHandler } from "./services/openpgp"; // Import OpenPGP handler

export interface INoteShieldSettings {} // Define interface for plugin settings

const DEFAULT_SETTINGS: INoteShieldSettings = {}; // Default settings for the plugin

export interface KeyInfo {
	id: string; // Unique identifier for the key
	userId: string; // User ID associated with the key
	armoredPublicKey: string; // Armored public key string
	armoredPrivateKey?: string; // Optional armored private key string
	isDecrypted?: boolean; // Optional flag indicating if the private key is decrypted
}

export default class NoteShieldPlugin extends Plugin {
	settings: INoteShieldSettings; // Plugin settings
	storage = new MemoryStorage(); // Initialize memory storage
	keys: KeyInfo[] = []; // Array to store key information

	// Method called when the plugin is loaded
	async onload(): Promise<void> {
		await this.loadKeys(); // Load keys

		this.addSettingTab(new NoteShieldSettingTab(this.app, this)); // Add custom settings tab to the app

		// Register PGP file view for the plugin
		this.registerView(
			VIEW_TYPE_PGP_FILE_CONTENT,
			(leaf) => new NoteShieldPGPView(leaf, this)
		);

		// Register .pgp file extension with the view type
		this.registerExtensions(["pgp"], VIEW_TYPE_PGP_FILE_CONTENT);

		// Add ribbon icon to create a new PGP note
		this.addRibbonIcon("file-key-2", "Create PGP Note", async () => {
			await this.createPGPNote();
		});

		// Add context menu option to create a new PGP note
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file, source, leaf) => {
				if (file instanceof TFolder) {
					// Only add option if the file is a folder
					menu.addItem((item) => {
						item.setTitle("New PGP Note"); // Set context menu item title
						item.onClick(async () => {
							await this.createPGPNote(file.path); // Create a new PGP note in the folder
						});
					});
				}
			})
		);
	}

	async loadKeys() {
		const vault = this.app.vault; // Get the vault instance
		const keyFolderExist = await vault.adapter.exists(".pgp"); // Check if the .pgp folder exists
		if (keyFolderExist) {
			const { files } = await vault.adapter.list(".pgp"); // List all files in the .pgp folder

			for await (const filepath of files) {
				const armoredKey = await vault.adapter.read(filepath); // Read the key file
				const encryption = new OpenPGPHandler(armoredKey); // Initialize OpenPGP handler
				await encryption.init(); // Initialize encryption handler
				const keyId = encryption.getId(); // Get the key ID
				const userId = encryption.getUserId(); // Get the user ID
				const isPrivateKey = encryption.isPrivateKey(); // Check if it's a private key
				const isDecrypted = isPrivateKey
					? await encryption.isDecrypted() // Check if the private key is decrypted
					: false;
				const index = this.keys.findIndex((key) => key.id === keyId); // Find index of the key in the keys array
				if (index !== -1) {
					// If key already exists in the array
					if (!this.keys[index].armoredPrivateKey && isPrivateKey) {
						this.keys[index].armoredPrivateKey = armoredKey; // Update private key
						this.keys[index].isDecrypted = isDecrypted; // Update decrypted status
						this.keys[index].userId = userId; // Update user ID
					}

					if (!this.keys[index].armoredPublicKey && !isPrivateKey) {
						this.keys[index].armoredPublicKey = armoredKey; // Update public key
						this.keys[index].userId = userId; // Update user ID
					}
				} else {
					// If key does not exist in the array
					if (isPrivateKey) {
						this.keys.push({
							id: keyId,
							armoredPrivateKey: armoredKey,
							armoredPublicKey: encryption.getPublicArmoredKey(),
							isDecrypted: isDecrypted,
							userId: userId,
						});
					} else {
						this.keys.push({
							id: keyId,
							armoredPublicKey: armoredKey,
							userId: userId,
						});
					}
				}
			}
		}
	}

	// Method to save plugin settings
	async saveSettings() {
		// not needed for now
	}

	// Method to save keys
	async saveKeys({
		privateKey,
		publicKey,
	}: {
		privateKey?: string;
		publicKey: string;
	}) {
		try {
			const vault = this.app.vault; // Get the vault instance
			const keyFolderExist = await vault.adapter.exists(".pgp"); // Check if the .pgp folder exists
			if (!keyFolderExist) {
				await vault.createFolder(".pgp"); // Create .pgp folder if it doesn't exist
			}

			const handler = new OpenPGPHandler(publicKey); // Initialize OpenPGP handler with public key
			await handler.init(); // Initialize encryption handler
			const keyId = handler.getId(); // Get the key ID
			const isPrivateKey = handler.isPrivateKey(); // Check if it's a private key
			const filename = `${keyId}_${
				isPrivateKey ? "_private" : "_public"
			}.asc`; // Generate filename based on key ID and type

			const path = `.pgp/${filename}`; // Define file path

			vault.adapter.write(path, publicKey); // Write public key to file

			if (privateKey) {
				// If private key is provided
				const handler = new OpenPGPHandler(privateKey); // Initialize OpenPGP handler with private key
				await handler.init(); // Initialize encryption handler
				const keyId = handler.getId(); // Get the key ID
				const isPrivateKey = handler.isPrivateKey(); // Check if it's a private key

				if (!isPrivateKey) {
					throw new Error("The provided key is not a private key."); // Throw error if key is not a private key
				}

				const filename = `${keyId}_${
					isPrivateKey ? "_private" : "_public"
				}.asc`; // Generate filename based on key ID and type

				const path = `.pgp/${filename}`; // Define file path

				vault.adapter.write(path, privateKey); // Write private key to file
			}

			new Notice("Saving keys"); // Show notice for saving keys
		} catch (error) {
			new Notice("An error occurred: " + error.message); // Show notice for errors
		}
	}

	// Method to create a new PGP note
	async createPGPNote(path?: string) {
		const currentDate = new Date(); // Get current date and time
		const year = currentDate.getFullYear(); // Get current year
		const month = String(currentDate.getMonth() + 1).padStart(2, "0"); // Get current month
		const day = String(currentDate.getDate()).padStart(2, "0"); // Get current day
		const hours = String(currentDate.getHours()).padStart(2, "0"); // Get current hours
		const minutes = String(currentDate.getMinutes()).padStart(2, "0"); // Get current minutes
		const seconds = String(currentDate.getSeconds()).padStart(2, "0"); // Get current seconds

		const formattedDate = `${year}-${month}-${day} ${hours}${minutes}${seconds}`; // Format date and time

		const file = await this.app.vault.create(
			(path ?? "") + `/${formattedDate}.pgp`,
			"" // Create a new PGP file with formatted date as name
		);

		const leaf = this.app.workspace.getLeaf(); // Get a new workspace leaf
		await leaf.openFile(file); // Open the newly created PGP file
	}
}
