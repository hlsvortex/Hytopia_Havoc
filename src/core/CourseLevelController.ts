import { World, Player, PlayerEntity, type Vector3Like, PlayerCameraMode } from 'hytopia';
import { LevelController } from './LevelController';
import { type LevelConfiguration } from '../config/LevelConfiguration';
import { AreaComponent } from '../AreaComponent'; // Import AreaComponent
import { TriggerEntity } from '../TriggerEntity'; // Import TriggerEntity
import { UIBridge } from './UIBridge'; // Corrected path
import { GameManager } from './GameManager';
import PlayerController from '../PlayerController';


export abstract class CourseLevelController extends LevelController {
    protected finishArea: AreaComponent | null = null;
    protected finishTrigger: TriggerEntity | null = null; // Added
    protected checkpoints: AreaComponent[] = [];
    protected checkpointTriggers: TriggerEntity[] = []; // Added to track checkpoint triggers
    protected playerCheckpoints: Map<string, number> = new Map(); // Track highest checkpoint reached per player
    protected boundariesInitialized: boolean = false; // Track if boundaries are set up
    protected timerInterval: NodeJS.Timeout | null = null;
    protected timeRemainingSeconds: number = 180; // Default 3 minutes time limit
    protected roundStartTime: number = 0;
    protected roundTimerEnded: boolean = false;
    protected roundEnded: boolean = false; // Track if round has ended
    protected showCheckpointMessages: boolean = true; // Control checkpoint messages
    
    constructor(world: World, config: LevelConfiguration, uiBridge: UIBridge | null = null, gameManager: GameManager) {
        super(world, config, uiBridge, gameManager);
        // Don't call setupCourseBoundaries here - will be called in startRound when needed
        console.log(`[${this.constructor.name}] Constructor called for ${config.id}`);
        
        // Set time limit from config if provided
        if (config.timeLimitSeconds !== undefined) {
            this.timeRemainingSeconds = config.timeLimitSeconds;
            console.log(`[${this.constructor.name}] Course time limit set to ${this.timeRemainingSeconds} seconds`);
        }
        
        // Check if checkpoint messages should be disabled
        if (config && (config as any).showCheckpointMessages === false) {
            this.showCheckpointMessages = false;
            console.log(`[${this.constructor.name}] Checkpoint messages disabled`);
        }
    }
    
    /**
     * Abstract method for subclasses to define their specific start/finish areas.
     * This should be called from startRound, not automatically in constructor.
     */
    protected abstract setupCourseBoundaries(): void;

	public override eliminatePlayer(playerEntity: PlayerEntity): void {
		//console.log(`[CourseLevelController] Eliminating player ${playerEntity.player?.id}`);
	}

	protected respawnPlayerAtCheckpoint(playerEntity: PlayerEntity): void {
		//console.log(`[CourseLevelController] Respawning player  at checkpoint`);
		
		const playerController = playerEntity.controller as PlayerController;
		playerController.RespawnAtCheckpoint();

	}

    /**
     * Defines the finish area and creates the finish trigger entity.
     * @param corner1 One corner of the finish area.
     * @param corner2 The opposite corner of the finish area.
     */
    protected setFinishArea(corner1: Vector3Like, corner2: Vector3Like): void {
        if (this.finishArea) {
            console.warn(`[${this.constructor.name}] Finish area already set. Overwriting.`);
            // Despawn previous trigger if it exists
            if (this.finishTrigger ) {
                this.finishTrigger.despawn();
            }
            this.finishTrigger = null;
        }
        
        this.finishArea = new AreaComponent(corner1, corner2);
        console.log(`[${this.constructor.name}] Finish area set.`);
        
        // Create and spawn the trigger entity
        if (this.finishArea) {
            this.finishTrigger = new TriggerEntity(
                this.finishArea, 
                this.handlePlayerFinished.bind(this), 
                `${this.getLevelName()} Finish Line`,
                this.world
            );

            //this.finishTrigger.spawn(this.world, this.finishArea.getCenter()); // Spawn the trigger
        } else {
            console.error(`[${this.constructor.name}] Failed to create finish trigger: Finish area is null.`);
        }
    }

    /**
     * Handles the logic when a player enters the finish trigger.
     * @param playerEntity The PlayerEntity that entered the trigger.
     */
    protected handlePlayerFinished(playerEntity: PlayerEntity): void {
        if (!playerEntity.player) return; // Should not happen, but safety check
        
        const playerId = playerEntity.player.id;

        // Log the current target value WHEN the finish line is hit
        console.log(`[${this.constructor.name}] handlePlayerFinished: Checking player ${playerId}. Current Target: ${this.qualificationTarget}, Qualified Count: ${this.qualifiedPlayerIds.size}`);

        // Already qualified? Ignore.
        if (this.qualifiedPlayerIds.has(playerId)) {
            // console.log(`[${this.constructor.name}] Player ${playerId} already qualified.`);
            return; 
        }

        // Check if qualification target is met
        if (this.qualificationTarget > 0 && this.qualifiedPlayerIds.size >= this.qualificationTarget) {
             console.log(`[${this.constructor.name}] Qualification target (${this.qualificationTarget}) already met. Player ${playerId} finished but did not qualify.`);
             // Put player in spectator mode even if they don't qualify (they finished)
             playerEntity.player.camera.setMode(PlayerCameraMode.SPECTATOR);
             if (playerEntity.isSpawned) playerEntity.despawn();
             return; // Don't add to qualified list
        }
        
        // Qualify the player
        this.qualifiedPlayerIds.add(playerId);
        console.log(`[${this.constructor.name}] Player ${playerId} QUALIFIED! (${this.qualifiedPlayerIds.size}/${this.qualificationTarget})`);
        
        // Show QUALIFIED text to the specific player
        if (this.uiBridge) {
            this.uiBridge.showAnimatedText(playerEntity.player, "QUALIFIED!", "", 2000); // Show for 2 seconds
        }
        
        // Put player in spectator mode FIRST
        playerEntity.player.camera.setMode(PlayerCameraMode.SPECTATOR);
        
        // Update HUD for everyone
        this.broadcastHudUpdate();
        
        // Delay despawn slightly
        if (playerEntity.isSpawned) {
            console.log(`[${this.constructor.name}] Scheduling despawn for player ${playerId}`);
            setTimeout(() => {
                if (playerEntity.isSpawned) { // Check again inside timeout
                    try {
                        playerEntity.despawn();
                        console.log(`[${this.constructor.name}] Delayed despawn executed for player ${playerId}`);
                    } catch(e) {
                        console.error(`[${this.constructor.name}] Error during delayed despawn for player ${playerId}:`, e);
                    }
                }
            }, 50); // Delay by 50ms (adjust if needed)
        }
        
        // Check if target met AFTER adding this player
        if (this.qualifiedPlayerIds.size >= this.qualificationTarget) {
            console.log(`[${this.constructor.name}] Qualification target reached!`);
            setTimeout(() => this.endRound(), 1000); 
        }
    }
    
	/**
	 * Begin actual gameplay after any intro/countdown
	 * Activates all obstacles and emits an event
	 */
	public override beginGameplay(): void {
		console.log(`[${this.constructor.name}] Beginning gameplay - activating obstacles`);

		// Activate all registered obstacles
		this.obstacles.forEach(obstacle => {
			obstacle.activate();
		});

		this.setPausePlayersIds(Array.from(this.startingPlayerIds), false);

		// Emit gameplay start event
		this.events.emit('RoundGameplayStart', null);

		// Start the round timer
		console.log(`[${this.constructor.name}] Starting round timer`);
		this.startRoundTimer();
	}

    /**
     * Start the course timer
     */
    protected startRoundTimer(): void {
        if (this.timeRemainingSeconds <= 0) {
            console.log(`[${this.constructor.name}] No time limit provided, timer not started`);
            return;
        }

        // Clear any existing timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        this.roundStartTime = Date.now();
        this.roundTimerEnded = false;
        console.log(`[${this.constructor.name}] Timer started with ${this.timeRemainingSeconds} seconds`);

        // Set up timer interval
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.roundStartTime) / 1000);
            const remaining = Math.max(0, this.timeRemainingSeconds - elapsed);
            
            // Update HUD if we're in the last 10 seconds or if timer ended
            if (remaining <= 10 || remaining === 0) {
                this.broadcastHudUpdate(remaining);
            }
            
            // Show countdown announcements in the final seconds
            if (remaining <= 5 && remaining > 0 && this.uiBridge) {
                this.uiBridge.broadcastAnimatedText(remaining.toString(), "", 900);
            }
            
            // If time is up, eliminate all unqualified players
            if (remaining === 0 && !this.roundTimerEnded) {
                this.handleTimeUp();
                if (this.timerInterval) {
                    clearInterval(this.timerInterval);
                    this.timerInterval = null;
                }
            }
        }, 1000);
    }
    
    /**
     * Handle time up - eliminate all remaining players
     */
    protected handleTimeUp(): void {
        if (this.roundTimerEnded) return;
        
        console.log(`[${this.constructor.name}] Course time limit reached!`);
        this.roundTimerEnded = true;
        
        // Show TIME UP! message to all players
        if (this.uiBridge) {
            this.uiBridge.broadcastAnimatedText("TIME", "UP!", 2000);
        }
        
        // Get all players who haven't qualified yet
        const remainingPlayers = Array.from(this.startingPlayerIds)
            .filter(id => !this.qualifiedPlayerIds.has(id));
            
        // No need to continue if everyone qualified
        if (remainingPlayers.length === 0) {
            console.log(`[${this.constructor.name}] All players already qualified, ending round`);
            this.endRound();
            return;
        }
        
        // Eliminate all remaining players
        console.log(`[${this.constructor.name}] Eliminating ${remainingPlayers.length} players who didn't finish in time`);
        
        // Put remaining players in spectator mode
        remainingPlayers.forEach(playerId => {
            const player = this.gameManager?.getPlayerById(playerId);
            if (player) {
                const playerEntity = this.gameManager?.getPlayerEntity(playerId);
                if (playerEntity && playerEntity.player) {
                    // Show ELIMINATED message
                    if (this.uiBridge) {
                        this.uiBridge.showAnimatedText(playerEntity.player, "ELIMINATED!", "", 2000);
                    }
                    
                    // Set to spectator and despawn
                    playerEntity.player.camera.setMode(PlayerCameraMode.SPECTATOR);
                    if (playerEntity.isSpawned) {
                        setTimeout(() => {
                            if (playerEntity.isSpawned) {
                                playerEntity.despawn();
                            }
                        }, 50);
                    }
                }
            }
        });
        
        // End the round after a short delay
        setTimeout(() => {
            if (!this.roundEnded) {
                this.endRound();
            }
        }, 2000);
    }

    /**
     * Broadcasts the current HUD state to all players.
     */
    protected broadcastHudUpdate(timeRemaining?: number): void {
        if (!this.uiBridge) return;
        
        // Only include timer if in last 10 seconds or explicitly provided
        const showTimer = timeRemaining !== undefined || 
            (this.timeRemainingSeconds > 0 && 
             Math.floor((Date.now() - this.roundStartTime) / 1000) >= this.timeRemainingSeconds - 10);
        
        const currentTimeRemaining = timeRemaining !== undefined ? 
            timeRemaining : 
            Math.max(0, this.timeRemainingSeconds - Math.floor((Date.now() - this.roundStartTime) / 1000));
        
        const hudData = {
            goal: "Race to the finish!",
            statusLabel: "QUALIFIED",
            currentCount: this.qualifiedPlayerIds.size,
            totalCount: this.qualificationTarget,
            // Only show timer in last 10 seconds
            timer: showTimer ? currentTimeRemaining : undefined
        };
        
        this.uiBridge.broadcastData({ type: 'UPDATE_HUD', hudData }); 
        console.log(`[${this.constructor.name}] Broadcasting HUD Update: ${hudData.currentCount}/${hudData.totalCount} ${showTimer ? `Time: ${currentTimeRemaining}s` : ''}`);
    }
    
    /**
     * Ends the current round, emitting results.
     */
    public override endRound(): void {
        if (this.roundEnded) {
            console.log(`[${this.constructor.name}] endRound called but round already ended`);
            return;
        }
        
        console.log(`[${this.constructor.name}] *** endRound() CALLED ***. Qualified: ${this.qualifiedPlayerIds.size}, Target: ${this.qualificationTarget}, Started: ${this.startingPlayerIds.size}`);
        
        this.roundEnded = true;
        
        // Clear the timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        // Calculate eliminated players
        const eliminatedIds = Array.from(this.startingPlayerIds)
                                   .filter(id => !this.qualifiedPlayerIds.has(id));
        console.log(`[${this.constructor.name}] Calculated Eliminated IDs:`, eliminatedIds);
        
        this.events.emit('RoundEnd', { 
            q: Array.from(this.qualifiedPlayerIds), 
            e: eliminatedIds 
        });
        console.log(`[${this.constructor.name}] Emitted RoundEnd event.`);
    }

    /**
     * Adds a checkpoint area to the course and creates a trigger entity for it.
     * @param corner1 One corner of the checkpoint area.
     * @param corner2 The opposite corner of the checkpoint area.
     * @param respawnHeight Optional fixed Y-level for respawning within this checkpoint.
     * @returns The index of the added checkpoint
     */
    protected addCheckpointArea(corner1: Vector3Like, corner2: Vector3Like, respawnHeight?: number): number {
        const checkpoint = new AreaComponent(corner1, corner2, respawnHeight);
        const checkpointIndex = this.checkpoints.length;
        this.checkpoints.push(checkpoint);
        
        // Create a trigger entity for this checkpoint
        const checkpointTrigger = new TriggerEntity(
            checkpoint,
            (playerEntity) => this.handlePlayerCheckpoint(playerEntity, checkpointIndex),
            `${this.getLevelName()} Checkpoint ${checkpointIndex + 1}`,
            this.world
        );
        
        // Store and spawn the trigger
        this.checkpointTriggers.push(checkpointTrigger);
        //checkpointTrigger.spawn(this.world, checkpoint.getCenter());
        
        console.log(`[${this.constructor.name}] Checkpoint ${checkpointIndex + 1} added and trigger spawned.`);
        return checkpointIndex;
    }
    
    /**
     * Handles when a player enters a checkpoint trigger.
     * @param playerEntity The player entity that entered the checkpoint
     * @param checkpointIndex The index of the checkpoint (0-based)
     */
    protected handlePlayerCheckpoint(playerEntity: PlayerEntity, checkpointIndex: number): void {
        if (!playerEntity.player) return;
        
        const playerId = playerEntity.player.id;
        const player = playerEntity.player;
        
        // Get the player's current highest checkpoint
        const currentCheckpoint = this.playerCheckpoints.get(playerId) || -1;
        
        // Only update if this is a new checkpoint or a higher one
        if (checkpointIndex > currentCheckpoint) {
            console.log(`[${this.constructor.name}] Player ${playerId} reached checkpoint ${checkpointIndex + 1}`);
            
            // Update the player's checkpoint
            this.playerCheckpoints.set(playerId, checkpointIndex);
            
            // Update the player controller's checkpoint position
            const checkpointArea = this.checkpoints[checkpointIndex];
            const respawnPos = checkpointArea.getRandomPosition();
            
            const playerController = playerEntity.controller as PlayerController;
            if (playerController) {
                playerController.setCheckpoint(respawnPos);
                console.log(`[${this.constructor.name}] Set checkpoint position for player ${playerId} at checkpoint ${checkpointIndex + 1}`);
            }
            
            // Show checkpoint message to the player if enabled
            if (this.showCheckpointMessages && this.uiBridge) {
                this.uiBridge.showAnimatedText(
                    player, 
                    `CHECKPOINT ${checkpointIndex + 1}`, 
                    "", 
                    1500
                );
            }
        }
    }

    /**
     * Checks if a given position is within the finish area.
     * @param position The position to check.
     * @returns True if the position is inside the finish area, false otherwise.
     */
    public isInFinishArea(position: Vector3Like): boolean {
        return this.finishArea ? this.finishArea.contains(position) : false;
    }

    /**
     * Finds the appropriate checkpoint respawn position for a given player position.
     * Uses the tracked checkpoint data instead of checking positions.
     * @param playerId The player's ID
     * @returns The respawn position of the last checkpoint the player passed, or the start area spawn position if none found.
     */
    public getCheckpointRespawnPosition(playerId: string): Vector3Like | null {
        // Get the player's highest checkpoint index
        const checkpointIndex = this.playerCheckpoints.get(playerId);
        
        // If player has reached a checkpoint, use that position
        if (checkpointIndex !== undefined && checkpointIndex >= 0 && checkpointIndex < this.checkpoints.length) {
            return this.checkpoints[checkpointIndex].getRandomPosition();
        }
        
        // If no checkpoint passed, return start area spawn
        return this.getStartSpawnPosition(); 
    }
    
    /**
     * Starts the round for this level.
     * @param players List of players participating.
     * @param qualificationTarget Number of players needed to qualify.
     */
    public startRound(players: Player[], qualificationTarget: number): void {
        console.log(`[CourseLevelController] Starting round with ${players.length} players. Target: ${qualificationTarget}`);
        this.qualificationTarget = qualificationTarget;
        this.qualifiedPlayerIds.clear(); 
        // Store starting player IDs
        this.startingPlayerIds = new Set(players.map(p => p.id)); 
        // Reset round state
        this.roundEnded = false;
        
        // Reset player checkpoints
        this.playerCheckpoints.clear();
        
        this.setPausePlayers(players, true);
        
        // Check if we need to initialize boundaries
        if (!this.boundariesInitialized) {
            this.setupCourseBoundaries();
            this.boundariesInitialized = true;
        } else {
            // Check if finish trigger needs respawning (might have been despawned but not nullified)
            if (this.finishTrigger && !this.finishTrigger.isSpawned && this.finishArea) {
                console.log(`[${this.constructor.name}] Respawning finish trigger`);
                this.finishTrigger.spawn(this.world);
            }
            
            // Check if checkpoint triggers need respawning
            this.checkpointTriggers.forEach((trigger, index) => {
                if (!trigger.isSpawned && index < this.checkpoints.length) {
                    console.log(`[${this.constructor.name}] Respawning checkpoint trigger ${index + 1}`);
                    trigger.spawn(this.world);
                }
            });
        }
    }
    
    // Override cleanup 
    public override cleanup(): void {
        console.log(`[${this.constructor.name}] Cleaning up course level resources`);
        
        // First cleanup local resources
        if (this.finishTrigger) {
            if (this.finishTrigger.isSpawned) {
                try {
                    this.finishTrigger.despawn();
                } catch (e) {
                    console.error(`[${this.constructor.name} ${this.config.id}] Error despawning finishTrigger:`, e);
                }
            }
        } else {
            console.log(`[${this.constructor.name} ${this.config.id}] No finishTrigger found during cleanup.`);
        }
        
        // Despawn all checkpoint triggers
        this.checkpointTriggers.forEach((trigger, index) => {
            if (trigger.isSpawned) {
                try {
                    trigger.despawn();
                    console.log(`[${this.constructor.name}] Despawned checkpoint trigger ${index + 1}`);
                } catch (e) {
                    console.error(`[${this.constructor.name}] Error despawning checkpoint trigger ${index + 1}:`, e);
                }
            }
        });
        
        // Completely null out all area components
        this.finishTrigger = null;
        this.finishArea = null;
        this.checkpoints = [];
        this.checkpointTriggers = [];
        this.playerCheckpoints.clear();
        this.qualifiedPlayerIds.clear();
        this.startingPlayerIds.clear(); // Clear starting players
        this.qualificationTarget = 0; 
        this.boundariesInitialized = false; // Reset initialization flag
        
        // Then call parent cleanup
        console.log(`[${this.constructor.name}] Calling LevelController cleanup`);
        super.cleanup(); // Call base cleanup (LevelController)
        
        console.log(`[${this.constructor.name}] Course level cleanup complete`);
        
        // Clear timer interval
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
} 