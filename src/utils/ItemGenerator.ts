import fs from 'fs';
import path from 'path';
import { ItemSlot, ItemRarity } from '../types/ItemTypes';
import { Logger } from './Logger';

const logger = new Logger('ItemGenerator');

/**
 * Utility for generating new items and adding them to the items.json file
 */
export class ItemGenerator {
  private static dataFilePath = path.join(__dirname, '../data/items.json');
  
  /**
   * Generate a new item and add it to the items.json file
   * @param options Configuration for the new item
   * @returns Success status
   */
  public static generateItem(options: {
    id: string;
    name: string;
    description: string;
    slot: ItemSlot;
    rarity: ItemRarity;
    cost: number;
    modelUri: string;
    thumbnailUri: string;
    unlockLevel: number;
    isDefault?: boolean;
  }): boolean {
    try {
      // Validate item ID format
      if (!/^[a-z0-9_]+$/.test(options.id)) {
        logger.error('Item ID must contain only lowercase letters, numbers, and underscores');
        return false;
      }
      
      // Load existing items
      const items = this.loadItems();
      
      // Check if item already exists
      if (items[options.id]) {
        logger.error(`Item with ID ${options.id} already exists`);
        return false;
      }
      
      // Add new item
      items[options.id] = {
        ...options,
        isDefault: options.isDefault || false
      };
      
      // Save updated items
      this.saveItems(items);
      
      logger.log(`Successfully added item: ${options.name} (${options.id})`);
      return true;
    } catch (error) {
      logger.error('Failed to generate item', error);
      return false;
    }
  }
  
  /**
   * Load items from the JSON file
   */
  private static loadItems(): Record<string, any> {
    try {
      if (!fs.existsSync(this.dataFilePath)) {
        logger.error(`Items file not found at: ${this.dataFilePath}`);
        return {};
      }
      
      const data = fs.readFileSync(this.dataFilePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      logger.error('Error loading items', error);
      return {};
    }
  }
  
  /**
   * Save items to the JSON file
   */
  private static saveItems(items: Record<string, any>): void {
    try {
      const dirPath = path.dirname(this.dataFilePath);
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      // Format JSON with proper indentation
      const data = JSON.stringify(items, null, 2);
      fs.writeFileSync(this.dataFilePath, data, 'utf8');
      
      logger.log(`Saved ${Object.keys(items).length} items to ${this.dataFilePath}`);
    } catch (error) {
      logger.error('Error saving items', error);
    }
  }
  
  /**
   * Example usage of the ItemGenerator
   */
  public static example(): void {
    // Example adding a new item
    this.generateItem({
      id: 'head_pirate',
      name: 'Pirate Hat',
      description: 'Yarr! A fancy pirate hat with a feather',
      slot: ItemSlot.HEAD,
      rarity: ItemRarity.RARE,
      cost: 2800,
      modelUri: 'models/cosmetics/head/pirate.fbx',
      thumbnailUri: 'textures/ui/cosmetics/head_pirate.png',
      unlockLevel: 9,
      isDefault: false
    });
  }
} 