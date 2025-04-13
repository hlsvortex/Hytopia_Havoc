import { PlayerInventory } from '../core/PlayerInventory';
import { ItemManager } from '../core/ItemManager';
import { ItemSlot } from '../types/ItemTypes';
import { Logger } from '../utils/Logger';

const logger = new Logger('PlayerInventoryTest');

/**
 * Simple test function to verify PlayerInventory functionality
 */
function testPlayerInventory(): void {
  logger.log('Starting PlayerInventory tests');
  
  // Initialize the item manager first (singleton)
  const itemManager = ItemManager.getInstance();
  
  // Create a test player inventory
  const playerInv = new PlayerInventory('test-player-123');
  
  // Check initial state
  const ownedItems = playerInv.getOwnedItems();
  logger.log(`Player owns ${ownedItems.length} items initially`);
  
  // Test equipped items
  const equipped = playerInv.getEquippedItems();
  logger.log(`Player has equipped: `, equipped);
  
  // Test equipping a non-default item that the player doesn't own yet
  const equipResult1 = playerInv.equipItem('head_crown');
  logger.log(`Attempt to equip unowned item result: ${equipResult1}`);
  
  // Add the item to the player's inventory
  const addResult = playerInv.addItem('head_crown');
  logger.log(`Added crown to inventory: ${addResult}`);
  
  // Now try equipping it
  const equipResult2 = playerInv.equipItem('head_crown');
  logger.log(`Attempt to equip owned item result: ${equipResult2}`);
  
  // Check that the crown is now equipped
  const newEquipped = playerInv.getEquippedItems();
  logger.log(`Player has equipped after changes: `, newEquipped);
  
  // Test player level functionality
  logger.log(`Initial player level: ${playerInv.getPlayerLevel()}`);
  
  // Set player level to unlock more items
  playerInv.setPlayerLevel(15);
  logger.log(`New player level: ${playerInv.getPlayerLevel()}`);
  
  // Check which items are available to purchase at this level
  const availableItems = playerInv.getAvailableToPurchase();
  logger.log(`Player has ${availableItems.length} items available to purchase at level ${playerInv.getPlayerLevel()}`);
  
  // Add one more item and check if it's removed from available to purchase
  if (availableItems.length > 0) {
    const itemToAdd = availableItems[0];
    playerInv.addItem(itemToAdd.id);
    
    const newAvailableItems = playerInv.getAvailableToPurchase();
    logger.log(`After adding ${itemToAdd.name}, player has ${newAvailableItems.length} items available to purchase`);
  }
  
  // Get detailed item data for equipped items
  const equipData = playerInv.getEquippedItemsData();
  logger.log('Equipped item data:');
  Object.entries(equipData).forEach(([slot, item]) => {
    logger.log(`Slot ${slot}: ${item.name} (${item.rarity})`);
  });
  
  logger.log('PlayerInventory tests completed');
}

// Run the test
testPlayerInventory(); 