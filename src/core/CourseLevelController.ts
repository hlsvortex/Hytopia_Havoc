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
    protected boundariesInitialized: boolean = false; // Track if boundaries are set up
    
    constructor(world: World, config: LevelConfiguration, uiBridge: UIBridge | null = null, gameManager: GameManager) {
        super(world, config, uiBridge, gameManager);
        // Don't call setupCourseBoundaries here - will be called in startRound when needed
        console.log(`[${this.constructor.name}] Constructor called for ${config.id}`);
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
            if (this.finishTrigger && this.finishTrigger.isSpawned) {
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
                `${this.getLevelName()} Finish Line`
            );

            this.finishTrigger.spawn(this.world, this.finishArea.getCenter()); // Spawn the trigger
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

		// Start the round timer (now only started here, not in startRound)
		console.log(`[${this.constructor.name}] Starting round timer`);
	}

    /**
     * Broadcasts the current HUD state to all players.
     */
    protected broadcastHudUpdate(): void {
        if (!this.uiBridge) return;
        
        // TODO: Get goal text dynamically if needed (or assume it's set initially)
        const hudData = {
            // goal: this.config.displayName ?? "Survive!", 
            statusLabel: "QUALIFIED",
            currentCount: this.qualifiedPlayerIds.size,
            totalCount: this.qualificationTarget,
            timer: null // TODO: Add timer logic if applicable
        };
        
        // Need a way to get all players - maybe from GameManager via LevelManager?
        // For now, assume uiBridge has a broadcast method (we need to add it)
        this.uiBridge.broadcastData({ type: 'UPDATE_HUD', hudData }); 
        console.log(`[${this.constructor.name}] Broadcasting HUD Update: ${hudData.currentCount}/${hudData.totalCount}`);
    }
    
    /**
     * Ends the current round, emitting results.
     */
    public endRound(): void {
        console.log(`[${this.constructor.name}] *** endRound() CALLED ***. Qualified: ${this.qualifiedPlayerIds.size}, Target: ${this.qualificationTarget}, Started: ${this.startingPlayerIds.size}`);

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
     * Adds a checkpoint area to the course.
     * @param corner1 One corner of the checkpoint area.
     * @param corner2 The opposite corner of the checkpoint area.
     * @param respawnHeight Optional fixed Y-level for respawning within this checkpoint.
     */
    protected addCheckpointArea(corner1: Vector3Like, corner2: Vector3Like, respawnHeight?: number): void {
        const checkpoint = new AreaComponent(corner1, corner2, respawnHeight);
        this.checkpoints.push(checkpoint);
        console.log(`[${this.constructor.name}] Checkpoint area ${this.checkpoints.length} added.`);
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
     * Iterates through checkpoints in reverse order (latest checkpoint first).
     * @param playerPosition The current position of the player.
     * @returns The respawn position of the last checkpoint the player passed, or the start area spawn position if none found.
     */
    public getCheckpointRespawnPosition(playerPosition: Vector3Like): Vector3Like | null {
        for (let i = this.checkpoints.length - 1; i >= 0; i--) {
            // Simple check: Has the player moved past the center Z of the checkpoint?
            // More robust checks might be needed depending on level layout.
            if (playerPosition.z > this.checkpoints[i].getCenter().z) {
                return this.checkpoints[i].getRandomPosition();
            }
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
        this.qualificationTarget = qualificationTarget;
        this.qualifiedPlayerIds.clear(); 
        // Store starting player IDs
        this.startingPlayerIds = new Set(players.map(p => p.id)); 

		this.setPausePlayers(players, true);
        
        // Check if we need to initialize boundaries
        if (!this.boundariesInitialized) {
            this.setupCourseBoundaries();
            this.boundariesInitialized = true;
        } else {
            // Check if finish trigger needs respawning (might have been despawned but not nullified)
            if (this.finishTrigger && !this.finishTrigger.isSpawned && this.finishArea) {
                console.log(`[${this.constructor.name}] Respawning finish trigger`);
                this.finishTrigger.spawn(this.world, this.finishArea.getCenter());
            }
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
        
        // Completely null out all area components
        this.finishTrigger = null;
        this.finishArea = null;
        this.checkpoints = [];
        this.qualifiedPlayerIds.clear();
        this.startingPlayerIds.clear(); // Clear starting players
        this.qualificationTarget = 0; 
        this.boundariesInitialized = false; // Reset initialization flag
        
        // Then call parent cleanup
        console.log(`[${this.constructor.name}] Calling LevelController cleanup`);
        super.cleanup(); // Call base cleanup (LevelController)
        
        console.log(`[${this.constructor.name}] Course level cleanup complete`);
    }
} 