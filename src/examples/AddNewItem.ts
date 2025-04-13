import { ItemGenerator } from '../utils/ItemGenerator';
import { ItemSlot, ItemRarity } from '../types/ItemTypes';
import { Logger } from '../utils/Logger';

const logger = new Logger('AddNewItem');

/**
 * Example script showing how to add new items to the game
 */
function addNewItems(): void {
  logger.log('Adding new items to the game...');
  
  // Example 1: Add a dinosaur costume
  const dinosaurResult = ItemGenerator.generateItem({
    id: 'body_dinosaur',
    name: 'Dinosaur Costume',
    description: 'Stomp your way to victory in this prehistoric outfit',
    slot: ItemSlot.BODY,
    rarity: ItemRarity.EPIC,
    cost: 4200,
    modelUri: 'models/cosmetics/body/dinosaur.fbx',
    thumbnailUri: 'textures/ui/cosmetics/body_dinosaur.png',
    unlockLevel: 20,
    isDefault: false
  });
  
  if (dinosaurResult) {
    logger.log('Successfully added Dinosaur Costume');
  }
  
  // Example 2: Add a rainbow hat
  const rainbowResult = ItemGenerator.generateItem({
    id: 'head_rainbow',
    name: 'Rainbow Hat',
    description: 'A colorful hat that brings good luck',
    slot: ItemSlot.HEAD,
    rarity: ItemRarity.RARE,
    cost: 2500,
    modelUri: 'models/cosmetics/head/rainbow.fbx',
    thumbnailUri: 'textures/ui/cosmetics/head_rainbow.png',
    unlockLevel: 7,
    isDefault: false
  });
  
  if (rainbowResult) {
    logger.log('Successfully added Rainbow Hat');
  }
  
  // Example 3: Add animated fire legs
  const fireLegsResult = ItemGenerator.generateItem({
    id: 'legs_fire',
    name: 'Fire Legs',
    description: 'Leave a trail of flames wherever you go',
    slot: ItemSlot.LEGS,
    rarity: ItemRarity.LEGENDARY,
    cost: 7500,
    modelUri: 'models/cosmetics/legs/fire.fbx',
    thumbnailUri: 'textures/ui/cosmetics/legs_fire.png',
    unlockLevel: 30,
    isDefault: false
  });
  
  if (fireLegsResult) {
    logger.log('Successfully added Fire Legs');
  }
  
  logger.log('Item addition process completed!');
}

// Run the script
addNewItems(); 