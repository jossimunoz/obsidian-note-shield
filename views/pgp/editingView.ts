import { getIcon } from "obsidian";
import { NoteShieldPGPView } from ".";

/**
 * Renders an editing view for an encrypted note.
 * @param view - The NoteShieldPGPView instance representing the note.
 * @param container - The HTML container to render the editing view into.
 */
const editingView = async (view: NoteShieldPGPView, container: HTMLElement) => {
	// Add a header to indicate editing mode with an icon
	view.addHeader(container, "Editing an encrypted note", getIcon("code"));

	// Add 'lock' action if it hasn't been added yet
	if (!view.actions.includes("lock_note")) {
		view.actions.push("lock_note");
		view.addAction("lock", "Lock", () => view.lockNote());
	}

	// Build the editor container for source view
	const editorContainer = container.createDiv({
		cls: "editor-source-view", // CSS class for styling purposes
	});
	editorContainer.spellcheck = true; // Enable spell checking
	editorContainer.autocapitalize = "on"; // Enable auto-capitalization
	editorContainer.translate = false; // Disable translation (if applicable)
	editorContainer.contentEditable = "true"; // Enable content editing
	editorContainer.innerText = view.clearText; // Set initial content to clear text

	editorContainer.focus(); // Set focus on the editor container

	// Event listener for input changes in the editor container
	editorContainer.on("input", "*", async (ev, target) => {
		view.clearText = editorContainer.innerText; // Update clear text with editor content
		await view.encryptAndSave(); // Encrypt and save the updated content
	});
};

export default editingView;
