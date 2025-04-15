import { ItemCatalogManager } from "./ItemCatalogManager";
import { ItemSlot } from "./types/ItemTypes";
import type { ItemData, EquippedItems } from "./types/ItemTypes";

/**
 * Interface for player inventory data storage
 */
export interface PlayerInventoryData {
    unlockedItems: string[]; // Array of item IDs the player has unlocked
    equippedItems: EquippedItems; // Currently equipped items
    currency: number; // In-game currency amount
}

/**
 * PlayerInventoryManager
 * 
 * Manages a player's inventory, including unlocked items and equipped items
 */
export class PlayerInventoryManager {
    private playerId: string;
    private unlockedItems: Set<string>; // Using Set for more efficient item lookup
    private equippedItems: EquippedItems;
    private currency: number;
    private itemCatalog: ItemCatalogManager;

    constructor(playerId: string, inventoryData?: PlayerInventoryData) {
        this.playerId = playerId;
        this.unlockedItems = new Set<string>();
        this.equippedItems = {
            head: '',
            body: '',
            legs: ''
        };
        this.currency = 0;
        this.itemCatalog = ItemCatalogManager.getInstance();

        // If inventory data is provided, initialize with it
        if (inventoryData) {
            this.loadFromData(inventoryData);
        } else {
            this.initializeDefaultInventory();
        }
    }

    /**
     * Initialize a new player with default items
     */
    private initializeDefaultInventory(): void {
        // Add default items to player's inventory
        const defaultHeadItem = this.itemCatalog.getDefaultItem(ItemSlot.HEAD);
        const defaultBodyItem = this.itemCatalog.getDefaultItem(ItemSlot.BODY);
        const defaultLegsItem = this.itemCatalog.getDefaultItem(ItemSlot.LEGS);

        if (defaultHeadItem) {
            this.unlockItem(defaultHeadItem.id);
            this.equippedItems[ItemSlot.HEAD] = defaultHeadItem.id;
        }

        if (defaultBodyItem) {
            this.unlockItem(defaultBodyItem.id);
            this.equippedItems[ItemSlot.BODY] = defaultBodyItem.id;
        }

        if (defaultLegsItem) {
            this.unlockItem(defaultLegsItem.id);
            this.equippedItems[ItemSlot.LEGS] = defaultLegsItem.id;
        }
    }

    /**
     * Load inventory data from persistence
     */
    public loadFromData(data: PlayerInventoryData): void {
        // Load unlocked items
        this.unlockedItems = new Set<string>(data.unlockedItems);
        
        // Load equipped items
        this.equippedItems = data.equippedItems;
        
        // Load currency
        this.currency = data.currency;
    }

    /**
     * Save inventory data for persistence
     */
    public toData(): PlayerInventoryData {
        return {
            unlockedItems: Array.from(this.unlockedItems),
            equippedItems: this.equippedItems,
            currency: this.currency
        };
    }

    /**
     * Check if a player has a specific item
     */
    public hasItem(itemId: string): boolean {
        return this.unlockedItems.has(itemId);
    }

    /**
     * Unlock an item for the player
     */
    public unlockItem(itemId: string): boolean {
        // Check if item exists in catalog
        const item = this.itemCatalog.getItem(itemId);
        if (!item) {
            console.error(`PlayerInventoryManager: Attempted to unlock non-existent item ${itemId}`);
            return false;
        }

        // Add to unlocked items
        this.unlockedItems.add(itemId);
        return true;
    }

    /**
     * Equip an item in the appropriate slot
     */
    public equipItem(itemId: string): boolean {
        // Check if player has the item
        if (!this.hasItem(itemId)) {
            console.error(`PlayerInventoryManager: Player ${this.playerId} doesn't have item ${itemId}`);
            return false;
        }

        // Get the item data
        const item = this.itemCatalog.getItem(itemId);
        if (!item) {
            console.error(`PlayerInventoryManager: Item ${itemId} doesn't exist in catalog`);
            return false;
        }

        // Equip the item in the appropriate slot
        this.equippedItems[item.slot] = itemId;
        return true;
    }

    /**
     * Get all unlocked items
     */
    public getUnlockedItems(): ItemData[] {
        return Array.from(this.unlockedItems)
            .map(id => this.itemCatalog.getItem(id))
            .filter((item): item is ItemData => item !== undefined);
    }

    /**
     * Get all equipped items
     */
    public getEquippedItems(): Record<ItemSlot, ItemData | undefined> {
        const result: Record<ItemSlot, ItemData | undefined> = {
            [ItemSlot.HEAD]: undefined,
            [ItemSlot.BODY]: undefined,
            [ItemSlot.LEGS]: undefined
        };

        for (const slot of Object.values(ItemSlot)) {
            const itemId = this.equippedItems[slot];
            if (itemId) {
                result[slot] = this.itemCatalog.getItem(itemId);
            }
        }

        return result;
    }

    /**
     * Get equipped item for a specific slot
     */
    public getEquippedItemInSlot(slot: ItemSlot): ItemData | undefined {
        const itemId = this.equippedItems[slot];
        return itemId ? this.itemCatalog.getItem(itemId) : undefined;
    }

    /**
     * Add currency to player's account
     */
    public addCurrency(amount: number): void {
        this.currency += amount;
    }

    /**
     * Deduct currency from player's account
     */
    public deductCurrency(amount: number): boolean {
        if (this.currency < amount) {
            return false;
        }
        this.currency -= amount;
        return true;
    }

    /**
     * Get current currency amount
     */
    public getCurrency(): number {
        return this.currency;
    }

    /**
     * Purchase an item with currency
     */
    public purchaseItem(itemId: string): boolean {
        // Check if player already has the item
        if (this.hasItem(itemId)) {
            console.warn(`PlayerInventoryManager: Player ${this.playerId} already has item ${itemId}`);
            return false;
        }

        // Get the item data
        const item = this.itemCatalog.getItem(itemId);
        if (!item) {
            console.error(`PlayerInventoryManager: Item ${itemId} doesn't exist in catalog`);
            return false;
        }

        // Check if player has enough currency
        if (this.currency < item.cost) {
            console.warn(`PlayerInventoryManager: Player ${this.playerId} doesn't have enough currency to purchase ${itemId}`);
            return false;
        }

        // Deduct currency and unlock item
        this.deductCurrency(item.cost);
        this.unlockItem(itemId);
        return true;
  
	}
} 