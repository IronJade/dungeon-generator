const { Plugin, Modal, Setting, Notice, PluginSettingTab } = require('obsidian');

// Default settings with pre-configured generators
const DEFAULT_SETTINGS = {
    dungeonTypes: {
        'Cave': {
            name: 'Cave',
            possibleRooms: ['Cavern', 'Grotto', 'Tunnel', 'Chamber', 'Pool', 'Crevasse', 'Stalagmite Forest'],
            possibleTraps: ['Pit Trap', 'Rock Fall', 'Poison Gas', 'Slippery Slope'],
            possibleMinorHazards: ['Slippery Ground', 'Low Ceiling', 'Unstable Floor'],
            possibleSoloMonsters: ['Cave Bear', 'Giant Bat', 'Slime', 'Troll'],
            possibleNPCs: ['Lost Miner', 'Hermit', 'Cultist', 'Refugee'],
            possibleMonsterMobs: ['Goblins', 'Kobolds', 'Giant Spiders', 'Bats'],
            possibleMajorHazards: ['Underground River', 'Lava Flow', 'Collapsing Ceiling'],
            possibleTreasures: ['Gem Vein', 'Ancient Cache', 'Forgotten Equipment', 'Crystal Formation'],
            possibleBossMonsters: ['Dragon', 'Giant', 'Chimera', 'Elder Slime']
        },
        'Tomb': {
            name: 'Tomb',
            possibleRooms: ['Crypt', 'Burial Chamber', 'Sarcophagus Room', 'Ceremonial Hall', 'Treasure Vault'],
            possibleTraps: ['Poison Dart', 'Swinging Blade', 'Collapsing Floor', 'Curse Tablet'],
            possibleMinorHazards: ['Cobwebs', 'Crumbling Stairs', 'Faded Inscriptions'],
            possibleSoloMonsters: ['Mummy', 'Skeleton Warrior', 'Cursed Statue', 'Ghost'],
            possibleNPCs: ['Archaeologist', 'Tomb Robber', 'Cursed Noble', 'Death Priest'],
            possibleMonsterMobs: ['Skeletons', 'Zombies', 'Scarabs', 'Animated Objects'],
            possibleMajorHazards: ['Soul-draining Mist', 'Time Loop', 'Magical Ward'],
            possibleTreasures: ['Royal Jewelry', 'Ancient Artifacts', 'Ceremonial Weapons', 'Burial Masks'],
            possibleBossMonsters: ['Lich', 'Mummy Lord', 'Death Knight', 'Ancient Guardian']
        },
        'Deep Tunnels': {
            name: 'Deep Tunnels',
            possibleRooms: ['Mine Shaft', 'Excavated Chamber', 'Natural Cavity', 'Crossroads', 'Storage Room'],
            possibleTraps: ['Mining Explosives', 'Elevator Malfunction', 'Flood Trap', 'Cave-in'],
            possibleMinorHazards: ['Poor Air Quality', 'Rickety Supports', 'Narrow Passage'],
            possibleSoloMonsters: ['Giant Worm', 'Rock Elemental', 'Deep One', 'Cave Fisher'],
            possibleNPCs: ['Lost Explorer', 'Mad Miner', 'Deep Cult Priest', 'Escaped Slave'],
            possibleMonsterMobs: ['Duergar', 'Troglodytes', 'Hook Horrors', 'Myconids'],
            possibleMajorHazards: ['Bottomless Chasm', 'Toxic Spore Cloud', 'Underground Lake'],
            possibleTreasures: ['Rare Minerals', 'Dwarven Artifact', 'Forgotten Cache', 'Ancient Technology'],
            possibleBossMonsters: ['Purple Worm', 'Stone Titan', 'Mind Flayer', 'Beholder']
        },
        'Ruins': {
            name: 'Ruins',
            possibleRooms: ['Collapsed Hall', 'Overgrown Chamber', 'Broken Tower', 'Former Library', 'Throne Room'],
            possibleTraps: ['Collapsing Wall', 'Hidden Pitfall', 'Ancient Magic Rune', 'Animated Statue'],
            possibleMinorHazards: ['Crumbling Floor', 'Overgrown Vegetation', 'Unstable Archway'],
            possibleSoloMonsters: ['Gargoyle', 'Animated Armor', 'Phase Spider', 'Wraith'],
            possibleNPCs: ['Historian', 'Treasure Hunter', 'Cultist Leader', 'Trapped Spirit'],
            possibleMonsterMobs: ['Bandits', 'Cultists', 'Animated Objects', 'Restless Dead'],
            possibleMajorHazards: ['Magical Anomaly', 'Reality Warp', 'Time Distortion'],
            possibleTreasures: ['Ancient Library', 'Royal Treasury', 'Magical Artifacts', 'Historical Records'],
            possibleBossMonsters: ['Ancient Construct', 'Forgotten Deity', 'Archmage Ghost', 'Demonic Entity']
        }
    },
    defaultDungeonType: 'Cave',
    mapStyle: {
        wallColor: '#4a9ebd',       // Blue wall color
        floorColor: '#ffffff',      // White floor color
        gridColor: '#cccccc',       // Light gray grid lines
        textColor: '#000000',       // Black text for room numbers
        useColors: true,            // Whether to use color-coding for room content
        doorStyle: 'line'           // Could be 'line', 'gap', or 'none'
    }
};

// Create the dungeon
class DungeonGenerator {
    constructor(settings) {
        this.settings = settings;
    }

    generateDungeon(options) {
        const dungeonType = this.settings.dungeonTypes[options.dungeonType];
        const sizeConfig = this.getSizeConfig(options.size);
        
        // Generate rooms
        const rooms = [];
        let numRooms = sizeConfig.minRooms + Math.floor(Math.random() * (sizeConfig.maxRooms - sizeConfig.minRooms));
        
        // Ensure we have at least 3 rooms for a meaningful dungeon
        numRooms = Math.max(numRooms, 3);
        
        // Create initial grid-based layout
        const gridSize = sizeConfig.gridSize;
        const grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(false));
        
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
                        const room = {
                            id: i + 1,
                            x: x,
                            y: y,
                            width: 1,
                            height: 1,
                            connections: [],
                            type: this.getRandomElement(dungeonType.possibleRooms),
                            content: '',
                            contentType: ''
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
                    let closestRoom = null;
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
        const svg = this.generateSVG(rooms, grid, gridSize, sizeConfig.cellSize);
        
        // Generate DM guide
        const guide = this.generateGuide(rooms, dungeonType.name);
        
        return {
            rooms: rooms,
            svg: svg,
            guide: guide
        };
    }
    
    getSizeConfig(size) {
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
    
    determineRoomContent(size) {
        // Probabilities for different content types
        const probabilityTable = {
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
        const contentTypes = Object.keys(probabilityTable);
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

    getRoomContentByType(contentType, dungeonType) {
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

    getRandomElement(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    connectRooms(rooms, grid, gridSize) {
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
        
        const connected = new Set([startRoomIndex]);
        const unconnected = new Set(rooms.map((_, i) => i).filter(i => i !== startRoomIndex));
        
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
            const potentialConnections = [];
            
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

    createPath(room1, room2, grid) {
        // Create a proper path between two rooms with corridors and doors
        const startX = room1.x;
        const startY = room1.y;
        const endX = room2.x;
        const endY = room2.y;
        
        // Store path coordinates to mark in grid later
        const pathCoordinates = [];
        
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
    
    cleanupGrid(grid, rooms, gridSize) {
        // Fix any isolated corridor cells and ensure intersection connectivity
        
        // Define directions once for reuse
        const directions = [
            { dx: 0, dy: -1 }, // North
            { dx: 1, dy: 0 },  // East
            { dx: 0, dy: 1 },  // South
            { dx: -1, dy: 0 }  // West
        ];
        
        // First, identify all corridor cells (not room cells)
        const corridorCells = [];
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

    generateSVG(rooms, grid, gridSize, cellSize) {
        const padding = 10;
        const svgWidth = gridSize * cellSize + padding * 2;
        const svgHeight = gridSize * cellSize + padding * 2;
        
        // Get colors from settings
        const wallColor = this.settings.mapStyle?.wallColor || '#4a9ebd';
        const floorColor = this.settings.mapStyle?.floorColor || '#ffffff';
        const gridColor = this.settings.mapStyle?.gridColor || '#cccccc';
        const textColor = this.settings.mapStyle?.textColor || '#000000';
        const useColors = this.settings.mapStyle?.useColors !== undefined ? this.settings.mapStyle.useColors : true;
        const doorStyle = this.settings.mapStyle?.doorStyle || 'line';
        
        // Create the SVG with a styled grid
        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">`;
        
        // Add a background
        svg += `<rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" fill="${floorColor}" />`;
        
        // Create a grid of cells, will fill with color for walls later
        const allCells = [];
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
    getRoomContentColor(contentType) {
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

    generateGuide(rooms, dungeonType) {
        let guide = `# ${dungeonType} Dungeon Master's Guide\n\n`;
        
        // Add a legend
        guide += `## Legend\n`;
        guide += `- White: Empty Room\n`;
        guide += `- Light Red: Trap\n`;
        guide += `- Light Orange: Minor Hazard\n`;
        guide += `- Light Yellow: Solo Monster\n`;
        guide += `- Light Green: NPC\n`;
        guide += `- Light Blue: Monster Mob\n`;
        guide += `- Light Purple: Major Hazard\n`;
        guide += `- Gold: Treasure\n`;
        guide += `- Red: Boss Monster\n\n`;
        
        guide += `## Room Details\n\n`;
        
        // Add details for each room
        rooms.sort((a, b) => a.id - b.id);
        
        for (const room of rooms) {
            guide += `### Room ${room.id}: ${room.type}\n`;
            guide += `**Content**: ${room.contentType} - ${room.content}\n`;
            guide += `**Connections**: Connects to rooms ${room.connections.join(', ')}\n\n`;
            
            // Add suggested descriptions based on room type and content
            guide += `**Suggested Description**: ${this.generateRoomDescription(room, dungeonType)}\n\n`;
        }
        
        return guide;
    }

    generateRoomDescription(room, dungeonType) {
        const descriptions = {
            'Cave': {
                'base': [
                    "A damp cavern with stalactites hanging from the ceiling.",
                    "A narrow passage that opens into a wider space.",
                    "A rocky chamber with evidence of recent seismic activity.",
                    "A cave with luminescent fungi providing dim light."
                ],
            },
            'Tomb': {
                'base': [
                    "Ancient stone walls inscribed with forgotten symbols.",
                    "A burial chamber with ornate carvings depicting the deceased's life.",
                    "A dusty room with sarcophagi lining the walls.",
                    "A ceremonial space with faded murals depicting ancient rites."
                ],
            },
            'Deep Tunnels': {
                'base': [
                    "A mine shaft reinforced with aged wooden supports.",
                    "A tunnel that shows signs of both natural formation and artificial expansion.",
                    "An excavated chamber with abandoned mining equipment.",
                    "A dark passage with veins of unusual minerals in the walls."
                ],
            },
            'Ruins': {
                'base': [
                    "Crumbling stone walls partially reclaimed by nature.",
                    "A once-grand chamber now exposed to the elements.",
                    "The remains of what appears to have been an important structure.",
                    "Ancient architecture that has withstood the test of time, though barely."
                ],
            }
        };
        
        // Get base description for the dungeon type
        let baseDescriptions = descriptions[dungeonType]?.base || descriptions['Cave'].base;
        let baseDescription = this.getRandomElement(baseDescriptions);
        
        // Add content specific details
        let contentDescription = "";
        
        switch (room.contentType) {
            case 'Empty':
                contentDescription = "The room appears to be empty, though careful inspection might reveal subtle details or clues.";
                break;
            case 'Trap':
                contentDescription = `There's a ${room.content.toLowerCase()} here that might be triggered if adventurers aren't careful.`;
                break;
            case 'Minor Hazard':
                contentDescription = `Be wary of the ${room.content.toLowerCase()} that makes traversing this area more difficult.`;
                break;
            case 'Solo Monster':
                contentDescription = `A ${room.content.toLowerCase()} has made this place its lair.`;
                break;
            case 'NPC':
                contentDescription = `A ${room.content.toLowerCase()} can be found here, perhaps with information or a request.`;
                break;
            case 'Monster Mob':
                contentDescription = `A group of ${room.content.toLowerCase()} have claimed this area as their territory.`;
                break;
            case 'Major Hazard':
                contentDescription = `The ${room.content.toLowerCase()} presents a significant danger to anyone entering this area.`;
                break;
            case 'Treasure':
                contentDescription = `This area contains ${room.content.toLowerCase()} that might interest the adventurers.`;
                break;
            case 'Boss Monster':
                contentDescription = `Beware! A powerful ${room.content.toLowerCase()} awaits those who enter here.`;
                break;
            default:
                contentDescription = "The contents of this room are mysterious.";
        }
        
        return `${baseDescription} ${contentDescription}`;
    }
}

// Modal for generating dungeons
class DungeonGeneratorModal extends Modal {
    constructor(app, plugin) {
        super(app);
        this.plugin = plugin;
        this.dungeonType = plugin.settings.defaultDungeonType;
        this.size = 'Medium';
        this.generatedDungeon = null;
    }

    onOpen() {
        const {contentEl} = this;
        
        contentEl.createEl('h2', {text: 'Generate Dungeon'});
        
        // Dungeon Type Selection
        new Setting(contentEl)
            .setName('Dungeon Type')
            .setDesc('Select the type of dungeon to generate')
            .addDropdown(dropdown => {
                const dungeonTypes = Object.keys(this.plugin.settings.dungeonTypes);
                
                dungeonTypes.forEach(type => {
                    dropdown.addOption(type, type);
                });
                
                dropdown.setValue(this.dungeonType);
                dropdown.onChange(value => {
                    this.dungeonType = value;
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
                    this.size = value;
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

    generateDungeon() {
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

    insertDungeonIntoNote() {
        if (!this.generatedDungeon) return;
        
        const activeView = this.app.workspace.getActiveViewOfType(require('obsidian').MarkdownView);
        if (activeView) {
            const editor = activeView.editor;
            
            // Create the content to insert - use an excalidraw embed approach
            const timestamp = Date.now();
            const filename = `dungeon-map-${timestamp}.svg`;
            
            // First, create a "div" with an embedded image that references the SVG
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

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
}

// Settings tab of plugin
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

// Main plugin class
class DungeonGeneratorPlugin extends Plugin {
    async onload() {
        await this.loadSettings();
        
        // Initialize the dungeon generator
        this.dungeonGenerator = new DungeonGenerator(this.settings);

        // Add ribbon icon
        this.addRibbonIcon('dice', 'Generate Dungeon', () => {
            new DungeonGeneratorModal(this.app, this).open();
        });

        // Add command to generate dungeon
        this.addCommand({
            id: 'generate-dungeon',
            name: 'Generate Dungeon Map',
            editorCallback: (editor, view) => {
                new DungeonGeneratorModal(this.app, this).open();
            }
        });

        // Add settings tab
        this.addSettingTab(new DungeonGeneratorSettingTab(this.app, this));
    }

    onunload() {
        // Cleanup when plugin is disabled
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    generateDungeon(options) {
        return this.dungeonGenerator.generateDungeon(options);
    }
}

module.exports = DungeonGeneratorPlugin;