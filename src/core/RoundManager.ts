// Update RoundManager to work with LevelManager and GameConfig
import { World, Player } from 'hytopia';
import { EventEmitter } from '../utils/EventEmitter';
import { type LevelConfiguration } from '../config/LevelConfiguration';
import { LevelManager } from './LevelManager';
import { gameConfig } from '../config/gameConfig';

export class RoundManager {
    public events = new EventEmitter<{ 
        GameEndConditionMet: string;
        RoundStart: LevelConfiguration & { roundNumber: number };
        BeforeRoundTransition: { nextLevelId: string | null, qualifiedPlayers: string[] };
        RoundComplete: { qualifiedPlayers: string[], eliminatedPlayers: string[] };
    }>();
    
    private world: World;
    private activePlayerIds: string[] = [];
    private eliminatedPlayerIds: Set<string> = new Set();
    private levelManager: LevelManager;
    private currentRound: number = 0;
    private usedLevelIds: Set<string> = new Set();

    // Store the bound listener reference for proper removal
    private boundHandleRoundEnd: (data: { q: string[], e: string[] }) => void;

    constructor(world: World, initialPlayerIds: string[], levelManager: LevelManager) {
        this.world = world;
        this.activePlayerIds = [...initialPlayerIds];
        this.levelManager = levelManager;
        this.boundHandleRoundEnd = this.handleRoundEnd.bind(this);
        
        console.log(`[RoundManager] Initialized with ${initialPlayerIds.length} players`);
    }
    
    startNextRound(): void {
        this.currentRound++;
        console.log(`[RoundManager] Starting logic for round ${this.currentRound}`);
        
        if (this.currentRound > gameConfig.maxRounds) {
            console.log('[RoundManager] Max rounds reached, ending game');
            this.events.emit('GameEndConditionMet', 'MaxRoundsReached');
            return;
        }
        
        if (this.activePlayerIds.length <= 1 && this.currentRound > 1) {
            console.log('[RoundManager] Only one or zero players left, ending game');
            this.events.emit('GameEndConditionMet', 'LastPlayerStanding');
            return;
        }
        
        const isFinalRound = this.currentRound === gameConfig.maxRounds;
        const availableConfigs = this.levelManager.getAvailableLevelConfigs();

        let currentExcludeIds = Array.from(this.usedLevelIds);
        if (currentExcludeIds.length >= availableConfigs.length) {
             console.warn(`[RoundManager] Used all levels, allowing reuse.`);
                this.usedLevelIds.clear();
             currentExcludeIds = [];
        } else if (currentExcludeIds.length === availableConfigs.length -1) {
             const lastUnused = availableConfigs.find(c => !this.usedLevelIds.has(c.id));
             if (lastUnused) {
                 console.log(`[RoundManager] Only ${lastUnused.id} left, allowing it.`);
                 currentExcludeIds = currentExcludeIds.filter(id => id !== lastUnused.id);
             }
        }

        
        const eligibleLevels = availableConfigs.filter((config: LevelConfiguration) => {
             if (currentExcludeIds.includes(config.id)) return false;

             const minRound = config.minRound ?? 1;
             const maxRound = config.maxRound ?? gameConfig.maxRounds;
             if (this.currentRound < minRound || this.currentRound > maxRound) return false;

             const minPlayers = config.minPlayers ?? 1;
             const maxPlayers = config.maxPlayers ?? Infinity;
             if (this.activePlayerIds.length < minPlayers || this.activePlayerIds.length > maxPlayers) return false;

             if (isFinalRound !== (config.isFinalRound ?? false)) return false;

             return true;
        });

        
        if (eligibleLevels.length === 0) {
             console.error(`[RoundManager] No eligible levels found for round ${this.currentRound} with ${this.activePlayerIds.length} players. Filters: exclude=[${currentExcludeIds.join(',')}], isFinal=${isFinalRound}`);
            this.events.emit('GameEndConditionMet', 'NoSuitableLevels');
            return;
        }
        
        const randomIndex = Math.floor(Math.random() * eligibleLevels.length);
        const selectedLevelConfig = eligibleLevels[randomIndex];
        const selectedLevelId = selectedLevelConfig.id;
        
        this.usedLevelIds.add(selectedLevelId);
        console.log(`[RoundManager] Selected level for round ${this.currentRound}: ${selectedLevelId}`);
        
        this.events.emit('BeforeRoundTransition', { nextLevelId: selectedLevelId, qualifiedPlayers: this.activePlayerIds });
        console.log(`[RoundManager] Emitted BeforeRoundTransition for level ${selectedLevelId}`);
    }
    
    /**
     * Processes the results of a completed round.
     * Updates the active player list.
     * Returns true if the game should continue, false if end conditions met.
     */
    public processRoundResults(data: { q: string[], e: string[] }): boolean {
        console.log(`[RoundManager] Processing round ${this.currentRound} results. Qualified: ${data.q.length}, Eliminated: ${data.e.length}`);
        
        // Add newly eliminated players to our tracking set
        data.e.forEach(id => this.eliminatedPlayerIds.add(id));
        
        // Update active players to only include qualified players
        this.activePlayerIds = data.q;
        
        console.log(`[RoundManager] Total eliminated players across all rounds: ${this.eliminatedPlayerIds.size}`);

        // Emit event for external listeners
        this.events.emit('RoundComplete', { 
            qualifiedPlayers: data.q, 
            eliminatedPlayers: data.e 
        });
        
        // Check game end conditions based on remaining players
        if (this.activePlayerIds.length <= 1 && this.currentRound >= 1) { 
            console.log('[RoundManager] Game end condition met after round results: LastPlayerStanding');
            this.events.emit('GameEndConditionMet', 'LastPlayerStanding');
            return false; // Game should end
        }
        if (this.currentRound >= gameConfig.maxRounds) {
             console.log('[RoundManager] Game end condition met after round results: MaxRoundsReached');
             this.events.emit('GameEndConditionMet', 'MaxRoundsReached');
             return false; // Game should end
        }
        
        return true; // Game continues
    }
    
    /**
     * Contains the logic to select the next level and emit BeforeRoundTransition.
     * Should be called by GameManager after processing round results.
     */
    public startNextRoundLogic(): void {
        this.currentRound++;
        console.log(`[RoundManager] Starting selection logic for round ${this.currentRound}`);
        
        // --- Select Next Level ---
        // Check if we should force final round due to only 2 players remaining
        const onlyTwoPlayersRemain = this.activePlayerIds.length === 2;
        const isFinalRound = this.currentRound === gameConfig.maxRounds || onlyTwoPlayersRemain;
        
        if (onlyTwoPlayersRemain) {
            console.log(`[RoundManager] Only 2 players remain - forcing FINAL ROUND selection`);
        }
        
        const availableConfigs = this.levelManager.getAvailableLevelConfigs(); 

        let currentExcludeIds = Array.from(this.usedLevelIds);
        if (currentExcludeIds.length >= availableConfigs.length) {
             console.warn(`[RoundManager] Used all levels, allowing reuse.`);
             this.usedLevelIds.clear();
             currentExcludeIds = [];
        } else if (currentExcludeIds.length === availableConfigs.length -1) {
             const lastUnused = availableConfigs.find(c => !this.usedLevelIds.has(c.id));
             if (lastUnused) {
                 console.log(`[RoundManager] Only ${lastUnused.id} left, allowing it.`);
                 currentExcludeIds = currentExcludeIds.filter(id => id !== lastUnused.id);
             }
        }
        
        const eligibleLevels = availableConfigs.filter((config: LevelConfiguration) => {
             if (currentExcludeIds.includes(config.id)) return false;
             const minRound = config.minRound ?? 1;
             const maxRound = config.maxRound ?? gameConfig.maxRounds;
             if (this.currentRound < minRound || this.currentRound > maxRound) return false;
             const minPlayers = config.minPlayers ?? 1;
             const maxPlayers = config.maxPlayers ?? Infinity;
             if (this.activePlayerIds.length < minPlayers || this.activePlayerIds.length > maxPlayers) return false;
             if (isFinalRound !== (config.isFinalRound ?? false)) return false;
             return true;
        });
        
        // If we're forcing a final round but no final levels are eligible, try to find any level
        if (onlyTwoPlayersRemain && eligibleLevels.length === 0) {
            console.log(`[RoundManager] No eligible final rounds found with 2 players. Selecting any suitable level.`);
            const anyEligibleLevels = availableConfigs.filter((config: LevelConfiguration) => {
                if (currentExcludeIds.includes(config.id)) return false;
                const minPlayers = config.minPlayers ?? 1;
                const maxPlayers = config.maxPlayers ?? Infinity;
                if (this.activePlayerIds.length < minPlayers || this.activePlayerIds.length > maxPlayers) return false;
                return true;
            });
            
            if (anyEligibleLevels.length > 0) {
                const randomIndex = Math.floor(Math.random() * anyEligibleLevels.length);
                const selectedLevelConfig = anyEligibleLevels[randomIndex];
                const selectedLevelId = selectedLevelConfig.id;
                
                this.usedLevelIds.add(selectedLevelId);
                console.log(`[RoundManager] Selected non-final level for final round: ${selectedLevelId}`);
                
                this.events.emit('BeforeRoundTransition', { nextLevelId: selectedLevelId, qualifiedPlayers: this.activePlayerIds });
                console.log(`[RoundManager] Emitted BeforeRoundTransition for level ${selectedLevelId}`);
                return;
            }
        }
        
        if (eligibleLevels.length === 0) {
             console.error(`[RoundManager] No eligible levels found for round ${this.currentRound} with ${this.activePlayerIds.length} players. Filters: exclude=[${currentExcludeIds.join(',')}], isFinal=${isFinalRound}`);
             this.events.emit('GameEndConditionMet', 'NoSuitableLevels');
             return;
        }
        
        const randomIndex = Math.floor(Math.random() * eligibleLevels.length);
        const selectedLevelConfig = eligibleLevels[randomIndex];
        const selectedLevelId = selectedLevelConfig.id;
        
        this.usedLevelIds.add(selectedLevelId);
        console.log(`[RoundManager] Selected level for round ${this.currentRound}: ${selectedLevelId}`);
        // --- End Select Next Level --- 
        
        // Emit event for GameManager to handle the transition
        this.events.emit('BeforeRoundTransition', { nextLevelId: selectedLevelId, qualifiedPlayers: this.activePlayerIds });
        console.log(`[RoundManager] Emitted BeforeRoundTransition for level ${selectedLevelId}`);
    }

    // This method is the actual listener that gets attached.
    // It should just log that the event was received.
    // GameManager will handle processing via processRoundResults.
    private handleRoundEnd(data: { q: string[], e: string[] }): void {
       console.log(`[RoundManager] handleRoundEnd: Event received from level controller. Qualified: ${data.q.length}. GameManager should process.`);
       // DO NOT call processRoundResults or startNextRoundLogic here.
    }
    
    /**
     * Call this method to manually subscribe to the active level's RoundEnd event.
     * This should be called by GameManager after a level is activated.
     */
    public subscribeToActiveLevelEndEvent(): void {
        const activeLevelController = this.levelManager.getActiveLevelController();
        if (activeLevelController) {
             console.log(`[RoundManager] Subscribing to RoundEnd event of ${activeLevelController.getLevelName()}`);
             // Use the pre-bound listener reference for attaching
             activeLevelController.events.on('RoundEnd', this.boundHandleRoundEnd); 
        } else {
             console.error("[RoundManager] Cannot subscribe to level end event: No active level controller.");
        }
    }

    /**
     * Call this method to manually unsubscribe from the active level's RoundEnd event.
     * This should be called by GameManager before cleaning up a level.
     */
     public unsubscribeFromActiveLevelEndEvent(): void {
        const activeLevelController = this.levelManager.getActiveLevelController();
        if (activeLevelController) {
             console.log(`[RoundManager] Unsubscribing from RoundEnd event of ${activeLevelController.getLevelName()}`);
             // Use the pre-bound listener reference for detaching
             activeLevelController.events.off('RoundEnd', this.boundHandleRoundEnd); 
        } else {
             // Log silently if no controller, might happen during shutdown
             // console.log("[RoundManager] Cannot unsubscribe from level end event: No active level controller.");
        }
    }
    
    cleanup(): void {
        console.log('[RoundManager] Cleaning up');
        this.currentRound = 0;
        this.activePlayerIds = [];
        this.eliminatedPlayerIds.clear();
        this.usedLevelIds.clear();
        // Unsubscribe should be handled by GameManager before calling this
    }
    
    getLastPlayerId(): string | null {
        return this.activePlayerIds.length === 1 ? this.activePlayerIds[0] : null;
    }

    /**
     * Returns the list of all players eliminated in previous rounds
     */
    public getEliminatedPlayerIds(): string[] {
        return Array.from(this.eliminatedPlayerIds);
    }
    
    /**
     * Returns the list of currently active players
     */
    public getActivePlayerIds(): string[] {
        return [...this.activePlayerIds];
    }
}