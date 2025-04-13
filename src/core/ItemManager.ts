import { type ItemData, type ItemCatalog, ItemSlot, ItemRarity } from '../types/ItemTypes';
import { Logger } from '../utils/Logger';
import itemsData from '../data/items.json';

/**
 * Manager class for handling game items and the item catalog
 */
export class ItemManager {
  private static instance: ItemManager;
  private itemCatalog: ItemCatalog = {};
  private logger = new Logger('ItemManager');

  /**
   * Get the singleton instance
   */
  public static getInstance(): ItemManager {
    if (!ItemManager.instance) {
      ItemManager.instance = new ItemManager();
    }
    return ItemManager.instance;
  }

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.logger.log('Initializing ItemManager');
    this.loadItemsFromData();
  }

  /**
   * Load items from the JSON data file
   */
  private loadItemsFromData(): void {
    this.logger.log('Loading items from data file');
    
    try {
      // Convert the imported JSON data to our ItemCatalog type
      const items = itemsData as Record<string, ItemData>;
      
      // Add each item to our catalog with validation
      Object.values(items).forEach(itemData => {
        this.addItemWithValidation(itemData);
      });
      
      this.logger.log(`Successfully loaded ${Object.keys(this.itemCatalog).length} items from data`);
    } catch (error) {
      this.logger.error('Failed to load items from data file', error);
      // Fallback to default items if loading fails
      this.initializeDefaultItems();
    }
  }

  /**
   * Add an item with validation to ensure it matches our expected format
   */
  private addItemWithValidation(itemData: any): void {
    try {
      // Validate required fields
      if (!itemData.id || !itemData.name || !itemData.slot) {
        this.logger.error(`Invalid item data missing required fields: ${JSON.stringify(itemData)}`);
        return;
      }
      
      // Validate and convert slot to enum
      const slot = this.validateSlot(itemData.slot);
      if (!slot) {
        this.logger.error(`Invalid slot value: ${itemData.slot}`);
        return;
      }
      
      // Validate and convert rarity to enum
      const rarity = this.validateRarity(itemData.rarity);
      if (!rarity) {
        this.logger.error(`Invalid rarity value: ${itemData.rarity}`);
        return;
      }
      
      // Create validated item
      const validatedItem: ItemData = {
        id: itemData.id,
        name: itemData.name,
        description: itemData.description || '',
        slot,
        rarity,
        cost: typeof itemData.cost === 'number' ? itemData.cost : 0,
        modelUri: itemData.modelUri || '',
        thumbnailUri: itemData.thumbnailUri || '',
        unlockLevel: typeof itemData.unlockLevel === 'number' ? itemData.unlockLevel : 1,
        isDefault: Boolean(itemData.isDefault)
      };
      
      this.addItem(validatedItem);
    } catch (error) {
      this.logger.error(`Error validating item: ${JSON.stringify(itemData)}`, error);
    }
  }
  
  /**
   * Validate and convert slot string to enum
   */
  private validateSlot(slotString: string): ItemSlot | null {
    switch (slotString.toLowerCase()) {
      case 'head':
        return ItemSlot.HEAD;
      case 'body':
        return ItemSlot.BODY;
      case 'legs':
        return ItemSlot.LEGS;
      default:
        return null;
    }
  }
  
  /**
   * Validate and convert rarity string to enum
   */
  private validateRarity(rarityString: string): ItemRarity | null {
    switch (rarityString.toLowerCase()) {
      case 'common':
        return ItemRarity.COMMON;
      case 'uncommon':
        return ItemRarity.UNCOMMON;
      case 'rare':
        return ItemRarity.RARE;
      case 'epic':
        return ItemRarity.EPIC;
      case 'legendary':
        return ItemRarity.LEGENDARY;
      default:
        return null;
    }
  }

  /**
   * Fallback method to initialize default items if JSON loading fails
   */
  private initializeDefaultItems(): void {
    this.logger.log('Initializing fallback default items');
    
    // Add default head items
    this.addItem({
      id: 'head_default',
      name: 'Default Head',
      description: 'Standard issue head item',
      slot: ItemSlot.HEAD,
      rarity: ItemRarity.COMMON,
      cost: 0,
      modelUri: 'models/cosmetics/head/default.fbx',
      thumbnailUri: 'textures/ui/cosmetics/head_default.png',
      unlockLevel: 1,
      isDefault: true
    });

    // Add default body item
    this.addItem({
      id: 'body_default',
      name: 'Default Body',
      description: 'Standard issue body outfit',
      slot: ItemSlot.BODY,
      rarity: ItemRarity.COMMON,
      cost: 0,
      modelUri: 'models/cosmetics/body/default.fbx',
      thumbnailUri: 'textures/ui/cosmetics/body_default.png',
      unlockLevel: 1,
      isDefault: true
    });

    // Add default legs item
    this.addItem({
      id: 'legs_default',
      name: 'Default Legs',
      description: 'Standard issue leg wear',
      slot: ItemSlot.LEGS,
      rarity: ItemRarity.COMMON,
      cost: 0,
      modelUri: 'models/cosmetics/legs/default.fbx',
      thumbnailUri: 'textures/ui/cosmetics/legs_default.png',
      unlockLevel: 1,
      isDefault: true
    });

    this.logger.log(`Initialized ${Object.keys(this.itemCatalog).length} fallback default items`);
  }

  /**
   * Add an item to the catalog
   */
  public addItem(item: ItemData): void {
    if (this.itemCatalog[item.id]) {
      this.logger.warn(`Item with ID ${item.id} already exists in catalog, overwriting`);
    }
    this.itemCatalog[item.id] = item;
    this.logger.log(`Added item to catalog: ${item.name} (${item.id})`);
  }

  /**
   * Get the entire item catalog
   */
  public getItemCatalog(): ItemCatalog {
    return this.itemCatalog;
  }

  /**
   * Get an item by its ID
   */
  public getItemById(id: string): ItemData | undefined {
    return this.itemCatalog[id];
  }

  /**
   * Get all items of a specific slot
   */
  public getItemsBySlot(slot: ItemSlot): ItemData[] {
    return Object.values(this.itemCatalog).filter(item => item.slot === slot);
  }

  /**
   * Get all items of a specific rarity
   */
  public getItemsByRarity(rarity: ItemRarity): ItemData[] {
    return Object.values(this.itemCatalog).filter(item => item.rarity === rarity);
  }

  /**
   * Get the default item for a particular slot
   */
  public getDefaultItemForSlot(slot: ItemSlot): ItemData {
    const defaultItem = Object.values(this.itemCatalog).find(
      item => item.slot === slot && item.isDefault
    );
    
    if (!defaultItem) {
      throw new Error(`No default item found for slot: ${slot}`);
    }
    
    return defaultItem;
  }

  /**
   * Get all unlocked items for a given player level
   */
  public getUnlockedItems(playerLevel: number): ItemData[] {
    return Object.values(this.itemCatalog).filter(
      item => item.unlockLevel <= playerLevel
    );
  }
} 