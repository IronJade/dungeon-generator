import { DungeonContentType, MapStyle } from '../settings/settings';
import { Cell, Room, Door, PathCoordinate } from '../types';

export class SvgGenerator {
    private readonly mapStyle: MapStyle;

    constructor(mapStyle: MapStyle) {
        this.mapStyle = mapStyle;
    }

    public generateSVG(rooms: Room[], grid: boolean[][], gridSize: number, cellSize: number): string {
        const padding = 10;
        const svgWidth = gridSize * cellSize + padding * 2;
        const svgHeight = gridSize * cellSize + padding * 2;
        
        // Get colors from settings
        const wallColor = this.mapStyle?.wallColor || '#4a9ebd';
        const floorColor = this.mapStyle?.floorColor || '#ffffff';
        const corridorColor = this.mapStyle?.corridorColor || '#cccccc'; // New color for corridors
        const gridColor = this.mapStyle?.gridColor || '#dddddd';
        const textColor = this.mapStyle?.textColor || '#000000';
        const useColors = this.mapStyle?.useColors !== undefined ? this.mapStyle.useColors : true;
        const doorStyle = this.mapStyle?.doorStyle || 'line';
        
        // Create the SVG with a styled grid
        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">`;
        
        // Add a background (dark background for dungeons)
        svg += `<rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" fill="#000000" />`;
        
        // Create cell mappings for easier cell-type identification
        const roomCells: Record<string, Room> = {};
        const corridorCells: Record<string, boolean> = {};
        const doorCells: Record<string, Door> = {};
        
        // Map room cells
        rooms.forEach(room => {
            for (let y = room.y; y < room.y + room.height; y++) {
                for (let x = room.x; x < room.x + room.width; x++) {
                    const key = `${x},${y}`;
                    roomCells[key] = room;
                }
            }
            
            // Map door cells
            if (room.doors) {
                room.doors.forEach(door => {
                    const key = `${door.x},${door.y}`;
                    doorCells[key] = door;
                });
            }
        });
        
        // Map corridor cells (exclude room cells and doors)
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                if (grid[y][x]) { // If the cell is "open" (not a wall)
                    const key = `${x},${y}`;
                    // If it's not a room cell and not a door, it's a corridor
                    if (!roomCells[key] && !doorCells[key]) {
                        corridorCells[key] = true;
                    }
                }
            }
        
            // Iterate through paths to rooms and draw corridors
            rooms.forEach(room => {
                if (room.pathsTo) {
                    room.pathsTo.forEach(pathInfo => {
                        // Draw the corridor path
                        pathInfo.path.forEach(coord => {
                            const key = `${coord.x},${coord.y}`;
                            if (!roomCells[key] && !doorCells[key]) {
                                corridorCells[key] = true;
                            }
                        });
                    });
                }
            });
        }
        
        // Draw corridors with corridor color
        svg += `<g>`;
        Object.keys(corridorCells).forEach(key => {
            const [x, y] = key.split(',').map(Number);
            svg += `<rect x="${x * cellSize + padding}" y="${y * cellSize + padding}" 
                         width="${cellSize}" height="${cellSize}" 
                         fill="${corridorColor}" />`;
        });
        svg += `</g>`;
        
        // Draw room floors with color coding
        if (useColors) {
            svg += `<g>`;
            rooms.forEach(room => {
                const roomColor = this.getRoomContentColor(room.contentType);
                // Draw the entire room area
                svg += `<rect x="${room.x * cellSize + padding}" y="${room.y * cellSize + padding}" 
                         width="${room.width * cellSize}" height="${room.height * cellSize}" 
                         fill="${roomColor}" />`;
            });
            svg += `</g>`;
        } else {
            // If not using color coding, just draw all rooms with floor color
            svg += `<g>`;
            rooms.forEach(room => {
                svg += `<rect x="${room.x * cellSize + padding}" y="${room.y * cellSize + padding}" 
                         width="${room.width * cellSize}" height="${room.height * cellSize}" 
                         fill="${floorColor}" />`;
            });
            svg += `</g>`;
        }
        
        // Draw doors
        if (doorStyle !== 'none') {
            svg += `<g>`;
            Object.entries(doorCells).forEach(([key, door]) => {
                const [x, y] = key.split(',').map(Number);
                
                if (doorStyle === 'line') {
                    // Draw doors as gaps in the walls
                    svg += `<rect x="${x * cellSize + padding}" y="${y * cellSize + padding}" 
                             width="${cellSize}" height="${cellSize}" 
                             fill="${corridorColor}" />`;
                    
                    // Draw a door line
                    if (door.isHorizontal) {
                        // Horizontal door (on top/bottom of room) - draw horizontal line
                        const lineY = y * cellSize + cellSize / 2 + padding;
                        const lineX1 = x * cellSize + padding;
                        const lineX2 = lineX1 + cellSize;
                        svg += `<line x1="${lineX1}" y1="${lineY}" x2="${lineX2}" y2="${lineY}" 
                                 stroke="${wallColor}" stroke-width="2" />`;
                    } else {
                        // Vertical door (on left/right of room) - draw vertical line
                        const lineX = x * cellSize + cellSize / 2 + padding;
                        const lineY1 = y * cellSize + padding;
                        const lineY2 = lineY1 + cellSize;
                        svg += `<line x1="${lineX}" y1="${lineY1}" x2="${lineX}" y2="${lineY2}" 
                                 stroke="${wallColor}" stroke-width="2" />`;
                    }
                } else if (doorStyle === 'gap') {
                    // For gap style, we just color the door cell like a corridor
                    svg += `<rect x="${x * cellSize + padding}" y="${y * cellSize + padding}" 
                             width="${cellSize}" height="${cellSize}" 
                             fill="${corridorColor}" />`;
                }
            });
            svg += `</g>`;
        }
        
        // Draw grid lines if enabled
        if (this.mapStyle?.showGrid !== false) {
            svg += `<g stroke="${gridColor}" stroke-width="0.5">`;
            for (let i = 0; i <= gridSize; i++) {
                // Vertical lines
                svg += `<line x1="${i * cellSize + padding}" y1="${padding}" x2="${i * cellSize + padding}" y2="${svgHeight - padding}" />`;
                // Horizontal lines
                svg += `<line x1="${padding}" y1="${i * cellSize + padding}" x2="${svgWidth - padding}" y2="${i * cellSize + padding}" />`;
            }
            svg += `</g>`;
        }
        
        // Draw walls (all cells that are not rooms, corridors, or doors)
        svg += `<g>`;
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                const key = `${x},${y}`;
                if (!grid[y][x] && !doorCells[key]) { // If it's a wall (not open) and not a door
                    svg += `<rect x="${x * cellSize + padding}" y="${y * cellSize + padding}" width="${cellSize}" height="${cellSize}" fill="${wallColor}" />`;
                }
            }
        }
        svg += `</g>`;
        
        // Add room numbers
        svg += `<g font-family="Arial" font-size="${cellSize * 0.6}" text-anchor="middle" font-weight="bold" fill="${textColor}">`;
        rooms.forEach(room => {
            // Calculate center of the room
            const centerX = room.x * cellSize + (room.width * cellSize) / 2 + padding;
            const centerY = room.y * cellSize + (room.height * cellSize) / 2 + padding + 5; // Small offset for better centering
            svg += `<text x="${centerX}" y="${centerY}">${room.id}</text>`;
        });
        svg += `</g>`;
        
        // Close SVG
        svg += `</svg>`;
        
        return svg;
    }

    private getRoomContentColor(contentType: DungeonContentType): string {
        // Return color based on content type for room highlighting
        switch (contentType) {
            case 'Empty': return '#aaaaaa'; // Light gray
            case 'Trap': return '#ff9999';  // Light red
            case 'Minor Hazard': return '#ffcc99'; // Light orange
            case 'Solo Monster': return '#ffff99'; // Light yellow
            case 'NPC': return '#99ff99'; // Light green
            case 'Monster Mob': return '#99ccff'; // Light blue
            case 'Major Hazard': return '#ff99ff'; // Light purple
            case 'Treasure': return '#ffcc00'; // Gold
            case 'Boss Monster': return '#ff6666'; // Red
            default: return '#aaaaaa'; // Light gray
        }
    }
}