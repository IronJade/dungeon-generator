import { DungeonContentType, MapStyle } from '../settings/settings';
import { Cell, Room } from '../types';

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
        const gridColor = this.mapStyle?.gridColor || '#cccccc';
        const textColor = this.mapStyle?.textColor || '#000000';
        const useColors = this.mapStyle?.useColors !== undefined ? this.mapStyle.useColors : true;
        const doorStyle = this.mapStyle?.doorStyle || 'line';
        
        // Create the SVG with a styled grid
        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">`;
        
        // Add a background
        svg += `<rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" fill="${floorColor}" />`;
        
        // Create a grid of cells, will fill with color for walls later
        const allCells: Cell[] = [];
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                allCells.push({
                    x: x * cellSize + padding,
                    y: y * cellSize + padding,
                    gridX: x,
                    gridY: y,
                    isWall: true, // By default, everything is a wall
                    isRoom: false,
                    roomId: null,  // Track if this cell belongs to a room
                    isDoor: false, // Track if this is a door
                    isHorizontalDoor: false,
                    isCorridorIntersection: false // Track corridor intersections
                });
            }
        }
        
        // First pass - mark rooms, corridors, and doors
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                if (grid[y][x]) {
                    // This is not a wall
                    const cellIndex = y * gridSize + x;
                    allCells[cellIndex].isWall = false;
                    
                    // Check if this belongs to a specific room
                    const room = rooms.find(r => r.x === x && r.y === y);
                    if (room) {
                        allCells[cellIndex].isRoom = true;
                        allCells[cellIndex].roomId = room.id;
                        allCells[cellIndex].roomType = room.contentType;
                    }
                    
                    // Check if this is a door
                    let isDoor = false;
                    let isHorizontalDoor = false;
                    
                    rooms.forEach(room => {
                        if (room.doors) {
                            room.doors.forEach(door => {
                                if (door.x === x && door.y === y) {
                                    isDoor = true;
                                    isHorizontalDoor = door.isHorizontal;
                                }
                            });
                        }
                    });
                    
                    if (isDoor) {
                        allCells[cellIndex].isDoor = true;
                        allCells[cellIndex].isHorizontalDoor = isHorizontalDoor;
                    }
                }
            }
        }
        
        // Second pass - identify corridor intersections
        for (let y = 1; y < gridSize - 1; y++) {
            for (let x = 1; x < gridSize - 1; x++) {
                const cellIndex = y * gridSize + x;
                
                // Skip walls and rooms
                if (allCells[cellIndex].isWall || allCells[cellIndex].isRoom) {
                    continue;
                }
                
                // Count adjacent corridor cells
                let adjacentCorridors = 0;
                
                // Check the four cardinal directions
                const adjacentIndices = [
                    (y - 1) * gridSize + x, // North
                    y * gridSize + (x + 1), // East
                    (y + 1) * gridSize + x, // South
                    y * gridSize + (x - 1)  // West
                ];
                
                for (const adjIndex of adjacentIndices) {
                    if (adjIndex >= 0 && adjIndex < allCells.length && 
                        !allCells[adjIndex].isWall && !allCells[adjIndex].isRoom) {
                        adjacentCorridors++;
                    }
                }
                
                // If this is connected to 3 or more corridors, it's an intersection
                if (adjacentCorridors >= 3) {
                    allCells[cellIndex].isCorridorIntersection = true;
                }
            }
        }
        
        // Draw all walls first
        svg += `<g fill="${wallColor}">`;
        allCells.forEach(cell => {
            if (cell.isWall) {
                svg += `<rect x="${cell.x}" y="${cell.y}" width="${cellSize}" height="${cellSize}" />`;
            }
        });
        svg += `</g>`;
        
        // If color-coding is enabled, add colored backgrounds for rooms based on content type
        if (useColors) {
            svg += `<g>`;
            allCells.forEach(cell => {
                if (!cell.isWall && cell.isRoom) {
                    const room = rooms.find(r => r.id === cell.roomId);
                    if (room) {
                        const roomColor = this.getRoomContentColor(room.contentType);
                        svg += `<rect x="${cell.x}" y="${cell.y}" width="${cellSize}" height="${cellSize}" fill="${roomColor}" opacity="0.3" />`;
                    }
                }
            });
            svg += `</g>`;
        }
        
        // Draw doors if enabled and if doors exist
        if (doorStyle !== 'none') {
            svg += `<g stroke="${wallColor}" stroke-width="${cellSize/4}" stroke-linecap="round">`;
            let doorsFound = false;
            
            allCells.forEach(cell => {
                if (cell.isDoor) {
                    doorsFound = true;
                    if (doorStyle === 'line') {
                        // Draw a line to represent door
                        if (cell.isHorizontalDoor) {
                            // Horizontal door (vertical line)
                            const lineX = cell.x + cellSize / 2;
                            svg += `<line x1="${lineX}" y1="${cell.y}" x2="${lineX}" y2="${cell.y + cellSize}" />`;
                        } else {
                            // Vertical door (horizontal line)
                            const lineY = cell.y + cellSize / 2;
                            svg += `<line x1="${cell.x}" y1="${lineY}" x2="${cell.x + cellSize}" y2="${lineY}" />`;
                        }
                    }
                    // For 'gap' style, we just leave the space open
                }
            });
            
            // If no doors were found, it could be because we haven't properly assigned door information
            // In this case, we can try to infer doors at room entrances
            if (!doorsFound && doorStyle === 'line') {
                // Look for cells that connect rooms to corridors
                for (let y = 0; y < gridSize; y++) {
                    for (let x = 0; x < gridSize; x++) {
                        const idx = y * gridSize + x;
                        if (allCells[idx].isWall || allCells[idx].isRoom) continue;
                        
                        // Check if this corridor cell is adjacent to a room
                        const directions = [
                            { dx: 0, dy: -1 }, // North
                            { dx: 1, dy: 0 },  // East
                            { dx: 0, dy: 1 },  // South
                            { dx: -1, dy: 0 }  // West
                        ];
                        
                        for (const dir of directions) {
                            const nx = x + dir.dx;
                            const ny = y + dir.dy;
                            
                            if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
                                const neighborIdx = ny * gridSize + nx;
                                if (neighborIdx >= 0 && neighborIdx < allCells.length && 
                                    !allCells[neighborIdx].isWall && allCells[neighborIdx].isRoom) {
                                    // This is a corridor cell adjacent to a room - add a door
                                    const isHorizontal = dir.dx !== 0;
                                    if (isHorizontal) {
                                        // Horizontal connection (vertical door)
                                        const lineX = allCells[idx].x + cellSize / 2;
                                        svg += `<line x1="${lineX}" y1="${allCells[idx].y}" x2="${lineX}" y2="${allCells[idx].y + cellSize}" />`;
                                    } else {
                                        // Vertical connection (horizontal door)
                                        const lineY = allCells[idx].y + cellSize / 2;
                                        svg += `<line x1="${allCells[idx].x}" y1="${lineY}" x2="${allCells[idx].x + cellSize}" y2="${lineY}" />`;
                                    }
                                    break;
                                }
                            }
                        }
                    }
                }
            }
            
            svg += `</g>`;
        }
        
        // Draw grid lines
        svg += `<g stroke="${gridColor}" stroke-width="0.5">`;
        for (let i = 0; i <= gridSize; i++) {
            // Vertical lines
            svg += `<line x1="${i * cellSize + padding}" y1="${padding}" x2="${i * cellSize + padding}" y2="${svgHeight - padding}" />`;
            // Horizontal lines
            svg += `<line x1="${padding}" y1="${i * cellSize + padding}" x2="${svgWidth - padding}" y2="${i * cellSize + padding}" />`;
        }
        svg += `</g>`;
        
        // Add room numbers
        svg += `<g font-family="Arial" font-size="${cellSize * 0.6}" text-anchor="middle" font-weight="bold" fill="${textColor}">`;
        rooms.forEach(room => {
            const x = room.x * cellSize + cellSize / 2 + padding;
            const y = room.y * cellSize + cellSize / 2 + padding + 5; // Small offset for better centering
            svg += `<text x="${x}" y="${y}">${room.id}</text>`;
        });
        svg += `</g>`;
        
        // Close SVG
        svg += `</svg>`;
        
        return svg;
    }

    private getRoomContentColor(contentType: DungeonContentType): string {
        // Return color based on content type for room highlighting
        switch (contentType) {
            case 'Empty': return '#ffffff';
            case 'Trap': return '#ff9999';
            case 'Minor Hazard': return '#ffcc99';
            case 'Solo Monster': return '#ffff99';
            case 'NPC': return '#99ff99';
            case 'Monster Mob': return '#99ccff';
            case 'Major Hazard': return '#ff99ff';
            case 'Treasure': return '#ffcc00';
            case 'Boss Monster': return '#ff6666';
            default: return '#ffffff';
        }
    }
}