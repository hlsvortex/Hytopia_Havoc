export interface LevelConfiguration {
    /** Unique identifier for this level */
    id: string;
    
    /** Map file name */
    mapName: string;
    
    /** Human-readable name for this level */
    displayName: string;
    
    /** Level controller class for this level */
    controller: any;
    
    /** Level type (qualification, survival, final, etc.) */
    levelType: 'Qualification' | 'Survival' | 'Final' | 'Team';
    
    /** Minimum players required for this level */
    minPlayers: number;
    
    /** Maximum players supported by this level */
    maxPlayers: number;
    
    /** Minimum round this level can appear in (1-based) */
    minRound: number;
    
    /** Maximum round this level can appear in (1-based) */
    maxRound: number;
    
    /** Is this a final round level? */
    isFinalRound: boolean;
    
    /** Ratio of players who can qualify (0.0 to 1.0) */
    qualificationSlotsRatio: number;
    
    /** Difficulty rating for this level */
    difficulty: 'easy' | 'medium' | 'hard';
    
    /** Condition for qualification (PassFinishLine, Survive, etc.) */
    qualifyCondition: 'PassFinishLine' | 'Survive' | 'Score' | 'Other';
    
    /** What happens when a player dies (RespawnAtCheckPoint, Eliminated) */
    onPlayerDeath?: 'RespawnAtCheckPoint' | 'Eliminated';
    
    /** Description of this level */
    description?: string;
    
    /** Time limit in seconds (0 = no limit) */
    timeLimitSeconds?: number;
    
    /** Whether to show the timer in the HUD */
    showTimer?: boolean;
    
    /** Debug mode flag */
    debugMode?: boolean;
    
    /** Enable team-based play for this level */
    teamMode?: boolean;
} 