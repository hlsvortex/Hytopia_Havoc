// Base class for level controllers
import { World, Player } from 'hytopia';
import { type LevelConfiguration } from '../config/LevelConfiguration';
import { EventEmitter } from '../utils/EventEmitter';
import * as fs from 'fs';
import * as path from 'path';

export abstract class LevelController {
    protected world: World;
    protected config: LevelConfiguration;
    protected currentMapData: any = null;
    
    public events = new EventEmitter<{
        RoundEnd: { q: string[], e: string[] }
    }>();
    
    constructor(world: World, config: LevelConfiguration) {
        this.world = world;
        this.config = config;
    }
    
    /**
     * Get the name of this level
     * @returns Level name
     */
    public getLevelName(): string {
        return this.config.displayName;
    }
    
    /**
     * Get the currently loaded map data for this level.
     * @returns The map data or null if no map is loaded.
     */
    public getCurrentMapData(): any | null {
        return this.currentMapData;
    }
    
    /**
     * Activate this level - default implementation just loads the map
     * Subclasses should override this to implement level-specific setup
     */
    public activate(): void {
        console.log(`[LevelController] Activating level ${this.getLevelName()}`);
        this.loadMap();
    }
    
    /**
     * Load the map for this level if available
     */
    public loadMap(): void {
        const mapPath = this.config.mapName;
        
        if (!mapPath) {
            return;
        }
        
        try {
            // Clear any existing map blocks first to avoid overlap
            console.log(`[LevelController] Clearing existing map before loading new one`);
            if (this.world) {
                this.world.loadMap({ blocks: {} });
                console.log(`[LevelController] Cleared existing map with empty map`);
            }

            // Resolve the absolute path to the file
            const resolvedPath = path.resolve(process.cwd(), mapPath);
            console.log(`[LevelController] Loading map from resolved path: ${resolvedPath}`);
            
            // Check if file exists
            if (!fs.existsSync(resolvedPath)) {
                console.error(`[LevelController] Map file does not exist: ${resolvedPath}`);
                return;
            }
            
            // Read the file content
            const fileContent = fs.readFileSync(resolvedPath, 'utf8');
            console.log(`[LevelController] Read ${fileContent.length} bytes from map file`);
            
            // Parse the JSON content
            const mapData = JSON.parse(fileContent);
            
            // Store current map data
            this.currentMapData = mapData;
            
            // Log the number of blocks found during parsing
            const blockCount = mapData.blocks ? Object.keys(mapData.blocks).length : 0;
            console.log(`[LevelController] Parsed map file ${mapPath}, found ${blockCount} blocks.`);
            
            // Load the map
            this.world.loadMap(mapData);
            
            console.log(`[LevelController] Successfully loaded map for ${this.getLevelName()}`);
        } catch (error) {
            console.error(`[LevelController] Failed to load map for ${this.getLevelName()}:`, error);
        }
    }
    
    /**
     * Register a player for the current round
     * @param player The player to register
     */
    public registerPlayer(player: Player): void {
        console.log(`[LevelController] Registered player ${player.id} for ${this.getLevelName()}`);
    }
    
    /**
     * End the current round
     */
    public endRound(): void {
        console.log(`[LevelController] Ended round for ${this.getLevelName()}`);
        
        // Emit a default RoundEnd event with empty arrays
        this.events.emit('RoundEnd', { q: [], e: [] });
    }
    
    /**
     * Clean up this level before unloading
     * This is called when switching between levels or shutting down the level
     */
    public cleanup(): void {
        console.log(`[LevelController] *** CLEANUP CALLED for ${this.getLevelName()} ***`);
        
        // Clear all blocks by directly setting them to 0 (air)
        try {
            if (this.world && this.currentMapData && this.currentMapData.blocks) {
                const blocks = this.currentMapData.blocks;
                let blockCount = 0;
                // Iterate through all blocks in the map and set them to 0 (air)
                for (const blockKey in blocks) {
                    if (Object.prototype.hasOwnProperty.call(blocks, blockKey)) {
                        // Parse the block coordinates from the key (format: "x,y,z")
                        const coords = blockKey.split(',').map(Number);
                        if (coords.length === 3) {
                            const [x, y, z] = coords;
                            // Set the block to air (0)
                            this.world.chunkLattice.setBlock({x, y, z}, 0);
                            blockCount++;
                        }
                    }
                }

				this.world.chunkLattice.getAllChunks().forEach(chunk => {
					chunk.despawn();
				});
                
                this.world.loadMap({ blocks: {} });
        
		    } else {
                // Attempt to load empty map as fallback if no current map data
                if (this.world) {
                    this.world.loadMap({ blocks: {} });
                }
            }
            
          
        } catch (error) {
            console.error(`[LevelController] Error clearing blocks:`, error);
        }
        
        // Clear current map data
        this.currentMapData = null;
        console.log(`[LevelController] *** CLEANUP COMPLETE for ${this.getLevelName()} ***`);
    }
    
    abstract startRound(players: Player[]): void;
} 