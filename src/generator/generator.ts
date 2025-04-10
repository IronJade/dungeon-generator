import { 
    DungeonGeneratorSettings, 
    DungeonSize, 
    DungeonContentType, 
    DungeonTypeConfig 
} from '../settings/settings';
import { 
    Room,
    SizeConfig,
    GeneratedDungeon,
    DungeonOptions,
    Direction,
    PathCoordinate,
    PotentialConnection,
    RoomShape
} from '../types';
import { SvgGenerator } from './svg';
import { GuideGenerator } from './guide';

export class DungeonGenerator {
    private settings: DungeonGeneratorSettings;
    private svgGenerator: SvgGenerator;
    private guideGenerator: GuideGenerator;
    
    constructor(settings: DungeonGeneratorSettings) {
        this.settings = settings;
        this.svgGenerator = new SvgGenerator(settings.mapStyle);
        this.guideGenerator = new GuideGenerator();
    }

    public generateDungeon(options: DungeonOptions): GeneratedDungeon {
        const dungeonType = this.settings.dungeonTypes[options.dungeonType];
        const sizeConfig = this.getSizeConfig(options.size);
        
        // Generate rooms
        const rooms: Room[] = [];
        let numRooms = sizeConfig.minRooms + Math.floor(Math.random() * (sizeConfig.maxRooms - sizeConfig.minRooms));
        
        // Ensure we have at least 3 rooms for a meaningful dungeon
        numRooms = Math.max(numRooms, 3);
        
        // Create initial grid-based layout with all walls
        const gridSize = sizeConfig.gridSize;
        const grid: boolean[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(false));
        
        // Generate rooms with variable sizes
        this.generateVariableSizedRooms(rooms, grid, gridSize, numRooms, dungeonType, options.size);
        
        // Connect rooms with proper hallways
        this.connectRoomsWithHallways(rooms, grid, gridSize);
        
        // Place doors at appropriate locations
        this.placeDoors(rooms, grid);
        
        // Post-process the grid to ensure hallways connect properly and remove dead ends
        this.cleanupGrid(grid, rooms, gridSize);
        
        // Generate SVG representation
        const svg = this.svgGenerator.generateSVG(rooms, grid, gridSize, sizeConfig.cellSize);
        
        // Generate DM guide
        const guide = this.guideGenerator.generateGuide(rooms, dungeonType.name);
        
        return {
            rooms: rooms,
            svg: svg,
            guide: guide
        };
    }
    
    private getSizeConfig(size: DungeonSize): SizeConfig {
        switch (size) {
            case 'Small':
                return { minRooms: 5, maxRooms: 8, gridSize: 24, cellSize: 20 };
            case 'Medium':
                return { minRooms: 8, maxRooms: 12, gridSize: 32, cellSize: 16 };
            case 'Large':
                return { minRooms: 12, maxRooms: 20, gridSize: 48, cellSize: 12 };
            default:
                return { minRooms: 8, maxRooms: 12, gridSize: 32, cellSize: 16 };
        }
    }

    /**
     * Generate rooms with variable sizes and different shapes
     */
    private generateVariableSizedRooms(
        rooms: Room[], 
        grid: boolean[][], 
        gridSize: number, 
        numRooms: number, 
        dungeonType: DungeonTypeConfig, 
        size: DungeonSize
    ): void {
        // Define possible room shapes and sizes
        const roomShapes: RoomShape[] = [
            { name: 'small-square', width: 2, height: 2, probability: 0.25 },
            { name: 'medium-square', width: 3, height: 3, probability: 0.2 },
            { name: 'large-square', width: 4, height: 4, probability: 0.1 },
            { name: 'small-rectangle-h', width: 3, height: 2, probability: 0.15 },
            { name: 'medium-rectangle-h', width: 4, height: 3, probability: 0.1 },
            { name: 'small-rectangle-v', width: 2, height: 3, probability: 0.15 },
            { name: 'medium-rectangle-v', width: 3, height: 4, probability: 0.05 }
        ];
        
        // Add rooms with different shapes and sizes
        for (let i = 0; i < numRooms; i++) {
            // Try to place a room up to 50 attempts
            let attempts = 0;
            let placed = false;
            
            while (!placed && attempts < 50) {
                attempts++;
                
                // Select a random room shape based on probabilities
                const shape = this.selectRandomRoomShape(roomShapes);
                const width = shape.width;
                const height = shape.height;
                
                // Ensure padding from grid edges
                const maxX = gridSize - width - 3;
                const maxY = gridSize - height - 3;
                const minPadding = 3; // Minimum padding from edges
                
                // Pick a random position with padding from edges
                const x = Math.floor(Math.random() * (maxX - minPadding)) + minPadding;
                const y = Math.floor(Math.random() * (maxY - minPadding)) + minPadding;
                
                // Check if the entire room area + buffer is free
                if (this.isAreaFree(grid, x, y, width, height, 2)) {
                    // Mark the room area as occupied
                    for (let dy = 0; dy < height; dy++) {
                        for (let dx = 0; dx < width; dx++) {
                            grid[y + dy][x + dx] = true;
                        }
                    }
                    
                    // Create the room
                    const room: Room = {
                        id: i + 1,
                        x: x,
                        y: y,
                        width: width,
                        height: height,
                        connections: [],
                        type: this.getRandomElement(dungeonType.possibleRooms),
                        content: '',
                        contentType: 'Empty',
                        shape: shape.name,
                        doors: [],
                        pathsTo: []
                    };
                    
                    // Add room content based on probabilities
                    room.contentType = this.determineRoomContent(size);
                    room.content = this.getRoomContentByType(room.contentType, dungeonType);
                    
                    // Ensure boss monsters and treasures are fairly distributed
                    if (room.contentType === 'Boss Monster' && rooms.some(r => r.contentType === 'Boss Monster')) {
                        // Don't allow too many boss monsters for small dungeons
                        if (numRooms < 8 || Math.random() < 0.7) {
                            room.contentType = 'Monster Mob';
                            room.content = this.getRandomElement(dungeonType.possibleMonsterMobs);
                        }
                    }
                    
                    rooms.push(room);
                    placed = true;
                }
            }
            
            // If we couldn't place after 50 attempts, stop adding more rooms
            if (!placed) {
                break;
            }
        }
    }
    
    /**
     * Select a random room shape based on probabilities
     */
    private selectRandomRoomShape(shapes: RoomShape[]): RoomShape {
        // Calculate total probability
        const totalProb = shapes.reduce((sum, shape) => sum + shape.probability, 0);
        
        // Random value between 0 and total probability
        const rand = Math.random() * totalProb;
        
        // Find the selected shape
        let cumulativeProb = 0;
        for (const shape of shapes) {
            cumulativeProb += shape.probability;
            if (rand <= cumulativeProb) {
                return shape;
            }
        }
        
        // Fallback to first shape
        return shapes[0];
    }
    
    /**
     * Check if an area in the grid is free (including a buffer zone)
     */
    private isAreaFree(grid: boolean[][], x: number, y: number, width: number, height: number, buffer: number): boolean {
        // Check the area of the room plus a buffer zone around it
        for (let dy = -buffer; dy < height + buffer; dy++) {
            for (let dx = -buffer; dx < width + buffer; dx++) {
                const checkX = x + dx;
                const checkY = y + dy;
                
                // Skip checks outside the grid
                if (checkX < 0 || checkY < 0 || checkX >= grid[0].length || checkY >= grid.length) {
                    continue;
                }
                
                // If any cell is already occupied, the area is not free
                if (grid[checkY][checkX]) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Connect rooms with proper hallways
     */
    private connectRoomsWithHallways(rooms: Room[], grid: boolean[][], gridSize: number): void {
        // Ensure we have rooms to connect
        if (rooms.length <= 1) return;
        
        // Create a minimum spanning tree to ensure all rooms are connected
        const connected = new Set<number>([0]); // Start with the first room
        const unconnected = new Set<number>(rooms.map((_, i) => i).filter(i => i !== 0));
        
        // Connect all rooms
        while (unconnected.size > 0) {
            let bestDistance = Infinity;
            let bestConnectedRoom = -1;
            let bestUnconnectedRoom = -1;
            let bestPath: PathCoordinate[] = [];
            
            // Find the closest pair of rooms between connected and unconnected sets
            for (const connectedIdx of connected) {
                const connectedRoom = rooms[connectedIdx];
                
                for (const unconnectedIdx of unconnected) {
                    const unconnectedRoom = rooms[unconnectedIdx];
                    
                    // Calculate the best path between these rooms
                    const path = this.findBestPath(connectedRoom, unconnectedRoom, grid, gridSize);
                    
                    // Calculate the path length
                    const pathLength = path.length;
                    
                    // If this is the shortest path so far, remember it
                    if (pathLength < bestDistance) {
                        bestDistance = pathLength;
                        bestConnectedRoom = connectedIdx;
                        bestUnconnectedRoom = unconnectedIdx;
                        bestPath = path;
                    }
                }
            }
            
            // Add the connection
            if (bestConnectedRoom !== -1 && bestUnconnectedRoom !== -1) {
                const room1 = rooms[bestConnectedRoom];
                const room2 = rooms[bestUnconnectedRoom];
                
                room1.connections.push(room2.id);
                room2.connections.push(room1.id);
                
                // Mark the path on the grid
                this.markPathOnGrid(bestPath, grid);
                
                // Store path information
                if (!room1.pathsTo) room1.pathsTo = [];
                if (!room2.pathsTo) room2.pathsTo = [];
                
                room1.pathsTo.push({
                    roomId: room2.id,
                    path: bestPath
                });
                
                room2.pathsTo.push({
                    roomId: room1.id,
                    path: bestPath
                });
                
                // Update sets
                connected.add(bestUnconnectedRoom);
                unconnected.delete(bestUnconnectedRoom);
            }
        }
        
        // Add a few extra connections for loops (about 20% more connections)
        const extraConnections = Math.floor(rooms.length * 0.2) + 1;
        
        for (let i = 0; i < extraConnections; i++) {
            // Find two rooms that are close but not connected yet
            let bestDistance = Infinity;
            let bestRoom1 = -1;
            let bestRoom2 = -1;
            let bestPath: PathCoordinate[] = [];
            
            // Try all pairs of rooms
            for (let r1 = 0; r1 < rooms.length; r1++) {
                for (let r2 = r1 + 1; r2 < rooms.length; r2++) {
                    // Skip if already connected
                    if (rooms[r1].connections.includes(rooms[r2].id)) {
                        continue;
                    }
                    
                    // Find the best path
                    const path = this.findBestPath(rooms[r1], rooms[r2], grid, gridSize);
                    const pathLength = path.length;
                    
                    // If this is the shortest valid path so far, remember it
                    if (pathLength < bestDistance && pathLength < 15) { // Limit the distance for extra connections
                        bestDistance = pathLength;
                        bestRoom1 = r1;
                        bestRoom2 = r2;
                        bestPath = path;
                    }
                }
            }
            
            // If we found a good pair, connect them
            if (bestRoom1 !== -1 && bestRoom2 !== -1) {
                const room1 = rooms[bestRoom1];
                const room2 = rooms[bestRoom2];
                
                room1.connections.push(room2.id);
                room2.connections.push(room1.id);
                
                // Mark the path on the grid
                this.markPathOnGrid(bestPath, grid);
                
                // Store path information
                if (!room1.pathsTo) room1.pathsTo = [];
                if (!room2.pathsTo) room2.pathsTo = [];
                
                room1.pathsTo.push({
                    roomId: room2.id,
                    path: bestPath
                });
                
                room2.pathsTo.push({
                    roomId: room1.id,
                    path: bestPath
                });
            }
        }
    }
    
    /**
     * Find the best path between two rooms
     */
    private findBestPath(room1: Room, room2: Room, grid: boolean[][], gridSize: number): PathCoordinate[] {
        // Find potential exit points from each room
        const exits1 = this.findPotentialExits(room1, grid, gridSize);
        const exits2 = this.findPotentialExits(room2, grid, gridSize);
        
        let bestPath: PathCoordinate[] = [];
        let bestDistance = Infinity;
        
        // Try all combinations of exits to find the shortest path
        for (const exit1 of exits1) {
            for (const exit2 of exits2) {
                // Generate a path from exit1 to exit2
                const path = this.generatePathBetweenPoints(exit1, exit2, grid, gridSize);
                
                // If this is the shortest path so far, remember it
                if (path.length < bestDistance) {
                    bestDistance = path.length;
                    bestPath = path;
                }
            }
        }
        
        return bestPath;
    }
    
    /**
     * Find potential exit points from a room
     */
    private findPotentialExits(room: Room, grid: boolean[][], gridSize: number): PathCoordinate[] {
        const exits: PathCoordinate[] = [];
        
        // Check all four sides of the room for potential exits
        
        // Top side
        for (let x = room.x; x < room.x + room.width; x++) {
            const y = room.y - 1;
            if (y >= 0 && !grid[y][x]) {
                exits.push({ x, y, isDoor: false });
            }
        }
        
        // Bottom side
        for (let x = room.x; x < room.x + room.width; x++) {
            const y = room.y + room.height;
            if (y < gridSize && !grid[y][x]) {
                exits.push({ x, y, isDoor: false });
            }
        }
        
        // Left side
        for (let y = room.y; y < room.y + room.height; y++) {
            const x = room.x - 1;
            if (x >= 0 && !grid[y][x]) {
                exits.push({ x, y, isDoor: false });
            }
        }
        
        // Right side
        for (let y = room.y; y < room.y + room.height; y++) {
            const x = room.x + room.width;
            if (x < gridSize && !grid[y][x]) {
                exits.push({ x, y, isDoor: false });
            }
        }
        
        // If no exits found, try corners as a fallback
        if (exits.length === 0) {
            // Top-left corner
            if (room.x > 0 && room.y > 0 && !grid[room.y - 1][room.x - 1]) {
                exits.push({ x: room.x - 1, y: room.y - 1, isDoor: false });
            }
            
            // Top-right corner
            if (room.x + room.width < gridSize && room.y > 0 && !grid[room.y - 1][room.x + room.width]) {
                exits.push({ x: room.x + room.width, y: room.y - 1, isDoor: false });
            }
            
            // Bottom-left corner
            if (room.x > 0 && room.y + room.height < gridSize && !grid[room.y + room.height][room.x - 1]) {
                exits.push({ x: room.x - 1, y: room.y + room.height, isDoor: false });
            }
            
            // Bottom-right corner
            if (room.x + room.width < gridSize && room.y + room.height < gridSize && !grid[room.y + room.height][room.x + room.width]) {
                exits.push({ x: room.x + room.width, y: room.y + room.height, isDoor: false });
            }
        }
        
        return exits;
    }
    
    /**
     * Generate a path between two points using A* pathfinding algorithm
     */
    private generatePathBetweenPoints(start: PathCoordinate, end: PathCoordinate, grid: boolean[][], gridSize: number): PathCoordinate[] {
        // Implementation of A* pathfinding
        // For simplicity, we'll use a basic L-shaped path for now
        const path: PathCoordinate[] = [];
        
        // Decide whether to go horizontal first or vertical first (randomly)
        const goHorizontalFirst = Math.random() > 0.5;
        
        if (goHorizontalFirst) {
            // Go horizontal first
            let x = start.x;
            while (x !== end.x) {
                x += x < end.x ? 1 : -1;
                path.push({ x, y: start.y, isDoor: false });
            }
            
            // Then go vertical
            let y = start.y;
            while (y !== end.y) {
                y += y < end.y ? 1 : -1;
                path.push({ x: end.x, y, isDoor: false });
            }
        } else {
            // Go vertical first
            let y = start.y;
            while (y !== end.y) {
                y += y < end.y ? 1 : -1;
                path.push({ x: start.x, y, isDoor: false });
            }
            
            // Then go horizontal
            let x = start.x;
            while (x !== end.x) {
                x += x < end.x ? 1 : -1;
                path.push({ x, y: end.y, isDoor: false });
            }
        }
        
        return path;
    }
    
    /**
     * Mark a path on the grid
     */
    private markPathOnGrid(path: PathCoordinate[], grid: boolean[][]): void {
        path.forEach(coord => {
            if (coord.x >= 0 && coord.x < grid[0].length && coord.y >= 0 && coord.y < grid.length) {
                grid[coord.y][coord.x] = true;
            }
        });
    }
    
    /**
     * Place doors at appropriate hallway-room junctions
     */
    private placeDoors(rooms: Room[], grid: boolean[][]): void {
        // Go through each room's pathsTo entries to place doors
        rooms.forEach(room => {
            if (!room.pathsTo) return;
            
            room.pathsTo.forEach(pathInfo => {
                const targetRoom = rooms.find(r => r.id === pathInfo.roomId);
                if (!targetRoom) return;
                
                // Find the cells where the path meets the room (potential door locations)
                const doorLocations = this.findDoorLocations(room, targetRoom, pathInfo.path, grid);
                
                // Add doors if valid locations found
                if (doorLocations.length > 0) {
                    // Use the first valid door location (closest to the path start)
                    const doorLocation = doorLocations[0];
                    
                    // Determine if this door is horizontal or vertical
                    const isHorizontal = this.isDoorHorizontal(doorLocation, room);
                    
                    // Add the door to the room
                    if (!room.doors) room.doors = [];
                    room.doors.push({
                        x: doorLocation.x,
                        y: doorLocation.y,
                        isHorizontal: isHorizontal,
                        connectsTo: targetRoom.id
                    });
                    
                    // Also add the door to the target room
                    if (!targetRoom.doors) targetRoom.doors = [];
                    if (!targetRoom.doors.some(d => d.x === doorLocation.x && d.y === doorLocation.y)) {
                        targetRoom.doors.push({
                            x: doorLocation.x,
                            y: doorLocation.y,
                            isHorizontal: isHorizontal,
                            connectsTo: room.id
                        });
                    }
                    
                    // Mark this coordinate as a door
                    doorLocation.isDoor = true;
                }
            });
        });
    }
    
    /**
     * Find valid door locations between a room and a path
     */
    private findDoorLocations(room1: Room, room2: Room, path: PathCoordinate[], grid: boolean[][]): PathCoordinate[] {
        const doorLocations: PathCoordinate[] = [];
        
        // Check each path coordinate to see if it's adjacent to the room
        for (const coord of path) {
            // Check if this coordinate is adjacent to room1
            if (this.isAdjacentToRoom(coord, room1)) {
                doorLocations.push(coord);
                break; // We found a door location for room1
            }
        }
        
        // Check from the other end of the path for room2
        for (let i = path.length - 1; i >= 0; i--) {
            const coord = path[i];
            // Check if this coordinate is adjacent to room2
            if (this.isAdjacentToRoom(coord, room2)) {
                doorLocations.push(coord);
                break; // We found a door location for room2
            }
        }
        
        return doorLocations;
    }
    
    /**
     * Check if a coordinate is adjacent to a room
     */
    private isAdjacentToRoom(coord: PathCoordinate, room: Room): boolean {
        // Check if the coordinate is adjacent to the room's edge
        
        // Top edge
        if (coord.y === room.y - 1 && coord.x >= room.x && coord.x < room.x + room.width) {
            return true;
        }
        
        // Bottom edge
        if (coord.y === room.y + room.height && coord.x >= room.x && coord.x < room.x + room.width) {
            return true;
        }
        
        // Left edge
        if (coord.x === room.x - 1 && coord.y >= room.y && coord.y < room.y + room.height) {
            return true;
        }
        
        // Right edge
        if (coord.x === room.x + room.width && coord.y >= room.y && coord.y < room.y + room.height) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Determine if a door is horizontal (on top/bottom edge) or vertical (on left/right edge)
     */
    private isDoorHorizontal(doorLocation: PathCoordinate, room: Room): boolean {
        // Check if the door is on the top or bottom edge
        return (doorLocation.y === room.y - 1 || doorLocation.y === room.y + room.height);
    }
    
    /**
     * Clean up the grid to eliminate dead-end corridors and fix intersections
     */
    private cleanupGrid(grid: boolean[][], rooms: Room[], gridSize: number): void {
        // First, identify all corridor cells (not room cells)
        const corridorCells: {x: number, y: number}[] = [];
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                if (!grid[y][x]) continue; // Skip walls
                
                // Check if this is a room
                const isRoom = rooms.some(r => 
                    x >= r.x && x < r.x + r.width && 
                    y >= r.y && y < r.y + r.height
                );
                
                if (!isRoom) {
                    corridorCells.push({ x, y });
                }
            }
        }
        
        // Directions for checking adjacency
        const directions: Direction[] = [
            { dx: 0, dy: -1 }, // North
            { dx: 1, dy: 0 },  // East
            { dx: 0, dy: 1 },  // South
            { dx: -1, dy: 0 }  // West
        ];
        
        // Identify dead-end corridors
        let madeChanges = true;
        let iterations = 0;
        const maxIterations = 10; // Limit to prevent infinite loops
        
        while (madeChanges && iterations < maxIterations) {
            madeChanges = false;
            iterations++;
            
            // Check each corridor cell
            for (let i = corridorCells.length - 1; i >= 0; i--) {
                const cell = corridorCells[i];
                
                // Count adjacent open cells
                let adjacentOpenCells = 0;
                let adjacentRooms = 0;
                let isDoorCell = false;
                
                // Check if this is a door cell
                rooms.forEach(room => {
                    if (room.doors) {
                        if (room.doors.some(door => door.x === cell.x && door.y === cell.y)) {
                            isDoorCell = true;
                        }
                    }
                });
                
                // If it's a door, don't remove it
                if (isDoorCell) continue;
                
                // Check adjacent cells
                for (const dir of directions) {
                    const nx = cell.x + dir.dx;
                    const ny = cell.y + dir.dy;
                    
                    if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
                        if (grid[ny][nx]) {
                            adjacentOpenCells++;
                            
                            // Check if adjacent cell is a room
                            const isAdjacentRoom = rooms.some(r => 
                                nx >= r.x && nx < r.x + r.width && 
                                ny >= r.y && ny < r.y + r.height
                            );
                            
                            if (isAdjacentRoom) {
                                adjacentRooms++;
                            }
                        }
                    }
                }
                
                // If this is a dead-end corridor (only one connection) and not leading to a room, remove it
                if (adjacentOpenCells <= 1 && adjacentRooms === 0) {
                    grid[cell.y][cell.x] = false; // Convert to wall
                    corridorCells.splice(i, 1); // Remove from corridor cells
                    madeChanges = true;
                }
            }
        }
    }

    private determineRoomContent(size: DungeonSize): DungeonContentType {
        // Probabilities for different content types
        const probabilityTable: Record<DungeonContentType, number> = {
            'Empty': 15,
            'Trap': 10,
            'Minor Hazard': 15,
            'Solo Monster': 10,
            'NPC': 10,
            'Monster Mob': 15,
            'Major Hazard': 5,
            'Treasure': 15,
            'Boss Monster': size === 'Small' ? 5 : (size === 'Medium' ? 3 : 2) // Less common in bigger dungeons
        };
        
        // Convert to cumulative probabilities
        const contentTypes = Object.keys(probabilityTable) as DungeonContentType[];
        const probabilities = Object.values(probabilityTable);
        
        let sum = 0;
        const cumulativeProbabilities = probabilities.map(p => (sum += p));
        
        // Random roll
        const roll = Math.random() * sum;
        
        // Find the corresponding content type
        for (let i = 0; i < contentTypes.length; i++) {
            if (roll < cumulativeProbabilities[i]) {
                return contentTypes[i];
            }
        }
        
        return 'Empty';
    }

    private getRoomContentByType(contentType: DungeonContentType, dungeonType: DungeonTypeConfig): string {
        switch (contentType) {
            case 'Trap':
                return this.getRandomElement(dungeonType.possibleTraps);
            case 'Minor Hazard':
                return this.getRandomElement(dungeonType.possibleMinorHazards);
            case 'Solo Monster':
                return this.getRandomElement(dungeonType.possibleSoloMonsters);
            case 'NPC':
                return this.getRandomElement(dungeonType.possibleNPCs);
            case 'Monster Mob':
                return this.getRandomElement(dungeonType.possibleMonsterMobs);
            case 'Major Hazard':
                return this.getRandomElement(dungeonType.possibleMajorHazards);
            case 'Treasure':
                return this.getRandomElement(dungeonType.possibleTreasures);
            case 'Boss Monster':
                return this.getRandomElement(dungeonType.possibleBossMonsters);
            default:
                return 'Empty room';
        }
    }

    private getRandomElement<T>(array: T[]): T {
        return array[Math.floor(Math.random() * array.length)];
    }
}