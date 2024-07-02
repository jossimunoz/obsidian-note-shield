import { Notice, Setting } from "obsidian";
import { NoteShieldSettingTab } from ".";
import { algorithmList, Algorithm } from "services/openpgp";
import { OpenPGPHandler } from "services/openpgp";

interface CreateKeyData {
	algorithm: Algorithm;
	passphrase: null | string;
	expire: string;
	email: string;
	name: string;
	save: boolean;
}

const createKey = (setting: NoteShieldSettingTab, containerEl: HTMLElement) => {
	containerEl.createEl("h4", { text: "Create a key" });

	const data: CreateKeyData = {
		algorithm: algorithmList[0].value,
		passphrase: null,
		email: "",
		name: "",
		expire: "0",
		save: false,
	};

	new Setting(containerEl)
		.setName("Encryption Algorithm")
		.setDesc("Choose the encryption algorithm to use.")
		.addDropdown((dp) => {
			algorithmList.map((o) => dp.addOption(o.value, o.display));

			dp.setValue(data.algorithm);

			dp.onChange((value: Algorithm) => {
				data.algorithm = value;
			});
		});
	new Setting(containerEl)
		.setName("Email")
		.setDesc("Your email address.")
		.addText((text) => {
			text.onChange((value) => {
				data.email = value;
			});
		});
	new Setting(containerEl)
		.setName("Name")
		.setDesc("Your name.")
		.addText((text) => {
			text.onChange((value) => {
				data.name = value;
			});
		});

	new Setting(containerEl)
		.setName("Passphrase")

		.setDesc("Optional: Set a passphrase to protect your private key.")
		.addText((text) => {
			text.inputEl.setAttr("type", "password");
			text.onChange((value) => {
				data.passphrase = value;
			});
		});

	new Setting(containerEl)
		.setName("Expire")
		.setDesc("Please specify how long the key should be valid.")
		.addDropdown((dropdown) => {
			dropdown.addOption("0", "Never"); // 0 seconds
			dropdown.addOption("31536000", "1 year"); // 1 year = 365 days * 24 hours * 60 minutes * 60 seconds
			dropdown.addOption("15768000", "6 months"); // 6 months = 182.5 days * 24 hours * 60 minutes * 60 seconds
			dropdown.addOption("7884000", "3 months"); // 3 months = 91.25 days * 24 hours * 60 minutes * 60 seconds
			dropdown.addOption("2628000", "1 month"); // 1 month = 30.44 days * 24 hours * 60 minutes * 60 seconds
			dropdown.addOption("604800", "1 week"); // 1 week = 7 days * 24 hours * 60 minutes * 60 seconds
			dropdown.addOption("86400", "1 day"); // 1 day = 24 hours * 60 minutes * 60 seconds

			dropdown.onChange((value) => {
				data.expire = value;
			});
		});

	new Setting(containerEl)
		.setName("Save your private key in obsidian")
		.setDesc(
			"Store your private key securely for easy access. Enhance security and convenience by enabling this option. Consider adding a passphrase for additional protection."
		)
		.addToggle((toggle) => {
			toggle.setValue(data.save);
			toggle.onChange((toggle) => {
				data.save = toggle;
			});
		});

	new Setting(containerEl).addButton((button) => {
		button.setButtonText("Create").onClick(async (e) => {
			try {
				if (data.email === "" || data.name === "") {
					throw new Error(
						"Please fill in your name and email address."
					);
				}

				// Do something with the collected data

				const handler = new OpenPGPHandler();
				const { privateKey, publicKey } = await handler.generateKey(
					data
				);

				await handler.init();

				await setting.plugin.saveKeys({
					publicKey: publicKey,
					privateKey: data.save ? privateKey : undefined,
				});

				// download the private key

				const blob = new Blob([privateKey], {
					type: "text/plain",
				});

				const url = URL.createObjectURL(blob);

				const a = document.createElement("a");
				a.href = url;
				a.download = handler.getId() + "_private.asc";

				a.click();

				setting.hide();
				setting.display();
			} catch (error) {
				new Notice("An error occurred: " + error.message);
			}
		});
	});
};

export default createKey;
