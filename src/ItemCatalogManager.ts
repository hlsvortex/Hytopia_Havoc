import { ItemRarity, ItemSlot } from "./types/ItemTypes";
import type { ItemCatalog, ItemData } from "./types/ItemTypes";

/**
 * ItemCatalogManager
 * 
 * Manages the collection of all items available in the game
 */
export class ItemCatalogManager {
    private static instance: ItemCatalogManager;
    private items: ItemCatalog = {};

    private constructor() {
        this.initializeDefaultItems();
    }

    public static getInstance(): ItemCatalogManager {
        if (!ItemCatalogManager.instance) {
            ItemCatalogManager.instance = new ItemCatalogManager();
        }
        return ItemCatalogManager.instance;
    }

    /**
     * Initialize default items in the catalog
     */
    private initializeDefaultItems(): void {
        // Default head item
        this.registerItem({
            id: 'head_basic_helmet',
            name: 'Basic Helmet',
            description: 'A basic helmet for your head',
            slot: ItemSlot.HEAD,
            rarity: ItemRarity.COMMON,
            cost: 0,
            modelUri: 'models/cosmetics/head/basic_helmet.gltf',
            thumbnailUri: 'images/items/head_default.png',
            unlockLevel: 1,
            isDefault: true
        });

		this.registerItem({
			id: 'head_viking_helmet',
			name: 'Viking Helmet',
			description: 'A viking helmet for your head',
			slot: ItemSlot.HEAD,
			rarity: ItemRarity.COMMON,
			cost: 10,
			modelUri: 'models/cosmetics/head/viking_helmet.gltf',
			thumbnailUri: 'images/items/head_default.png',
			unlockLevel: 1,
			isDefault: true
		});
		/*

        // Default body item
        this.registerItem({
            id: 'body_default',
            name: 'Default Body',
            description: 'Standard issue body',
            slot: ItemSlot.BODY,
            rarity: ItemRarity.COMMON,
            cost: 0,
            modelUri: 'models/items/body_default.gltf',
            thumbnailUri: 'images/items/body_default.png',
            unlockLevel: 1,
            isDefault: true
        });

        // Default legs item
        this.registerItem({
            id: 'legs_default',
            name: 'Default Legs',
            description: 'Standard issue legs',
            slot: ItemSlot.LEGS,
            rarity: ItemRarity.COMMON,
            cost: 0,
            modelUri: 'models/items/legs_default.gltf',
            thumbnailUri: 'images/items/legs_default.png',
            unlockLevel: 1,
            isDefault: true
        });

        // Add some example premium items
        this.registerItem({
            id: 'head_crown',
            name: 'Royal Crown',
            description: 'For the winners of the Fall Guys game!',
            slot: ItemSlot.HEAD,
            rarity: ItemRarity.LEGENDARY,
            cost: 5000,
            modelUri: 'models/items/head_crown.gltf',
            thumbnailUri: 'images/items/head_crown.png',
            unlockLevel: 10,
            isDefault: false
        });

        this.registerItem({
            id: 'body_pirate',
            name: 'Pirate Jacket',
            description: 'Yarr! A fancy coat for the high seas!',
            slot: ItemSlot.BODY,
            rarity: ItemRarity.EPIC,
            cost: 3000,
            modelUri: 'models/items/body_pirate.gltf',
            thumbnailUri: 'images/items/body_pirate.png',
            unlockLevel: 5,
            isDefault: false
        });

        this.registerItem({
            id: 'legs_robot',
            name: 'Robot Legs',
            description: 'Mechanical legs that make cool sounds',
            slot: ItemSlot.LEGS,
            rarity: ItemRarity.RARE,
            cost: 2000,
            modelUri: 'models/items/legs_robot.gltf',
            thumbnailUri: 'images/items/legs_robot.png',
            unlockLevel: 3,
            isDefault: false
        });
		*/
    }

    /**
     * Register a new item in the catalog
     */
    public registerItem(item: ItemData): void {
        if (this.items[item.id]) {
            console.warn(`ItemCatalogManager: Item with ID ${item.id} already exists in catalog. Overwriting.`);
        }
        this.items[item.id] = item;
    }

    /**
     * Get an item by its ID
     */
    public getItem(itemId: string): ItemData | undefined {
        return this.items[itemId];
    }

    /**
     * Get all items in the catalog
     */
    public getAllItems(): ItemData[] {
        return Object.values(this.items);
    }

    /**
     * Get all items for a specific slot
     */
    public getItemsBySlot(slot: ItemSlot): ItemData[] {
        return Object.values(this.items).filter(item => item.slot === slot);
    }

    /**
     * Get all items of a specific rarity
     */
    public getItemsByRarity(rarity: ItemRarity): ItemData[] {
        return Object.values(this.items).filter(item => item.rarity === rarity);
    }

    /**
     * Get items available at or below a specific player level
     */
    public getItemsByLevel(level: number): ItemData[] {
        return Object.values(this.items).filter(item => item.unlockLevel <= level);
    }

    /**
     * Get the default item for a specific slot
     */
    public getDefaultItem(slot: ItemSlot): ItemData | undefined {
        return Object.values(this.items).find(item => item.slot === slot && item.isDefault);
    }
} 