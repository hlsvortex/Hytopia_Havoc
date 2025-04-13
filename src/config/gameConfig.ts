import { type LevelConfiguration } from './LevelConfiguration';
import { GateCrashLevelController } from '../levels/GateCrashLevelController';
import { SeesawLevelController } from '../levels/SeesawLevelController';
import { JumpClubLevelController } from '../levels/JumpClubLevelController';
import { TopDropLevelController } from '../levels/TopDropLevelController';
// Import other level controllers later...

export const gameConfig = {
	maxRounds: 5,
	minPlayersToStart: 2, // Lowered for easier testing
	minPlayersForFinal: 3,
	absoluteMinPlayers: 1,

	// Level-specific configurations
	levelConfigs: {
		seesaw: {
			id: "seesaw",
			name: "Seesaw Survivor",
			mapPath: "assets/seesaw.json",
			difficulty: "medium",
			config: {
				baseDepth: 5,
				seesawDepth: 11,
				width: 12
			}
		},
		gatecrash: {
			id: "gatecrash",
			name: "Gate Crash",
			mapPath: "assets/gate_crash.json",
			difficulty: "medium"
		},
		rotatingbeam: {
			id: "rotatingbeam",
			name: "Spinning Beam Blitz",
			mapPath: "assets/rotating_beam.json", // Create this map file
			difficulty: "medium"
		}
	},

	availableLevels: [
		// --- Qualification --- 
		{
			id: 'seesaw',
			mapName: 'assets/seesaw.json',
			displayName: 'Seesaw Survivor',
			controller: SeesawLevelController,
			levelType: 'Qualification',
			minPlayers: 1,
			maxPlayers: 24,
			minRound: 1,
			maxRound: 4,
			isFinalRound: false,
			qualificationSlotsRatio: 0.66,
			difficulty: 'medium',
			qualifyCondition: 'PassFinishLine',
			onPlayerDeath: 'RespawnAtCheckPoint'
		},
		{
			id: 'gatecrash',
			mapName: 'assets/gate_crash.json',
			displayName: 'Gate Crash',
			controller: GateCrashLevelController,
			levelType: 'Qualification',
			minPlayers: 1,
			maxPlayers: 24,
			minRound: 1,
			maxRound: 4,
			isFinalRound: false,
			qualificationSlotsRatio: 0.66,
			difficulty: 'medium',
			qualifyCondition: 'PassFinishLine',
			onPlayerDeath: 'RespawnAtCheckPoint',
			//debugMode: true
		},
		{
			id: 'jumpclub',
			mapName: 'assets/jump_club.json',
			displayName: 'Spinning Beam Blitz',
			description: 'Dodge the spinning beams and make it to the finish line!',
			controller: JumpClubLevelController,
			levelType: 'Survival',
			minPlayers: 1,
			maxPlayers: 10,
			minRound: 1,
			maxRound: 4,
			isFinalRound: true,
			qualificationSlotsRatio: 0.66,
			difficulty: 'medium',
			qualifyCondition: 'Survive',
			onPlayerDeath: 'Eliminated',
			timeLimitSeconds: 0,
			//debugMode: true
		},
		{
			id: 'topdrop',
			mapName: 'assets/top_drop.json',
			displayName: 'Top Drop',
			description: 'Dodge the spinning beams and make it to the finish line!',
			controller: TopDropLevelController,
			levelType: 'Survival',
			minPlayers: 1,
			maxPlayers: 10,
			minRound: 1,
			maxRound: 4,
			isFinalRound: true,
			qualificationSlotsRatio: 0.66,
			difficulty: 'medium',
			qualifyCondition: 'Survive',
			onPlayerDeath: 'Eliminated',
			showTimer: false,
			timeLimitSeconds: 0,
			//debugMode: true
		},
	] as LevelConfiguration[],
}; 