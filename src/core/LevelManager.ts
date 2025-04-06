import { World, Player, PlayerEntity } from 'hytopia';
import { LevelController } from './LevelController';
import { type LevelConfiguration } from '../config/LevelConfiguration';
import { SeesawLevelController } from '../levels/SeesawLevelController';
import { GateCrashLevelController } from '../levels/GateCrashLevelController';
import { gameConfig } from '../config/gameConfig';

/**
 * Central manager for all game levels
 */
export class LevelManager {
	private world: World;
	private levels: Map<string, LevelController> = new Map();
	private activeLevel: LevelController | null = null;
	private activeLevelId: string | null = null;
	private players: Map<string, Player> = new Map();
	private availableLevelConfigs: LevelConfiguration[];

	/**
	 * Create a new level manager
	 * @param world The game world
	 */
	constructor(world: World) {
		this.world = world;
		this.availableLevelConfigs = gameConfig.availableLevels;
		console.log('[LevelManager] Created Level Manager');
		
		// Load the initial list of available levels from gameConfig
		this.loadAvailableLevels();
	}

	/**
	 * Load available levels from gameConfig
	 */
	private loadAvailableLevels(): void {
		console.log(`[LevelManager] Loading ${this.availableLevelConfigs.length} levels from gameConfig`);
		
		// Clear existing levels if any
		this.levels.clear();
		
		// Create all levels from the config but don't load maps yet
		this.availableLevelConfigs.forEach(levelConfig => {
			this.createLevel(levelConfig);
		});
		
		console.log(`[LevelManager] Registered ${this.levels.size} level controllers (maps will be loaded when activated)`);
	}

	/**
	 * Create a level from a LevelConfiguration
	 */
	public createLevel(config: LevelConfiguration): LevelController | null {
		// Check if this level already exists
		if (this.levels.has(config.id)) {
			console.log(`[LevelManager] Level ${config.id} already exists`);
			return this.levels.get(config.id) || null;
		}
		
		console.log(`[LevelManager] Creating level controller: ${config.displayName} (${config.id})`);
		
		// Create the appropriate controller based on the controller class in the config
		let levelController: LevelController;
		try {
			// Determine which controller class to use based on the controller property
			if (config.controller === SeesawLevelController) {
				levelController = new SeesawLevelController(this.world, config);
			} else if (config.controller === GateCrashLevelController) {
				levelController = new GateCrashLevelController(this.world, config);
			} else {
				console.error(`[LevelManager] Unknown controller for level ${config.id}`);
				return null;
			}
			
			// Register the level (but don't load map yet)
			this.registerLevel(config.id, levelController);
			return levelController;
		} catch (error) {
			console.error(`[LevelManager] Error creating level ${config.id}:`, error);
			return null;
		}
	}

	/**
	 * Get a random level from the available levels based on criteria
	 * @param roundNumber Current round number
	 * @param playerCount Number of active players
	 * @param excludeIds Level IDs to exclude from selection
	 */
	public getRandomLevel(
		roundNumber: number, 
		playerCount: number, 
		excludeIds: string[] = []
	): string | null {
		// Filter levels based on criteria
		const eligibleLevels = Array.from(this.levels.entries())
			.filter(([id, _]) => !excludeIds.includes(id))
			.filter(([_, level]) => {
				const config = this.getLevelConfig(level);
				if (!config) return false;
				
				// Check round constraints
				const isValidRound = roundNumber >= config.minRound && roundNumber <= config.maxRound;
				// Check player count constraints
				const hasEnoughPlayers = playerCount >= config.minPlayers && playerCount <= config.maxPlayers;
				// Check if final round level matches the setting
				const isFinalRoundValid = config.isFinalRound === (roundNumber === gameConfig.maxRounds);
				
				return isValidRound && hasEnoughPlayers && isFinalRoundValid;
			})
			.map(([id, _]) => id);
		
		if (eligibleLevels.length === 0) {
			console.warn(`[LevelManager] No eligible levels for round ${roundNumber} with ${playerCount} players`);
			return null;
		}
		
		// Select a random level
		const randomIndex = Math.floor(Math.random() * eligibleLevels.length);
		return eligibleLevels[randomIndex];
	}

	/**
	 * Get the level configuration for a LevelController
	 */
	private getLevelConfig(level: LevelController): LevelConfiguration | null {
		const configId = Array.from(this.levels.entries())
			.find(([_, controller]) => controller === level)?.[0];
		
		if (!configId) return null;
		
		return this.availableLevelConfigs.find(config => config.id === configId) || null;
	}

	/**
	 * Register a level instance with a unique ID
	 * @param id Unique identifier for the level
	 * @param level Level controller instance
	 */
	public registerLevel(id: string, level: LevelController): void {
		this.levels.set(id, level);
		console.log(`[LevelManager] Registered level: ${id}`);
	}

	/**
	 * Get a list of all registered level IDs
	 */
	public getAvailableLevels(): string[] {
		return Array.from(this.levels.keys());
	}

	public hasLevel(id: string): boolean {
		return this.levels.has(id);
	}

	/**
	 * Activate a specific level by ID
	 * @param id Level ID to activate
	 */
	public activateLevel(id: string): boolean {
		console.log(`[LevelManager] Activating level: ${id}`);
		
		// Force cleanup of any existing active level by explicitly loading an empty map
		if (this.activeLevel) {
			console.log(`[LevelManager] Cleaning up previous active level: ${this.activeLevelId}`);
			try {
				// First try to use the level's cleanup method
				this.activeLevel.cleanup();
				
				// Then force an empty map to be sure
				this.world.loadMap({ blocks: {} });
				
				// Reset active level
				this.activeLevel = null;
				this.activeLevelId = null;
				
				console.log(`[LevelManager] Previous level cleaned up successfully`);
			} catch (error) {
				console.error(`[LevelManager] Error cleaning up previous level:`, error);
				// Continue anyway to try to load the new level
			}
		}

		// Check if the level ID is registered
		const level = this.levels.get(id);
		if (!level) {
			console.error(`[LevelManager] Level ID not found: ${id}`);
			return false;
		}

		try {
			// Use the existing level controller
			this.activeLevel = level;
			this.activeLevelId = id;

			// Call activate method if it exists to set up the level
			if (typeof this.activeLevel.activate === 'function') {
				console.log(`[LevelManager] Calling activate on level controller for ${id}`);
				this.activeLevel.activate();
			} else {
				// Otherwise just load the map directly
				console.log(`[LevelManager] Loading map for ${id}`);
				this.activeLevel.loadMap();
			}

			// Register existing players
			for (const player of this.players.values()) {
				this.activeLevel.registerPlayer(player);
			}

			console.log(`[LevelManager] Successfully activated level: ${id}`);
			return true;
		} catch (err) {
			console.error(`[LevelManager] Failed to activate level ${id}:`, err);
			this.activeLevel = null;
			this.activeLevelId = null;
			return false;
		}
	}

	/**
	 * Get the currently active level ID
	 */
	public getActiveLevelId(): string | null {
		return this.activeLevelId;
	}

	/**
	 * Get the currently active level controller
	 */
	public getActiveLevel(): LevelController | null {
		return this.activeLevel;
	}

	/**
	 * Start the current round with all registered players
	 */
	public startRound(): boolean {
		if (!this.activeLevel) {
			console.warn('[LevelManager] Cannot start round - no active level');
			return false;
		}

		const players = Array.from(this.players.values());
		console.log(`[LevelManager] Starting round with ${players.length} players`);
		this.activeLevel.startRound(players);
		return true;
	}

	/**
	 * End the current round
	 */
	public endRound(): void {
		if (this.activeLevel) {
			this.activeLevel.endRound();
		} else {
			console.warn('[LevelManager] Cannot end round - no active level');
		}
	}

	/**
	 * Register a player with the active level
	 * @param player Player to register
	 */
	public registerPlayer(player: Player): void {
		this.players.set(player.id, player);

		if (this.activeLevel) {
			this.activeLevel.registerPlayer(player);
		} else {
			console.warn('[LevelManager] No active level to register player with');
		}
	}

	/**
	 * Unregister a player from the level manager
	 * @param playerId Player ID to unregister
	 */
	public unregisterPlayer(playerId: string): void {
		this.players.delete(playerId);
	}

	/**
	 * Check if a player has fallen off the course in the active level
	 * @param playerEntity Player entity to check
	 */
	public hasPlayerFallenOff(playerEntity: PlayerEntity): boolean {
		if (!this.activeLevel) return false;
		
		// Check if the level has the hasPlayerFallenOff method
		if ('hasPlayerFallenOff' in this.activeLevel) {
			return (this.activeLevel as any).hasPlayerFallenOff(playerEntity);
		}
		
		// Default fallback
		return playerEntity.position.y < -5;
	}

	/**
	 * Clean up the active level and reset state
	 */
	public cleanup(): void {
		if (this.activeLevel) {
			console.log('[LevelManager] Cleaning up active level');
			this.activeLevel.cleanup();
			this.activeLevel = null;
			this.activeLevelId = null;
		}

		console.log('[LevelManager] Active level cleaned up');
	}

	/**
	 * Clear all registered levels and reset the manager state completely
	 * This is different from cleanup() which only cleans the active level
	 */
	public reset(): void {
		// First clean up active level
		this.cleanup();
		
		// Then clear all registered levels
		this.levels.clear();
		console.log('[LevelManager] All level controllers cleared');
	}
} 