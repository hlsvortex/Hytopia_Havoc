import {
	startServer,
	PlayerEntity,
	PlayerEvent,
	EntityEvent,
	World,
	Player,
	Entity,
	Vector3,
	RigidBody,
	Collider,
	PlayerCameraMode,
	PlayerUIEvent
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
	
	// =========================================
	// GAME ACTION FUNCTIONS
	// These can be called from commands or UI
	// =========================================
	
	// Handle player joining the game - either as player or spectator
	function handlePlayerJoinGame(player: Player): string {
		console.log(`Player ${player.id} joining game`);
		
		// Check if game is in progress
		if (gameManager.isGameInProgress()) {
			// Put player in spectator mode
			console.log(`Game in progress, putting player ${player.id} in spectator mode`);
			enableSpectatorMode(player);
			return "Game in progress. Entering spectator mode...";
		} else {
			// Spawn player normally
			spawnPlayerInGame(player);
			return "Joining game...";
		}
	}
	
	// Handle starting a game
	function handleStartGame(): string {
		gameManager.startGame();
		return "Starting game with all players!";
	}
	
	// Handle ending a game with optional reason
	function handleEndGame(reason: string = "ManualEnd"): string {
		gameManager.endGame(reason);
		return `Game ended. Reason: ${reason}`;
	}
	
	// Handle loading a specific level
	function handleLoadLevel(levelId: string = "seesaw"): string {
		console.log(`Loading level: ${levelId}`);
		
		if (levelManager.activateLevel(levelId)) {
			world.chatManager.sendBroadcastMessage(`Loaded level: ${levelId}`);
			return `Successfully activated level: ${levelId}`;
		} else {
			return `Failed to activate level: ${levelId}. Available levels: ${levelManager.getAvailableLevels().join(', ')}`;
		}
	}
	
	// Handle starting a round on the current level
	function handleStartRound(): string {
		if (levelManager.startRound()) {
			return "Starting round with the current level!";
		} else {
			return "Failed to start round. No active level.";
		}
	}
	
	// =========================================
	// PLAYER HANDLING
	// =========================================
	
	// Handle player joining - show main menu first, don't spawn player yet
	world.on(PlayerEvent.JOINED_WORLD, ({ player }) => {
		console.log(`Player joined: ${player.id}`);
		
		// Load the UI for the player (which will show the main menu)
		player.ui.load('ui/index.html');
		
		// Set up UI data bridge to listen for commands from the UI
		player.ui.on(PlayerUIEvent.DATA, ({ playerUI, data }) => {
			console.log(`Received UI data from player ${player.id}:`, data);
			
			// Handle chat commands from UI
			if (data.type === 'CHAT_COMMAND' && data.command) {
				console.log(`Executing command from UI: ${data.command}`);
				
				// Extract the command without slash if it exists
				const commandText = data.command.startsWith('/') ? data.command.substring(1) : data.command;
				const commandArgs = commandText.split(' ').slice(1);
				const mainCommand = commandText.split(' ')[0];
				
				// Handle commands directly using our reusable functions
				let result = "";
				switch (mainCommand) {
					case 'play':
						result = handlePlayerJoinGame(player);
						break;
					case 'startgame':
						result = handleStartGame();
						break;
					case 'endgame':
						result = handleEndGame(commandArgs.join(" ") || "ManualEnd");
						break;
					case 'loadlevel':
						result = handleLoadLevel(commandArgs[0]);
						break;
					case 'startround':
						result = handleStartRound();
						break;
					default:
						// For unknown commands
						result = `Unknown command: ${commandText}`;
						break;
				}
				
				// Send result back to the player
				world.chatManager.sendPlayerMessage(player, result);
			}
		});
		
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
	
	// =========================================
	// COMMAND REGISTRATION
	// Use the same handler functions as the UI
	// =========================================
	
	// Command to join the game for a player
	world.chatManager.registerCommand("play", (player, args) => {
		return handlePlayerJoinGame(player);
	});
	
	// Command to manually start the game
	world.chatManager.registerCommand("startgame", (player, args) => {
		return handleStartGame();
	});
	
	// Command to end the game
	world.chatManager.registerCommand("endgame", (player, args) => {
		return handleEndGame(args.join(" ") || "ManualEnd");
	});
	
	// Command to manually load a level
	world.chatManager.registerCommand("loadlevel", (player, args) => {
		return handleLoadLevel(args[0]);
	});
	
	// Command to start a round with the current active level
	world.chatManager.registerCommand("startround", (player, args) => {
		return handleStartRound();
	});
	
	// Listen for game events from the GameManager
	gameManager.events.on('GameWon', (winnerId) => {
		world.chatManager.sendBroadcastMessage(`Game won by player: ${winnerId}`);
	});
	
	gameManager.events.on('GameEnded', (reason) => {
		world.chatManager.sendBroadcastMessage(`Game ended. Reason: ${reason}`);
	});
	
	// Function to enable spectator mode for a player
	function enableSpectatorMode(player: Player) {
		// Don't spawn an entity, just set up camera
		player.camera.setMode(PlayerCameraMode.FIRST_PERSON);
		player.camera.setForwardOffset(-6);
		player.camera.setOffset({ x: 0, y: 5, z: 0 }); // Higher position to see more
		
		// Tell UI to close main menu
		player.ui.sendData({
			type: 'CLOSE_MENU'
		});
		
		// Send message to player
		world.chatManager.sendPlayerMessage(player, "You are in spectator mode. A game is already in progress.");
		
		// If applicable, teleport existing player entity or set initial camera view
		// Note: Specific teleportation logic depends on the game implementation
		// This part may need to be adjusted based on your game's entity management
	}
	
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

		// Hide the UI before spawning
		player.ui.sendData({
			type: 'CLOSE_MENU'
		});

		// Spawn the player entity first
		playerEntity.spawn(world, { x: 0, y: 10, z: 0 });
		console.log('Spawned player entity with PlayerController!');

		// Set up camera AFTER spawning the entity
		player.camera.setMode(PlayerCameraMode.FIRST_PERSON);
		player.camera.setForwardOffset(-6);  // Positive value moves camera back
		player.camera.setOffset({ x: 0, y: 1, z: 0 }); // Height above player
		player.camera.setAttachedToEntity(playerEntity);
		//player.camera.setTrackedEntity(playerEntity);
		
		// Send instructions to player
		world.chatManager.sendPlayerMessage(player, `Use WASD to move, Space to jump, and C to set checkpoints.`);
		
		// Set initial checkpoint near start area
		playerController.setCheckpoint({ x: 0, y: 1, z: 0 });
		
		// Register the player with the level manager for the active level
		levelManager.registerPlayer(player);

		// Enable mouse look for camera rotation
		player.ui.lockPointer(true);
		
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
});
