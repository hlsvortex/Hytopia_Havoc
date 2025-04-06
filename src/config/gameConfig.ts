import { type LevelConfiguration } from './LevelConfiguration';
import { GateCrashLevelController } from '../levels/GateCrashLevelController';
import { SeesawLevelController } from '../levels/SeesawLevelController';
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
      maxPlayers: 60,
      minRound: 1,
      maxRound: 4,
      isFinalRound: false,
      qualificationSlotsRatio: 0.66,
      difficulty: 'medium'
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
      difficulty: 'medium'
    },
    // --- Seesaw Final level ---
    {
      id: 'seesaw_final',
      mapName: 'assets/seesaw.json',
      displayName: 'Seesaw Final',
      controller: SeesawLevelController,
      levelType: 'Final',
      minPlayers: 1,
      maxPlayers: 20,
      minRound: 3,
      maxRound: 5,
      isFinalRound: true,
      difficulty: 'hard'
    }
  ] as LevelConfiguration[],
}; 