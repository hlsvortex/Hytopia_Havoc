/**
 * Enumeration of available item slots
 */
export enum ItemSlot {
    HEAD = 'head',
    BODY = 'body',
    LEGS = 'legs'
}

/**
 * Enumeration of item rarities
 */
export enum ItemRarity {
    COMMON = 'common',
    UNCOMMON = 'uncommon',
    RARE = 'rare',
    EPIC = 'epic',
    LEGENDARY = 'legendary'
}

/**
 * Interface for item data
 */
export interface ItemData {
    id: string;
    name: string;
    description: string;
    slot: ItemSlot;
    rarity: ItemRarity;
    cost: number;
    modelUri: string;
    thumbnailUri: string;
    unlockLevel: number;
    isDefault: boolean;
}

/**
 * Type for the item catalog, mapping item IDs to item data
 */
export type ItemCatalog = Record<string, ItemData>;

/**
 * Interface for equipped items, one item per slot
 */
export interface EquippedItems {
    [ItemSlot.HEAD]: string;
    [ItemSlot.BODY]: string;
    [ItemSlot.LEGS]: string;
}

/**
 * Default equipped items (must match default item IDs in ItemManager)
 */
export const DEFAULT_EQUIPPED_ITEMS: EquippedItems = {
    [ItemSlot.HEAD]: 'head_default',
    [ItemSlot.BODY]: 'body_default',
    [ItemSlot.LEGS]: 'legs_default'
}; 