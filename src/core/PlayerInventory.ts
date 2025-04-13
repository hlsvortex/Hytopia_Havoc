import { type EquippedItems, DEFAULT_EQUIPPED_ITEMS, type ItemData } from '../types/ItemTypes';
import { ItemManager } from './ItemManager';
import { Logger } from '../utils/Logger';

/**
 * Manages a player's inventory, including owned items and equipped items
 */
export class PlayerInventory {
  private playerId: string;
  private ownedItemIds: Set<string> = new Set<string>();
  private equippedItems: EquippedItems = { ...DEFAULT_EQUIPPED_ITEMS };
  private playerLevel: number = 1;
  private logger: Logger;
  private itemManager: ItemManager;

  /**
   * Create a new inventory for a player
   * @param playerId The unique ID of the player
   */
  constructor(playerId: string) {
    this.playerId = playerId;
    this.logger = new Logger(`PlayerInventory:${playerId}`);
    this.itemManager = ItemManager.getInstance();
    this.initializeDefaultItems();
    this.logger.log('Player inventory initialized');
  }

  /**
   * Add default items to the player's inventory
   */
  private initializeDefaultItems(): void {
    // Find all default items and add them to inventory
    const allItems = Object.values(this.itemManager.getItemCatalog());
    const defaultItems = allItems.filter(item => item.isDefault);
    
    defaultItems.forEach(item => {
      this.ownedItemIds.add(item.id);
    });
    
    this.logger.log(`Added ${defaultItems.length} default items to inventory`);
  }

  /**
   * Check if the player owns a specific item
   * @param itemId The item ID to check
   */
  public hasItem(itemId: string): boolean {
    return this.ownedItemIds.has(itemId);
  }

  /**
   * Add an item to the player's inventory
   * @param itemId The item ID to add
   * @returns True if the item was added, false if already owned
   */
  public addItem(itemId: string): boolean {
    if (this.hasItem(itemId)) {
      this.logger.log(`Player already owns item: ${itemId}`);
      return false;
    }
    
    const item = this.itemManager.getItemById(itemId);
    if (!item) {
      this.logger.error(`Cannot add non-existent item to inventory: ${itemId}`);
      return false;
    }
    
    this.ownedItemIds.add(itemId);
    this.logger.log(`Added item to inventory: ${item.name} (${itemId})`);
    return true;
  }

  /**
   * Get all items owned by the player
   */
  public getOwnedItems(): ItemData[] {
    return Array.from(this.ownedItemIds)
      .map(id => this.itemManager.getItemById(id))
      .filter((item): item is ItemData => item !== undefined);
  }

  /**
   * Equip an item in the appropriate slot
   * @param itemId The item ID to equip
   * @returns True if equipped successfully, false otherwise
   */
  public equipItem(itemId: string): boolean {
    if (!this.hasItem(itemId)) {
      this.logger.error(`Cannot equip unowned item: ${itemId}`);
      return false;
    }
    
    const item = this.itemManager.getItemById(itemId);
    if (!item) {
      this.logger.error(`Item not found in catalog: ${itemId}`);
      return false;
    }
    
    this.equippedItems[item.slot] = itemId;
    this.logger.log(`Equipped item: ${item.name} (${itemId}) in slot: ${item.slot}`);
    return true;
  }

  /**
   * Get the currently equipped items
   */
  public getEquippedItems(): EquippedItems {
    return { ...this.equippedItems };
  }

  /**
   * Get the item data for all equipped items
   */
  public getEquippedItemsData(): Record<string, ItemData> {
    const result: Record<string, ItemData> = {};
    
    Object.entries(this.equippedItems).forEach(([slot, itemId]) => {
      const item = this.itemManager.getItemById(itemId);
      if (item) {
        result[slot] = item;
      }
    });
    
    return result;
  }

  /**
   * Set the player's level (used for unlocking level-restricted items)
   * @param level The new player level
   */
  public setPlayerLevel(level: number): void {
    if (level < 1) {
      this.logger.warn(`Invalid player level: ${level}, setting to 1`);
      this.playerLevel = 1;
    } else {
      this.playerLevel = level;
      this.logger.log(`Player level set to: ${level}`);
    }
  }

  /**
   * Get the player's current level
   */
  public getPlayerLevel(): number {
    return this.playerLevel;
  }

  /**
   * Get items the player can purchase (based on level requirement)
   */
  public getAvailableToPurchase(): ItemData[] {
    // Get all items that are unlocked at the player's level
    const allUnlockedItems = this.itemManager.getUnlockedItems(this.playerLevel);
    
    // Filter out items the player already owns
    return allUnlockedItems.filter(item => !this.ownedItemIds.has(item.id));
  }
} 