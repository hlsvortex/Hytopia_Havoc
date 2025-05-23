import {
	startServer,
	PlayerEvent,
	World,
	Player,
} from 'hytopia';

import PlayerController from './src/PlayerController';
import { GameManager } from './src/core/GameManager';
import { LevelManager } from './src/core/LevelManager';
import { UIBridge } from './src/core/UIBridge';
import { gameConfig } from './src/config/gameConfig';

startServer(world => {
	console.log('[Server] Initializing Fall Guys game...');

	// Visualize raycasts for debugging if needed
	// world.simulation.enableDebugRaycasting(true);

	// 1. Create the GameManager
	const gameManager = new GameManager(world);
	
	// 2. Create the UIBridge and link it with GameManager
	const uiBridge = new UIBridge(world, gameManager);
	gameManager.setUIBridge(uiBridge); // Provide GameManager with a reference to UIBridge
	
	// 3. Handle Player Join - Initialize UI via UIBridge
	world.on(PlayerEvent.JOINED_WORLD, async ({ player }) => {
		console.log(`[Server] Player ${player.id} joined.`);
		
		// Let GameManager's handlePlayerJoin execute first to load player data
		// This happens automatically due to the listener registered in GameManager
		
		// Small delay to ensure player data is loaded before initializing UI
		setTimeout(() => {
			// Initialize the UI
			uiBridge.initializePlayerUI(player);
			
			// Send welcome message using player name
			const playerName = gameManager.getPlayerName(player.id);
			world.chatManager.sendBroadcastMessage(`Welcome ${playerName} to Hytopia Havoc!`);
			
			// Force another update of the player's stats after a small delay
			setTimeout(() => {
				const playerData = gameManager.getPlayerData(player.id);
				if (playerData) {
					uiBridge.updatePlayerStats(player, playerData);
				}
			}, 500);
		}, 100);
	});
	
	// =========================================
	// COMMAND REGISTRATION
	// Route commands to GameManager or relevant manager
	// =========================================
	
	// Command to manually start the game (host/admin)
	world.chatManager.registerCommand("/startgame", (player, args) => {
		console.log(`[Command] /startgame received from ${player.id}`);
		if (gameManager.getGameState() === 'Lobby') {
			gameManager.startGame();
			return "Attempting to start the game...";
		} else {
			return "Game can only be started from the Lobby.";
		}
	});
	
	// Command to end the game (host/admin)
	world.chatManager.registerCommand("/endgame", (player, args) => {
		 console.log(`[Command] /endgame received from ${player.id}`);
		 const reason = args.join(" ") || "Manual Admin End";
		 gameManager.endGame(reason);
		 return `Ending the game. Reason: ${reason}`;
	});
	
	// Command to manually load a level (for testing/admin)
	// Note: Normal level loading happens via UIBridge -> GameManager -> loadAndStartRound
	world.chatManager.registerCommand("/loadlevel", (player, args) => {
		const levelId = args[0];
		if (!levelId) return "Usage: /loadlevel <levelId>";
		console.log(`[Command] /loadlevel ${levelId} received from ${player.id}`);
		
		// This bypasses normal game flow, primarily for testing
		if (gameManager.levelManager.activateLevel(levelId)) { // Access LevelManager via GameManager
			 world.chatManager.sendBroadcastMessage(`Admin loaded level: ${levelId}`);
			 return `Successfully activated level: ${levelId}`;
		 } else {
			 return `Failed to activate level: ${levelId}.`;
		 }
	});
	
	// =========================================
	// GAME EVENT LISTENERS (Optional - Example)
	// =========================================
	
	gameManager.events.on('GameWon', (winnerId) => {
		// Log winner using just the ID
		console.log(`[Event] Game Won by ${winnerId}`); 
		// Broadcast handled within GameManager.endGame
	});
	
	gameManager.events.on('GameEnded', (reason) => {
		console.log(`[Event] Game Ended. Reason: ${reason}`);
		// Broadcast handled within GameManager.endGame
	});

	console.log('[Server] Fall Guys game initialized successfully!');
});
