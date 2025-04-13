import { ItemManager } from '../core/ItemManager';
import { ItemSlot, ItemRarity } from '../types/ItemTypes';
import { Logger } from '../utils/Logger';

const logger = new Logger('ItemManagerTest');

/**
 * Simple test function to verify ItemManager functionality
 */
function testItemManager(): void {
  logger.log('Starting ItemManager tests');
  
  // Get the instance
  const itemManager = ItemManager.getInstance();
  
  // Get the catalog
  const catalog = itemManager.getItemCatalog();
  logger.log(`Item catalog contains ${Object.keys(catalog).length} items`);
  
  // Test getting items by slot
  const headItems = itemManager.getItemsBySlot(ItemSlot.HEAD);
  logger.log(`Found ${headItems.length} head items`);
  
  // Test getting items by rarity
  const rareItems = itemManager.getItemsByRarity(ItemRarity.RARE);
  logger.log(`Found ${rareItems.length} rare items`);
  
  // Test getting default items
  try {
    const defaultHead = itemManager.getDefaultItemForSlot(ItemSlot.HEAD);
    logger.log(`Default head item: ${defaultHead.name} (${defaultHead.id})`);
    
    const defaultBody = itemManager.getDefaultItemForSlot(ItemSlot.BODY);
    logger.log(`Default body item: ${defaultBody.name} (${defaultBody.id})`);
    
    const defaultLegs = itemManager.getDefaultItemForSlot(ItemSlot.LEGS);
    logger.log(`Default legs item: ${defaultLegs.name} (${defaultLegs.id})`);
  } catch (error) {
    logger.error('Error getting default items', error);
  }
  
  // Test getting unlocked items for different player levels
  const level1Items = itemManager.getUnlockedItems(1);
  logger.log(`Player level 1 has ${level1Items.length} unlocked items`);
  
  const level10Items = itemManager.getUnlockedItems(10);
  logger.log(`Player level 10 has ${level10Items.length} unlocked items`);
  
  const level30Items = itemManager.getUnlockedItems(30);
  logger.log(`Player level 30 has ${level30Items.length} unlocked items`);
  
  // Test getting an item by ID
  const crownItem = itemManager.getItemById('head_crown');
  if (crownItem) {
    logger.log(`Found crown item: ${crownItem.name}, Rarity: ${crownItem.rarity}, Unlock Level: ${crownItem.unlockLevel}`);
  } else {
    logger.error('Could not find head_crown item');
  }
  
  // Test adding a new item
  itemManager.addItem({
    id: 'head_test',
    name: 'Test Hat',
    description: 'A test hat item',
    slot: ItemSlot.HEAD,
    rarity: ItemRarity.UNCOMMON,
    cost: 1500,
    modelUri: 'models/cosmetics/head/test.fbx',
    thumbnailUri: 'textures/ui/cosmetics/head_test.png',
    unlockLevel: 5,
    isDefault: false
  });
  
  // Verify the new item was added
  const testHat = itemManager.getItemById('head_test');
  if (testHat) {
    logger.log(`Successfully added test hat: ${testHat.name}`);
  } else {
    logger.error('Failed to add test hat');
  }
  
  // Final item count
  logger.log(`Final item count: ${Object.keys(itemManager.getItemCatalog()).length}`);
  logger.log('ItemManager tests completed');
}

// Run the test
testItemManager(); 