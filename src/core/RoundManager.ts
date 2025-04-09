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
    private levelManager: LevelManager;
    private currentRound: number = 0;
    private usedLevelIds: Set<string> = new Set();

    constructor(world: World, initialPlayerIds: string[], levelManager: LevelManager) {
        this.world = world;
        this.activePlayerIds = [...initialPlayerIds];
        this.levelManager = levelManager;
        
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
    
    private handleRoundEnd(data: { q: string[], e: string[] }): void {
        console.log(`[RoundManager] Round ${this.currentRound} ended. Qualified: ${data.q.length}, Eliminated: ${data.e.length}`);
        
        this.activePlayerIds = data.q;
        
        this.events.emit('RoundComplete', { 
            qualifiedPlayers: data.q, 
            eliminatedPlayers: data.e 
        });
        
        if (this.activePlayerIds.length <= 1 && this.currentRound >= 1) { 
            console.log('[RoundManager] Only one or zero players left after round, ending game');
            this.events.emit('GameEndConditionMet', 'LastPlayerStanding');
            return;
        }
        
        this.startNextRound();
    }
    
    public subscribeToActiveLevelEndEvent(): void {
        const activeLevelController = this.levelManager.getActiveLevelController();
        if (activeLevelController) {
             console.log(`[RoundManager] Subscribing to RoundEnd event of ${activeLevelController.getLevelName()}`);
             activeLevelController.events.on('RoundEnd', this.handleRoundEnd.bind(this));
        } else {
             console.error("[RoundManager] Cannot subscribe to level end event: No active level controller.");
        }
    }

    public unsubscribeFromActiveLevelEndEvent(): void {
        const activeLevelController = this.levelManager.getActiveLevelController();
        if (activeLevelController) {
             console.log(`[RoundManager] Unsubscribing from RoundEnd event of ${activeLevelController.getLevelName()}`);
             console.warn("[RoundManager] Limitation: Cannot reliably unsubscribe from RoundEnd event due to bind(this). Consider refactoring listener binding.");
        }
    }

    cleanup(): void {
        console.log('[RoundManager] Cleaning up');
        this.currentRound = 0;
        this.activePlayerIds = [];
        this.usedLevelIds.clear();
    }
    
    getLastPlayerId(): string | null {
        return this.activePlayerIds.length === 1 ? this.activePlayerIds[0] : null;
    }
}