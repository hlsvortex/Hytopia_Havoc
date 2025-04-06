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
            this.cleanup();

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
        console.log(`[LevelController] Base cleanup for ${this.getLevelName()}`);
        
        // Clear all blocks by loading an empty map
        try {
            if (this.world) {
                console.log(`[LevelController] Clearing all blocks by loading empty map`);
                // The most efficient way to clear all blocks is to load an empty map
                this.world.loadMap({ blocks: {} });
                console.log(`[LevelController] Successfully cleared all blocks`);
            }
        } catch (error) {
            console.error(`[LevelController] Error clearing blocks:`, error);
        }
        
        // Clear current map data
        this.currentMapData = null;
    }
    
    abstract startRound(players: Player[]): void;
} 