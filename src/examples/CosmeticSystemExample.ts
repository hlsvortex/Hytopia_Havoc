import { ItemManager } from '../core/ItemManager';
import { PlayerInventory } from '../core/PlayerInventory';
import { PlayerAvatarManager } from '../core/PlayerAvatarManager';
import { Logger } from '../utils/Logger';

const logger = new Logger('CosmeticSystemExample');

/**
 * Example demonstrating the use of the cosmetic system in a game
 */
export class CosmeticSystemExample {
  private itemManager: ItemManager;
  private playerInventories: Map<string, PlayerInventory> = new Map();
  private playerAvatars: Map<string, PlayerAvatarManager> = new Map();
  
  /**
   * Initialize the cosmetic system
   */
  constructor() {
    logger.log('Initializing cosmetic system example');
    
    // Initialize the item manager (singleton)
    this.itemManager = ItemManager.getInstance();
    
    logger.log('Cosmetic system initialized');
  }
  
  /**
   * Register a new player in the system
   * @param playerId The player's unique ID
   * @param characterRoot The root object for the player's character in the scene
   */
  public registerPlayer(playerId: string, characterRoot: any): void {
    logger.log(`Registering player: ${playerId}`);
    
    // Create a player inventory
    const inventory = new PlayerInventory(playerId);
    this.playerInventories.set(playerId, inventory);
    
    // Create a player avatar manager
    const avatar = new PlayerAvatarManager(playerId, inventory, characterRoot);
    this.playerAvatars.set(playerId, avatar);
    
    // Update the avatar to show default equipped items
    avatar.updateAvatar();
    
    logger.log(`Player ${playerId} registered with default equipment`);
  }
  
  /**
   * Unregister a player from the system
   * @param playerId The player's unique ID
   */
  public unregisterPlayer(playerId: string): void {
    logger.log(`Unregistering player: ${playerId}`);
    
    // Clean up the avatar manager
    const avatar = this.playerAvatars.get(playerId);
    if (avatar) {
      avatar.cleanup();
      this.playerAvatars.delete(playerId);
    }
    
    // Remove the player inventory
    this.playerInventories.delete(playerId);
    
    logger.log(`Player ${playerId} unregistered`);
  }
  
  /**
   * Handle a player purchasing an item
   * @param playerId The player's ID
   * @param itemId The item ID being purchased
   * @returns True if purchase succeeded, false otherwise
   */
  public handleItemPurchase(playerId: string, itemId: string): boolean {
    const inventory = this.playerInventories.get(playerId);
    if (!inventory) {
      logger.error(`Cannot purchase item: Player ${playerId} not found`);
      return false;
    }
    
    // Check if the player already owns this item
    if (inventory.hasItem(itemId)) {
      logger.log(`Player ${playerId} already owns item ${itemId}`);
      return false;
    }
    
    // In a real game, you would check player's currency here
    // and deduct the cost if sufficient
    
    // Add the item to player's inventory
    const result = inventory.addItem(itemId);
    
    if (result) {
      logger.log(`Player ${playerId} purchased item ${itemId}`);
    }
    
    return result;
  }
  
  /**
   * Handle a player equipping an item
   * @param playerId The player's ID
   * @param itemId The item ID to equip
   * @returns True if equipped successfully, false otherwise
   */
  public handleItemEquip(playerId: string, itemId: string): boolean {
    const inventory = this.playerInventories.get(playerId);
    const avatar = this.playerAvatars.get(playerId);
    
    if (!inventory || !avatar) {
      logger.error(`Cannot equip item: Player ${playerId} not found`);
      return false;
    }
    
    // Equip the item
    const result = inventory.equipItem(itemId);
    
    if (result) {
      // Update the avatar to reflect the newly equipped item
      avatar.updateAvatar();
      logger.log(`Player ${playerId} equipped item ${itemId}`);
    }
    
    return result;
  }
  
  /**
   * Simulate a player running animation
   * @param playerId The player's ID
   */
  public simulatePlayerRunning(playerId: string): void {
    const avatar = this.playerAvatars.get(playerId);
    
    if (!avatar) {
      logger.error(`Cannot animate: Player ${playerId} not found`);
      return;
    }
    
    // Apply the running animation
    avatar.applyAnimation('running');
    logger.log(`Player ${playerId} is now running`);
  }
  
  /**
   * Example usage of the cosmetic system
   */
  public runExample(): void {
    logger.log('Starting cosmetic system example');
    
    // Create a mock character root object
    const mockCharacterRoot = {
      name: 'PlayerCharacter',
      // Other properties would be here in a real implementation
    };
    
    // Register a player
    this.registerPlayer('player1', mockCharacterRoot);
    
    // Simulate the player reaching level 10
    const player1Inventory = this.playerInventories.get('player1');
    if (player1Inventory) {
      player1Inventory.setPlayerLevel(10);
      logger.log('Player reached level 10');
      
      // Get items available at this level
      const availableItems = player1Inventory.getAvailableToPurchase();
      logger.log(`Player has ${availableItems.length} items available to purchase`);
      
      // Purchase a new item if available
      if (availableItems.length > 0) {
        const itemToPurchase = availableItems[0];
        logger.log(`Attempting to purchase: ${itemToPurchase.name}`);
        this.handleItemPurchase('player1', itemToPurchase.id);
        
        // Equip the newly purchased item
        this.handleItemEquip('player1', itemToPurchase.id);
      }
    }
    
    // Simulate player running with new equipment
    this.simulatePlayerRunning('player1');
    
    // Unregister the player when done
    setTimeout(() => {
      this.unregisterPlayer('player1');
      logger.log('Example complete');
    }, 1000);
  }
}

// Create and run the example when this file is executed
const example = new CosmeticSystemExample();
example.runExample(); 