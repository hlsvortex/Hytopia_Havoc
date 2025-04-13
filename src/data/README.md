# Item System Documentation

This document describes how the item and cosmetic system works in our Fall Guys-style game.

## Overview

The game uses a JSON-based approach for defining items. All items are stored in `items.json` and loaded at runtime by the `ItemManager`. This makes it easy to add, modify, or remove items without changing code.

## Item Structure

Each item has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| id | string | Unique identifier for the item (lowercase with underscores) |
| name | string | Display name of the item |
| description | string | Text description of the item |
| slot | string | Equipment slot: "head", "body", or "legs" |
| rarity | string | Rarity level: "common", "uncommon", "rare", "epic", "legendary" |
| cost | number | Cost to purchase in game currency |
| modelUri | string | Path to the 3D model file |
| thumbnailUri | string | Path to the thumbnail image for UI |
| unlockLevel | number | Player level required to purchase |
| isDefault | boolean | Whether players start with this item |

## Adding New Items

### Method 1: Directly edit items.json

You can directly edit the `items.json` file. Add a new entry with a unique ID key:

```json
"head_example": {
  "id": "head_example",
  "name": "Example Head Item",
  "description": "An example head item to show the format",
  "slot": "head",
  "rarity": "rare",
  "cost": 1500,
  "modelUri": "models/cosmetics/head/example.fbx",
  "thumbnailUri": "textures/ui/cosmetics/head_example.png",
  "unlockLevel": 5,
  "isDefault": false
}
```

### Method 2: Use the ItemGenerator utility

For a programmatic approach, use the `ItemGenerator` class:

```typescript
import { ItemGenerator } from '../utils/ItemGenerator';
import { ItemSlot, ItemRarity } from '../types/ItemTypes';

ItemGenerator.generateItem({
  id: 'head_awesome',
  name: 'Awesome Hat',
  description: 'The most awesome hat ever',
  slot: ItemSlot.HEAD,
  rarity: ItemRarity.EPIC,
  cost: 3500,
  modelUri: 'models/cosmetics/head/awesome.fbx',
  thumbnailUri: 'textures/ui/cosmetics/head_awesome.png',
  unlockLevel: 12,
  isDefault: false
});
```

See `src/examples/AddNewItem.ts` for examples of using this utility.

## Best Practices

1. **Use consistent ID naming**: Follow the pattern `[slot]_[name]` (e.g., "head_crown", "body_ninja")
2. **Balance costs and rarity**: Higher rarity items should generally cost more
3. **Level requirements**: Higher level unlocks should be more powerful/prestigious
4. **Test model paths**: Ensure model and thumbnail paths are correct before adding to production
5. **Default items**: Each slot should have exactly one default item (isDefault: true)

## Schema Validation

A JSON schema is available at `src/schemas/item-schema.json` for validating item data structure. 