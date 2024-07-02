import { App, Modal, Notice, Setting, TextAreaComponent } from "obsidian";
import { OpenPGPHandler } from "services/openpgp";

export class UploadPublicKeyModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		let { contentEl, close } = this;

		// textarea to paste the private key
		contentEl.createEl("h1", { text: "Upload Public Key" });

		const form = contentEl.createEl("form");

		form.onsubmit = async (event) => {
			event.preventDefault();

			const currentTarget = event.currentTarget as HTMLFormElement;
			const publickey = currentTarget["publickey"].value;

			try {
				const handler = new OpenPGPHandler(publickey);
				await handler.init();
				const isPrivateKey = handler.isPrivateKey();

				const filename = handler.getId() + "_public.asc";

				if (isPrivateKey) {
					throw new Error("The key is not a public key");
				}

				// save the public key
				await this.app.vault.adapter.write(
					".pgp/" + filename,
					publickey
				);

				this.close();

				new Notice("Public key uploaded successfully");

				// close modal
			} catch (error) {
				new Notice(error.message);
			}

			return false;
		};

		const textarea = new TextAreaComponent(form);
		textarea.inputEl.name = "publickey";
		textarea.setPlaceholder("Paste your public key here");
		textarea.inputEl.addClass("noteshield-settings-textarea-key");

		new Setting(form)
			.addButton((button) => {
				button.setButtonText("Upload File");
				button.buttonEl.type = "button";

				button.onClick(async () => {
					const fileInput = document.createElement("input");
					fileInput.type = "file";

					fileInput.onchange = async (event) => {
						const target = event.target as HTMLInputElement;

						if (!target.files) {
							return;
						}
						const file = target.files[0];

						if (!file) {
							return;
						}

						const reader = new FileReader();
						reader.onload = async (event) => {
							if (event.target == null) {
								return;
							}

							const publicKey = event.target.result as string;

							if (publicKey.length > 10000) {
								new Notice("The file is too large");
								return;
							}

							textarea.setValue(publicKey);
						};

						reader.readAsText(file);
					};

					fileInput.click();
				});
			})
			.addButton((button) => {
				button.buttonEl.type = "submit";
				button.setButtonText("Upload");
			});
	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}
}
