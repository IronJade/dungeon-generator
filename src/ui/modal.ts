import { App, Modal, Notice, Setting, MarkdownView, Editor } from 'obsidian';
import { DungeonGeneratorPlugin } from '../main';
import { DungeonSize, DungeonType } from '../settings/settings';
import { GeneratedDungeon } from '../types';

export class DungeonGeneratorModal extends Modal {
    private plugin: DungeonGeneratorPlugin;
    private dungeonType: DungeonType;
    private size: DungeonSize;
    private generatedDungeon: GeneratedDungeon | null;

    constructor(app: App, plugin: DungeonGeneratorPlugin) {
        super(app);
        this.plugin = plugin;
        this.dungeonType = plugin.settings.defaultDungeonType;
        this.size = 'Medium';
        this.generatedDungeon = null;
    }

    onOpen(): void {
        const {contentEl} = this;
        contentEl.empty();
        
        // Apply modern styling to the modal
        contentEl.addClass('dungeon-generator-modal');
        
        // Title with better styling
        contentEl.createEl('h2', {
            text: 'Generate Dungeon',
            cls: 'dungeon-generator-title'
        });
        
        // Container for settings
        const settingsContainer = contentEl.createDiv('dungeon-settings-container');
        settingsContainer.style.marginBottom = '20px';
        settingsContainer.style.padding = '15px';
        settingsContainer.style.backgroundColor = 'var(--background-secondary)';
        settingsContainer.style.borderRadius = '5px';
        
        // Dungeon Type Selection
        new Setting(settingsContainer)
            .setName('Dungeon Type')
            .setDesc('Select the type of dungeon to generate')
            .addDropdown(dropdown => {
                const dungeonTypes = Object.keys(this.plugin.settings.dungeonTypes) as DungeonType[];
                
                dungeonTypes.forEach(type => {
                    dropdown.addOption(type, this.plugin.settings.dungeonTypes[type].name);
                });
                
                dropdown.setValue(this.dungeonType);
                dropdown.onChange(value => {
                    this.dungeonType = value as DungeonType;
                });
            });
        
        // Size Selection
        new Setting(settingsContainer)
            .setName('Size')
            .setDesc('Select the size of the dungeon')
            .addDropdown(dropdown => {
                dropdown.addOption('Small', 'Small (5-8 rooms)');
                dropdown.addOption('Medium', 'Medium (8-12 rooms)');
                dropdown.addOption('Large', 'Large (12-20 rooms)');
                
                dropdown.setValue(this.size);
                dropdown.onChange(value => {
                    this.size = value as DungeonSize;
                });
            });
        
        // Generate Button with better styling
        const generateButtonContainer = contentEl.createDiv('generate-button-container');
        generateButtonContainer.style.textAlign = 'center';
        generateButtonContainer.style.marginBottom = '20px';
        
        const generateButton = generateButtonContainer.createEl('button', {
            text: 'Generate Dungeon',
            cls: 'mod-cta'
        });
        generateButton.style.padding = '8px 16px';
        generateButton.style.fontSize = '1.1em';
        
        generateButton.addEventListener('click', () => {
            this.generateDungeon();
        });
        
        // Preview Container with better styling
        const previewContainer = contentEl.createDiv({
            cls: 'dungeon-preview-container',
            attr: {'id': 'dungeon-preview'}
        });
        previewContainer.style.display = 'none'; // Hide initially
        previewContainer.style.maxHeight = '500px';
        previewContainer.style.overflow = 'auto';
        previewContainer.style.textAlign = 'center';
        previewContainer.style.padding = '15px';
        previewContainer.style.backgroundColor = 'var(--background-secondary)';
        previewContainer.style.borderRadius = '5px';
        previewContainer.style.marginBottom = '20px';
        
        // Insert/Regenerate Buttons (initially hidden)
        const buttonContainer = contentEl.createDiv({
            cls: 'dungeon-buttons-container',
            attr: {'id': 'insert-button-container'}
        });
        buttonContainer.style.display = 'none'; // Hide initially
        buttonContainer.style.textAlign = 'center';
        buttonContainer.style.gap = '10px';
        
        const buttonRow = buttonContainer.createDiv('button-row');
        buttonRow.style.display = 'flex';
        buttonRow.style.justifyContent = 'center';
        buttonRow.style.gap = '10px';
        
        const insertButton = buttonRow.createEl('button', {
            text: 'Insert into Note',
            cls: 'mod-cta'
        });
        insertButton.style.padding = '8px 16px';
        
        insertButton.addEventListener('click', () => {
            this.insertDungeonIntoNote();
        });
        
        const regenerateButton = buttonRow.createEl('button', {
            text: 'Regenerate',
            cls: ''
        });
        regenerateButton.style.padding = '8px 16px';
        
        regenerateButton.addEventListener('click', () => {
            this.generateDungeon();
        });
    }

    generateDungeon(): void {
        const options = {
            dungeonType: this.dungeonType,
            size: this.size
        };
        
        // Show loading state
        const previewContainer = document.getElementById('dungeon-preview');
        if (previewContainer) {
            previewContainer.style.display = 'block';
            previewContainer.innerHTML = '<div style="padding: 30px; text-align: center;">Generating dungeon...</div>';
        }
        
        // Generate the dungeon
        this.generatedDungeon = this.plugin.generateDungeon(options);
        
        // Display preview
        if (previewContainer) {
            previewContainer.innerHTML = '';
            previewContainer.innerHTML = this.generatedDungeon.svg;
        }
        
        // Add a title above the SVG
        const dungeonTitle = document.createElement('h3');
        dungeonTitle.textContent = `${this.plugin.settings.dungeonTypes[this.dungeonType].name} - ${this.size}`;
        dungeonTitle.style.marginBottom = '10px';
        
        if (previewContainer && previewContainer.firstChild) {
            previewContainer.insertBefore(dungeonTitle, previewContainer.firstChild);
        }
        
        // Show buttons
        const buttonContainer = document.getElementById('insert-button-container');
        if (buttonContainer) {
            buttonContainer.style.display = 'block';
        }
    }

    insertDungeonIntoNote(): void {
        if (!this.generatedDungeon) return;
        
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView) {
            const editor = activeView.editor;
            
            // Create the content to insert
            const dungeonContent = `
## ${this.plugin.settings.dungeonTypes[this.dungeonType].name} Dungeon (${this.size})

${this.generatedDungeon.svg}

${this.generatedDungeon.guide}
`;
            
            // Insert at cursor position
            editor.replaceRange(dungeonContent, editor.getCursor());
            
            // Show success message
            new Notice('Dungeon inserted into note');
            
            // Close the modal
            this.close();
        } else {
            new Notice('No active markdown editor found');
        }
    }

    onClose(): void {
        const {contentEl} = this;
        contentEl.empty();
    }
}