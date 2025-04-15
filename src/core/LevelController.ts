// Base class for level controllers
import { World, Player, type Vector3Like, PlayerEntity, PlayerEvent } from 'hytopia';
import { type LevelConfiguration } from '../config/LevelConfiguration';
import { EventEmitter } from '../utils/EventEmitter';
import * as fs from 'fs';
import * as path from 'path';
import { UIBridge } from './UIBridge';
import { AreaComponent } from '../AreaComponent';
import ObstacleEntity from '../obsticals/ObstacleEntity';
import PlayerController from '../PlayerController';
import { GameManager } from './GameManager';
import { Team } from '../enums/Team';
import type { PlayerData } from '../types/PlayerData';
export abstract class LevelController {

	protected gameManager: GameManager;
    protected world: World;
    protected config: LevelConfiguration;
    protected currentMapData: any = null;
    protected uiBridge: UIBridge | null = null;

	protected startingPlayerIds: Set<string> = new Set(); // Added to track who started
    protected qualifiedPlayerIds: Set<string> = new Set(); // Added
	protected eliminatedPlayerIds: Set<string> = new Set();

	protected qualificationTarget: number = 0;

	// Replace single start area with a list of start areas
	protected startAreas: AreaComponent[] = [];
	
	protected obstacles: ObstacleEntity[] = [];

	public getConfig(): LevelConfiguration {
		return this.config;
	}

    // Define the event types
    public events = new EventEmitter<{
        RoundEnd: { q: string[], e: string[] },
        RoundGameplayStart: null,
    }>();
    
    constructor(world: World, config: LevelConfiguration, uiBridge: UIBridge | null = null, gameManager: GameManager) {
        this.world = world;
        this.config = config;
        this.uiBridge = uiBridge;
		this.gameManager = gameManager;
    }
    
	public getLevelConfig(): LevelConfiguration {
		return this.config;
	}

    /**
     * Allows setting/updating the UIBridge after construction.
     */
    public setUIBridge(uiBridge: UIBridge | null): void {
        this.uiBridge = uiBridge;
    }
    
    /**
     * Get the level's configuration ID
     */
    public getConfigId(): string {
        return this.config.id;
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
    
	

	public registerObstacle(obstacle: ObstacleEntity): void {
		this.obstacles.push(obstacle);
	}

    /**
     * Activate this level - default implementation just loads the map
     * Subclasses should override this to implement level-specific setup
     */
    public loadLevel(): void {
        this.loadMap();
    }

	public resetObstacles(): void {
		for (const obstacle of this.obstacles) {
			obstacle.reset();
		}
	}

	/**
     * Adds a starting area for the course.
     * @param corner1 One corner of the starting area.
     * @param corner2 The opposite corner of the starting area.
     * @param spawnHeight Optional fixed Y-level for spawning within the area.
     * @param team Optional team assignment for this area.
     */
	protected addStartArea(corner1: Vector3Like, corner2: Vector3Like, spawnHeight?: number, team: Team = Team.None): void {
		const area = new AreaComponent(corner1, corner2, spawnHeight, team);
		this.startAreas.push(area);
		console.log(`[${this.constructor.name}] Start area added. Total areas: ${this.startAreas.length}, Team: ${team}`);
	}
	
	/**
     * Legacy method to maintain backward compatibility.
     * Sets a single start area, clearing any previously added areas.
     * @param corner1 One corner of the starting area.
     * @param corner2 The opposite corner of the starting area.
     * @param spawnHeight Optional fixed Y-level for spawning within the area.
     */
	protected clearAndSetStartArea(corner1: Vector3Like, corner2: Vector3Like, spawnHeight?: number): void {
		this.startAreas = []; // Clear existing areas
		this.addStartArea(corner1, corner2, spawnHeight);
		console.log(`[${this.constructor.name}] Start area set (legacy method).`);
	}

	/**
     * Gets a random spawn position within any of the defined start areas.
     * @returns A spawn position or null if no start areas are defined.
     */
	public getStartSpawnPosition(): Vector3Like | null {
		if (this.startAreas.length === 0) {
			return null;
		}
		
		// Choose a random start area
		const randomIndex = Math.floor(Math.random() * this.startAreas.length);
		const area = this.startAreas[randomIndex];
		
		return area.getRandomPosition();
	}
	
	/**
     * Gets a random spawn position for a specific team.
     * @param team The team to get a spawn position for.
     * @returns A spawn position for the team, or a random position from any area if no team-specific area exists.
     */
	public getTeamSpawnPosition(team: Team): Vector3Like | null {
		// First try to find areas for the specific team
		const teamAreas = this.startAreas.filter(area => area.getTeam() === team);
		
		if (teamAreas.length > 0) {
			// Choose a random area from the team's areas
			const randomIndex = Math.floor(Math.random() * teamAreas.length);
			return teamAreas[randomIndex].getRandomPosition();
		}
		
		// Fall back to any area if no team-specific area exists
		return this.getStartSpawnPosition();
	}
	
	/**
     * Gets all start areas for a specific team.
     * @param team The team to get areas for.
     * @returns Array of areas assigned to the team.
     */
	public getTeamStartAreas(team: Team): AreaComponent[] {
		return this.startAreas.filter(area => area.getTeam() === team);
	}
	
	/**
     * Gets all defined start areas.
     * @returns Array of all start areas.
     */
	public getAllStartAreas(): AreaComponent[] {
		return [...this.startAreas];
	}
	
	/**
     * Check if there are any start areas defined for a specific team.
     * @param team The team to check.
     * @returns True if at least one start area exists for the team.
     */
	public hasTeamStartAreas(team: Team): boolean {
		return this.startAreas.some(area => area.getTeam() === team);
	}

	protected setPausePlayers(players: Player[], pause: boolean): void {
		players.forEach(player => {
			const playerData = this.gameManager.getPlayerData(player.id);
			if (playerData) {
				const playerController = playerData.playerController;
				if (playerController) {
					playerController.setPauseMovement(pause);
				}
			}
		});
	}

	protected setPausePlayersIds(playerIds: string[], pause: boolean): void {
		playerIds.forEach(playerId => {
			const playerData = this.gameManager.getPlayerData(playerId);
			if (playerData) {
				const playerController = playerData.playerController;
				if (playerController) {
					playerController.setPauseMovement(pause);
				}
			}
		});
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
   
	public abstract eliminatePlayer(playerEntity: PlayerEntity): void;

	protected abstract respawnPlayerAtCheckpoint(playerEntity: PlayerEntity): void;
	
	public beginGameplay(): void {
		console.log(`[LevelController] Beginning gameplay for ${this.getLevelName()}`);
		this.events.emit('RoundGameplayStart', null);
	}

    /**
     * End the current round
     */
    public endRound(): void {
        console.log(`[LevelController] Ended round for ${this.getLevelName()}`);
        
        // Emit a default RoundEnd event with empty arrays
        this.events.emit('RoundEnd', { q: [], e: [] });
    }
	
	abstract startRound(players: Player[], qualificationTarget: number): void;

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
        
		// Clear start areas
		this.startAreas = [];
		
        // Clear current map data
        this.currentMapData = null;
        console.log(`[LevelController] *** CLEANUP COMPLETE for ${this.getLevelName()} ***`);
    }
    



} 