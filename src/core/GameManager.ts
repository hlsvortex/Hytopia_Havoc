import { World, Player, PlayerEvent, PlayerCameraMode, EntityEvent, PlayerUIEvent, Entity, PlayerEntity, ColliderShape, CollisionGroup } from 'hytopia';
import { EventEmitter } from '../utils/EventEmitter';
import { RoundManager } from './RoundManager';
import { gameConfig } from '../config/gameConfig';
import { LevelManager } from './LevelManager';
import { UIBridge } from './UIBridge';
import PlayerController from '../PlayerController';
import { CourseLevelController } from './CourseLevelController';
import { LevelController } from './LevelController'; // Import base LevelController

type GameState = 'Lobby' | 'Starting' | 'RoundInProgress' | 'PostRound' | 'GameOver';

export class GameManager {
	private world: World;
	private state: GameState = 'Lobby';
	private players: Map<string, Player> = new Map();
	private playerEntities: Map<string, PlayerEntity> = new Map();
	private roundManager: RoundManager | null = null;
	public levelManager: LevelManager;
	private uiBridge: UIBridge | null = null;
	private currentQualificationTarget: number = 0;
	// Store listener reference for cleanup
	private boundHandleLevelRoundEnd: (data: { q: string[], e: string[] }) => void;
	private boundHandleBeforeRoundTransition: (data: { nextLevelId: string | null, qualifiedPlayers: string[] }) => void;
	
	public events = new EventEmitter<{
		GameWon: string;
		GameEnded: string;
	}>();

	constructor(world: World) {
		this.world = world;
		this.levelManager = new LevelManager(world, this.uiBridge);
		this.boundHandleLevelRoundEnd = this.handleLevelRoundEnd.bind(this);
		this.boundHandleBeforeRoundTransition = this.handleBeforeRoundTransition.bind(this);
		console.log('[GameManager] Initialized in Lobby state.');
		this.registerHytopiaListeners();
	}

	public setUIBridge(uiBridge: UIBridge): void {
		this.uiBridge = uiBridge;
		console.log('[GameManager] UIBridge linked.');
		if(this.levelManager) {
			this.levelManager.setUIBridge(uiBridge);
		}
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
		// Called by prepareRound
		console.log(`[GameManager] Spawning player ${player.id} in game`);
		
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
		    // Define collision groups for the player entity
		    rigidBodyOptions: {
		        // Add other rigid body options if needed (e.g., mass, friction)
		        colliders: [
		            {
		                // Define the main player collider shape (e.g., capsule)
		                 shape: ColliderShape.CAPSULE, // Or BOX, etc.
                         halfHeight: 0.6, // Example value
                         radius: 0.4,    // Example value
		                 collisionGroups: {
		                    belongsTo: [CollisionGroup.PLAYER],
		                    collidesWith: [
		                        CollisionGroup.ENTITY_SENSOR,  // Ensure it collides with sensors
		                      ]
		                }
		            }
		        ]
		    }
		});
		
		playerEntity.setCollisionGroupsForSensorColliders({
			belongsTo: [CollisionGroup.PLAYER],
			collidesWith: [
				CollisionGroup.ENTITY,
				CollisionGroup.ENTITY_SENSOR,  // Ensure it collides with sensors
				CollisionGroup.PLAYER,
				CollisionGroup.BLOCK
			]
		});

		// Spawn at the determined spawn point
		playerEntity.spawn(this.world, spawnPoint); 
		this.playerEntities.set(player.id, playerEntity);

		// DO NOT CHANGE THIS CODE - IT IS CORRECT
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
			    let respawnPoint = spawnPoint; 
			    if (activeLevelController && activeLevelController instanceof CourseLevelController) {
			        const courseController = activeLevelController as CourseLevelController;
			        const checkpointSpawn = courseController.getCheckpointRespawnPosition(playerEntity.position);
			        if (checkpointSpawn) {
			            respawnPoint = checkpointSpawn;
			        }
			    }
			    playerController.handleFall(playerEntity, respawnPoint); 
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
			image: `level_${level.id}.jpg`,
            // Include other relevant data for UI if needed
            minPlayers: level.minPlayers,
            maxPlayers: level.maxPlayers,
            qualificationSlotsRatio: level.qualificationSlotsRatio
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

        // --- Calculate Qualification Target --- 
        const config = this.levelManager.getLevelConfigById(levelId);
        const playerCount = this.players.size;
        this.currentQualificationTarget = playerCount; 

        if (config) {
            // Force a final round configuration when only 2 players remain
            const onlyTwoPlayersRemain = this.roundManager?.getActivePlayerIds().length === 2;
            const isFinalRound = config.isFinalRound || onlyTwoPlayersRemain;
            
            if (isFinalRound) {
                this.currentQualificationTarget = 1;
                console.log(`[GameManager] Level ${levelId} is ${onlyTwoPlayersRemain ? 'treating as FINAL round (2 players)' : 'FINAL round'}. Qualification target: ${this.currentQualificationTarget}`);
            } else {
                const ratio = config.qualificationSlotsRatio ?? 0.6; 
                this.currentQualificationTarget = Math.max(1, Math.ceil(playerCount * ratio));
                console.log(`[GameManager] Level ${levelId} uses ratio ${ratio}. Player count: ${playerCount}. Qualification target: ${this.currentQualificationTarget}`);
            }
        } else {
             console.warn(`[GameManager] Could not find config for level ${levelId} to calculate qualification target. Defaulting to all players.`);
             this.currentQualificationTarget = playerCount; 
        }
        // --- End Calculation --- 

        // Initialize RoundManager if it doesn't exist (first round)
        if (!this.roundManager) {
            const initialPlayerIds = Array.from(this.players.keys());
            this.roundManager = new RoundManager(this.world, initialPlayerIds, this.levelManager); 
            // Subscribe to RoundManager events
            this.roundManager.events.on('GameEndConditionMet', this.handleGameEndConditionMet.bind(this)); 
            this.roundManager.events.on('BeforeRoundTransition', this.boundHandleBeforeRoundTransition); // Use bound handler
            console.log('[GameManager] 4. Round Manager initialized and listeners attached.');
        } else {
             console.log('[GameManager] 4. Round Manager already exists (likely next round).');
        }

        // Get active (qualified) player IDs from the RoundManager
        const activePlayerIds = this.roundManager?.getActivePlayerIds() || [];
        const eliminatedPlayerIds = this.roundManager?.getEliminatedPlayerIds() || [];
        
        console.log(`[GameManager] 5. Active players: ${activePlayerIds.length}, Eliminated players: ${eliminatedPlayerIds.length}`);

        // Spawn only active (non-eliminated) players into the new level
        console.log(`[GameManager] 6. Spawning ${activePlayerIds.length} active players for round...`);
        
        // First despawn any existing player entities to prevent duplicates
        this.playerEntities.forEach((entity, playerId) => {
            if (entity.isSpawned) {
                console.log(`[GameManager] Despawning existing entity for player ${playerId}`);
                entity.despawn();
            }
        });
        this.playerEntities.clear();
        
        // Now spawn only the active players
        activePlayerIds.forEach(playerId => {
            const player = this.players.get(playerId);
            if (player) {
                this.spawnPlayerInGame(player);
            }
        });
        
        // Set eliminated players to spectator mode
        eliminatedPlayerIds.forEach(playerId => {
            const player = this.players.get(playerId);
            if (player) {
                console.log(`[GameManager] Setting eliminated player ${playerId} to spectator mode`);
                player.camera.setMode(PlayerCameraMode.SPECTATOR);
                this.uiBridge?.closeMenu(player);
            }
        });
        
        console.log(`[GameManager] 7. Finished spawning players for level ${levelId}. Ready for gameplay start.`);
        
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
		
		// --- Show & Update HUD for all players --- 
		console.log('[GameManager] Showing & Initializing HUD for all players.');
		const activeLevelController = this.levelManager.getActiveLevelController();
		const activeLevelConfig = activeLevelController ? this.levelManager.getLevelConfigById(activeLevelController.getConfigId()) : null;
		const initialHudData = {
		    goal: activeLevelConfig?.displayName ?? "Survive!",
		    statusLabel: "QUALIFIED",
		    currentCount: 0,
		    totalCount: this.currentQualificationTarget,
		    timer: null 
		};
		
		this.players.forEach(player => {
			this.uiBridge?.showHud(player);
			this.uiBridge?.updateHud(player, initialHudData);
		});
		// --- End Show & Update HUD ---
		
		// Start the round logic via LevelManager
		console.log(`[GameManager] 8. Attempting to start round gameplay via LevelManager with ${this.players.size} players.`);
		if (this.levelManager.startRound(this.getPlayers(), this.currentQualificationTarget)) { 
			console.log(`[GameManager] 9. Round gameplay started successfully.`);
            
            // Subscribe GameManager and RoundManager to level end event AFTER round starts
            if (activeLevelController) {
                console.log(`[GameManager] Subscribing GameManager to RoundEnd event of ${activeLevelController.getLevelName()}`);
                activeLevelController.events.on('RoundEnd', this.boundHandleLevelRoundEnd);
                this.roundManager?.subscribeToActiveLevelEndEvent(); // Tell RoundManager to subscribe too
            } else {
                 console.error("[GameManager] Cannot subscribe to level end: No active controller after startRound!");
                 this.endGame('MissingControllerPostStart');
            }
		} else {
			console.error(`[GameManager] LevelManager failed to start round gameplay. Ending game.`);
			this.endGame('FailedToStartRoundGameplay'); 
		}
	}

	private getPlayerName(playerId: string): string {
		// Use player ID as name for now
		return playerId;
	}

	private handleLevelRoundEnd(data: { q: string[], e: string[] }): void {
		console.log(`[GameManager] Received RoundEnd event from LevelController.`);
		
		this.uiBridge?.broadcastAnimatedText("ROUND", "OVER!"); // Default 3s duration
		
		if (!this.roundManager) {
			console.error("[GameManager] Round ended but RoundManager is missing!");
			this.endGame('RoundManagerMissingOnRoundEnd');
			return;
		}
		
		const shouldContinue = this.roundManager.processRoundResults(data);
		
		// Prepare player lists for UI using correct event data
		const qualifiedNames = data.q.map(id => this.getPlayerName(id));
		const eliminatedNames = data.e.map(id => this.getPlayerName(id)); 

		// Despawn remaining players (those in 'e')
		console.log("[GameManager] Despawning eliminated player entities...");
		this.playerEntities.forEach((entity, playerId) => {
			if (entity.isSpawned && data.e.includes(playerId)) { // Check if player ID is in eliminated list
				console.log(`[GameManager] Despawning eliminated player ${playerId}`);
				try {
					entity.player?.camera.setMode(PlayerCameraMode.SPECTATOR); 
					entity.despawn();
				 } catch(e) {
					 console.error(`[GameManager] Error despawning player ${playerId} on round end:`, e);
				 }
			}
		});
		// Remove despawned entities from the map
		data.e.forEach(playerId => this.playerEntities.delete(playerId));
		// Qualified players should have already been despawned with a delay by handlePlayerFinished
		// Clear remaining qualified players from map too, just in case delay overlaps
		data.q.forEach(playerId => this.playerEntities.delete(playerId));

		// Check if game ended based on results
		if (!shouldContinue) {
			console.log("[GameManager] Round results indicate game should end. (Winner/Max Rounds)");
			setTimeout(() => {
				 if (this.state === 'GameOver') return;
				 console.log("[GameManager] Broadcasting final round results UI.");
				 this.uiBridge?.broadcastRoundResults(qualifiedNames, eliminatedNames);
				 // handleGameEndConditionMet handles full endGame call
			}, 3000); 
			return; 
		}
		
		// Game continues: Show results, wait, then trigger next round logic 
		console.log("[GameManager] Game continues. Showing results, then starting next round logic...");
		const eliminationAnimTime = (eliminatedNames.length * 300); 
		const baseResultsDisplayTime = 5000; 
		const resultsDisplayDuration = Math.max(baseResultsDisplayTime, eliminationAnimTime) + 500; 
		const transitionDelay = 3000; 

		// Show Results Panel after ROUND OVER text
		setTimeout(() => {
			if (this.state === 'GameOver') return; 
			console.log("[GameManager] Broadcasting round results UI.");
			this.uiBridge?.broadcastRoundResults(qualifiedNames, eliminatedNames);
		}, transitionDelay); 

		// Start next round logic AFTER results panel duration
		setTimeout(() => {
			if (this.state === 'GameOver') return; 
			
			 console.log("[GameManager] Cleaning up finished level and preparing for next round.");
			 const finishedLevelController = this.levelManager.getActiveLevelController(); 
			 if (finishedLevelController) {
				finishedLevelController.events.off('RoundEnd', this.boundHandleLevelRoundEnd);
			 }
			 this.roundManager?.unsubscribeFromActiveLevelEndEvent();
			 this.levelManager.cleanup();
			 
			 this.state = 'PostRound'; 
			 console.log("[GameManager] Triggering next round selection.");
			 this.roundManager?.startNextRoundLogic(); // This emits BeforeRoundTransition

		}, transitionDelay + resultsDisplayDuration); 
	}

	private handleGameEndConditionMet(reason: string): void {
		console.log(`[GameManager] GameEndConditionMet event received: ${reason}`);
		if (this.state === 'GameOver') return; // Avoid double-ending
		
		if (reason === 'LastPlayerStanding' && this.roundManager) {
			const winnerId = this.roundManager.getLastPlayerId();
			if (winnerId) {
				// const winnerPlayer = this.players.get(winnerId); // Get player if needed
				console.log(`[GameManager] Winner detected: ${winnerId}`);
				this.events.emit('GameWon', winnerId); 
			}
		}
		
		// Make sure HUD is hidden for all players
		this.players.forEach(player => {
			this.uiBridge?.hideHud(player);
		});
		
		// Always end the game when this event occurs
		this.endGame(reason);
	}

	private handleBeforeRoundTransition(data: { nextLevelId: string | null, qualifiedPlayers: string[] }): void {
		console.log(`[GameManager] Received BeforeRoundTransition. Next Level ID: ${data.nextLevelId}`);
		
		if (!data.nextLevelId) {
			console.error("[GameManager] BeforeRoundTransition received null level ID. Cannot proceed.");
			this.endGame('NoNextLevelSelected');
			return;
		}
		
		// Close HUD and round results UI for all players before showing level select
		console.log("[GameManager] Closing HUD and round results before showing level select");
		this.players.forEach(player => {
			// Hide HUD
			this.uiBridge?.hideHud(player);
			// Close round results panel
			this.uiBridge?.closeRoundResults(player);
		});
		
		// Prepare level list for UI (same as in startGame, maybe refactor later)
		const levelList = gameConfig.availableLevels.map(level => ({
			id: level.id,
			name: level.displayName,
			description: `${level.levelType} round - ${level.difficulty} difficulty`,
			image: `level_${level.id}.jpg`,
            minPlayers: level.minPlayers,
            maxPlayers: level.maxPlayers,
            qualificationSlotsRatio: level.qualificationSlotsRatio
		}));
		
		// Show Level Select UI to all currently connected players
		// (RoundManager has already filtered based on qualified players for level selection)
		console.log("[GameManager] Showing Level Select for next round.");
		this.players.forEach(player => {
			this.uiBridge?.showLevelSelect(player, levelList);
		});
		
		// Set state back to Starting, ready for UI selection
		this.state = 'Starting'; 
	}

	public endGame(reason: string): void {
		if (this.state === 'GameOver') return;
		console.log(`[GameManager] Ending game. Reason: ${reason}`);
		const previousState = this.state;
		this.state = 'GameOver';

        // Unsubscribe from RoundManager events
        if (this.roundManager) {
             this.roundManager.events.off('GameEndConditionMet', this.handleGameEndConditionMet.bind(this));
             this.roundManager.events.off('BeforeRoundTransition', this.boundHandleBeforeRoundTransition);
             this.roundManager.cleanup(); 
             this.roundManager = null;
        }
        
        // Unsubscribe GameManager from Level End event before cleaning LevelManager
        const activeLevelController = this.levelManager.getActiveLevelController();
        if (activeLevelController) {
            console.log(`[GameManager] endGame: Unsubscribing from RoundEnd of ${activeLevelController.getLevelName()}`);
            activeLevelController.events.off('RoundEnd', this.boundHandleLevelRoundEnd);
        }
        // Also tell RoundManager to unsubscribe its listener if it exists
        // This might be redundant if roundManager cleanup handles it, but safe.
        // this.roundManager?.unsubscribeFromActiveLevelEndEvent(); 
        
        // Cleanup LevelManager (cleans active level controller)
		if (this.levelManager) {
			this.levelManager.cleanup();
		}
		
        // Despawn player entities
		console.log(`[GameManager] Despawning ${this.playerEntities.size} player entities.`);
		this.playerEntities.forEach(entity => {
			if (entity.isSpawned) entity.despawn();
		});
		this.playerEntities.clear();
		
        // Emit event and notify players
		this.events.emit('GameEnded', reason);
		this.world.chatManager.sendBroadcastMessage(`Game Over! Reason: ${reason}`);
		console.log("[GameManager] Game Over. Resetting players and state to Lobby.");
		
		this.players.forEach(player => {
			// Ensure UI elements are closed/hidden
			this.uiBridge?.hideHud(player);
			this.uiBridge?.closeRoundResults(player);

			player.camera.setMode(PlayerCameraMode.SPECTATOR); 
			this.uiBridge?.showMainMenu(player); 
		});
		this.state = 'Lobby'; 
	}
}