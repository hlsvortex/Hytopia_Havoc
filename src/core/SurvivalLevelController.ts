import { World, Player, PlayerEntity, type Vector3Like, PlayerCameraMode, EntityEvent } from 'hytopia';
import { LevelController } from './LevelController';
import { type LevelConfiguration } from '../config/LevelConfiguration';
import { AreaComponent } from '../AreaComponent'; 
import { UIBridge } from './UIBridge';
import { GameManager } from './GameManager';
import  ObstacleEntity  from '../obsticals/ObstacleEntity';
import { EventEmitter } from '../utils/EventEmitter';
import PlayerController from '../PlayerController';
import type { PlayerData } from '../types/PlayerData';
/**
 * Base controller for survival-type levels where players must avoid being eliminated
 * by staying on a platform for a set duration.
 * 
 * Configuration options:
 * - timeLimitSeconds: Duration of the round in seconds
 * - onPlayerDeath: What happens when a player falls ('RespawnAtCheckPoint' or 'Eliminated')
 * - showTimer: Whether to show the timer in the HUD (default: true)
 */
export abstract class SurvivalLevelController extends LevelController {
    protected playArea: AreaComponent | null = null;
    protected roundDuration: number = 60000; // Default round duration: 60 seconds
    protected roundStartTime: number = 0;
    protected roundEnded: boolean = false;
    protected tickListener: (() => void) | null = null;
    protected timeRemaining: number = 0;
    protected timerInterval: NodeJS.Timeout | null = null;
	protected roundEndTimeout: NodeJS.Timeout | null = null;
    //protected players: Map<string, Player> = new Map(); // Store reference to players
    //protected playerEntities: Map<string, PlayerEntity> = new Map(); // Store reference to player entities
    protected onPlayerDeathBehavior: 'RespawnAtCheckPoint' | 'Eliminated' = 'Eliminated'; // Default behavior
    protected pendingTimeouts: Set<NodeJS.Timeout> = new Set();
    protected playerDespawnTimeouts: Map<string, NodeJS.Timeout> = new Map();
    protected showTimer: boolean = true; // Default: show timer in UI
    protected goalMessage: string = 'Survive!'; // Default goal message
    
    constructor(world: World, config: LevelConfiguration, uiBridge: UIBridge | null = null, gameManager: GameManager) {
        super(world, config, uiBridge, gameManager);
        console.log(`[${this.constructor.name}] Constructor called for ${config.id}`);
        
        // Configure level-specific settings
        // Use timeLimitSeconds from config if provided
        if (config.timeLimitSeconds !== undefined) {
            this.roundDuration = config.timeLimitSeconds * 1000; // Convert to milliseconds
            console.log(`[${this.constructor.name}] Round duration set to ${this.roundDuration}ms`);
        }
        
        // Set player death behavior from config
        if (config.onPlayerDeath) {
            this.onPlayerDeathBehavior = config.onPlayerDeath;
            console.log(`[${this.constructor.name}] Player death behavior set to: ${this.onPlayerDeathBehavior}`);
        }
        
        // Check if showTimer is specified in config
        if (typeof (config as any).showTimer === 'boolean') {
            this.showTimer = (config as any).showTimer;
            console.log(`[${this.constructor.name}] Timer visibility set to: ${this.showTimer ? 'shown' : 'hidden'}`);
        }

        // Check if goal message is specified
        if (typeof (config as any).goalMessage === 'string') {
            this.goalMessage = (config as any).goalMessage;
            console.log(`[${this.constructor.name}] Custom goal message set: "${this.goalMessage}"`);
        }
    }
    
    /**
     * Set GameManager reference to access player entities
     */
    public setGameManager(gameManager: GameManager): void {
        this.gameManager = gameManager;
    }
    
    
	protected respawnPlayerAtCheckpoint(playerEntity: PlayerEntity): void {
		//console.log(`[SurvivalLevelController] Respawning player ${playerEntity.player?.id} at checkpoint`);
		const playerController = playerEntity.controller as PlayerController;
		playerController.RespawnAtCheckpoint();
	}
  
    
    /**
     * Safely set a timeout that will be tracked and can be cleared during cleanup
     */
    protected safeSetTimeout(callback: () => void, delay: number): NodeJS.Timeout {
        const timeout = setTimeout(() => {
            this.pendingTimeouts.delete(timeout);
            callback();
        }, delay);
        this.pendingTimeouts.add(timeout);
        return timeout;
    }

    /**
     * Modified eliminatePlayer to use tracked timeouts
     */
    public override eliminatePlayer(playerEntity: PlayerEntity): void {
        if (!playerEntity.player) return;
        
        const playerId = playerEntity.player.id;
        
        console.log(`[SurvivalLevelController] Eliminating player ${playerId}`);

        // Skip if already eliminated
        if (this.eliminatedPlayerIds.has(playerId)) {
            return;
        }
        
        // Add to eliminated list
        this.eliminatedPlayerIds.add(playerId);
        console.log(`[${this.constructor.name}] Player ${playerId} ELIMINATED!`);
        
        // Show ELIMINATED text to the player
        if (this.uiBridge) {
            this.uiBridge.showAnimatedText(playerEntity.player, "ELIMINATED!", "", 2000);
        }
        
        // Set to spectator mode
        playerEntity.player.camera.setMode(PlayerCameraMode.SPECTATOR);
        
        // Despawn after a short delay with tracked timeout
        if (playerEntity.isSpawned) {
            // Clear any existing timeout for this player
            if (this.playerDespawnTimeouts.has(playerId)) {
                clearTimeout(this.playerDespawnTimeouts.get(playerId)!);
            }
            
            // Set new timeout and track it
            const timeout = this.safeSetTimeout(() => {
                if (playerEntity.isSpawned) {
                    playerEntity.despawn();
                }
                this.playerDespawnTimeouts.delete(playerId);
            }, 50);
            
            this.playerDespawnTimeouts.set(playerId, timeout);
        }
        
        // Update HUD for all players
        this.broadcastHudUpdate();
        
        // Check if enough players have been eliminated to end the round
        this.checkRoundOverConditions();
    }
    
    /**
     * Set the goal message displayed in the HUD
     */
    protected setGoalMessage(message: string): void {
        this.goalMessage = message;
        console.log(`[${this.constructor.name}] Goal message set to: "${this.goalMessage}"`);
        
        // Update HUD immediately if we've already started
        if (this.uiBridge && !this.roundEnded) {
            this.broadcastHudUpdate();
        }
    }
    
    /**
     * Broadcast HUD update to all players with current status
     */
    protected broadcastHudUpdate(): void {
        if (!this.uiBridge) return;
        
        const totalPlayers = this.startingPlayerIds.size;
        const remainingCount = totalPlayers - this.eliminatedPlayerIds.size;
        const eliminatedCount = this.eliminatedPlayerIds.size;
        
        // Calculate how many players need to be eliminated
        // If we have 4 players and 2 can qualify, we need to eliminate 2 players
        let playersToEliminate;

        // Special handling for 1-2 players (small games)
        if (totalPlayers <= 2) {
            // For 1-2 players, eliminate at most half (rounded down)
            playersToEliminate = Math.floor(totalPlayers / 2);
            console.log(`[SurvivalLevelController] Small game (${totalPlayers} players) - setting elimination target to ${playersToEliminate}`);
        } else {
            // Normal case: eliminate players according to qualification target
            playersToEliminate = totalPlayers - this.qualificationTarget;
        }
        
        // Make absolutely sure we never try to eliminate all players
        playersToEliminate = Math.min(playersToEliminate, totalPlayers - 1);
        
        // Format the goal message with time if applicable
        let formattedGoal = this.goalMessage;
        if (this.showTimer && formattedGoal.includes('{time}')) {
            formattedGoal = formattedGoal.replace('{time}', `${Math.ceil(this.timeRemaining / 1000)}`);
        }
        
        const hudData = {
            goal: formattedGoal,
            statusLabel: "ELIMINATED",
            currentCount: eliminatedCount,
            totalCount: playersToEliminate,
            // Only include timer if showTimer is true
            timer: this.showTimer ? Math.ceil(this.timeRemaining / 1000) : undefined
        };
        
        console.log(`[SurvivalLevelController] HUD Update: ${eliminatedCount}/${playersToEliminate} players eliminated, ${remainingCount} remaining`);
        
        this.uiBridge.broadcastData({ type: 'UPDATE_HUD', hudData });
    }
    
    /**
     * Check if the round should end
     */
    protected checkRoundOverConditions(): void {
        // If round already ended, skip
        if (this.roundEnded) return;
        
        const remainingCount = this.startingPlayerIds.size - this.eliminatedPlayerIds.size;
        
        // End round if only qualification target number of players remain
        if (remainingCount <= this.qualificationTarget) {
            console.log(`[${this.constructor.name}] Only ${remainingCount} players remaining, ending round early`);
            this.endRound();
        }
    }
    
    /**
     * Initialize and start the round timer
     */
    protected startRoundTimer(): void {
        console.log(`[SurvivalLevelController] Starting round timer with duration ${this.roundDuration}ms`);
        
		if (this.roundDuration === 0) {
			console.log(`[SurvivalLevelController] No time limit provided, round timer not started`);
			return;
		}

        // Make sure we don't have multiple timers
        if (this.timerInterval) {
            console.log(`[SurvivalLevelController] Clearing existing timer interval`);
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        this.roundStartTime = Date.now();
        this.timeRemaining = this.roundDuration;
        
        console.log(`[SurvivalLevelController] Round start time: ${this.roundStartTime}`);
        
        // Set up timer interval to update timer display
        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.roundStartTime;
            this.timeRemaining = Math.max(0, this.roundDuration - elapsed);
            
            // Update HUD with new time
            this.broadcastHudUpdate();
            console.log(`[SurvivalLevelController] Update roundtime ${this.timeRemaining}`);
            
            // If time is up, end round
            if (this.timeRemaining <= 0) {
                this.endRoundByTimeout();
            }
        }, 1000); // Update every second
    }
    
    /**
     * Modified endRoundByTimeout to use tracked timeout
     */
    protected endRoundByTimeout(): void {
        // If the round is already ended, don't do anything
        if (this.roundEnded) {
            console.log(`[${this.constructor.name}] endRoundByTimeout called but round already ended, ignoring`);
            return;
        }
        
        // Immediately mark the round as ended to prevent multiple calls
        this.roundEnded = true;
        console.log(`[${this.constructor.name}] Round time expired! Marking round as ended.`);
        
        // Clear the timer immediately to prevent any further ticks
        if (this.timerInterval) {
            console.log(`[${this.constructor.name}] Clearing timer interval`);
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Clear any existing round end timeout
        if (this.roundEndTimeout) {
            console.log(`[${this.constructor.name}] Clearing existing round end timeout`);
            clearTimeout(this.roundEndTimeout);
            this.roundEndTimeout = null;
        }
        
        // Show TIME UP! message to all players
        if (this.uiBridge) {
            console.log(`[${this.constructor.name}] Showing TIME UP! message`);
            this.uiBridge.broadcastAnimatedText("TIME", "UP!", 2000);
        }
        
        // Determine qualified players (all players who weren't eliminated)
        const qualified = Array.from(this.startingPlayerIds)
            .filter(id => !this.eliminatedPlayerIds.has(id));
        const eliminated = Array.from(this.eliminatedPlayerIds);
        
        // Store qualified players
        this.qualifiedPlayerIds = new Set(qualified);
        
        console.log(`[${this.constructor.name}] Time expired - Qualified: ${qualified.length}, Eliminated: ${eliminated.length}`);
        
        // Use a stronger timeout approach with direct event emission
        setTimeout(() => {
            // Safety check - if somehow the round ended through another path during our timeout
            if (!this.roundEnded) {
                console.log(`[${this.constructor.name}] Round no longer marked as ended during timeout, aborting endRoundByTimeout`);
                return;
            }

            console.log(`[${this.constructor.name}] Time's up timeout completed, emitting RoundEnd event directly`);
            
            // Emit the RoundEnd event directly with our qualified/eliminated players
            this.events.emit('RoundEnd', { q: qualified, e: eliminated });
            
            // Additional cleanup to ensure we're fully done with this level
            this.cleanupRound();
            
        }, 2000);
    }
    
    /**
     * Additional cleanup method to ensure all timers and handlers are properly cleared
     * Called by both endRound and endRoundByTimeout
     */
    protected cleanupRound(): void {
        // Clear timers
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        if (this.roundEndTimeout) {
            clearTimeout(this.roundEndTimeout);
            this.roundEndTimeout = null;
        }
        
        // Clear tick handler
        if (this.tickListener) {
            this.world.off(EntityEvent.TICK, this.tickListener);
            this.tickListener = null;
        }
        
        console.log(`[${this.constructor.name}] Round cleanup completed`);
    }
    
    /**
     * Set up the tick handler to check for fallen players
     */
    protected setupTickHandler(): void {
        // Clear any existing tick listener
        if (this.tickListener) {
            this.world.off(EntityEvent.TICK, this.tickListener);
            this.tickListener = null;
        }
    }
    
    /**
     * Start the round for this level
     */
    public startRound(players: Player[], qualificationTarget: number): void {
        console.log(`[SurvivalLevelController] Starting round with ${players.length} players. Target: ${qualificationTarget}`);
        
        // Store round parameters
        this.qualificationTarget = Math.max(1, qualificationTarget); // Ensure at least 1 player qualifies
        this.startingPlayerIds = new Set(players.map(p => p.id));
        this.qualifiedPlayerIds.clear();
        this.eliminatedPlayerIds.clear();
        this.roundEnded = false;
        
		this.setPausePlayersIds(Array.from(this.startingPlayerIds), true);
        
		
        // Set up handlers
        this.setupTickHandler();
        
        // Initialize timer values but don't start timer yet
        this.roundStartTime = Date.now();
        this.timeRemaining = this.roundDuration;
        
        // Initial HUD update
        this.broadcastHudUpdate();
    }
    
    /**
     * End the current round with improved cleanup
     */
    public override endRound(): void {
        // Check if round already ended to prevent double calls
        if (this.roundEnded) {
            console.log(`[${this.constructor.name}] endRound called but round already ended, ignoring`);
            return;
        }
        
        this.roundEnded = true;
        
        // Call our cleanup method to ensure all timers are cleared
        this.cleanupRound();
        
        // Determine qualified and eliminated players
        const qualified = Array.from(this.startingPlayerIds)
            .filter(id => !this.eliminatedPlayerIds.has(id));
            
        const eliminated = Array.from(this.eliminatedPlayerIds);
        
        // Store qualified players
        this.qualifiedPlayerIds = new Set(qualified);
        
        console.log(`[${this.constructor.name}] Round ended. Qualified: ${qualified.length}, Eliminated: ${eliminated.length}`);
        
        // Emit round end event
        this.events.emit('RoundEnd', { q: qualified, e: eliminated });
    }
    
    /**
     * Register an obstacle with this level controller
     * This allows activating all obstacles when gameplay begins
     */
    public registerObstacle(obstacle: ObstacleEntity): void {
        this.obstacles.push(obstacle);
        console.log(`[${this.constructor.name}] Registered obstacle: ${obstacle.id}`);
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
        this.startRoundTimer();
    }
    
    /**
     * Enhanced cleanup to ensure all resources are properly released
     */
    public override cleanup(): void {
        console.log(`[SurvivalLevelController] Cleaning up survival level...`);
        
        // Mark round as ended to prevent further processing
        this.roundEnded = true;
        
        // Clear the round timer interval
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Clear round end timeout if it exists
        if (this.roundEndTimeout) {
            clearTimeout(this.roundEndTimeout);
            this.roundEndTimeout = null;
        }
        
        // Clear all player despawn timeouts
        this.playerDespawnTimeouts.forEach((timeout) => {
            clearTimeout(timeout);
        });
        this.playerDespawnTimeouts.clear();
        
        // Clear all other pending timeouts
        this.pendingTimeouts.forEach((timeout) => {
            clearTimeout(timeout);
        });
        this.pendingTimeouts.clear();
        
        // Clean up tick handler
        if (this.tickListener) {
            this.world.off(EntityEvent.TICK, this.tickListener);
            this.tickListener = null;
        }
        
        // Clear player references
        //this.players.clear();
        //this.playerEntities.clear();
        this.obstacles = []; // Clear obstacle references
        
        console.log(`[SurvivalLevelController] SurvivalLevelController cleanup complete, calling LevelController cleanup`);
        
        // Call base class cleanup
        super.cleanup();
    }
    
    /**
     * Register a player entity with this controller
     */
    public registerPlayerEntity(playerId: string, entity: PlayerEntity): void {
        //this.playerEntities.set(playerId, entity);
    }
    
    /**
     * Get a spawn position within the play area
     */
    public getSpawnPosition(): Vector3Like | null {
        // First try to get a start area spawn position
        const startSpawn = this.getStartSpawnPosition();
        if (startSpawn) {
            console.log(`[${this.constructor.name}] Using start area spawn: ${JSON.stringify(startSpawn)}`);
            return startSpawn;
        }
        
        // Fall back to play area if no start area defined
        if (this.playArea) {
            const playAreaSpawn = this.playArea.getRandomPosition();
            console.log(`[${this.constructor.name}] Using play area spawn: ${JSON.stringify(playAreaSpawn)}`);
            return playAreaSpawn;
        }
        
        console.warn(`[${this.constructor.name}] No spawn positions available!`);
        return null;
    }
} 