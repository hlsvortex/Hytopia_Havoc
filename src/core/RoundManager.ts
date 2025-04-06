// Update RoundManager to work with LevelManager and GameConfig
import { World } from 'hytopia';
import { EventEmitter } from '../utils/EventEmitter';
import { type LevelConfiguration } from '../config/LevelConfiguration';
import { LevelManager } from './LevelManager';
import { gameConfig } from '../config/gameConfig';

export class RoundManager {
    public events = new EventEmitter<{ 
        GameEndConditionMet: string;
        RoundStart: LevelConfiguration & { roundNumber: number };
        BeforeRoundTransition: { nextLevel: LevelConfiguration | null, qualifiedPlayers: string[] };
        RoundComplete: { qualifiedPlayers: string[], eliminatedPlayers: string[] };
    }>();
    
    private world: World;
    private activePlayerIds: string[] = [];
    private levelManager: LevelManager;
    private currentRound: number = 0;
    private usedLevelIds: Set<string> = new Set();

    constructor(world: World, initialPlayerIds: string[]) {
        this.world = world;
        this.activePlayerIds = [...initialPlayerIds];
        this.levelManager = new LevelManager(world);
        
        console.log(`[RoundManager] Initialized with ${initialPlayerIds.length} players`);
    }
    
    startNextRound(): void {
        this.currentRound++;
        
        if (this.currentRound > gameConfig.maxRounds) {
            console.log('[RoundManager] Max rounds reached, ending game');
            this.events.emit('GameEndConditionMet', 'MaxRoundsReached');
            return;
        }
        
        if (this.activePlayerIds.length <= 1) {
            console.log('[RoundManager] Only one player left, ending game');
            this.events.emit('GameEndConditionMet', 'LastPlayerStanding');
            return;
        }
        
        // For final round, filter to only select levels marked as final
        const isFinalRound = this.currentRound === gameConfig.maxRounds;
        
        // Select a level based on the current round and number of players
        // Exclude levels we've already used unless we're out of options
        const excludeIds = Array.from(this.usedLevelIds);
        
        // If we're running out of levels, allow reusing
        if (excludeIds.length >= this.levelManager.getAvailableLevels().length - 1) {
            // Keep only the most recently used level in the exclude list
            const recentlyUsed = Array.from(this.usedLevelIds).pop();
            if (recentlyUsed) {
                this.usedLevelIds.clear();
                this.usedLevelIds.add(recentlyUsed);
            }
        }
        
        const selectedLevelId = this.levelManager.getRandomLevel(
            this.currentRound,
            this.activePlayerIds.length,
            isFinalRound ? [] : Array.from(this.usedLevelIds) // Don't exclude for final round
        );
        
        if (!selectedLevelId) {
            console.error('[RoundManager] Failed to select a level for the next round');
            this.events.emit('GameEndConditionMet', 'NoSuitableLevels');
            return;
        }
        
        // Add to used levels
        this.usedLevelIds.add(selectedLevelId);
        
        console.log(`[RoundManager] Selected level for round ${this.currentRound}: ${selectedLevelId}`);
        
        // Activate the selected level
        if (this.levelManager.activateLevel(selectedLevelId)) {
            // Register active players with the level
            this.activePlayerIds.forEach(playerId => {
                console.log(`[RoundManager] Tracking player ID: ${playerId}`);
            });
            
            // Start the round
            if (this.levelManager.startRound()) {
                console.log(`[RoundManager] Round ${this.currentRound} started with ${this.activePlayerIds.length} players`);
                
                // Subscribe to the level's RoundEnd event
                const activeLevel = this.levelManager.getActiveLevel();
                if (activeLevel) {
                    activeLevel.events.on('RoundEnd', this.handleRoundEnd.bind(this));
                }
            } else {
                console.error('[RoundManager] Failed to start round!');
                this.events.emit('GameEndConditionMet', 'FailedToStartRound');
            }
        } else {
            console.error(`[RoundManager] Failed to activate level: ${selectedLevelId}`);
            this.events.emit('GameEndConditionMet', 'FailedToActivateLevel');
        }
    }
    
    private handleRoundEnd(data: { q: string[], e: string[] }): void {
        console.log(`[RoundManager] Round ended with ${data.q.length} qualified, ${data.e.length} eliminated`);
        
        // Update active players
        this.activePlayerIds = data.q;
        
        if (this.activePlayerIds.length <= 1) {
            console.log('[RoundManager] Only one player left after round, ending game');
            this.events.emit('GameEndConditionMet', 'LastPlayerStanding');
            return;
        }
        
        // Emit event for round completion
        this.events.emit('RoundComplete', { 
            qualifiedPlayers: data.q, 
            eliminatedPlayers: data.e 
        });
        
        // Unsubscribe from the level's events
        const activeLevel = this.levelManager.getActiveLevel();
        if (activeLevel) {
            activeLevel.events.off('RoundEnd', this.handleRoundEnd.bind(this));
        }
        
        // Transition to next round
        this.startNextRound();
    }
    
    cleanup(): void {
        console.log('[RoundManager] Cleaning up');
        this.levelManager.cleanup();
    }
    
    getLastPlayerId(): string | null {
        return this.activePlayerIds.length === 1 ? this.activePlayerIds[0] : null;
    }
}