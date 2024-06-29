import { Notice, Setting } from "obsidian";
import { NoteShieldPGPView, ViewTypeEnum } from ".";
import formatKeyId from "utils/formatKeyId";
/**
 * Renders a view for creating a new PGP encrypted note.
 * @param view - The NoteShieldPGPView instance containing context for the new note.
 * @param container - The HTML element where the new note form will be rendered.
 */
const newNoteView = async (view: NoteShieldPGPView, container: HTMLElement) => {
	// Ensure the file is defined before proceeding
	if (!view.file) throw new Error("File is not defined");

	// Create a heading and display the path of the new note
	container.createEl("h2", { text: `New PGP Note` });
	container.createEl("p", { text: `${view.file.path}` });

	// Create the form element for user input
	const form = container.createEl("form");

	// Handle form submission to encrypt and save the note
	form.onsubmit = async (event) => {
		event.preventDefault();
		try {
			const currentTarget = event.currentTarget as HTMLFormElement;
			const privateKey = currentTarget["privatekey"].value;
			const filename = currentTarget["filename"].value;

			// Find the selected private key for encryption
			const index = view.plugin.keys.findIndex(
				(key) => key.id === privateKey
			);

			// If a valid key is found, proceed with encryption and renaming
			if (index !== -1) {
				view.clearText = "";
				view.publicKey = view.plugin.keys[index].armoredPublicKey;

				await view.encryptAndSave();

				// Rename the file to include the ".pgp" extension
				if (!view.file) throw new Error("File is not defined");
				const parent_path = view.file.parent?.path ?? "";
				const path = `${parent_path}/${filename}.pgp`;
				await view.file.vault.rename(view.file, path);

				// Switch to editing mode after successful encryption
				view.setView(ViewTypeEnum.EDIT_NOTE);
			}
		} catch (error) {
			new Notice(error); // Display any encountered errors as notifications
		}
	};

	// Create settings for filename input
	new Setting(form).setName("Filename").addText((text) => {
		text.inputEl.setAttr("name", "filename");
		text.setValue(view.getDisplayText()); // Set initial filename based on context
	});

	// Create settings for selecting encryption key
	new Setting(form)
		.setName("Encryption Key")
		.setDesc("Choose your encryption key to encrypt this note")
		.addDropdown((dropdown) => {
			dropdown.selectEl.setAttr("name", "privatekey");

			// Populate dropdown with available encryption keys
			if (view.plugin.keys.length === 0) {
				// Handle case where no keys are available
			} else {
				view.plugin.keys.forEach(async (key) => {
					dropdown.addOption(
						key.id,
						`${key.userId} (${formatKeyId(key.id)})`
					);
				});
			}
		});

	// Add buttons for deleting and submitting the note
	new Setting(form)
		.addButton((button) => {
			button.buttonEl.setAttr("type", "button");
			button.setButtonText("Remove");

			// Handle deletion of the current note
			button.onClick(async () => {
				await view.file?.vault.delete(view.file);
			});
		})
		.addButton((button) => {
			button.buttonEl.setAttr("type", "submit");
			button.setButtonText("OK");
		});
};

export default newNoteView;
