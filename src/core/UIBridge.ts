import { Player, PlayerUIEvent, World } from 'hytopia';
import { GameManager } from './GameManager'; // Forward declaration
import { gameConfig } from '../config/gameConfig'; // Correct import path

export class UIBridge {
    private world: World;
    private gameManager: GameManager;
    private roundReadyProcessed: boolean = false; // Track if round ready has been processed for current round

    constructor(world: World, gameManager: GameManager) {
        this.world = world;
        this.gameManager = gameManager;
        console.log('[UIBridge] Initialized');
    }

    /**
     * Reset internal state (should be called when game ends or new round starts)
     */
    public resetState(): void {
        console.log('[UIBridge] Resetting internal state');
        this.roundReadyProcessed = false;
    }

    /**
     * Initializes the UI for a player when they join.
     * Loads the main HTML file and sets up the listener for data from the UI.
     */
    public initializePlayerUI(player: Player): void {
        console.log(`[UIBridge] Initializing UI for player ${player.id}`);
        // Load the main UI file
        player.ui.load('ui/index.html');

        // Listen for data sent from this player's UI
        player.ui.on(PlayerUIEvent.DATA, ({ data }) => {
            // console.log(`[UIBridge] Received data from Player ${player.id}:`, data); // Optional: Verbose logging
            this.handleDataFromUI(player, data);
        });

         // Removed automatic showMainMenu timeout - GameManager handles this now
         // setTimeout(() => {
         //    this.showMainMenu(player);
         // }, 1000); 
    }

    /**
     * Handles incoming data packets from a player's UI.
     */
    private handleDataFromUI(player: Player, data: any): void {
        if (!data || !data.type) {
            console.warn('[UIBridge] Received invalid data packet from UI:', data);
            return;
        }

        // Route based on data type
        switch (data.type) {
            case 'UI_ACTION':

				console.log("ACTION ", data.action,data.payload);

                this.handleUIAction(player, data.action, data.payload);
                break;
            case 'TOGGLE_POINTER_LOCK': // Handle pointer lock requests from UI
                 break;
            // Add other data types handlers as needed (e.g., 'SETTINGS_UPDATE')
            default:
                console.warn(`[UIBridge] Unknown data type from UI: ${data.type}`);
        }
    }

    /**
     * Processes specific actions requested by the UI.
     */
    private handleUIAction(player: Player, action: string, payload: any): void {
        console.log(`[UIBridge] Handling UI Action: ${action} from Player ${player.id}`, payload || '');
        
        switch (action) {
            case 'JOIN_GAME':
                this.gameManager.handlePlayerAttemptJoin(player);
                break;
            case 'LEVEL_SELECTED':
                if (payload && payload.levelId) {
                    // Reset our state when a new level is selected
                    this.resetState();
                    this.gameManager.prepareRound(payload.levelId);
                } else {
                    console.error('[UIBridge] LEVEL_SELECTED action missing levelId payload');
                }
                break;
            case 'ROUND_READY':
                // Only process the first ROUND_READY event
                if (!this.roundReadyProcessed) {
                    console.log(`[UIBridge] Processing first ROUND_READY from ${player.id}`);
                    this.roundReadyProcessed = true;
                    this.gameManager.beginRoundGameplay();
                } else {
                    console.log(`[UIBridge] Ignoring duplicate ROUND_READY from ${player.id}`);
                }
                break;
            case 'SUMMARY_CONTINUE':
                console.log('[UIBridge] SUMMARY_CONTINUE received. Player has finished viewing their summary.');
                this.gameManager.handleSummaryContinue();
                break;
            case 'START_GAME':
                console.log('[UIBridge] START_GAME action received but not yet implemented via UI.');
                this.gameManager.startGame();
                break;
            case 'REQUEST_PLAYER_COUNT':
                // Send the current player count to all connected players
                this.broadcastPlayerCount();
                // Also send the player list
                this.broadcastPlayerList();
                break;
            case 'REQUEST_PLAYER_LIST':
                // Send the current player list
                this.broadcastPlayerList();
                break;
            case 'SHOW_CHAT_MESSAGE':
                // Send a message to the player's chat
				//console.log(`[UIBridge] Sending chat message to player ${player.id}: ${payload.message}`);

				console.log(`[UIBridge] Showing chat message to player ${player.id}: ${payload}`);

				if (payload && payload.message) {

				    this.world.chatManager.sendPlayerMessage(player, payload.message);
                }
                break;
            default:
                console.warn(`[UIBridge] Unknown UI action: ${action}`);
        }
    }

    // --- Methods TO send data TO the UI (called by GameManager) ---

    public sendDataToPlayer(player: Player, data: object): void {
        player.ui.sendData(data);
    }

    public broadcastData(data: object): void {
        const players: Player[] = this.gameManager.getPlayers(); 
        players.forEach((p: Player) => {
             p.ui.sendData(data);
        });
     }


    public showMainMenu(player: Player): void {
		this.gameManager.playSongMainMenuMusic();
		player.ui.lockPointer(false);
        this.sendDataToPlayer(player, { type: 'SHOW_MAIN_MENU' });
    }

    /**
     * Shows level selection screen to player
     * @param player The player to show the level select to
     * @param levelList List of available levels
     * @param selectedLevelId Optional level ID to pre-select in the UI
     * @param currentRound Current round number
     */
    public showLevelSelect(player: Player, levelList: any[], selectedLevelId?: string, currentRound?: number): void {
        this.sendDataToPlayer(player, {
            type: 'LEVEL_SELECT_DATA',
            levels: levelList,
            selectedLevelId: selectedLevelId,
            currentRound: currentRound
        });
        this.sendDataToPlayer(player, { type: 'SHOW_LEVEL_SELECT' });
		player.ui.lockPointer(true); 
    }

    public updatePlayerData(player: Player, playerData: any): void {
        this.sendDataToPlayer(player, { type: 'PLAYER_DATA_UPDATE', playerData });
    }

    public closeMenu(player: Player): void {
        this.sendDataToPlayer(player, { type: 'CLOSE_MENU' });
    }

    // Added method to show the HUD
    public showHud(player: Player): void {
        console.log(`[UIBridge] Sending SHOW_HUD to player ${player.id}`);
        this.sendDataToPlayer(player, { type: 'SHOW_HUD' });
        // Optionally send initial HUD data here too
        // this.sendDataToPlayer(player, { type: 'UPDATE_HUD', hudData: { goal: 'Initial Goal' } });
    }
    
    // Added method to hide the HUD
    public hideHud(player: Player): void {
        this.sendDataToPlayer(player, { type: 'HIDE_HUD' });
    }
    
    // Added method to update the HUD data
    public updateHud(player: Player, hudData: object): void {
        this.sendDataToPlayer(player, { type: 'UPDATE_HUD', hudData });
    }
    
    // Added method to show round results
    public showRoundResults(player: Player, qualifiedNames: string[], eliminatedNames: string[]): void {
         this.sendDataToPlayer(player, {
             type: 'SHOW_ROUND_RESULTS',
             qualifiedPlayers: qualifiedNames,
             eliminatedPlayers: eliminatedNames
         });
    }
    
    // Method to broadcast round results
     public broadcastRoundResults(qualifiedNames: string[], eliminatedNames: string[]): void {
         this.broadcastData({
             type: 'SHOW_ROUND_RESULTS',
             qualifiedPlayers: qualifiedNames,
             eliminatedPlayers: eliminatedNames
         });
     }
	
    // Added method to show animated text
    public showAnimatedText(player: Player, line1: string, line2: string, duration: number = 3000): void {
         this.sendDataToPlayer(player, { type: 'SHOW_ANIMATED_TEXT', textLine1: line1, textLine2: line2, duration });
    }
    
     // Added method to broadcast animated text
    public broadcastAnimatedText(line1: string, line2: string, duration: number = 3000): void {
         this.broadcastData({ type: 'SHOW_ANIMATED_TEXT', textLine1: line1, textLine2: line2, duration });
    }

    // Added method to show the player summary screen
    public showPlayerSummary(player: Player, summaryData: {
        placement: number,
        coinsEarned: number,
        crownsEarned: number,
        totalPlayers: number,
        roundsPlayed: number
    }): void {
        this.sendDataToPlayer(player, { 
            type: 'SHOW_PLAYER_SUMMARY',
            ...summaryData
        });
    }
    
    // Added method to close the player summary screen
    public closePlayerSummary(player: Player): void {
        this.sendDataToPlayer(player, { type: 'CLOSE_PLAYER_SUMMARY' });
    }
    
    // Added method to broadcast player summary screen close
    public broadcastClosePlayerSummary(): void {
        this.broadcastData({ type: 'CLOSE_PLAYER_SUMMARY' });
    }

    // Added method to show the winner screen
    public showWinner(player: Player, winnerName: string): void {
        this.sendDataToPlayer(player, { type: 'SHOW_WINNER', winnerName });
    }
    
    // Added method to broadcast winner
    public broadcastWinner(winnerName: string): void {
        this.broadcastData({ type: 'SHOW_WINNER', winnerName });
    }
    
    // Added method to close the winner screen
    public closeWinner(player: Player): void {
        this.sendDataToPlayer(player, { type: 'CLOSE_WINNER' });
    }
    
    // Added method to close the winner screen for all players
    public broadcastCloseWinner(): void {
        this.broadcastData({ type: 'CLOSE_WINNER' });
    }

    // Added method to close the round results panel
    public closeRoundResults(player: Player): void {
        this.sendDataToPlayer(player, { type: 'CLOSE_ROUND_RESULTS' });
    }

    /**
     * Send player data updates to the UI
     */
    public updatePlayerStats(player: Player, playerData: any): void {
        console.log(`[UIBridge] Updating player stats for ${player.id}`);
        
        // Get the player entity to find model URI if available
        const playerEntity = playerData.playerEntity;
        const modelUri = playerEntity?.modelUri || 'models/players/player.gltf';
        
        this.sendDataToPlayer(player, {
            type: 'PLAYER_DATA_UPDATE',
            playerData: {
                playerName: playerData.playerName || player.id,
                level: playerData.playerLevel,
                xp: playerData.playerXP,
                coins: playerData.coins,
                crowns: playerData.crowns,
                wins: playerData.wins,
                modelUri: modelUri
            }
        });
    }
    
    /**
     * Broadcast player count to all players
     * This should be called whenever a player joins or leaves
     */
    public broadcastPlayerCount(): void {
        const playerCount = this.gameManager.getPlayers().length;
        const minPlayersRequired = gameConfig.minPlayersToStart;
        console.log(`[UIBridge] Broadcasting player count: ${playerCount}/${minPlayersRequired}`);
        
        this.broadcastData({
            type: 'PLAYER_COUNT_UPDATE',
            count: playerCount,
            required: minPlayersRequired
        });
    }

    /**
     * Broadcast all player data to update the player list
     */
    public broadcastPlayerList(): void {
        const playerDataList = [];
        const allPlayers = this.gameManager.getPlayers();
        
        for (const player of allPlayers) {
            const playerData = this.gameManager.getPlayerData(player.id);
            if (playerData) {
                playerDataList.push({
                    id: player.id,
                    name: playerData.playerName || player.id,
                    level: playerData.playerLevel
                });
            }
        }
        
        console.log(`[UIBridge] Broadcasting player list with ${playerDataList.length} players`);
        this.broadcastData({
            type: 'PLAYER_LIST_UPDATE',
            players: playerDataList
        });
    }

    /**
     * Send a chat message to a specific player
     */
    public sendChatMessage(player: Player, message: string): void {
        this.world.chatManager.sendPlayerMessage(player, message);
    }

    /**
     * Send a chat message to all players
     */
    public broadcastChatMessage(message: string): void {
        this.world.chatManager.sendBroadcastMessage(message);
    }
} 