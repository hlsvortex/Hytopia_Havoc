import { World, Player, PlayerEntity } from 'hytopia';
import { LevelController } from './LevelController';
import { type LevelConfiguration } from '../config/LevelConfiguration';
import { SeesawLevelController } from '../levels/SeesawLevelController';
import { GateCrashLevelController } from '../levels/GateCrashLevelController';
import { JumpClubLevelController } from '../levels/JumpClubLevelController';
import { gameConfig } from '../config/gameConfig';
import { UIBridge } from './UIBridge';
import { GameManager } from './GameManager';
/**
 * Central manager for all game levels
 */
export class LevelManager {
	private world: World;
	private levelControllers: Map<string, LevelController> = new Map();
	private gameManager: GameManager;
	//private players: Map<string, Player> = new Map();
	private availableLevelConfigs: LevelConfiguration[];
	private activeLevelController: LevelController | null = null;
	private uiBridge: UIBridge | null = null;

	/**
	 * Create a new level manager
	 * @param world The game world
	 * @param uiBridge Optional initial UIBridge reference
	 */
	constructor(world: World, uiBridge: UIBridge | null = null, gameManager: GameManager) {
		this.world = world;
		this.uiBridge = uiBridge;
		this.gameManager = gameManager;
		this.availableLevelConfigs = gameConfig.availableLevels;
		console.log('[LevelManager] Created Level Manager');
		
		this.loadAvailableLevels();
	}

	/**
	 * Load available levels from gameConfig
	 */
	private loadAvailableLevels(): void {
		console.log(`[LevelManager] Loading ${this.availableLevelConfigs.length} levels from gameConfig`);
		
		this.levelControllers.clear();
		
		this.availableLevelConfigs.forEach(levelConfig => {
			this.createLevelController(levelConfig);
		});
		
		console.log(`[LevelManager] Registered ${this.levelControllers.size} level controllers (maps/obstacles load on activation)`);
	}

	/**
	 * Create a level controller instance from config
	 */
	public createLevelController(config: LevelConfiguration): LevelController | null {
		if (this.levelControllers.has(config.id)) {
			console.log(`[LevelManager] Level controller for ${config.id} already exists`);
			return this.levelControllers.get(config.id) || null;
		}
		
		console.log(`[LevelManager] Creating level controller: ${config.displayName} (${config.id})`);
		
		let newController: LevelController;
		try {
			if (config.controller === SeesawLevelController || config.id === 'seesaw') {
				newController = new SeesawLevelController(this.world, config, this.uiBridge, this.gameManager);
			} else if (config.controller === GateCrashLevelController || config.id === 'gatecrash') {
				newController = new GateCrashLevelController(this.world, config, this.uiBridge, this.gameManager);
			} else if (config.controller === JumpClubLevelController || config.id === 'jumpclub') {
				newController = new JumpClubLevelController(this.world, config, this.uiBridge, this.gameManager);
			} else {
				console.error(`[LevelManager] Unknown controller type configured for level ${config.id}`);
				return null;
			}
			
			this.levelControllers.set(config.id, newController);
			console.log(`[LevelManager] Registered controller for level: ${config.id}`);
			return newController;
		} catch (error) {
			console.error(`[LevelManager] Error creating level controller for ${config.id}:`, error);
			return null;
		}
	}

	public getLevelConfigById(levelId: string): LevelConfiguration | undefined {
		return this.availableLevelConfigs.find(config => config.id === levelId);
	}

	/**
	 * Activate a specific level by ID
	 * @param id Level ID to activate
	 */
	public activateLevel(id: string): boolean {
		console.log(`[LevelManager] Attempting to activate level: ${id}`);
		
		if (this.activeLevelController) {
			const previousLevelName = this.activeLevelController.getLevelName();
			try {
				this.activeLevelController.cleanup();
			} catch (error) {
				console.error(`[LevelManager] Error during cleanup of ${previousLevelName}:`, error);
			}
	
			this.activeLevelController = null;
		}

		const controller = this.levelControllers.get(id);

		console.log(`[LevelManager] Activating level controller: ${controller?.constructor.name}`);

		if (!controller) {
			console.error(`[LevelManager] Level controller not found for ID: ${id}`);
			return false;
		}

		try {
			controller.loadLevel();
			this.activeLevelController = controller;
			return true;
		} catch (error) {
			console.error(`[LevelManager] Error during level controller activation:`, error);
			this.activeLevelController = null;
			return false;
		}
	}

	/**
	 * Get the configuration objects for all available levels.
	 * @returns Array of LevelConfiguration objects.
	 */
	public getAvailableLevelConfigs(): LevelConfiguration[] {
		return this.availableLevelConfigs;
	}

	/**
	 * Gets the currently active level controller.
	 * @returns The active LevelController instance or null.
	 */
	public getActiveLevelController(): LevelController | null {
		console.log(`[LevelManager] getActiveLevelController called. Returning: ${this.activeLevelController ? this.activeLevelController.constructor.name : 'null'}`);
		return this.activeLevelController;
	}

	public getActiveLevelConfig(): LevelConfiguration | null {
		return this.activeLevelController?.getLevelConfig() || null;
	}

	/**
	 * Start the current round using the active controller
	 */
	public startRound(players: Player[], qualificationTarget: number): boolean {
		if (!this.activeLevelController) {
			console.error("[LevelManager] Cannot start round, no active level controller.");
			return false;
		}
		console.log(`[LevelManager] Starting round on ${this.activeLevelController.getLevelName()} with ${players.length} players`);
		this.activeLevelController.startRound(players, qualificationTarget);
		return true;
	}

	/**
	 * End the current round (if active)
	 */
	public endRound(): void {
		if (this.activeLevelController) {
			console.log(`[LevelManager] Ending round for ${this.activeLevelController.getLevelName()}`);
			this.activeLevelController.endRound();
		} else {
			console.warn('[LevelManager] Cannot end round - no active level controller');
		}
	}

	/**
	 * Clean up the active level controller and reset state
	 */
	public cleanup(): void {
		console.log(`[LevelManager] Cleanup called.`);
		if (this.activeLevelController) {
			const levelName = this.activeLevelController.getLevelName();
			const controllerClassName = this.activeLevelController.constructor.name;
			console.log(`[LevelManager] Cleaning up active level controller: ${levelName} (${controllerClassName})`);
			try {
				this.activeLevelController.cleanup();
			} catch(error) {
				console.error(`[LevelManager] Error during cleanup call for ${levelName}:`, error);
			}
			this.activeLevelController = null;
			console.log(`[LevelManager] Active level controller nulled.`);
		} else {
			console.log(`[LevelManager] Cleanup called but no activeLevelController was set.`);
		}
	}

	/**
	 * Clear all registered level controllers and reset the manager state completely
	 */
	public reset(): void {
		this.cleanup();
		this.levelControllers.clear();
		this.loadAvailableLevels();
		console.log('[LevelManager] LevelManager fully reset.');
	}

	/**
	 * Allows setting/updating the UIBridge after construction.
	 */
	public setUIBridge(uiBridge: UIBridge): void {
		this.uiBridge = uiBridge;
		console.log('[LevelManager] UIBridge linked.');
		this.levelControllers.forEach(controller => controller.setUIBridge(this.uiBridge));
	}
} 