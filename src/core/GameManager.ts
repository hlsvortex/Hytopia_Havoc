import { World, Player, PlayerEvent, PlayerCameraMode, EntityEvent, PlayerUIEvent, Entity, PlayerEntity } from 'hytopia';
import { EventEmitter } from '../utils/EventEmitter';
import { RoundManager } from './RoundManager';
import { gameConfig } from '../config/gameConfig';
import { LevelManager } from './LevelManager';
import { UIBridge } from './UIBridge';
import PlayerController from '../PlayerController';
import { CourseLevelController } from './CourseLevelController';

type GameState = 'Lobby' | 'Starting' | 'RoundInProgress' | 'PostRound' | 'GameOver';

export class GameManager {
	private world: World;
	private state: GameState = 'Lobby';
	private players: Map<string, Player> = new Map();
	private playerEntities: Map<string, PlayerEntity> = new Map();
	private roundManager: RoundManager | null = null;
	public levelManager: LevelManager;
	private uiBridge: UIBridge | null = null;
	public events = new EventEmitter<{
		GameWon: string;
		GameEnded: string;
	}>();

	constructor(world: World) {
		this.world = world;
		this.levelManager = new LevelManager(world);
		console.log('[GameManager] Initialized in Lobby state.');
		this.registerHytopiaListeners();
	}

	public setUIBridge(uiBridge: UIBridge): void {
		this.uiBridge = uiBridge;
		console.log('[GameManager] UIBridge linked.');
	}

	public getGameState(): GameState {
		return this.state;
	}

	public isGameInProgress(): boolean {
		return this.state !== 'Lobby' && this.state !== 'GameOver';
	}

	public getPlayers(): Player[] {
		return Array.from(this.players.values());
	}

	public getPlayerById(playerId: string): Player | undefined {
		return this.players.get(playerId);
	}

	private registerHytopiaListeners(): void {
		this.world.on(PlayerEvent.JOINED_WORLD, this.handlePlayerJoin.bind(this));
		this.world.on(PlayerEvent.LEFT_WORLD, this.handlePlayerLeave.bind(this));
	}

	private unregisterHytopiaListeners(): void {
		this.world.off(PlayerEvent.JOINED_WORLD, this.handlePlayerJoin.bind(this));
		this.world.off(PlayerEvent.LEFT_WORLD, this.handlePlayerLeave.bind(this));
	}

	private handlePlayerJoin(payload: { player: Player }): void {
		const player = payload.player;
		if (this.players.has(player.id)) return;

		console.log(`[GameManager] Player joined world: ${player.id}`);
		this.players.set(player.id, player);

		if (this.isGameInProgress()) {
			this.enterSpectatorMode(player);
		} else {
			this.uiBridge?.showMainMenu(player);
		}
	}

	private handlePlayerLeave(payload: { player: Player }): void {
		const player = payload.player;
		console.log(`[GameManager] Player left world: ${player.id}`);
		this.players.delete(player.id);
		
		const playerEntity = this.playerEntities.get(player.id);
		if (playerEntity && playerEntity.isSpawned) {
			playerEntity.despawn();
			console.log(`[GameManager] Despawned entity for ${player.id}`);
		}
		this.playerEntities.delete(player.id);

		if (this.state === 'RoundInProgress' || this.state === 'PostRound') {
			if (this.players.size < gameConfig.absoluteMinPlayers) {
				this.endGame('NotEnoughPlayers');
			}
		} else if (this.state === 'Lobby') {
			console.log(`[GameManager] Player left during lobby. Players remaining: ${this.players.size}`);
		}
	}

	/** Called by UIBridge when player clicks 'Play' */
	public handlePlayerAttemptJoin(player: Player): void {
		console.log(`[GameManager] Player ${player.id} attempting to join/spawn.`); 
		if (this.isGameInProgress()) {
			this.enterSpectatorMode(player);
		} else if (this.state === 'Lobby') {
			// In lobby, player clicked Play. Hide their menu and mark them as ready (conceptually).
			console.log(`[GameManager] Player ${player.id} ready in lobby. Hiding menu.`); 
			this.uiBridge?.closeMenu(player); // Tell UIBridge to close the menu
			// We don't spawn yet - spawning happens in loadAndStartRound
		} else {
			console.warn(`[GameManager] Player ${player.id} attempted join in unexpected state: ${this.state}`); 
		}
	}

	private enterSpectatorMode(player: Player): void {
		console.log(`[GameManager] Setting player ${player.id} to spectator mode.`);
		this.uiBridge?.closeMenu(player);

		const existingEntity = this.playerEntities.get(player.id);
		if (existingEntity && existingEntity.isSpawned) {
			existingEntity.despawn();
			this.playerEntities.delete(player.id);
			console.log(`[GameManager] Despawned existing entity for spectator ${player.id}.`);
		}

		player.camera.setMode(PlayerCameraMode.SPECTATOR);
		this.world.chatManager.sendPlayerMessage(player, "A game is in progress. Entering spectator mode.");
	}

	private spawnPlayerInGame(player: Player): void {
		if (this.playerEntities.has(player.id)) {
			console.warn(`[GameManager] Attempted to spawn player ${player.id} who already has an entity.`);
			return;
		}
		
		// --- Get Spawn Point from Active Level Controller --- 
		const activeLevelController = this.levelManager.getActiveLevelController();
		let spawnPoint = { x: 0, y: 10, z: 0 }; // Default fallback spawn
		
		if (activeLevelController && activeLevelController instanceof CourseLevelController) {
		    const courseController = activeLevelController as CourseLevelController;
		    const levelSpawn = courseController.getSpawnPosition();
		    if (levelSpawn) {
		        spawnPoint = levelSpawn;
		    } else {
		         console.warn(`[GameManager] Active course level controller ${courseController.getLevelName()} did not provide a spawn point. Using default.`);
		    }
		} else {
		     console.warn(`[GameManager] No active course level controller found. Using default spawn point.`);
		}
		// --- End Get Spawn Point ---
		
		console.log(`[GameManager] Spawning player ${player.id} in game at ${JSON.stringify(spawnPoint)}`);
		this.uiBridge?.closeMenu(player);
		
		const playerController = new PlayerController();
		const fallThreshold = -15;
		playerController.setFallThreshold(fallThreshold);

		const playerEntity = new PlayerEntity({
			player,
			name: player.id,
			modelUri: 'models/players/player.gltf',
			modelLoopedAnimations: ['idle'],
			modelScale: 0.61,
			controller: playerController,
		});
		
		// Spawn at the determined spawn point
		playerEntity.spawn(this.world, spawnPoint); 
		// console.log(`[GameManager] Spawned entity for ${player.id} at ${JSON.stringify(spawnPoint)}`); // Log moved up
		this.playerEntities.set(player.id, playerEntity);

		player.camera.setMode(PlayerCameraMode.FIRST_PERSON);
		player.camera.setForwardOffset(-6); 
		player.camera.setOffset({ x: 0, y: 2, z: 0 });
		player.camera.setAttachedToEntity(playerEntity);
		
		this.world.chatManager.sendPlayerMessage(player, `Use WASD to move, Space to jump.`);
		playerController.setCheckpoint(spawnPoint); // Use the determined spawn point as the first checkpoint
		
		if (activeLevelController) {
		    activeLevelController.registerPlayer(player); // Register player with the actual controller
		}

		const tickListener = () => {
			if (!playerEntity.isSpawned) {
				this.world.off(EntityEvent.TICK, tickListener);
				return;
			}
			if (playerEntity.position.y < fallThreshold) {
			    // --- Get Checkpoint Respawn --- 
			    let respawnPoint = spawnPoint; // Default to initial spawn
			    if (activeLevelController && activeLevelController instanceof CourseLevelController) {
			        const courseController = activeLevelController as CourseLevelController;
			        const checkpointSpawn = courseController.getCheckpointRespawnPosition(playerEntity.position);
			        if (checkpointSpawn) {
			            respawnPoint = checkpointSpawn;
			        }
			    }
			     // Pass the calculated respawn point to handleFall
			    playerController.handleFall(playerEntity, respawnPoint); 
			     // --- End Get Checkpoint Respawn ---
			}
		};
		this.world.on(EntityEvent.TICK, tickListener);
	}

	public startGame(): void {
		if (this.state !== 'Lobby') {
			console.warn(`[GameManager] Attempted start game in state: ${this.state}`);
			return;
		}
		if (this.players.size < gameConfig.minPlayersToStart) {
			this.world.chatManager.sendBroadcastMessage(`Need ${gameConfig.minPlayersToStart} players, have ${this.players.size}.`);
			console.warn(`[GameManager] Not enough players to start.`);
			return;
		}
		
		console.log(`[GameManager] Starting game with ${this.players.size} players.`);
		this.state = 'Starting';
		
		const levelList = gameConfig.availableLevels.map(level => ({
			id: level.id,
			name: level.displayName,
			description: `${level.levelType} round - ${level.difficulty} difficulty`,
			image: `level_${level.id}.jpg`
		}));
		
		this.players.forEach(player => {
			this.uiBridge?.showLevelSelect(player, levelList);
		});
	}

	/** 
	 * Called by UIBridge when LEVEL_SELECTED is received. 
	 * Activates the level and spawns players.
	 */
	public prepareRound(levelId: string): void {
		console.log(`[GameManager] 1. Preparing round for level: ${levelId}`);
		 if (this.state !== 'Starting' && this.state !== 'PostRound') { 
			console.warn(`[GameManager] Cannot prepare level in current state: ${this.state}. Aborting.`);
			return;
		}

		// Activate the chosen level
		console.log(`[GameManager] 2. Attempting to activate level: ${levelId}`);
		if (!this.levelManager.activateLevel(levelId)) {
			console.error(`[GameManager] Failed to activate level ${levelId}. Ending game.`);
			this.endGame('FailedToActivateLevel');
			return;
		}
		console.log(`[GameManager] 3. Level ${levelId} activated successfully.`);

		// Initialize RoundManager if it doesn't exist (first round)
		if (!this.roundManager) {
			const initialPlayerIds = Array.from(this.players.keys());
			this.roundManager = new RoundManager(this.world, initialPlayerIds, this.levelManager);
			this.roundManager.events.on('GameEndConditionMet', this.handleGameEndConditionMet.bind(this));
			console.log('[GameManager] 4. Round Manager initialized.');
		} else {
			 console.log('[GameManager] 4. Round Manager already exists (likely next round).');
		}

		// Spawn players into the new level
		console.log(`[GameManager] 5. Spawning ${this.players.size} players for round...`);
		this.players.forEach(player => {
			this.spawnPlayerInGame(player); // Spawn player entities
		});
		console.log(`[GameManager] 6. Finished spawning players for level ${levelId}. Ready for gameplay start.`);
		
		// Set state to RoundInProgress AFTER spawning is done
		this.state = 'RoundInProgress';
	}
	
	/** 
	 * Called by UIBridge when ROUND_READY is received.
	 * Starts the actual gameplay logic for the already loaded/spawned round.
	 */
	public beginRoundGameplay(): void {
		 console.log(`[GameManager] 7. Received signal to begin gameplay.`);
		  if (this.state !== 'RoundInProgress') {
			console.warn(`[GameManager] Cannot begin round gameplay in state: ${this.state}.`);
			return; 
		}
		
		// Show HUD for all players
		console.log('[GameManager] Showing HUD for all players.');
		this.players.forEach(player => {
			this.uiBridge?.showHud(player);
		});
		
		// Start the round logic via LevelManager, passing the current players
		console.log(`[GameManager] 8. Attempting to start round gameplay via LevelManager with ${this.players.size} players.`);
		if (this.levelManager.startRound(this.getPlayers())) { // Pass players map 
			console.log(`[GameManager] 9. Round gameplay started successfully.`);
		} else {
			console.error(`[GameManager] LevelManager failed to start round gameplay. Ending game.`);
			this.endGame('FailedToStartRoundGameplay');
		}
	}

	private handleGameEndConditionMet(reason: string): void {
		console.log(`[GameManager] GameEndConditionMet event received: ${reason}`);
		if (reason === 'LastPlayerStanding' && this.roundManager) {
			const winnerId = this.roundManager.getLastPlayerId();
			if (winnerId) {
				const winnerPlayer = this.players.get(winnerId);
				console.log(`[GameManager] Winner detected: ${winnerId}`);
				this.events.emit('GameWon', winnerId);
			}
		}
		this.endGame(reason);
	}

	public endGame(reason: string): void {
		if (this.state === 'GameOver') return;
		console.log(`[GameManager] Ending game. Reason: ${reason}`);
		const previousState = this.state;
		this.state = 'GameOver';
		if (this.roundManager) {
			this.roundManager.events.off('GameEndConditionMet', this.handleGameEndConditionMet.bind(this));
			this.roundManager.cleanup();
			this.roundManager = null;
		}
		if (this.levelManager) {
			this.levelManager.cleanup();
		}
		
		console.log(`[GameManager] Despawning ${this.playerEntities.size} player entities.`);
		this.playerEntities.forEach(entity => {
			if (entity.isSpawned) entity.despawn();
		});
		this.playerEntities.clear();
		
		this.events.emit('GameEnded', reason);
		this.world.chatManager.sendBroadcastMessage(`Game Over! Reason: ${reason}`);
		console.log("[GameManager] Game Over. Resetting to Lobby state.");
		
		this.players.forEach(player => {
			player.camera.setMode(PlayerCameraMode.SPECTATOR);
			this.uiBridge?.showMainMenu(player);
		});
		this.state = 'Lobby';
	}
} 