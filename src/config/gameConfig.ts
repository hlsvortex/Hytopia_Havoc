import { type LevelConfiguration } from './LevelConfiguration';
import { GateCrashLevelController } from '../levels/GateCrashLevelController';
import { SeesawLevelController } from '../levels/SeesawLevelController';
import { JumpClubLevelController } from '../levels/JumpClubLevelController';
import { TopDropLevelController } from '../levels/TopDropLevelController';
import { BlockPartyLevelController } from '../levels/BlockPartyLevelController';
import { BounceRushLevelController } from '../levels/BounceRushLevelController';
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
		},
		blockparty: {
			id: "blockparty",
			name: "Block Party",
			mapPath: "assets/block_party.json",
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
			onPlayerDeath: 'RespawnAtCheckPoint',
			timeLimitSeconds: 180 // 3 minutes time limit
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
			timeLimitSeconds: 180 // 3 minutes time limit
		},
		{
			id: 'bouncerush',
			mapName: 'assets/bounce_rush.json',
			displayName: 'Bounce Rush',
			controller: BounceRushLevelController,
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
			timeLimitSeconds: 200 // 2.5 minutes time limit
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
			maxRound: 5,
			isFinalRound: false,
			qualificationSlotsRatio: 0.66,
			difficulty: 'medium',
			qualifyCondition: 'Survive',
			onPlayerDeath: 'Eliminated',
			timeLimitSeconds: 0,
			showTimer: false,
			//debugMode: true
		},
		{
			id: 'topdrop',
			mapName: 'assets/top_drop.json',
			displayName: 'Top Drop',
			description: 'Keep moving while the platforms disappear!',
			controller: TopDropLevelController,
			levelType: 'Survival',
			minPlayers: 1,
			maxPlayers: 15,
			minRound: 1,
			maxRound: 5,
			isFinalRound: false,
			qualificationSlotsRatio: 0.66,
			difficulty: 'medium',
			qualifyCondition: 'Survive',
			onPlayerDeath: 'Eliminated',
			showTimer: true,
			timeLimitSeconds: 180,
		},
		{
			id: 'blockparty',
			mapName: 'assets/block_party.json',
			displayName: 'Block Party',
			description: 'Dodge the moving blocks and stay on the platform!',
			controller: BlockPartyLevelController,
			levelType: 'Survival',
			minPlayers: 1,
			maxPlayers: 20,
			minRound: 2,
			maxRound: 5,
			isFinalRound: false,
			qualificationSlotsRatio: 0.5,
			difficulty: 'hard',
			qualifyCondition: 'Survive',
			onPlayerDeath: 'Eliminated',
			showTimer: true,
			timeLimitSeconds: 180,
			blockSpawnInterval: 2000, // Spawn blocks every 2 seconds
			blockSpeed: 1.0, // Default speed
			//debugMode: true
		},
	] as LevelConfiguration[],
}; 