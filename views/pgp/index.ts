import { Notice, TextFileView } from "obsidian";
import { WorkspaceLeaf } from "obsidian";
import PGPEncryptPlugin from "main";
import newNoteView from "./newNoteView";
import decryptView from "./decryptView";
import editingView from "./editingView";
import { OpenPGPHandler } from "services/openpgp";

/**
 * Enum defining different view types for NoteShieldPGPView.
 */
export enum ViewTypeEnum {
	NEW_NOTE, // View for creating a new note
	EDIT_NOTE, // View for editing an existing unlocked note
	DECRYPT_NOTE, // View for decrypting a locked note
}

/**
 * Enum defining view modes for NoteShieldPGPView.
 */
export enum NoteShieldPGPViewModeEnum {
	SOURCE = "source", // View mode showing the source content of the note
	PREVIEW = "preview", // View mode showing a preview of the note content
}

// Constant for the view type identifier
export const VIEW_TYPE_PGP_FILE_CONTENT = "pgp-file-content-view";

/**
 * Extends TextFileView to provide PGP encryption and decryption capabilities for Obsidian notes.
 */
export class NoteShieldPGPView extends TextFileView {
	clearText: string = ""; // Clear text content of the note
	publicKey: string; // Public key used for encryption
	plugin: PGPEncryptPlugin; // Instance of the PGPEncryptPlugin managing the view
	viewMode: NoteShieldPGPViewModeEnum = NoteShieldPGPViewModeEnum.SOURCE; // Default view mode
	viewType: ViewTypeEnum = ViewTypeEnum.NEW_NOTE; // Default view type
	actions: string[] = []; // Array to store actions added to the view

	/**
	 * Constructs a new instance of NoteShieldPGPView.
	 * @param leaf - The WorkspaceLeaf associated with the view.
	 * @param plugin - The PGPEncryptPlugin instance managing the view.
	 */
	constructor(leaf: WorkspaceLeaf, plugin: PGPEncryptPlugin) {
		super(leaf);
		this.plugin = plugin;

		// Add 'copy' action for copying armored encryption content
		this.addAction("copy", "Copy armored encryption", () => {
			this.actions.push("copy");
			this.copyPGPArmoredContent(this.data);
		});
	}

	/**
	 * Adds a header to the specified HTML container with optional icon.
	 * @param container - The HTML container to which the header will be added.
	 * @param title - The title text of the header.
	 * @param icon - Optional SVG icon element to include in the header.
	 */
	public addHeader(
		container: HTMLElement,
		title: string,
		icon?: SVGSVGElement | null
	) {
		const div = container.createDiv({
			cls: "noteshield-note-header", // CSS class for styling purposes
		});

		div.createSpan({
			text: title, // Set the text content of the span element
		});

		if (icon) div.appendChild(icon); // Append the optional icon element if provided
	}

	/**
	 * Sets the current view type and updates the view accordingly.
	 * @param viewType - The type of view to set.
	 */
	setView(viewType: ViewTypeEnum) {
		this.viewType = viewType;

		this.contentEl.empty();

		const contentContainer = this.contentEl.createDiv({
			cls: "content-container",
		});

		// Switches between different views based on viewType
		switch (this.viewType) {
			case ViewTypeEnum.DECRYPT_NOTE:
				this.decryptView(contentContainer);
				break;
			case ViewTypeEnum.NEW_NOTE:
				this.newNoteView(contentContainer);
				break;
			case ViewTypeEnum.EDIT_NOTE:
				this.editingView(contentContainer);
				break;
		}
	}

	/**
	 * Sets view data and switches view type based on whether data is clear or encrypted.
	 * @param data - The data to set in the view.
	 * @param clear - Indicates if the data is clear (plaintext) or encrypted.
	 */
	override setViewData(data: string, clear: boolean) {
		if (clear) {
			let newView: ViewTypeEnum;
			if (data === "") {
				// Blank new file
				newView = ViewTypeEnum.NEW_NOTE;
			} else {
				// Encrypted file
				newView = ViewTypeEnum.DECRYPT_NOTE;
			}

			this.setView(newView);
		} else {
			// Detach leaf if multiple views of the same note are not supported
			this.leaf.detach();
			new Notice(
				"Multiple views of the same encrypted note isn't supported"
			);
		}
	}

	/**
	 * Retrieves the view data.
	 * @returns The current data in the view.
	 */
	override getViewData = () => {
		return this.data;
	};

	/**
	 * Renders editing view for the current note.
	 * @param container - The HTML container to render the view into.
	 */
	private async editingView(container: HTMLElement) {
		await editingView(this, container);
	}

	/**
	 * Renders decryption view for the current note.
	 * @param container - The HTML container to render the view into.
	 */
	private async decryptView(container: HTMLElement) {
		await decryptView(this, container);
	}

	/**
	 * Renders new note creation view.
	 * @param container - The HTML container to render the view into.
	 */
	private newNoteView(container: HTMLElement) {
		newNoteView(this, container);
	}

	/**
	 * Copies the provided PGP armored encryption content to the clipboard.
	 * @param data - The PGP armored encryption content to copy.
	 */
	private async copyPGPArmoredContent(data: string) {
		await navigator.clipboard.writeText(data);

		new Notice("Clipboard: Armored encryption"); // Show notice for successful clipboard copy
	}

	/**
	 * Locks the current note view for decryption and updates actions.
	 */
	public async lockNote() {
		this.clearText = "";
		this.setView(ViewTypeEnum.DECRYPT_NOTE);
		const button = document.querySelector('button[aria-label="Lock"]');
		button?.remove();
		this.actions = this.actions.filter((action) => action !== "lock_note");
	}

	/**
	 * Retrieves the view type identifier.
	 * @returns The view type identifier.
	 */
	getViewType() {
		return VIEW_TYPE_PGP_FILE_CONTENT;
	}

	/**
	 * Encrypts the current clear text using the stored public key and saves the encrypted data.
	 */
	async encryptAndSave() {
		try {
			const manager = new OpenPGPHandler(this.publicKey);

			await manager.init();

			const data = await manager.encryptMessage(this.clearText);

			this.data = data as string;

			this.requestSave();
		} catch (e) {
			console.error(e);
			new Notice(e, 10000); // Show error notice for 10 seconds
		}
	}

	/**
	 * Placeholder method to be overridden.
	 */
	override clear = () => {};
}
