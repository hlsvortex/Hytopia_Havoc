import type { EquippedItems } from './ItemTypes';

/**
 * Interface defining the structure of persisted player data
 */
export interface PlayerDataJSON {
    playerName?: string;
    level: number;
    xp: number;
    coins: number;
    crowns: number;
    ownedItemIds: string[];   // IDs of all items owned by the player
    equippedItems?: EquippedItems; // Currently equipped items by slot
    wins: number;
    modelUri?: string;
    lastUpdated?: number; // Timestamp of last update
}

/**
 * Default values for a new player
 */
export const DEFAULT_PLAYER_DATA: PlayerDataJSON = {
    playerName: "Player",
    level: 1,
    xp: 0,
    coins: 0,
    crowns: 0,
    ownedItemIds: ['head_basic_helmet'], // Default items
    equippedItems: {
		head: 'head_basic_helmet',
        body: 'none',
        legs: 'none'
    },
    wins: 0,
    modelUri: "models/players/player.gltf",
    lastUpdated: Date.now()
}; 