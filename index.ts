import {
	startServer,
	PlayerEntity,
	PlayerEvent,
	EntityEvent,
	PlayerCameraMode,
	World,
	Player
} from 'hytopia';

import PlayerController from './src/PlayerController';
import { GameManager } from './src/core/GameManager';
import { LevelManager } from './src/core/LevelManager';

startServer(world => {
	// Visualize raycasts for debugging
	world.simulation.enableDebugRaycasting(true);

	// Create a game manager to handle the overall game flow
	const gameManager = new GameManager(world);
	
	// Create a level manager and activate a default level for the lobby
	const levelManager = new LevelManager(world);
	
	// Pick a random level to start with
	const availableLevels = levelManager.getAvailableLevels();
	console.log(`[Server] Available levels: ${availableLevels.join(", ")}`);
	
	if (availableLevels.length > 0) {
		// Pick a random level from the available levels
		const randomIndex = Math.floor(Math.random() * availableLevels.length);
		const randomLevelId = availableLevels[randomIndex];
		levelManager.activateLevel(randomLevelId)

	} else {
		console.warn("[Server] No levels available to load");
	}
	
	// Handle player joining - show main menu first, don't spawn player yet
	world.on(PlayerEvent.JOINED_WORLD, ({ player }) => {
		console.log(`Player joined: ${player.id}`);
		
		// Load the UI for the player (which will show the main menu)
		player.ui.load('ui/index.html');
		
		// Send welcome message
		world.chatManager.sendBroadcastMessage(`Welcome to Fall Guys!`);
		
		// Configure callback for when UI is loaded to show the main menu
		setTimeout(() => {
			// Tell UI to show main menu
			player.ui.sendData({
				type: 'SHOW_MAIN_MENU'
			});
		}, 1500); // Give UI time to load
	});
	
	// Register a command to start the game from the UI
	world.chatManager.registerCommand("/joingame", (player, args) => {
		console.log(`Player ${player.id} joining game from main menu`);
		spawnPlayerInGame(player);
		return "Joining game...";
	});
	
	// Function to spawn player in game when they click Play
	function spawnPlayerInGame(player: Player) {
		// Create a PlayerController instance
		const playerController = new PlayerController();
		
		// Set fall threshold to match level's expected range
		playerController.setFallThreshold(-15);
		
		// Create and spawn the player
		const playerEntity = new PlayerEntity({
			player,
			name: 'Player',
			modelUri: 'models/players/player.gltf',
			modelLoopedAnimations: ['idle'],
			modelScale: 0.61,
			controller: playerController,
		});

		playerEntity.spawn(world, { x: 0, y: 10, z: 0 });
		console.log('Spawned player entity with PlayerController!');
		
		// Set camera to first person - this is a 3rd person game but the camera is set to first person because of how hytopia handles the camera
		playerEntity.player.camera.setMode(PlayerCameraMode.FIRST_PERSON);
		playerEntity.player.camera.setForwardOffset(-6);  // Camera position behind player
		playerEntity.player.camera.setOffset({ x: 0, y: 1.5, z: 0 }); // Position at head level
		
		// Send instructions to player
		world.chatManager.sendPlayerMessage(player, `Use WASD to move, Space to jump, and C to set checkpoints.`);
		
		// Set initial checkpoint near start area
		if (playerEntity.isSpawned) {
			playerController.setCheckpoint({ x: 0, y: 1, z: 0 });
		}
		
		// Register the player with the level manager for the active level
		levelManager.registerPlayer(player);
		
		// Setup checkpoint detection and respawn
		world.on(EntityEvent.TICK, () => {
			if (!playerEntity.isSpawned) return;
			
			// Check if player has fallen off
			const hasFallen = playerEntity.position.y < 0
			if (hasFallen === true) {
				// Use player controller to handle respawn
				playerController.handleFall(playerEntity);
			}
		});
	}

	// Handle player leaving
	world.on(PlayerEvent.LEFT_WORLD, ({ player }) => {
		world.entityManager.getPlayerEntitiesByPlayer(player).forEach(entity => entity.despawn());
	});

	// Command to manually start the game through GameManager
	world.chatManager.registerCommand("/startgame", (player, args) => {
		gameManager.startGame();
		return "Starting game with all players!";
	});
	
	// Command to end the game through GameManager
	world.chatManager.registerCommand("/endgame", (player, args) => {
		gameManager.endGame(args.join(" ") || "ManualEnd");
		return "Game ended manually.";
	});
	
	// Command to manually reload the default level if needed
	world.chatManager.registerCommand("/loadlevel", (player, args) => {
		// Get the level ID from args or default to seesaw
		const levelId = args[0] || "seesaw";
		
		console.log(`[Server] Player ${player.id} requested to load level: ${levelId}`);
		
		// First reset the world to clear everything
		//world.loadMap({ blocks: {} }); 
		
		// Then activate the requested level
		if (levelManager.activateLevel(levelId)) {
			world.chatManager.sendBroadcastMessage(`Loaded level: ${levelId}`);
			return `Successfully activated level: ${levelId}`;
		} else {
			return `Failed to activate level: ${levelId}. Available levels: ${levelManager.getAvailableLevels().join(', ')}`;
		}
	});
	
	// Command to start a round with the current active level
	world.chatManager.registerCommand("/startround", (player, args) => {
		if (levelManager.startRound()) {
			return "Starting round with the current level!";
		} else {
			return "Failed to start round. No active level.";
		}
	});
	
	// Listen for game events from the GameManager
	gameManager.events.on('GameWon', (winnerId) => {
		world.chatManager.sendBroadcastMessage(`Game won by player: ${winnerId}`);
	});
	
	gameManager.events.on('GameEnded', (reason) => {
		world.chatManager.sendBroadcastMessage(`Game ended. Reason: ${reason}`);
	});
});
