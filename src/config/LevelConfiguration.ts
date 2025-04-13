import { type World } from 'hytopia';
import { type LevelController } from '../core/LevelController';

export type LevelType = 'Qualification' | 'Elimination' | 'Survival' | 'Team' | 'Final';

export interface LevelConfiguration {
	id: string; // Unique identifier (e.g., "gate_crash_qual")
	mapName: string; // e.g., "gatecrash", used by LevelManager/LevelController to load
	displayName: string; // e.g., "Gate Crash" (for UI)
	description?: string; // e.g., "A fast-paced gate crash course" (for UI)
	// Use 'any' for constructor temporarily to avoid circular dependencies during initial setup
	// We'll refine this later if needed.
	controller: new (world: World, config: LevelConfiguration) => any;
	levelType: LevelType;
	minPlayers: number; // Min players required for this level to be selected
	maxPlayers: number; // Max players allowed (can influence selection)
	minRound: number; // Earliest round this can appear (1-based)
	maxRound: number; // Latest round this can appear (relative to max rounds)
	isFinalRound: boolean; // Can this be selected as the final round?
	difficulty?: 'easy' | 'medium' | 'hard'; // Difficulty setting for this level
	imageUrl?: string; // URL to an image for this level (for UI)

	// --- Type-specific config --- 
	// Optional fields based on level type
	qualificationSlotsRatio?: number; // e.g., 0.6 = 60% of players qualify
	timeLimitSeconds?: number; // e.g., 120 for Survival
	teamSize?: 0 | 2 | 3; // e.g., 2 for Team
	teamMode?: boolean; // Whether this level uses team mechanics
	qualifyCondition?: 'Survive' | 'PassFinishLine' | 'MostPoints'; // e.g., 'Survive' for Survival
	onPlayerDeath?: 'RespawnAtCheckPoint' | 'Eliminated'; // e.g., 'RespawnAtCheckPoint' for Survival
	finalRound?: boolean; // e.g., true for Final

	debugMode?: boolean; // e.g., true for Debug

	// Add other type-specific settings as needed (e.g., teamSize)
} 