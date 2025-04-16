import { World, Player, PlayerEvent, PlayerCameraMode,  Entity, PlayerEntity, ColliderShape, CollisionGroup, Audio } from 'hytopia';
import { EventEmitter } from '../utils/EventEmitter';
import { RoundManager } from './RoundManager';
import { gameConfig } from '../config/gameConfig';
import { LevelManager } from './LevelManager';
import { UIBridge } from './UIBridge';
import PlayerController from '../PlayerController';
import type { LevelController } from './LevelController';
import { Team } from '../enums/Team';
import type { PlayerDataJSON } from '../types/PlayerDataJSON';
import { DEFAULT_PLAYER_DATA } from '../types/PlayerDataJSON';
import { PlayerData, type PlayerReward } from '../types/PlayerData';

type GameState = 'Lobby' | 'Starting' | 'RoundInProgress' | 'PostRound' | 'GameOver';


export class GameManager {
	
	private world: World;
	private roundManager: RoundManager | null = null;
	private state: GameState = 'Lobby';
	private players: Map<string, Player> = new Map();
	private joinedPlayerData : Map<string, PlayerData> = new Map();
	private readyPlayerIds: Set<string> = new Set(); // Track players who are ready to play
	private spectatorIds: Set<string> = new Set(); // Track players who are in spectator mode

	//public activePlayerIds: Set<string> = new Set(); // Added
	public eliminatedPlayerIds: Set<string> = new Set(); // Added

	private uiBridge: UIBridge | null = null;
	private currentQualificationTarget: number = 0;
	// Store listener reference for cleanup
	private boundHandleLevelRoundEnd: (data: { q: string[], e: string[] }) => void;
	private boundHandleBeforeRoundTransition: (data: { nextLevelId: string | null, qualifiedPlayers: string[] }) => void;
	private currentRound: number = 0; // Track the round number
	
	public levelManager: LevelManager;
	
	private mainMenuMusic: Audio | null = null;
	private battleMusic: Audio | null = null;
	private currentMusic: Audio | null = null;

	public events = new EventEmitter<{
		GameWon: string;
		GameEnded: string;
	}>();

	constructor(world: World) {
		this.world = world;
		this.levelManager = new LevelManager(world, this.uiBridge, this);
		this.boundHandleLevelRoundEnd = this.handleLevelRoundEnd.bind(this);
		this.boundHandleBeforeRoundTransition = this.handleBeforeRoundTransition.bind(this);
		console.log('[GameManager] Initialized in Lobby state.');
		this.registerHytopiaListeners();
		this.initializeMusic();
		this.playSongMainMenuMusic();
	}

	public setUIBridge(uiBridge: UIBridge): void {
		this.uiBridge = uiBridge;
		console.log('[GameManager] UIBridge linked.');
		if(this.levelManager) {
			this.levelManager.setUIBridge(uiBridge);
		}
	}

	public getPlayerData(playerId: string): PlayerData | null {
		return this.joinedPlayerData.get(playerId) ?? null;
	}

	public getPlayerEntity(playerId: string): PlayerEntity | null {
		return this.joinedPlayerData.get(playerId)?.playerEntity ?? null;
	}

	public getPlayerController(playerId: string): PlayerController | null {
		return this.joinedPlayerData.get(playerId)?.playerController ?? null;
	}

	public getActiveLevel(): LevelController | null {
		return this.levelManager.getActiveLevelController() ?? null;
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

	private async handlePlayerJoin(payload: { player: Player }): Promise<void> {
		const player = payload.player;
		console.log(`[GameManager] Player joined world: ${player.id}`);
		
		this.players.set(player.id, player);
		
		// Load or create player data
		const loadedData = await this.loadPlayerData(player);
		const playerData = new PlayerData(player);
		playerData.fromJSON(loadedData);
		this.joinedPlayerData.set(player.id, playerData);
		
		// If a game is already in progress, mark player as spectator
		if (this.isGameInProgress()) {
			this.spectatorIds.add(player.id);
			console.log(`[GameManager] Player ${player.id} joined during game in progress. Added to spectators.`);
		}

		// Show UI to the player
		if (this.uiBridge) {
			// Set up the main menu with player data
			this.uiBridge.showMainMenu(player);
			
			// Update player stats in the main menu
			this.uiBridge.updatePlayerStats(player, playerData);
			
			// Broadcast updated player count to all players
			this.uiBridge.broadcastPlayerCount();
			// Update the player list
			this.uiBridge.broadcastPlayerList();
			
			// Show HUD if the player is joining during an active game
			if (this.state === 'RoundInProgress') {
				console.log(`[GameManager] Player ${player.id} joining during active round. Showing HUD.`);
				this.uiBridge.showHud(player);
				
				// Get the active level controller to determine HUD type
				const activeLevelController = this.levelManager.getActiveLevelController();
				if (activeLevelController) {
					// Create a basic spectator HUD data since getCurrentHudData doesn't exist
					const hudData = {
						goal: "Game in Progress",
						statusLabel: "SPECTATING",
						currentCount: 0,
						totalCount: 0
					};
					
					this.uiBridge.updateHud(player, hudData);
				}
			}
		}

		// If game is in progress, set to spectator mode
		if (this.isGameInProgress()) {
			this.enterSpectatorMode(player);
		}
		
		// Welcome the player
		const playerName = this.getPlayerName(player.id);
		this.world.chatManager.sendPlayerMessage(player, `Welcome to Hytopia Havoc, ${playerName}!`);
	}

	private async handlePlayerLeave(payload: { player: Player }): Promise<void> {
		const player = payload.player;
		console.log(`[GameManager] Player left world: ${player.id}`);
		
		const playerData = this.joinedPlayerData.get(player.id);
		if (playerData) {
			// Save player data before they leave
			await this.savePlayerData(player, playerData);
			playerData.leaveGame();
		}

		// Remove player from ready set if they were ready
		this.readyPlayerIds.delete(player.id);

		this.joinedPlayerData.delete(player.id);
		this.players.delete(player.id);

		// Broadcast updated player count to all players
		this.uiBridge?.broadcastPlayerCount();
		// Update the player list
		this.uiBridge?.broadcastPlayerList();

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
			// In lobby, player clicked Play. Hide their menu and mark them as ready.
			console.log(`[GameManager] Player ${player.id} ready in lobby. Hiding menu.`); 
			this.uiBridge?.closeMenu(player); // Tell UIBridge to close the menu
			
			// Add player to ready set
			this.readyPlayerIds.add(player.id);
			
			// Check if we have enough players to start the game
			if (this.players.size >= gameConfig.minPlayersToStart) {
				console.log(`[GameManager] We have ${this.players.size} players - starting game automatically.`);
				
				// Close menu for all players to ensure a clean transition to level select
				this.players.forEach(p => {
					if (p.id !== player.id) { // Already closed for the current player
						console.log(`[GameManager] Closing menu for player ${p.id} as game is starting`);
						this.uiBridge?.closeMenu(p);
					}
				});
				
				// Add slight delay before starting game to ensure menus are closed
				setTimeout(() => {
					this.startGame();
				}, 200);
			} else {
				console.log(`[GameManager] Waiting for more players: have ${this.players.size}, need ${gameConfig.minPlayersToStart}`);
				this.world.chatManager.sendPlayerMessage(player, `Waiting for more players to join. Need ${gameConfig.minPlayersToStart}, have ${this.players.size}.`);
			}
		} else {
			console.warn(`[GameManager] Player ${player.id} attempted join in unexpected state: ${this.state}`); 
		}
	}

	private enterSpectatorMode(player: Player): void {
		console.log(`[GameManager] Setting player ${player.id} to spectator mode.`);
		this.uiBridge?.closeMenu(player);
		
		// Add to spectator list
		this.spectatorIds.add(player.id);

		const existingEntity = this.joinedPlayerData.get(player.id);
		if (existingEntity && existingEntity.isSpawned()) {
			existingEntity.setSpectatorMode();
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
		
		// Check if the active level controller has team-based spawn positions
		if (activeLevelController) {
			// Get the player data to check for team assignment
			const playerData = this.joinedPlayerData.get(player.id);
			
			// Try to use team-specific spawn point if the controller supports it and the player has a team
			// First check if this is a JumpClubLevelController which has the getSpawnPositionForTeam method
			if (activeLevelController.constructor.name === 'JumpClubLevelController' && 
				playerData && 
				playerData.team) {
				// Use the team-specific spawn method
				const teamSpawn = (activeLevelController as any).getSpawnPositionForTeam(playerData.team);
				if (teamSpawn) {
					spawnPoint = teamSpawn;
					console.log(`[GameManager] Using team-specific spawn for player ${player.id}, team: ${playerData.team}`);
				}
			} else {
				// Fall back to standard spawn position
				spawnPoint = activeLevelController.getStartSpawnPosition() ?? spawnPoint;
			}
		}

		// --- End Get Spawn Point ---
		this.uiBridge?.closeMenu(player);
		
		const playerController = new PlayerController();
		playerController.setGameManager(this);


		//playerController.eventManager.on(FGPlayerEvent.PLAYER_DEATH, this.handlePlayerDeath.bind(this));

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
						 friction: 0.0,
		                 collisionGroups: {
		                    belongsTo: [CollisionGroup.PLAYER],
		                    collidesWith: [
		                        CollisionGroup.ENTITY_SENSOR,
								CollisionGroup.PLAYER,
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
		//this.playerEntities.set(player.id, playerEntity);

		const playerData = this.joinedPlayerData.get(player.id);

		if (playerData) {
			playerData.setPlayerEntity(playerEntity);

		}
		// DO NOT CHANGE THIS CODE - IT IS CORRECT
		player.camera.setMode(PlayerCameraMode.FIRST_PERSON);
		player.camera.setForwardOffset(-6); 
		player.camera.setOffset({ x: 0, y: 1.5, z: 0 });
		player.camera.setAttachedToEntity(playerEntity);
		
		this.world.chatManager.sendPlayerMessage(player, `Use WASD to move, Space to jump.`);
		playerController.setCheckpoint(spawnPoint); // Use the determined spawn point as the first checkpoint
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
		
		// Clear spectator and eliminated lists when starting a new game
		this.spectatorIds.clear();
		this.eliminatedPlayerIds.clear();
		
		console.log(`[GameManager] Starting game with ${this.players.size} players.`);
		this.state = 'Starting';
		
		// Update the player count display for all players
		this.uiBridge?.broadcastPlayerCount();
		
		const levelList = gameConfig.availableLevels.map(level => ({
			id: level.id,
			name: level.displayName,
			description: `${level.levelType} round - ${level.difficulty} difficulty`,
			image: `level_${level.id}.jpg`,
			// Include other relevant data for UI if needed
			minPlayers: level.minPlayers,
			maxPlayers: level.maxPlayers,
			qualificationSlotsRatio: level.qualificationSlotsRatio,
			debugMode: level.debugMode,
			minRound: level.minRound,
			maxRound: level.maxRound,
			isFinalRound: level.isFinalRound
		}));
		
		// Pre-select a level for the first round
		let selectedLevelId: string | undefined;
		
		const debugLevels = levelList.filter(config => Boolean(config.debugMode));

		if (debugLevels.length > 0) {
			// In debug mode, always use the first debug level
			selectedLevelId = debugLevels[0].id;
			console.log(`[GameManager] Selected debug level for first round: ${selectedLevelId}`);
			
			// Broadcast level select to all players at once
			this.uiBridge?.broadcastLevelSelect(debugLevels, selectedLevelId, 1);
		} else {
			// Filter levels eligible for the first round
			const eligibleLevels = levelList.filter(level => {
				const minRound = level.minRound || 1;
				const maxRound = level.maxRound || gameConfig.maxRounds;
				return 1 >= minRound && 1 <= maxRound;
			});
			
			if (eligibleLevels.length > 0) {
				// Randomly select one of the eligible levels
				const randomIndex = Math.floor(Math.random() * eligibleLevels.length);
				selectedLevelId = eligibleLevels[randomIndex].id;
				console.log(`[GameManager] Selected level for first round: ${selectedLevelId}`);
			} else {
				// Fallback if no eligible levels
				selectedLevelId = levelList[0].id;
				console.log(`[GameManager] No eligible levels for round 1, using fallback: ${selectedLevelId}`);
			}
			
			// Broadcast level select to all players at once
			this.uiBridge?.broadcastLevelSelect(levelList, selectedLevelId, 1);
		}
	}

	/** 
	 * Called by UIBridge when LEVEL_SELECTED is received. 
	 * Activates the level and spawns players.
	 */
	public prepareRound(levelId: string): void {
		// Increment the round counter
		this.currentRound++;
		console.log(`[GameManager] 1. Preparing round ${this.currentRound} for level: ${levelId}`);
		
		if (this.state !== 'Starting' && this.state !== 'PostRound') { 
			console.error(`[GameManager] Cannot prepare level in current state: ${this.state}. Aborting.`);
			return;
		}

		this.playSongBattleMusic();
		// Reset UIBridge state at the start of a new round
		this.uiBridge?.resetState();

		// Activate the chosen level
		console.log(`[GameManager] 2. Attempting to activate level: ${levelId}`);
		if (!this.levelManager.activateLevel(levelId)) {
			console.error(`[GameManager] Failed to activate level ${levelId}. Ending game.`);
			this.endGame('FailedToActivateLevel');
			return;
		}
        console.log(`[GameManager] 3. Level ${levelId} activated successfully.`);

        // Initialize RoundManager first if it doesn't exist (first round)
        // This needs to happen BEFORE qualification target calculation
        if (!this.roundManager) {
            const initialPlayerIds = Array.from(this.players.keys());
            this.roundManager = new RoundManager(this.world, initialPlayerIds, this.levelManager, this); 
            // Subscribe to RoundManager events
            this.roundManager.events.on('GameEndConditionMet', this.handleGameEndConditionMet.bind(this)); 
            this.roundManager.events.on('BeforeRoundTransition', this.boundHandleBeforeRoundTransition); // Use bound handler
            console.log('[GameManager] 4. Round Manager initialized and listeners attached.');
        } else {
             console.log('[GameManager] 4. Round Manager already exists (likely next round).');
        }

        // Get active (qualified) player IDs from the RoundManager BEFORE calculating qualification
        const activePlayerIds = this.roundManager?.getActivePlayerIds() || [];
        const eliminatedPlayerIds = this.roundManager?.getEliminatedPlayerIds() || [];
        
        console.log(`[GameManager] 5. Active players: ${activePlayerIds.length}, Eliminated players: ${eliminatedPlayerIds.length}`);

        // --- Calculate Qualification Target --- 
        const config = this.levelManager.getLevelConfigById(levelId);
        
        // Use the activePlayerIds we just got above
        const activePlayerCount = activePlayerIds.length;
        
        // Force recalculation of qualification target
        if (config) {
            // Check if this is a team-based level
            if (config.teamMode) {
                console.log(`[GameManager] Team mode detected for level ${levelId}. Assigning teams...`);
                this.assignTeamsRandomly();
            } else {
                // Reset teams to None for non-team levels
                this.joinedPlayerData.forEach(playerData => {
                    playerData.team = Team.None;
                });
            }
            
            // Force a final round configuration when only 2 players remain
            const onlyTwoPlayersRemain = activePlayerCount === 2;
            const isFinalRound = config.isFinalRound || onlyTwoPlayersRemain;
            
            if (isFinalRound) {
                this.currentQualificationTarget = 1;
                console.log(`[GameManager] Level ${levelId} is ${onlyTwoPlayersRemain ? 'treating as FINAL round (2 players)' : 'FINAL round'}. Qualification target: ${this.currentQualificationTarget}`);
            } else {
                const ratio = config.qualificationSlotsRatio ?? 0.6; 
                // Safeguard: Ensure we're using at least 1 for player count in calculation
                const safePlayerCount = Math.max(1, activePlayerCount);
                
                // Calculate the qualification target using ceiling to ensure we round up
                // E.g. 4 players with 0.66 ratio = 2.64, which rounds up to 3
                const calculatedTarget = Math.ceil(safePlayerCount * ratio);
                this.currentQualificationTarget = Math.max(1, calculatedTarget);
                
                console.log(`[GameManager] Level ${levelId} qualification calculation: ${safePlayerCount} players × ${ratio} ratio = ${safePlayerCount * ratio} raw (${calculatedTarget} after ceiling). Final target: ${this.currentQualificationTarget}`);
            }
        } else {
             console.warn(`[GameManager] Could not find config for level ${levelId} to calculate qualification target. Defaulting to all players.`);
             this.currentQualificationTarget = Math.max(1, activePlayerCount); 
        }
        // --- End Calculation --- 

        // Spawn only active (non-eliminated) players into the new level
        console.log(`[GameManager] 6. Spawning ${activePlayerIds.length} active players for round...`);
        
        // First despawn any existing player entities to prevent duplicates
        this.joinedPlayerData.forEach((playerData, playerId) => {
            if (playerData.playerEntity && playerData.playerEntity.isSpawned) {
                console.log(`[GameManager] Despawning existing entity for player ${playerId}`);
                playerData.playerEntity.despawn();
            }
        });

        
        // Now spawn only the active players, except spectators
        activePlayerIds.forEach(playerId => {
            // Skip players who joined mid-game and are marked as spectators
            if (this.spectatorIds.has(playerId)) {
                console.log(`[GameManager] Skipping spawn for spectator ${playerId}`);
                return;
            }
            
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

		// Determine if this is a survival-type level
		const isSurvivalLevel = activeLevelController && (
			activeLevelController.constructor.name === 'SurvivalLevelController' ||
			activeLevelController.constructor.name === 'JumpClubLevelController'
		);

		let initialHudData;

		if (isSurvivalLevel) {
			// For Survival levels, show elimination count
			const totalPlayers = this.players.size - this.spectatorIds.size; // Count only active players
			
			// IMPORTANT: We need at least 1 player to qualify
			// If there are only 1-2 players, only eliminate up to half of them
			let playersToEliminate;
			if (totalPlayers <= 2) {
				// For 1-2 players, eliminate at most half (rounded down)
				playersToEliminate = Math.floor(totalPlayers / 2);
				console.log(`[GameManager] Small game (${totalPlayers} players) - setting elimination target to ${playersToEliminate}`);
			} else {
				// Normal case: eliminate players according to qualification target
				playersToEliminate = Math.max(0, totalPlayers - this.currentQualificationTarget);
			}
			
			// Make absolutely sure we never try to eliminate all players
			playersToEliminate = Math.min(playersToEliminate, totalPlayers - 1);
			
			initialHudData = {
				goal: activeLevelConfig?.displayName ?? "Survive!",
				statusLabel: "ELIMINATED", 
				currentCount: 0, // No players eliminated yet
				totalCount: playersToEliminate, // Number of players that need to be eliminated
				timer: null // Will be set by the level controller when the timer starts
			};
			
			console.log(`[GameManager] Setting up Survival HUD: Elimination target ${playersToEliminate} of ${totalPlayers} players (min 1 will qualify)`);
		} else {
			// For other levels (course/race type), show qualification count
			initialHudData = {
				goal: activeLevelConfig?.displayName ?? "Race to the finish!",
				statusLabel: "QUALIFIED",
				currentCount: 0,
				totalCount: this.currentQualificationTarget,
				timer: null
			};
			
			console.log(`[GameManager] Setting up Course HUD: Qualification target ${this.currentQualificationTarget} players can qualify`);
		}

		this.players.forEach(player => {
			this.uiBridge?.showHud(player);
			this.uiBridge?.updateHud(player, initialHudData);
		});
		// --- End Show & Update HUD ---
		
		// Get only active non-spectator players from the round manager
		const activePlayerIds = this.roundManager?.getActivePlayerIds() || [];
		const activePlayers = activePlayerIds
			.map(id => this.players.get(id))
			.filter(Boolean) as Player[];
			
		console.log(`[GameManager] Starting round with ${activePlayers.length} active players and qualification target: ${this.currentQualificationTarget}`);
		
		// Start the round logic via LevelManager
		if (this.levelManager.startRound(activePlayers, this.currentQualificationTarget)) { 
			console.log(`[GameManager] 9. Round gameplay started successfully.`);
            
            // Subscribe GameManager and RoundManager to level end event AFTER round starts
            if (activeLevelController) {
                activeLevelController.events.on('RoundEnd', this.boundHandleLevelRoundEnd);
                this.roundManager?.subscribeToActiveLevelEndEvent(); // Tell RoundManager to subscribe too
                
                // Tell the level controller to begin gameplay (activate obstacles, etc.)
                activeLevelController.beginGameplay();
            } else {
                 this.endGame('MissingControllerPostStart');
            }
		} else {
			this.endGame('FailedToStartRoundGameplay'); 
		}
	}

	public getPlayerName(playerId: string): string {
		// Get player data and return player name if available, otherwise fallback to ID
		const playerData = this.players.get(playerId);
		return playerData?.username || playerId;
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
		
		// Award XP to players based on qualification status
		const roundNumber = this.currentRound;
		
		// Award more XP to qualified players
		data.q.forEach(playerId => {
			const playerData = this.joinedPlayerData.get(playerId);
			if (playerData) {
				const xpAmount = 30 + (roundNumber * 10);
				playerData.addXP(xpAmount);
				console.log(`[GameManager] Qualified player ${playerId} earned ${xpAmount} XP for round ${roundNumber}`);
				
				// Update UI if player is still connected
				const player = this.players.get(playerId);
				if (player && this.uiBridge) {
					this.uiBridge.updatePlayerStats(player, playerData);
				}
			}
		});
		
		// Award less XP to eliminated players
		data.e.forEach(playerId => {
			const playerData = this.joinedPlayerData.get(playerId);
			if (playerData) {
				const xpAmount = 10 + (roundNumber * 5);
				playerData.addXP(xpAmount);
				console.log(`[GameManager] Eliminated player ${playerId} earned ${xpAmount} XP for round ${roundNumber}`);
				
				// Update UI if player is still connected
				const player = this.players.get(playerId);
				if (player && this.uiBridge) {
					this.uiBridge.updatePlayerStats(player, playerData);
				}
			}
		});
		
		// Prepare player lists for UI using correct event data
		const qualifiedNames = data.q.map(id => this.getPlayerName(id));
		const eliminatedNames = data.e.map(id => this.getPlayerName(id)); 

		// Despawn remaining players (those in 'e')
		this.joinedPlayerData.forEach((playerData, playerId) => {
			if (playerData.playerEntity) { // Check if player ID is in eliminated list
				playerData.setSpectatorMode();
			}
		});
		
		// Reset UIBridge state to prepare for next round
		this.uiBridge?.resetState();
		
		// Check if game ended based on results
		if (!shouldContinue) {
			console.log("[GameManager] Round results indicate game should end. (Winner/Max Rounds)");
			// Skip showing round results for final round
			if (data.q.length === 1 && this.roundManager.getActivePlayerIds().length === 1) {
				console.log("[GameManager] Final round with one winner - skipping results screen and showing winner directly");
				// Winner will be shown via handleGameEndConditionMet
				return;
			}
			
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

	/**
	 * Calculate rewards for a player based on their placement and total players
	 */
	private calculatePlayerRewards(placement: number, totalPlayers: number): PlayerReward {
	    // Base coins calculation (higher placement = more coins)
	    const BASE_COINS = 50;
	    const PLACEMENT_MULTIPLIER = 10;
	    const PLAYER_COUNT_BONUS = 5;
	    
	    // Calculate coins based on placement (inverse - 1st place gets most)
	    // Formula: BASE + ((totalPlayers - placement + 1) * MULTIPLIER) + (totalPlayers * BONUS)
	    const placementCoins = (totalPlayers - placement + 1) * PLACEMENT_MULTIPLIER;
	    const playerCountBonus = totalPlayers * PLAYER_COUNT_BONUS;
	    const coins = BASE_COINS + placementCoins + playerCountBonus;
	    
	    // Crown calculation (only high placements in bigger games)
	    let crowns = 0;
	    
	    // No crowns for games with fewer than 5 players
	    if (totalPlayers >= 5) {
	        if (placement === 1) {
	            // First place always gets at least 1 crown in 5+ player games
	            crowns = 1;
	            
	            // Bonus crown for 12+ player games
	            if (totalPlayers >= 12) {
	                crowns += 1;
	            }
	        }
	        else if (placement === 2) {
	            // Second place gets 1 crown in 8+ player games
	            if (totalPlayers >= 8) {
	                crowns = 1;
	            }
	        }
	        else if (placement === 3) {
	            // Third place gets 1 crown in 12+ player games
	            if (totalPlayers >= 12) {
	                crowns = 1;
	            }
	        }
	    }
	    
	    return {
	        placement,
	        coins,
	        crowns
	    };
	}
	
	/**
	 * Get player placement data for all players
	 */
	private getPlayerPlacements(): Map<string, number> {
	    const placements = new Map<string, number>();
	    
	    if (!this.roundManager) return placements;
	    
	    // Get player lists
	    const activePlayers = this.roundManager.getActivePlayerIds();
	    const eliminatedPlayers = this.roundManager.getEliminatedPlayerIds();
	    
	    // Set active players as winners (start with placement 1)
	    // In most cases this will be just one player
	    activePlayers.forEach((playerId, index) => {
	        placements.set(playerId, index + 1);
	    });
	    
	    // Set eliminated players with lower placements
	    // Last eliminated is placement activePlayers.length + 1
	    // We're assuming eliminatedPlayers is ordered by elimination time
	    const startPlacement = activePlayers.length + 1;
	    eliminatedPlayers.forEach((playerId, index) => {
	        placements.set(playerId, startPlacement + index);
	    });
	    
	    return placements;
	}

	private handleGameEndConditionMet(reason: string): void {
		console.log(`[GameManager] GameEndConditionMet event received: ${reason}`);
		if (this.state === 'GameOver') return; // Avoid double-ending
		
		// Calculate placements for all players
		const playerPlacements = this.getPlayerPlacements();
		const totalPlayers = this.players.size;
		
		if (reason === 'LastPlayerStanding' && this.roundManager) {
			const winnerId = this.roundManager.getLastPlayerId();
			if (winnerId) {
				// const winnerPlayer = this.players.get(winnerId); // Get player if needed
				console.log(`[GameManager] Winner detected: ${winnerId}`);
				
				// Show winner screen after a short delay
				setTimeout(() => {
					// Hide any existing UI elements
					this.players.forEach(player => {
						this.uiBridge?.hideHud(player);
						this.uiBridge?.closeRoundResults(player);
					});
					
					// Show the winner screen
					console.log(`[GameManager] Showing winner screen for ${winnerId}`);
					this.uiBridge?.broadcastWinner(this.getPlayerName(winnerId));
					
					// Wait longer before showing player summaries
					setTimeout(() => {
						// Unload level first before showing summary
						this.cleanupLevel();
						
						// Close winner screen
						this.uiBridge?.broadcastCloseWinner();
						
						// Show individual player summaries
						this.players.forEach(player => {
							const placement = playerPlacements.get(player.id) || totalPlayers;
							const rewards = this.calculatePlayerRewards(placement, totalPlayers);
							
							console.log(`[GameManager] Showing summary for player ${player.id}: placement=${placement}, coins=${rewards.coins}, crowns=${rewards.crowns}`);
							
							this.uiBridge?.showPlayerSummary(player, {
								placement: rewards.placement,
								coinsEarned: rewards.coins,
								crownsEarned: rewards.crowns,
								totalPlayers: totalPlayers,
								roundsPlayed: this.currentRound
							});
						});
						
						// After summaries are shown, wait for player to click continue
						// The actual end game is triggered by handling UI_ACTION with SUMMARY_CONTINUE action
						this.events.emit('GameWon', winnerId);
					}, 8000); // 8 seconds to show the winner screen
				}, 3000); // 3 second delay before showing winner screen
				
				// Return early to prevent immediate game end
				return;
			}
		}
		
		// Non-winner end conditions (max rounds, not enough players, etc.)
		
		// Make sure HUD is hidden for all players
		this.players.forEach(player => {
			this.uiBridge?.hideHud(player);
		});
		
		// Unload level first before showing summary
		this.cleanupLevel();
		
		// Show player summaries first
		setTimeout(() => {
			// Show individual player summaries
			this.players.forEach(player => {
				const placement = playerPlacements.get(player.id) || totalPlayers;
				const rewards = this.calculatePlayerRewards(placement, totalPlayers);
				
				this.uiBridge?.showPlayerSummary(player, {
					placement: rewards.placement,
					coinsEarned: rewards.coins,
					crownsEarned: rewards.crowns,
					totalPlayers: totalPlayers,
					roundsPlayed: this.currentRound
				});
			});
		}, 2000);
		
		// Always end the game when this event occurs (for non-winner cases)
		// The actual end game is triggered by handling UI_ACTION with SUMMARY_CONTINUE action
	}

	/** Add a handler for SUMMARY_CONTINUE in UIBridge handleUIAction */
	public handleSummaryContinue(): void {
		// This method is called when a player clicks "Continue" on the summary screen
		// The level should already be unloaded at this point, just transition to lobby
		
		// Switch to main menu music here after level is unloaded
		this.playSongMainMenuMusic();
		
		// Complete remaining cleanup and transition to lobby
		this.finishGameCleanup('PlayerContinued');
	}
	
	private handleBeforeRoundTransition(data: { nextLevelId: string | null, qualifiedPlayers: string[] }): void {
		console.log(`[GameManager] Received BeforeRoundTransition. Next Level ID: ${data.nextLevelId}`);
		
		if (!data.nextLevelId) {
			console.error("[GameManager] BeforeRoundTransition received null level ID. Cannot proceed.");
			this.endGame('NoNextLevelSelected');
			return;
		}
		
		// Store the selected level ID to ensure UI and game logic use the same level
		const selectedLevelId = data.nextLevelId;
		
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
			qualificationSlotsRatio: level.qualificationSlotsRatio,
			minRound: level.minRound,
			maxRound: level.maxRound,
			isFinalRound: level.isFinalRound
		}));
		
		// Show Level Select UI to all currently connected players
		// Include the pre-selected level ID so UI knows what level to show
		console.log(`[GameManager] Showing Level Select for next round with pre-selected level: ${selectedLevelId}`);
		// Broadcast level select to all players at once
		this.uiBridge?.broadcastLevelSelect(levelList, selectedLevelId, this.currentRound);
		
		// Set state back to Starting, ready for UI selection
		this.state = 'Starting'; 
	}
	
	/**
	 * Cleans up the level controller and visual elements
	 * Called before showing the summary screen
	 */
	private cleanupLevel(): void {
		console.log("[GameManager] Cleaning up level before showing summary");
		
		// Unsubscribe from level events
		const activeLevelController = this.levelManager.getActiveLevelController();
		if (activeLevelController) {
			try {
				activeLevelController.events.off('RoundEnd', this.boundHandleLevelRoundEnd);
			} catch (error) {
				console.error('[GameManager] Error unsubscribing from RoundEnd:', error);
			}
		}
		
		// Clean up level manager (cleans active level controller)
		if (this.levelManager) {
			try {
				this.levelManager.cleanup();
			} catch (error) {
				console.error('[GameManager] Error during LevelManager cleanup:', error);
			}
		}
		
		// Despawn all player entities
		console.log("[GameManager] Despawning all player entities");
		this.joinedPlayerData.forEach((playerData, playerId) => {
			try {
				// Reset player team
				playerData.team = Team.None;
				
				// Properly clean up player entity if it exists
				if (playerData.playerEntity) {
					if (playerData.playerEntity.isSpawned) {
						console.log(`[GameManager] Despawning entity for player ${playerId}`);
						playerData.playerEntity.despawn();
					}
					playerData.playerEntity = null;
				}
				
				// Reset player controller
				playerData.playerController = null;
			} catch (error) {
				console.error(`[GameManager] Error cleaning up player ${playerId}:`, error);
			}
		});
		
		// Reset all players to spectator camera mode
		this.players.forEach(player => {
			player.camera.setMode(PlayerCameraMode.SPECTATOR);
		});
	}
	
	/**
	 * Finishes the cleanup process and transitions to lobby
	 * Called when player clicks "Continue" on summary screen
	 */
	private finishGameCleanup(reason: string): void {
		console.log(`[GameManager] Finishing game cleanup. Reason: ${reason}`);
		
		// Reset state variables
		this.currentRound = 0;
		this.currentQualificationTarget = 0;
		this.eliminatedPlayerIds.clear();
		this.spectatorIds.clear();
		
		// Unsubscribe from RoundManager events
		if (this.roundManager) {
			try {
				this.roundManager.events.off('GameEndConditionMet', this.handleGameEndConditionMet.bind(this));
				this.roundManager.events.off('BeforeRoundTransition', this.boundHandleBeforeRoundTransition);
				this.roundManager.cleanup();
			} catch (error) {
				console.error('[GameManager] Error during RoundManager cleanup:', error);
			}
			this.roundManager = null;
		}
		
		// Emit events and notify players
		this.events.emit('GameEnded', reason);
		this.world.chatManager.sendBroadcastMessage(`Game Over! Back to lobby.`);
		console.log("[GameManager] Game Over. Resetting to Lobby state.");
		
		// Close all UI elements and show main menu
		this.players.forEach(player => {
			try {
				// Ensure UI elements are closed/hidden
				this.uiBridge?.hideHud(player);
				this.uiBridge?.closeRoundResults(player);
				this.uiBridge?.closeWinner(player);
				this.uiBridge?.closePlayerSummary(player);
				
				// Show main menu with updated stats
				this.uiBridge?.showMainMenu(player);
				
				// Update player stats in main menu
				const playerData = this.joinedPlayerData.get(player.id);
				if (playerData && this.uiBridge) {
					this.uiBridge.updatePlayerStats(player, playerData);
				}
			} catch (error) {
				console.error(`[GameManager] Error resetting UI for player ${player.id}:`, error);
			}
		});
		
		// Finally set state back to Lobby
		this.state = 'Lobby';
		console.log("[GameManager] Game state reset to Lobby, ready for new game");
		
		// Update the player count display for all players
		this.uiBridge?.broadcastPlayerCount();
		
		// Reset ready players set
		this.readyPlayerIds.clear();
	}
	
	public async endGame(reason: string): Promise<void> {
		if (this.state === 'GameOver') return;
		console.log(`[GameManager] Ending game. Reason: ${reason}`);
		const previousState = this.state;
		this.state = 'GameOver';

		// Apply rewards to players based on their placement
		if (reason === 'LastPlayerStanding' || reason === 'MaxRoundsReached' || reason === 'PlayerContinued') {
			const winnerPlayerId = reason === 'LastPlayerStanding' ? this.roundManager?.getLastPlayerId() || null : null;
			await this.applyPlayerRewards(winnerPlayerId);
		}

		// Reset UIBridge state
		this.uiBridge?.resetState();
		
		// If this is called directly (not through handleSummaryContinue), 
		// we need to clean up everything
		this.cleanupLevel();
		this.finishGameCleanup(reason);
	}

    /**
     * Assign teams randomly to all active players.
     * This is used for team-based levels.
     */
    private assignTeamsRandomly(): void {
        // Get active player IDs
        const activePlayerIds = this.roundManager?.getActivePlayerIds() || Array.from(this.players.keys());
        
        if (activePlayerIds.length === 0) {
            console.log(`[GameManager] No active players to assign teams to.`);
            return;
        }
        
        // Shuffle the player IDs to randomize team assignment
        const shuffledPlayerIds = [...activePlayerIds].sort(() => Math.random() - 0.5);
        
        // Determine how many teams to use based on player count
        const playerCount = shuffledPlayerIds.length;
        let teams: Team[] = [];
        
        if (playerCount <= 2) {
            // For 1-2 players, just Red vs Blue
            teams = [Team.Red, Team.Blue];
        } else if (playerCount <= 6) {
            // For 3-6 players, use all three teams
            teams = [Team.Red, Team.Blue, Team.Green];
        } else {
            // For more players, use all three teams with emphasis on Red and Blue
            const redCount = Math.ceil(playerCount / 3);
            const blueCount = Math.ceil(playerCount / 3);
            const greenCount = playerCount - redCount - blueCount;
            
            teams = Array(redCount).fill(Team.Red)
                .concat(Array(blueCount).fill(Team.Blue))
                .concat(Array(greenCount).fill(Team.Green));
                
            // Shuffle the teams array
            teams = teams.sort(() => Math.random() - 0.5);
        }
        
        // Assign teams to players
        shuffledPlayerIds.forEach((playerId, index) => {
            const teamIndex = index % teams.length;
            const team = teams[teamIndex];
            this.assignTeamToPlayer(playerId, team);
        });
        
        // Log team assignments
        console.log(`[GameManager] Team assignments complete.`);
        const teamCounts = {
            [Team.Red]: 0,
            [Team.Blue]: 0,
            [Team.Green]: 0,
            [Team.None]: 0
        };
        
        this.joinedPlayerData.forEach(playerData => {
            if (activePlayerIds.includes(playerData.playerID())) {
                teamCounts[playerData.team]++;
            }
        });
        
        console.log(`[GameManager] Team Red: ${teamCounts[Team.Red]}, Team Blue: ${teamCounts[Team.Blue]}, Team Green: ${teamCounts[Team.Green]}`);
    }
    
    /**
     * Assign a specific team to a player.
     * @param playerId The ID of the player to assign a team to
     * @param team The team to assign
     */
    private assignTeamToPlayer(playerId: string, team: Team): void {
        const playerData = this.joinedPlayerData.get(playerId);
        if (playerData) {
            playerData.team = team;
            console.log(`[GameManager] Assigned player ${playerId} to team ${team}`);
            
            // Optionally, notify the player of their team assignment
            if (playerData.player) {
                this.world.chatManager.sendPlayerMessage(playerData.player, `You have been assigned to the ${team} team!`);
            }
        }
	}

	private async loadPlayerData(player: Player): Promise<PlayerDataJSON> {
		try {
			console.log(`[GameManager] Loading persisted data for player ${player.id}`);
			const persistedData = await player.getPersistedData() as unknown as PlayerDataJSON | null;
			
			if (!persistedData) {
				console.log(`[GameManager] No persisted data found for player ${player.id}, using defaults`);
				return { ...DEFAULT_PLAYER_DATA };
			}
			
			console.log(`[GameManager] Loaded persisted data for player ${player.id}`);
			return persistedData;
		} catch (error) {
			console.error(`[GameManager] Error loading persisted data for player ${player.id}:`, error);
			return { ...DEFAULT_PLAYER_DATA };
		}
	}

	private async savePlayerData(player: Player, playerData: PlayerData): Promise<void> {
		try {
			console.log(`[GameManager] Saving persisted data for player ${player.id}`);
			const data = playerData.toJSON();
			await player.setPersistedData(data as unknown as Record<string, unknown>);
			console.log(`[GameManager] Saved persisted data for player ${player.id}`);
		} catch (error) {
			console.error(`[GameManager] Error saving persisted data for player ${player.id}:`, error);
		}
	}

	/**
	 * Updates player rewards based on their performance and saves the data
	 */
	private async applyPlayerRewards(winnerPlayerId: string | null): Promise<void> {
		// Get list of all player IDs that participated (both active and eliminated)
		const allPlayerIds = [...this.players.keys()];
		
		console.log(`[GameManager] Applying rewards to ${allPlayerIds.length} players. Winner: ${winnerPlayerId || 'None'}`);
		
		// Create mapping of players to their placement
		const playerPlacements: Map<string, number> = new Map();
		
		// Winner gets 1st place
		if (winnerPlayerId) {
			playerPlacements.set(winnerPlayerId, 1);
		}
		
		// Other active players that didn't win get next placements
		// (This won't execute if there's only one active player, which is the winner)
		const activePlayerIds = this.roundManager?.getActivePlayerIds() || [];
		let placementCounter = 2; // Start at 2 since winner is 1
		activePlayerIds.forEach(playerId => {
			if (playerId !== winnerPlayerId) {
				playerPlacements.set(playerId, placementCounter++);
			}
		});
		
		// Eliminated players get remaining placements
		const eliminatedPlayerIds = this.roundManager?.getEliminatedPlayerIds() || [];
		eliminatedPlayerIds.forEach(playerId => {
			playerPlacements.set(playerId, placementCounter++);
		});
		
		// Calculate and apply rewards to each player
		for (const playerId of allPlayerIds) {
			const player = this.players.get(playerId);
			const playerData = this.joinedPlayerData.get(playerId);
			
			if (!player || !playerData) continue;
			
			const placement = playerPlacements.get(playerId) || allPlayerIds.length;
			const totalPlayers = allPlayerIds.length;
			
			// Calculate XP based on placement and round number
			const baseXP = 50;
			const placementBonus = Math.max(0, totalPlayers - placement + 1) * 10;
			const roundBonus = this.currentRound * 20;
			const xpEarned = baseXP + placementBonus + roundBonus;
			
			// Award XP
			playerData.addXP(xpEarned);
			console.log(`[GameManager] Player ${playerId} earned ${xpEarned} XP (Level ${playerData.playerLevel})`);
			
			// Calculate rewards based on placement
			// Winner gets a crown and coins
			if (placement === 1) {
				playerData.addCrowns(1);
				playerData.addCoins(100);
				playerData.addWin();
				console.log(`[GameManager] Player ${playerId} WON and received 1 crown, 100 coins`);
			} else {
				// Other players get coins based on their placement
				// Better placement = more coins
				const coins = Math.max(10, 50 - ((placement - 1) * 5));
				playerData.addCoins(coins);
				console.log(`[GameManager] Player ${playerId} placed ${placement}/${totalPlayers} and received ${coins} coins`);
			}
			
			// Update the UI with new player stats
			if (this.uiBridge) {
				this.uiBridge.updatePlayerStats(player, playerData);
			}
			
			// Save updated player data
			await this.savePlayerData(player, playerData);
		}
	}

	private playGameSound(soundEffect: { uri: string, volume: number }, world: World) {
		if (world) {

			const playbackRate = Math.random() * 0.2 + 0.8;

			const sound = new Audio({
				uri: soundEffect.uri,
				volume: soundEffect.volume,
				referenceDistance: 5,
				loop: false,
				playbackRate: playbackRate,

			});
			sound.play(world);
		}
	}

	private initializeMusic(): void {
		// Create music players
		this.mainMenuMusic = new Audio({
			uri: 'audio/music/pixel_beat.mp3',
			loop: true,
			volume: 0.3,
		});

		this.battleMusic = new Audio({
			uri: 'audio/music/mind_spark.mp3',
			loop: true,
			volume: 0.3,
		});

		// Start main menu music by default
		this.playSongMainMenuMusic();
	}

	public playSongMainMenuMusic(): void {

		this.mainMenuMusic?.play(this.world, true);
		this.battleMusic?.pause();
		/*
		this.stopCurrentMusic();
		this.currentMusic = this.mainMenuMusic;
		if (this.currentMusic && this.world) {
			console.log('[GameManager] Playing main menu music');
			this.currentMusic.play(this.world, true);
		}
		*/
	}

	public playSongBattleMusic(): void {

		this.battleMusic?.play(this.world, true);
		this.mainMenuMusic?.pause();
		/*
		this.stopCurrentMusic();
		this.currentMusic = this.battleMusic;
		if (this.currentMusic && this.world) {
			console.log('[GameManager] Playing battle music');
			this.currentMusic.play(this.world, true);
		}
		*/
	}

	private stopCurrentMusic(): void {
		if (this.currentMusic) {
			this.currentMusic.pause();
			this.currentMusic = null;
		}
	}
} 