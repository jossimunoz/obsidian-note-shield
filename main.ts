import { Notice, Plugin, TFolder } from "obsidian";
import { NoteShieldSettingTab } from "./setting";
import { NoteShieldPGPView, VIEW_TYPE_PGP_FILE_CONTENT } from "./views/pgp";
import { MemoryStorage } from "./services/storage";
import { OpenPGPHandler } from "./services/openpgp";

export interface INoteShieldSettings {}

const DEFAULT_SETTINGS: INoteShieldSettings = {};

export interface KeyInfo {
	id: string;
	userId: string;
	armoredPublicKey: string;
	armoredPrivateKey?: string;
	isDecrypted?: boolean;
}

export default class NoteShieldPlugin extends Plugin {
	settings: INoteShieldSettings;
	configFilePath: string;
	storage = new MemoryStorage();
	keys: KeyInfo[] = [];

	async onload(): Promise<void> {
		await this.loadSettings();

		this.addSettingTab(new NoteShieldSettingTab(this.app, this));

		// Register PGPFileView for the plugin
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
					menu.addItem((item) => {
						item.setTitle("New PGP Note");
						item.onClick(async () => {
							await this.createPGPNote(file.path);
						});
					});
				}
			})
		);
	}

	async loadSettings() {
		const vault = this.app.vault;
		const keyFolderExist = await vault.adapter.exists(".pgp");
		if (keyFolderExist) {
			const { files } = await vault.adapter.list(".pgp");

			for await (const filepath of files) {
				const armoredKey = await vault.adapter.read(filepath);
				const encryption = new OpenPGPHandler(armoredKey);
				await encryption.init();
				const keyId = encryption.getId();
				const userId = encryption.getUserId();
				const isPrivateKey = encryption.isPrivateKey();
				const isDecrypted = isPrivateKey
					? await encryption.isDecrypted()
					: false;
				const index = this.keys.findIndex((key) => key.id === keyId);
				if (index !== -1) {
					if (!this.keys[index].armoredPrivateKey && isPrivateKey) {
						this.keys[index].armoredPrivateKey = armoredKey;
						this.keys[index].isDecrypted = isDecrypted;
						this.keys[index].userId = userId;
					}

					if (!this.keys[index].armoredPublicKey && !isPrivateKey) {
						this.keys[index].armoredPublicKey = armoredKey;
						this.keys[index].userId = userId;
					}
				} else {
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
		this.configFilePath = `${vault.configDir}/pgp-encrypt-settings.json`;
		try {
			const isConfigFile = await vault.adapter.exists(
				this.configFilePath
			);

			if (!isConfigFile) {
				this.settings = { ...DEFAULT_SETTINGS };
				await vault.adapter.write(
					this.configFilePath,
					JSON.stringify(this.settings, null, 2)
				);
			} else {
				const data = await vault.adapter.read(this.configFilePath);
				this.settings = JSON.parse(data);
			}
		} catch (error) {
			this.settings = { ...DEFAULT_SETTINGS };
		}
	}

	async saveSettings() {
		const data = JSON.stringify(this.settings, null, 2);
		await this.app.vault.adapter.write(this.configFilePath, data);
	}

	async saveKeys({
		privateKey,
		publicKey,
	}: {
		privateKey?: string;
		publicKey: string;
	}) {
		try {
			const vault = this.app.vault;
			const keyFolderExist = await vault.adapter.exists(".pgp");
			if (!keyFolderExist) {
				await vault.createFolder(".pgp");
			}

			const handler = new OpenPGPHandler(publicKey);
			await handler.init();
			const keyId = handler.getId();
			const isPrivateKey = handler.isPrivateKey();
			const filename = `${keyId}_${
				isPrivateKey ? "_private" : "_public"
			}.asc`;

			const path = `.pgp/${filename}`;

			vault.adapter.write(path, publicKey);

			if (privateKey) {
				const handler = new OpenPGPHandler(privateKey);
				await handler.init();
				const keyId = handler.getId();
				const isPrivateKey = handler.isPrivateKey();

				if (!isPrivateKey) {
					throw new Error("The provided key is not a private key.");
				}

				const filename = `${keyId}_${
					isPrivateKey ? "_private" : "_public"
				}.asc`;

				const path = `.pgp/${filename}`;

				vault.adapter.write(path, privateKey);
			}

			new Notice("Saving keys");
		} catch (error) {
			new Notice("An error occurred: " + error.message);
		}
	}

	async createPGPNote(path?: string) {
		const currentDate = new Date();
		const year = currentDate.getFullYear();
		const month = String(currentDate.getMonth() + 1).padStart(2, "0");
		const day = String(currentDate.getDate()).padStart(2, "0");
		const hours = String(currentDate.getHours()).padStart(2, "0");
		const minutes = String(currentDate.getMinutes()).padStart(2, "0");
		const seconds = String(currentDate.getSeconds()).padStart(2, "0");

		const formattedDate = `${year}-${month}-${day} ${hours}${minutes}${seconds}`;

		const file = await this.app.vault.create(
			(path ?? "") + `/${formattedDate}.pgp`,
			""
		);

		const leaf = this.app.workspace.getLeaf();
		await leaf.openFile(file);
	}
}
