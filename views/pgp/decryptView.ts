import { Notice, Setting } from "obsidian";
import { NoteShieldPGPView, NoteShieldPGPViewModeEnum, ViewTypeEnum } from ".";
import formatKeyId from "utils/formatKeyId";
import { OpenPGPHandler } from "services/openpgp";

/**
 * Function to handle the decryption view of a NoteShield PGP note.
 *
 * @param view - The NoteShield PGP view instance.
 * @param container - The HTML container element where the decryption UI will be rendered.
 */
const decryptView = async (view: NoteShieldPGPView, container: HTMLElement) => {
	const title = view.getDisplayText();
	const private_keys = view.plugin.keys.filter(
		(key) => key.armoredPrivateKey
	);

	// Display the title and description.
	container.createEl("h4", { text: `🔐 ${title}` });
	container.createEl("p", { text: `This note is encrypted with PGP` });

	// Create the decryption form.
	const form = container.createEl("form");

	// Handle form submission for decryption.
	form.onsubmit = async function (event) {
		event.preventDefault();

		const currentTarget = event.currentTarget as HTMLFormElement;
		const passphrase = currentTarget["passphrase"].value;
		const privateKey = currentTarget["privatekey"].value;

		try {
			const encryption = new OpenPGPHandler(privateKey);
			await encryption.init();

			if (!encryption.isPrivateKey()) {
				throw new Error("The key is not a private key");
			}

			const decryptedMessage = await encryption.decryptMessage(
				view.data,
				passphrase === "" ? undefined : passphrase
			);

			view.publicKey = encryption.getPublicArmoredKey();
			view.clearText = decryptedMessage as string;
			view.viewMode = NoteShieldPGPViewModeEnum.SOURCE;
			view.setView(ViewTypeEnum.EDIT_NOTE);
		} catch (error) {
            console.error(error);
			new Notice(error.message);
		}

		return false;
	};

	// Setting for selecting a private key.
	new Setting(form)
		.setName("Private key")
		.setDesc("Choose your private key to unlock the note")
		.addDropdown((dropdown) => {
			dropdown.selectEl.setAttr("name", "privatekey");
			dropdown.selectEl.setAttr("id", "privatekey");

			dropdown.addOption("", `Select a private key`);

			if (
				view.plugin.keys.filter(
					(key) =>
						key.armoredPrivateKey !== undefined &&
						key.armoredPrivateKey !== null
				).length === 0
			) {
				console.log("No private keys found");
				new Notice("No private keys found", 10000);
			} else {
				private_keys.map(async (key) => {
					if (key.armoredPrivateKey) {
						dropdown.addOption(
							key.armoredPrivateKey,
							`${key.userId} ${formatKeyId(key.id)}`
						);
					}
				});
			}
		})
		.addButton((button) => {
			button.buttonEl.type = "button";
			button.setIcon("upload").onClick((event) => {
				const input = document.getElementById("file-input");

				if (input) input.click();
			});
		});

	// Hidden file input for uploading a private key.
	form.createEl("input", {
		type: "file",
		attr: {
			id: "file-input",
			style: "display: none;",
		},
	}).addEventListener("change", async function (event) {
		if (this.files) {
			try {
				const privateKey = await this.files[0].text();

				const encryption = new OpenPGPHandler(privateKey);
				await encryption.init();

				if (!encryption.isPrivateKey())
					throw new Error("The key is not a private key");

				const keyId = encryption.getId();

				if (keyId) {
					const option = document.createElement("option");
					option.value = privateKey;
					option.textContent = keyId;

					const select = document.getElementById(
						"privatekey"
					) as HTMLSelectElement;

					if (select) select.appendChild(option);

					// Select the newly added key.
					select.value = privateKey;

					new Notice("Private key added", 10000);
				}
			} catch (err) {
				console.error(err);
				new Notice(err.message, 10000);
			}
		}
	});

	// Setting for entering the passphrase.
	new Setting(form)
		.setName("Passphrase")
		.setDesc("If a passphrase exists")
		.addText((text) => {
			text.inputEl.setAttr("name", "passphrase");
			text.inputEl.setAttr("id", "passphrase");
			text.inputEl.setAttr("type", "password");
			text.setPlaceholder("Your passphrase");
		});

	// Button to submit the form and unlock the note.
	new Setting(form).addButton((button) => {
		button.setButtonText("Unlock");
		button.buttonEl.type = "submit";
	});
};

export default decryptView;
