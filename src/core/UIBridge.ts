import { Player, PlayerUIEvent, World } from 'hytopia';
import { GameManager } from './GameManager'; // Forward declaration

export class UIBridge {
    private world: World;
    private gameManager: GameManager;

    constructor(world: World, gameManager: GameManager) {
        this.world = world;
        this.gameManager = gameManager;
        console.log('[UIBridge] Initialized');
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
                this.handleUIAction(player, data.action, data.payload);
                break;
            case 'TOGGLE_POINTER_LOCK': // Handle pointer lock requests from UI
                 // Pointer lock is typically controlled client-side or via player.ui methods if available
                 console.log(`[UIBridge] Pointer lock request received: ${data.enabled}. Hytopia usually manages this automatically or client-side.`);
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
            case 'LEVEL_SELECTED': // New Action
                if (payload && payload.levelId) {
                    this.gameManager.prepareRound(payload.levelId);
                } else {
                    console.error('[UIBridge] LEVEL_SELECTED action missing levelId payload');
                }
                break;
             case 'ROUND_READY': // Modified Action
                 // Sent from LevelSelectPanel countdown end
                 console.log('[UIBridge] ROUND_READY received. Telling GameManager to begin gameplay.');
                 this.gameManager.beginRoundGameplay(); 
                 break;
            case 'START_GAME': // Keep for potential future use
                console.log('[UIBridge] START_GAME action received but not yet implemented via UI.');
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
        this.sendDataToPlayer(player, { type: 'SHOW_MAIN_MENU' });
    }

    public showLevelSelect(player: Player, levelList: any[]): void {
         this.sendDataToPlayer(player, {
            type: 'LEVEL_SELECT_DATA',
            levels: levelList
        });
        this.sendDataToPlayer(player, { type: 'SHOW_LEVEL_SELECT' });
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

    // Added method to close the round results panel
    public closeRoundResults(player: Player): void {
        this.sendDataToPlayer(player, { type: 'CLOSE_ROUND_RESULTS' });
    }
} 