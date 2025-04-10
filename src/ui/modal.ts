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
        
        contentEl.createEl('h2', {text: 'Generate Dungeon'});
        
        // Dungeon Type Selection
        new Setting(contentEl)
            .setName('Dungeon Type')
            .setDesc('Select the type of dungeon to generate')
            .addDropdown(dropdown => {
                const dungeonTypes = Object.keys(this.plugin.settings.dungeonTypes) as DungeonType[];
                
                dungeonTypes.forEach(type => {
                    dropdown.addOption(type, type);
                });
                
                dropdown.setValue(this.dungeonType);
                dropdown.onChange(value => {
                    this.dungeonType = value as DungeonType;
                });
            });
        
        // Size Selection
        new Setting(contentEl)
            .setName('Size')
            .setDesc('Select the size of the dungeon')
            .addDropdown(dropdown => {
                dropdown.addOption('Small', 'Small');
                dropdown.addOption('Medium', 'Medium');
                dropdown.addOption('Large', 'Large');
                
                dropdown.setValue(this.size);
                dropdown.onChange(value => {
                    this.size = value as DungeonSize;
                });
            });
        
        // Generate Button
        new Setting(contentEl)
            .addButton(button => {
                button
                    .setButtonText('Generate')
                    .setCta()
                    .onClick(() => {
                        this.generateDungeon();
                    });
            });
        
        // Preview Container
        contentEl.createEl('div', {attr: {'id': 'dungeon-preview'}});
        
        // Insert Button (initially hidden)
        const insertButtonContainer = contentEl.createEl('div', {attr: {'id': 'insert-button-container', 'style': 'display: none;'}});
        
        new Setting(insertButtonContainer)
            .addButton(button => {
                button
                    .setButtonText('Insert into Note')
                    .setCta()
                    .onClick(() => {
                        this.insertDungeonIntoNote();
                    });
            })
            .addButton(button => {
                button
                    .setButtonText('Regenerate')
                    .onClick(() => {
                        this.generateDungeon();
                    });
            });
    }

    generateDungeon(): void {
        const options = {
            dungeonType: this.dungeonType,
            size: this.size
        };
        
        this.generatedDungeon = this.plugin.generateDungeon(options);
        
        // Display preview
        const previewContainer = document.getElementById('dungeon-preview');
        if (previewContainer) {
            previewContainer.innerHTML = '';
            previewContainer.innerHTML = this.generatedDungeon.svg;
            
            // Show insert button
            const insertButtonContainer = document.getElementById('insert-button-container');
            if (insertButtonContainer) {
                insertButtonContainer.style.display = 'block';
            }
        }
    }

    insertDungeonIntoNote(): void {
        if (!this.generatedDungeon) return;
        
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView) {
            const editor = activeView.editor;
            
            // Create the content to insert - embed SVG with base64 encoding
            const timestamp = Date.now();
            const filename = `dungeon-map-${timestamp}.svg`;
            
            // First, create a markdown section with the embedded image and guide
            const dungeonContent = `
## Dungeon Map
![Dungeon Map](data:image/svg+xml;base64,${btoa(this.generatedDungeon.svg)})

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