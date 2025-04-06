# Obsidian Dungeon Generator Plugin

This plugin for Obsidian allows you to quickly generate customizable dungeon layouts for your tabletop RPG sessions. It creates visual maps with accompanying GM guides to make running impromptu adventures easier.

## Features

- Generate dungeon maps with a single click
- Choose from different dungeon types: Cave, Tomb, Deep Tunnels, or Ruins
- Select dungeon size: Small, Medium, or Large
- Automatically populates rooms with:
  - Traps
  - Hazards (minor and major)
  - Monsters (solo, mobs, and bosses)
  - NPCs
  - Treasure
- Color-coded rooms for easy reference
- Numbered rooms with GM guide
- Customizable content lists for each dungeon type
- Option to regenerate if the first layout doesn't meet your needs

## How to Use

1. Click the d20 dice icon in the ribbon or use the command palette to open the generator
2. Select your dungeon type and size
3. Click "Generate" to create your dungeon
4. Review the generated dungeon map in the modal
5. Click "Insert into Note" to add the dungeon to your current note
6. If you don't like the result, click "Regenerate" for a new layout

## Game Master Guide

The plugin creates a markdown document with:

- A visual SVG map with numbered rooms
- Color-coded rooms to indicate content types
- A detailed legend explaining what each color represents
- Room-by-room descriptions
- Suggested descriptions for each room
- Connection information showing how rooms link together

## Customization

You can customize the available content for each dungeon type in the plugin settings:

- Room types
- Traps
- Minor hazards
- Solo monsters
- NPCs
- Monster mobs
- Major hazards
- Treasures
- Boss monsters

## Installation

### From Community Plugins
1. In Obsidian, go to Settings > Community Plugins
2. Disable Safe Mode
3. Click "Browse" and search for "Dungeon Generator"
4. Install the plugin and enable it

### Manual Installation
1. Download the latest release from the GitHub repository
2. Create a new folder called `dungeon-generator` in your Obsidian vault's `.obsidian/plugins/` directory
3. Extract the following files into that folder:
   - main.js
   - manifest.json
   - styles.css
   - defaults.js
   - dungeonGenerator.js
   - modal.js
   - settingsTab.js
4. Restart Obsidian
5. Enable the plugin in Settings > Community Plugins

## For Developers

This plugin is written in vanilla JavaScript, making it easy to modify without compilation steps. The code structure is organized into modular components:

- `main.js`: The main plugin file that initializes everything
- `defaults.js`: Contains default settings and dungeon content
- `dungeonGenerator.js`: Core logic for generating dungeon layouts
- `modal.js`: The UI for dungeon generation
- `settingsTab.js`: Settings interface for customization

## Feedback and Support

If you encounter any issues or have suggestions for improvements, please visit the [GitHub repository](https://github.com/yourusername/obsidian-dungeon-generator) to submit an issue.

## License

This plugin is licensed under the MIT License.