import { Modal, Notice, Setting, TextAreaComponent } from "obsidian";
import { OpenPGPHandler } from "services/openpgp";
import { NoteShieldSettingTab } from "setting";

export class UploadPrivateKeyModal extends Modal {
	setting: NoteShieldSettingTab;

	constructor(setting: NoteShieldSettingTab) {
		super(setting.app);

		this.setting = setting;
	}

	onOpen() {
		let { contentEl, close } = this;

		// textarea to paste the priavte key
		contentEl.createEl("h1", { text: "Upload Private Key" });

		const form = contentEl.createEl("form");

		form.onsubmit = async (event) => {
			event.preventDefault();

			const currentTarget = event.currentTarget as HTMLFormElement;
			const privateKey = currentTarget["privatekey"].value;

			try {
				const handler = new OpenPGPHandler(privateKey);
				await handler.init();
				const isPrivateKey = handler.isPrivateKey();

				const filename = handler.getId() + "_secret.asc";

				if (!isPrivateKey) {
					throw new Error("The key is not a private key");
				}

				// save the private key
				await this.app.vault.adapter.write(
					".pgp/" + filename,
					privateKey
				);

				this.close();

				this.setting.display();

				new Notice("Private key uploaded successfully");

				// close modal
			} catch (error) {
				new Notice(error.message);
			}

			return false;
		};

		const textarea = new TextAreaComponent(form);
		textarea.inputEl.name = "privatekey";
		textarea.setPlaceholder("Paste your private key here");
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

							const privateKey = event.target.result as string;

							if (privateKey.length > 10000) {
								new Notice("The file is too large");
								return;
							}

							textarea.setValue(privateKey);
						};

						reader.readAsText(file);
					};

					fileInput.click();
				});
			})
			.addButton((button) => {
				button.buttonEl.type = "submit";
				button.setButtonText("Save");
			});
	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}
}
