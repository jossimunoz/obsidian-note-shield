/**
 * Formats a Key ID
 * @param keyId The Key ID to format.
 * @returns The formatted Key ID.
 */
export default function formatKeyId(keyId: string): string {
    // Divide the Key ID into groups of 4 characters using a regular expression
    const keyIdGroups = keyId.match(/.{1,4}/g);

    if (!keyIdGroups) return "Invalid";

    const formattedKeyId = keyIdGroups.join(" ");
    const uppercaseKeyId = formattedKeyId.toUpperCase();
    return uppercaseKeyId;
}
