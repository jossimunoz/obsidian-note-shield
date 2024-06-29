import { App, Modal, PluginSettingTab, Setting } from "obsidian";
import NoteShieldPlugin from "main";
import formatKeyId from "utils/formatKeyId";
import createKey from "./createKey";
import { UploadPrivateKeyModal } from "./modals/uploadPrivatekey";
import { OpenPGPHandler } from "../services/openpgp";
import { UploadPublicKeyModal } from "./modals/uploadPublickey";

/**
 * Class representing the settings tab for the NoteShield plugin.
 */
export class NoteShieldSettingTab extends PluginSettingTab {
    plugin: NoteShieldPlugin;

    /**
     * Constructor for the settings tab.
     *
     * @param app - The Obsidian application instance.
     * @param plugin - The NoteShield plugin instance.
     */
    constructor(app: App, plugin: NoteShieldPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    /**
     * Display the settings tab content.
     */
    async display(): Promise<void> {
        let { containerEl } = this;

        // Clear the container element.
        containerEl.empty();

        // Create the main header.
        containerEl.createEl("h1", { text: "Note Shield's Settings" });

        // Create key section.
        createKey(this, containerEl);

        // Upload section header.
        containerEl.createEl("h4", { text: "Upload your keys" });

        // Setting for uploading a private key.
        new Setting(containerEl)
            .setName("Private key")
            .setDesc(
                "Add your private key to unlock your notes. This key will be used to decrypt your notes."
            )
            .addButton((button) => {
                button.setButtonText("Add");
                button.onClick(async () => {
                    new UploadPrivateKeyModal(this).open();
                });
            });

        // Setting for uploading a public key.
        new Setting(containerEl)
            .setName("Public key")
            .setDesc("Add a public key to encrypt a note.")
            .addButton((button) => {
                button.setButtonText("Add");
                button.onClick(async () => {
                    new UploadPublicKeyModal(this.app).open();
                });
            });

        // Section for displaying the user's keys.
        containerEl.createEl("h4", { text: "My keys" });

        // Check if the PGP folder exists in the vault.
        const existsPGPFolder = await this.app.vault.adapter.exists(".pgp");

        if (existsPGPFolder) {
            const { files } = await this.app.vault.adapter.list(".pgp");

            for await (const file of files) {
                const key = await this.app.vault.adapter.read(file);

                const handler = new OpenPGPHandler(key);
                await handler.init();

                new Setting(containerEl)
                    .setName(handler.getUserId() || "Unknown")
                    .setDesc(
                        (handler.isPrivateKey() ? "PRIVATE: " : "PUBLIC: ") +
                            (formatKeyId(handler.getId()) || "Unknown")
                    )
                    .addButton((button) => {
                        button.setButtonText("Remove");
                        button.onClick(async () => {
                            if (!confirm("Are you sure to remove this key?")) {
                                return;
                            }

                            await this.app.vault.adapter.remove(file);
                            await this.display();
                        });
                    })
                    .addButton((button) => {
                        button.setButtonText("Download");
                        button.onClick(async () => {
                            const blob = new Blob([key], {
                                type: "text/plain",
                            });
                            const url = URL.createObjectURL(blob);

                            const a = document.createElement("a");
                            a.href = url;
                            a.download =
                                handler.getId() +
                                (handler.isPrivateKey()
                                    ? "_private"
                                    : "_public") +
                                ".asc";

                            a.click();
                        });
                    });
            }
        } else {
            new Setting(containerEl)
                .setName("No keys found")
                .setDesc("You can add your keys by clicking the button above");
        }
    }
}
