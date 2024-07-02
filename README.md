# Obsidian Note Shield Plugin

The Obsidian Note Shield plugin is a powerful tool that enhances the security and privacy of your Obsidian notes. With this plugin, you can encrypt and password-protect your sensitive notes, ensuring that only authorized individuals can access them.

## Features

- **Note Encryption**: Encrypt your notes using strong encryption algorithms to keep them secure.
- **Passphrase Protection**: Secure your private key with a passphrase, adding an extra layer of security.
- **Selective Encryption**: Choose which notes to encrypt, giving you control over which ones require additional protection.
- **Easy Decryption**: Decrypt your notes effortlessly whenever you need to access them.
- **Intuitive Interface**: The plugin provides a user-friendly interface for managing encrypted notes.


### Generate a Private Key
![Generate a Private Key](/images/generate_keys.gif)

### Encrypt a note
![encrypt a note](/images/encrypt.gif)

### Copy encrypted message to clipboard
![Copy encrypted message to clipboard](/images/copy_encrypted_message.gif)



## Installation

1. Open your Obsidian vault.
2. Go to the "Community Plugins" tab in the settings.
3. Search for "Note Shield" and click "Install" to add the plugin to your vault.

## Usage

1. **Initial Setup**:
    - Once installed, go to **Settings > Community Plugins > Note Shield**.
    - Create a private key to encrypt your notes.
    - You can also add existing private and public keys.
2. **Encrypting Notes**:
    - Ensure you have public keys for encryption and private keys for decryption.
    - In Obsidian, use the button on the left sidebar to create a quick encrypted note.
    - Select the key you want to use for that note.
3. **Creating Encrypted Notes in Folders**:

    - Right-click on a folder and select the option to create a note within that folder.

4. **Decrypting Notes**:
    - To decrypt a note, select the encrypted note and use the corresponding private key.

Please note that if you forget the password for an encrypted note, it cannot be recovered. Make sure to keep your passwords safe and secure.

## Feedback and Support

If you have any questions, feedback, or need assistance with the Obsidian Note Shield plugin, please visit the [plugin's GitHub repository](https://github.com/jossimunoz/obsidian-note-shield) for more information.


## Credits

- Special thanks to the developers of [OpenPGP.js](https://github.com/openpgpjs/openpgpjs) for their excellent library, which has been instrumental in this project. 
- Additionally, I would like to acknowledge [Tejado](https://github.com/tejado) for the inspiration provided by their [obsidian-gpgCrypt plugin](https://github.com/tejado/obsidian-gpgCrypt). Their work has been a significant influence on the development of this project.
