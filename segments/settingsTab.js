const { PluginSettingTab, Setting } = require('obsidian');

class DungeonGeneratorSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const {containerEl} = this;

        containerEl.empty();

        containerEl.createEl('h2', {text: 'Dungeon Generator Settings'});

        // Map Style Settings
        containerEl.createEl('h3', {text: 'Map Style'});
        
        // Wall color
        new Setting(containerEl)
            .setName('Wall Color')
            .setDesc('The color of walls and obstacles')
            .addText(text => {
                text.setPlaceholder('#4a9ebd')
                    .setValue(this.plugin.settings.mapStyle?.wallColor || '#4a9ebd')
                    .onChange(async (value) => {
                        if (!this.plugin.settings.mapStyle) {
                            this.plugin.settings.mapStyle = {};
                        }
                        this.plugin.settings.mapStyle.wallColor = value;
                        await this.plugin.saveSettings();
                    });
                
                // Add a color picker if supported
                if (typeof text.inputEl.type === 'string') {
                    try {
                        text.inputEl.type = 'color';
                    } catch (e) {
                        // If browser doesn't support color input, keep as text
                    }
                }
            });
            
        // Floor color
        new Setting(containerEl)
            .setName('Floor Color')
            .setDesc('The color of open floor spaces')
            .addText(text => {
                text.setPlaceholder('#ffffff')
                    .setValue(this.plugin.settings.mapStyle?.floorColor || '#ffffff')
                    .onChange(async (value) => {
                        if (!this.plugin.settings.mapStyle) {
                            this.plugin.settings.mapStyle = {};
                        }
                        this.plugin.settings.mapStyle.floorColor = value;
                        await this.plugin.saveSettings();
                    });
                
                // Add a color picker if supported
                if (typeof text.inputEl.type === 'string') {
                    try {
                        text.inputEl.type = 'color';
                    } catch (e) {
                        // If browser doesn't support color input, keep as text
                    }
                }
            });
            
        // Grid color
        new Setting(containerEl)
            .setName('Grid Color')
            .setDesc('The color of grid lines')
            .addText(text => {
                text.setPlaceholder('#cccccc')
                    .setValue(this.plugin.settings.mapStyle?.gridColor || '#cccccc')
                    .onChange(async (value) => {
                        if (!this.plugin.settings.mapStyle) {
                            this.plugin.settings.mapStyle = {};
                        }
                        this.plugin.settings.mapStyle.gridColor = value;
                        await this.plugin.saveSettings();
                    });
                
                // Add a color picker if supported
                if (typeof text.inputEl.type === 'string') {
                    try {
                        text.inputEl.type = 'color';
                    } catch (e) {
                        // If browser doesn't support color input, keep as text
                    }
                }
            });
            
        // Text color
        new Setting(containerEl)
            .setName('Text Color')
            .setDesc('The color of room numbers and labels')
            .addText(text => {
                text.setPlaceholder('#000000')
                    .setValue(this.plugin.settings.mapStyle?.textColor || '#000000')
                    .onChange(async (value) => {
                        if (!this.plugin.settings.mapStyle) {
                            this.plugin.settings.mapStyle = {};
                        }
                        this.plugin.settings.mapStyle.textColor = value;
                        await this.plugin.saveSettings();
                    });
                
                // Add a color picker if supported
                if (typeof text.inputEl.type === 'string') {
                    try {
                        text.inputEl.type = 'color';
                    } catch (e) {
                        // If browser doesn't support color input, keep as text
                    }
                }
            });
            
        // Use color-coding
        new Setting(containerEl)
            .setName('Use Color-Coding')
            .setDesc('Color-code rooms based on their content type')
            .addToggle(toggle => {
                toggle.setValue(this.plugin.settings.mapStyle?.useColors !== undefined ? 
                               this.plugin.settings.mapStyle.useColors : true)
                    .onChange(async (value) => {
                        if (!this.plugin.settings.mapStyle) {
                            this.plugin.settings.mapStyle = {};
                        }
                        this.plugin.settings.mapStyle.useColors = value;
                        await this.plugin.saveSettings();
                    });
            });
            
        // Door style
        new Setting(containerEl)
            .setName('Door Style')
            .setDesc('How to represent doors between rooms')
            .addDropdown(dropdown => {
                dropdown.addOption('line', 'Line');
                dropdown.addOption('gap', 'Gap');
                dropdown.addOption('none', 'None');
                
                dropdown.setValue(this.plugin.settings.mapStyle?.doorStyle || 'line');
                dropdown.onChange(async (value) => {
                    if (!this.plugin.settings.mapStyle) {
                        this.plugin.settings.mapStyle = {};
                    }
                    this.plugin.settings.mapStyle.doorStyle = value;
                    await this.plugin.saveSettings();
                });
            });

        // Default dungeon type
        containerEl.createEl('h3', {text: 'Dungeon Content'});
        
        new Setting(containerEl)
            .setName('Default Dungeon Type')
            .setDesc('The default dungeon type when opening the generator')
            .addDropdown(dropdown => {
                const dungeonTypes = Object.keys(this.plugin.settings.dungeonTypes);
                
                dungeonTypes.forEach(type => {
                    dropdown.addOption(type, type);
                });
                
                dropdown.setValue(this.plugin.settings.defaultDungeonType);
                dropdown.onChange(async (value) => {
                    this.plugin.settings.defaultDungeonType = value;
                    await this.plugin.saveSettings();
                });
            });

        // For each dungeon type, add a section
        Object.keys(this.plugin.settings.dungeonTypes).forEach(typeKey => {
            const dungeonType = this.plugin.settings.dungeonTypes[typeKey];
            
            containerEl.createEl('h3', {text: `${dungeonType.name} Settings`});
            
            this.addListSetting(containerEl, dungeonType, 'possibleRooms', 'Room Types', 'Types of rooms that can appear in this dungeon');
            this.addListSetting(containerEl, dungeonType, 'possibleTraps', 'Traps', 'Traps that can appear in this dungeon');
            this.addListSetting(containerEl, dungeonType, 'possibleMinorHazards', 'Minor Hazards', 'Minor hazards that can appear in this dungeon');
            this.addListSetting(containerEl, dungeonType, 'possibleSoloMonsters', 'Solo Monsters', 'Solo monsters that can appear in this dungeon');
            this.addListSetting(containerEl, dungeonType, 'possibleNPCs', 'NPCs', 'NPCs that can appear in this dungeon');
            this.addListSetting(containerEl, dungeonType, 'possibleMonsterMobs', 'Monster Mobs', 'Groups of monsters that can appear in this dungeon');
            this.addListSetting(containerEl, dungeonType, 'possibleMajorHazards', 'Major Hazards', 'Major hazards that can appear in this dungeon');
            this.addListSetting(containerEl, dungeonType, 'possibleTreasures', 'Treasures', 'Treasures that can appear in this dungeon');
            this.addListSetting(containerEl, dungeonType, 'possibleBossMonsters', 'Boss Monsters', 'Boss monsters that can appear in this dungeon');
        });
    }

    addListSetting(containerEl, dungeonType, property, name, desc) {
        const setting = new Setting(containerEl)
            .setName(name)
            .setDesc(desc);
        
        // Current list display
        const listEl = containerEl.createEl('div', {
            cls: 'dungeon-generator-list',
            attr: { style: 'margin: 10px 0; padding: 10px; border: 1px solid #ccc; border-radius: 5px;' }
        });
        
        // Function to update list display
        const updateList = () => {
            listEl.empty();
            
            const items = dungeonType[property];
            
            if (items.length === 0) {
                listEl.createEl('div', {text: 'No items yet'});
                return;
            }
            
            const itemsList = listEl.createEl('ul', {
                attr: { style: 'list-style-type: none; padding: 0; margin: 0;' }
            });
            
            items.forEach((item, index) => {
                const itemRow = itemsList.createEl('li', {
                    attr: { style: 'display: flex; justify-content: space-between; align-items: center; margin: 5px 0;' }
                });
                
                itemRow.createEl('span', {text: item});
                
                const buttonsContainer = itemRow.createEl('div');
                
                // Edit button
                const editBtn = buttonsContainer.createEl('button', {
                    text: 'Edit',
                    attr: {
                        style: 'margin-right: 5px; padding: 2px 5px;',
                        type: 'button'
                    }
                });
                
                editBtn.addEventListener('click', () => {
                    const newValue = prompt('Edit item:', item);
                    if (newValue && newValue.trim() !== '') {
                        const items = dungeonType[property];
                        items[index] = newValue.trim();
                        this.plugin.saveSettings();
                        updateList();
                    }
                });
                
                // Delete button
                const deleteBtn = buttonsContainer.createEl('button', {
                    text: 'Delete',
                    attr: {
                        style: 'padding: 2px 5px;',
                        type: 'button'
                    }
                });
                
                deleteBtn.addEventListener('click', () => {
                    const items = dungeonType[property];
                    items.splice(index, 1);
                    this.plugin.saveSettings();
                    updateList();
                });
            });
        };
        
        // Add button
        setting.addButton(button => {
            button
                .setButtonText('Add')
                .onClick(() => {
                    const newValue = prompt('Enter new item:');
                    if (newValue && newValue.trim() !== '') {
                        const items = dungeonType[property];
                        items.push(newValue.trim());
                        this.plugin.saveSettings();
                        updateList();
                    }
                });
        });
        
        // Initialize list display
        updateList();
    }
}

module.exports = { DungeonGeneratorSettingTab };