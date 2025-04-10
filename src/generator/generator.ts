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
    PotentialConnection
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
        
        // Create initial grid-based layout
        const gridSize = sizeConfig.gridSize;
        const grid: boolean[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(false));
        
        // Place rooms with a minimum distance between them to allow for corridors
        for (let i = 0; i < numRooms; i++) {
            // Try to find a valid position
            let attempts = 0;
            let placed = false;
            
            while (!placed && attempts < 100) {
                attempts++;
                
                // Pick a random position with some padding from the edges
                const x = Math.floor(Math.random() * (gridSize - 6)) + 3;
                const y = Math.floor(Math.random() * (gridSize - 6)) + 3;
                
                // Check if position is free and not too close to other rooms
                if (!grid[y][x]) {
                    // Check surrounding area to ensure rooms aren't too close
                    let tooClose = false;
                    const minDistance = 2; // Minimum distance between rooms
                    
                    for (const existingRoom of rooms) {
                        const dx = Math.abs(existingRoom.x - x);
                        const dy = Math.abs(existingRoom.y - y);
                        if (dx < minDistance && dy < minDistance) {
                            tooClose = true;
                            break;
                        }
                    }
                    
                    if (!tooClose) {
                        // Mark as occupied
                        grid[y][x] = true;
                        
                        // Create room
                        const room: Room = {
                            id: i + 1,
                            x: x,
                            y: y,
                            width: 1,
                            height: 1,
                            connections: [],
                            type: this.getRandomElement(dungeonType.possibleRooms),
                            content: '',
                            contentType: 'Empty'
                        };
                        
                        // Add room content based on probabilities
                        room.contentType = this.determineRoomContent(options.size);
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
            }
            
            // If we couldn't place after 100 attempts, stop adding rooms
            if (!placed) {
                break;
            }
        }
        
        // Connect rooms to form a connected graph
        this.connectRooms(rooms, grid, gridSize);
        
        // Verify all rooms are connected
        const roomIdSet = new Set(rooms.map(room => room.id));
        const connectedRooms = new Set([rooms[0].id]);
        
        let changeMade = true;
        while (changeMade && connectedRooms.size < roomIdSet.size) {
            changeMade = false;
            for (const room of rooms) {
                if (!connectedRooms.has(room.id)) {
                    continue;
                }
                
                for (const connectedId of room.connections) {
                    if (!connectedRooms.has(connectedId)) {
                        connectedRooms.add(connectedId);
                        changeMade = true;
                    }
                }
            }
        }
        
        // If some rooms are not connected, connect them forcefully
        if (connectedRooms.size < roomIdSet.size) {
            for (const room of rooms) {
                if (!connectedRooms.has(room.id)) {
                    // Find the closest already-connected room
                    let closestRoom: Room | null = null;
                    let minDistance = Infinity;
                    
                    for (const connectedRoom of rooms) {
                        if (connectedRooms.has(connectedRoom.id)) {
                            const distance = Math.abs(room.x - connectedRoom.x) + Math.abs(room.y - connectedRoom.y);
                            if (distance < minDistance) {
                                minDistance = distance;
                                closestRoom = connectedRoom;
                            }
                        }
                    }
                    
                    if (closestRoom) {
                        // Connect the isolated room
                        room.connections.push(closestRoom.id);
                        closestRoom.connections.push(room.id);
                        this.createPath(room, closestRoom, grid);
                        connectedRooms.add(room.id);
                    }
                }
            }
        }
        
        // Post-process the grid to ensure hallways connect properly
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
                return { minRooms: 5, maxRooms: 8, gridSize: 8, cellSize: 30 };
            case 'Medium':
                return { minRooms: 8, maxRooms: 12, gridSize: 12, cellSize: 25 };
            case 'Large':
                return { minRooms: 12, maxRooms: 20, gridSize: 16, cellSize: 20 };
            default:
                return { minRooms: 8, maxRooms: 12, gridSize: 12, cellSize: 25 };
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

    private connectRooms(rooms: Room[], grid: boolean[][], gridSize: number): void {
        // Using a minimum spanning tree algorithm to ensure all rooms are connected
        if (rooms.length <= 1) return;
        
        // Start with a single room in the connected set (preferably a big central room)
        let startRoomIndex = 0;
        
        // Try to find a more central room to start from
        const centerX = gridSize / 2;
        const centerY = gridSize / 2;
        let minDistToCenter = Infinity;
        
        rooms.forEach((room, index) => {
            const distToCenter = Math.sqrt(
                Math.pow(room.x - centerX, 2) + 
                Math.pow(room.y - centerY, 2)
            );
            if (distToCenter < minDistToCenter) {
                minDistToCenter = distToCenter;
                startRoomIndex = index;
            }
        });
        
        const connected = new Set<number>([startRoomIndex]);
        const unconnected = new Set<number>(rooms.map((_, i) => i).filter(i => i !== startRoomIndex));
        
        // Connect all rooms
        while (unconnected.size > 0) {
            let minDistance = Infinity;
            let bestConnectedRoom = -1;
            let bestUnconnectedRoom = -1;
            
            // Find the closest pair of rooms between connected and unconnected sets
            for (const connectedIndex of connected) {
                for (const unconnectedIndex of unconnected) {
                    const connectedRoom = rooms[connectedIndex];
                    const unconnectedRoom = rooms[unconnectedIndex];
                    
                    // Calculate Manhattan distance
                    const distance = Math.abs(connectedRoom.x - unconnectedRoom.x) + 
                                    Math.abs(connectedRoom.y - unconnectedRoom.y);
                    
                    // Prefer connections between nearby rooms, slightly favoring rooms that are
                    // horizontally or vertically aligned (for better looking corridors)
                    let adjustedDistance = distance;
                    if (connectedRoom.x === unconnectedRoom.x || connectedRoom.y === unconnectedRoom.y) {
                        adjustedDistance *= 0.9; // Slight preference for straight corridors
                    }
                    
                    if (adjustedDistance < minDistance) {
                        minDistance = adjustedDistance;
                        bestConnectedRoom = connectedIndex;
                        bestUnconnectedRoom = unconnectedIndex;
                    }
                }
            }
            
            // Add the connection
            if (bestConnectedRoom !== -1 && bestUnconnectedRoom !== -1) {
                rooms[bestConnectedRoom].connections.push(rooms[bestUnconnectedRoom].id);
                rooms[bestUnconnectedRoom].connections.push(rooms[bestConnectedRoom].id);
                
                // Update sets
                connected.add(bestUnconnectedRoom);
                unconnected.delete(bestUnconnectedRoom);
                
                // Create pathways in the grid between the rooms
                this.createPath(
                    rooms[bestConnectedRoom], 
                    rooms[bestUnconnectedRoom], 
                    grid
                );
            }
        }
        
        // Add a few extra connections for loops (about 20% more connections for more realistic dungeon)
        const extraConnections = Math.floor(rooms.length * 0.2) + 1;
        
        for (let i = 0; i < extraConnections; i++) {
            // Prioritize connecting nearby rooms that aren't already connected
            const potentialConnections: PotentialConnection[] = [];
            
            for (let r1 = 0; r1 < rooms.length; r1++) {
                for (let r2 = r1 + 1; r2 < rooms.length; r2++) {
                    // Skip if already connected
                    if (rooms[r1].connections.includes(rooms[r2].id)) {
                        continue;
                    }
                    
                    // Calculate Manhattan distance
                    const distance = Math.abs(rooms[r1].x - rooms[r2].x) + 
                                    Math.abs(rooms[r1].y - rooms[r2].y);
                    
                    // Only consider rooms that are relatively close
                    if (distance <= 3) {
                        potentialConnections.push({
                            room1: r1,
                            room2: r2,
                            distance: distance
                        });
                    }
                }
            }
            
            // If we found potential connections, pick the closest one
            if (potentialConnections.length > 0) {
                potentialConnections.sort((a, b) => a.distance - b.distance);
                const connection = potentialConnections[0];
                
                // Add the connection
                rooms[connection.room1].connections.push(rooms[connection.room2].id);
                rooms[connection.room2].connections.push(rooms[connection.room1].id);
                
                // Create pathway
                this.createPath(rooms[connection.room1], rooms[connection.room2], grid);
            } else {
                // If no good candidates found, just pick two random unconnected rooms
                const room1Index = Math.floor(Math.random() * rooms.length);
                let room2Index = Math.floor(Math.random() * rooms.length);
                
                // Make sure we pick two different rooms
                while (room2Index === room1Index || 
                      rooms[room1Index].connections.includes(rooms[room2Index].id)) {
                    room2Index = Math.floor(Math.random() * rooms.length);
                }
                
                // Add the connection
                rooms[room1Index].connections.push(rooms[room2Index].id);
                rooms[room2Index].connections.push(rooms[room1Index].id);
                
                // Create pathway
                this.createPath(rooms[room1Index], rooms[room2Index], grid);
            }
        }
    }

    private createPath(room1: Room, room2: Room, grid: boolean[][]): void {
        // Create a proper path between two rooms with corridors and doors
        const startX = room1.x;
        const startY = room1.y;
        const endX = room2.x;
        const endY = room2.y;
        
        // Store path coordinates to mark in grid later
        const pathCoordinates: PathCoordinate[] = [];
        
        // Decide whether to go horizontal first then vertical, or vice versa
        // This creates L-shaped corridors rather than diagonal ones
        const goHorizontalFirst = Math.random() > 0.5;
        
        if (goHorizontalFirst) {
            // Go horizontal first
            let x = startX;
            while (x !== endX) {
                x += x < endX ? 1 : -1;
                // Don't add doors in the path, just corridor cells
                pathCoordinates.push({ x, y: startY, isDoor: false });
            }
            
            // Then go vertical
            let y = startY;
            while (y !== endY) {
                y += y < endY ? 1 : -1;
                pathCoordinates.push({ x: endX, y, isDoor: false });
            }
        } else {
            // Go vertical first
            let y = startY;
            while (y !== endY) {
                y += y < endY ? 1 : -1;
                pathCoordinates.push({ x: startX, y, isDoor: false });
            }
            
            // Then go horizontal
            let x = startX;
            while (x !== endX) {
                x += x < endX ? 1 : -1;
                pathCoordinates.push({ x, y: endY, isDoor: false });
            }
        }
        
        // Mark the path on the grid
        pathCoordinates.forEach(coord => {
            if (coord.x >= 0 && coord.x < grid[0].length && coord.y >= 0 && coord.y < grid.length) {
                grid[coord.y][coord.x] = true;
            }
        });
        
        // Add door markers at the entrance/exit of rooms
        if (pathCoordinates.length > 0) {
            // First point after leaving room1
            const doorCoord1 = { 
                x: pathCoordinates[0].x, 
                y: pathCoordinates[0].y, 
                isDoor: true,
                isHorizontal: pathCoordinates[0].y === room1.y
            };
            
            // Last point before entering room2
            const doorCoord2 = { 
                x: pathCoordinates[pathCoordinates.length - 1].x, 
                y: pathCoordinates[pathCoordinates.length - 1].y, 
                isDoor: true,
                isHorizontal: pathCoordinates[pathCoordinates.length - 1].x === room2.x
            };
            
            // Store the door positions for drawing later
            if (!room1.doors) room1.doors = [];
            if (!room2.doors) room2.doors = [];
            
            room1.doors.push({
                x: doorCoord1.x,
                y: doorCoord1.y,
                isHorizontal: doorCoord1.isHorizontal,
                connectsTo: room2.id
            });
            
            room2.doors.push({
                x: doorCoord2.x,
                y: doorCoord2.y,
                isHorizontal: doorCoord2.isHorizontal,
                connectsTo: room1.id
            });
        }
        
        // Store path information on the rooms
        if (!room1.pathsTo) room1.pathsTo = [];
        if (!room2.pathsTo) room2.pathsTo = [];
        
        room1.pathsTo.push({
            roomId: room2.id,
            path: pathCoordinates
        });
        
        room2.pathsTo.push({
            roomId: room1.id,
            path: pathCoordinates
        });
    }
    
    private cleanupGrid(grid: boolean[][], rooms: Room[], gridSize: number): void {
        // Fix any isolated corridor cells and ensure intersection connectivity
        
        // Define directions once for reuse
        const directions: Direction[] = [
            { dx: 0, dy: -1 }, // North
            { dx: 1, dy: 0 },  // East
            { dx: 0, dy: 1 },  // South
            { dx: -1, dy: 0 }  // West
        ];
        
        // First, identify all corridor cells (not room cells)
        const corridorCells: {x: number, y: number}[] = [];
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                if (!grid[y][x]) continue; // Skip walls
                
                // Check if this is a room
                const isRoom = rooms.some(room => room.x === x && room.y === y);
                if (!isRoom) {
                    corridorCells.push({ x, y });
                }
            }
        }
        
        // Check each corridor cell for proper connectivity
        for (const cell of corridorCells) {
            // Count adjacent open cells (rooms or corridors)
            let adjacentOpenCells = 0;
            let adjacentRooms = 0;
            
            for (const dir of directions) {
                const nx = cell.x + dir.dx;
                const ny = cell.y + dir.dy;
                
                if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
                    if (grid[ny][nx]) {
                        adjacentOpenCells++;
                        
                        // Check if this adjacent cell is a room
                        if (rooms.some(room => room.x === nx && room.y === ny)) {
                            adjacentRooms++;
                        }
                    }
                }
            }
            
            // If this is a dead-end corridor (only one connection) and not leading to a room, remove it
            if (adjacentOpenCells <= 1 && adjacentRooms === 0) {
                grid[cell.y][cell.x] = false; // Convert to wall
            }
            
            // If this is a hallway intersection (3 or 4 connections), ensure it stays open
            if (adjacentOpenCells >= 3) {
                // This is an intersection, make sure it stays open
                grid[cell.y][cell.x] = true;
            }
        }
        
        // Do a second pass to ensure all corridors lead somewhere
        // (no isolated corridors after the first cleanup)
        let madeChanges = true;
        let maxIterations = 10; // Prevent infinite loop by limiting iterations
        let iteration = 0;
        
        while (madeChanges && iteration < maxIterations) {
            madeChanges = false;
            iteration++;
            
            for (let y = 0; y < gridSize; y++) {
                for (let x = 0; x < gridSize; x++) {
                    // Skip walls and rooms
                    if (!grid[y][x] || rooms.some(room => room.x === x && room.y === y)) {
                        continue;
                    }
                    
                    // Count adjacent open cells
                    let adjacentOpenCells = 0;
                    let adjacentRooms = 0;
                    
                    for (const dir of directions) {
                        const nx = x + dir.dx;
                        const ny = y + dir.dy;
                        
                        if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
                            if (grid[ny][nx]) {
                                adjacentOpenCells++;
                                
                                // Check if adjacent cell is a room
                                if (rooms.some(room => room.x === nx && room.y === ny)) {
                                    adjacentRooms++;
                                }
                            }
                        }
                    }
                    
                    // If this corridor doesn't connect to anything useful, remove it
                    if (adjacentOpenCells <= 1 && adjacentRooms === 0) {
                        grid[y][x] = false; // Convert to wall
                        madeChanges = true;
                    }
                }
            }
        }
    }
}