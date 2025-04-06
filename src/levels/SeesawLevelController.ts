import { World, PlayerEntity, Entity, type Vector3Like, Player } from 'hytopia';
import { LevelController } from '../core/LevelController';
import { type LevelConfiguration } from '../config/LevelConfiguration';
import SeesawEntity from '../obsticals/SeesawEntity';

/**
 * Specialized level controller for seesaw obstacle course levels
 */
export class SeesawLevelController extends LevelController {
	private seesaws: SeesawEntity[] = [];
	private baseDepth: number = 5;
	private seesawDepth: number = 11;
	private baseXOffset: number = 1;
	private difficulty: 'easy' | 'medium' | 'hard' = 'medium';

	/**
	 * Create a new seesaw level controller
	 * @param world Game world
	 * @param config Level configuration
	 */
	constructor(
		world: World,
		config: LevelConfiguration
	) {
		super(world, config);
		this.difficulty = config.difficulty || 'medium';
		console.log(`Created seesaw level with ${this.difficulty} difficulty`);
		
		// Don't create the course automatically - wait for explicit activation
	}

	/**
	 * Activate this level - load the map and create obstacles
	 */
	public activate(): void {
		console.log(`[SeesawLevelController] Activating level`);
		this.createSeesawCourse();
	}

	/**
	 * Create a layout of seesaws in a line with default configuration
	 */
	protected createSeesawCourse(config: {
		baseDepth?: number;
		baseXOffset?: number;
		seesawDepth?: number;
		rows?: number;
		width?: number;
	} = {}): void {
		// First ensure map is loaded before adding obstacles
		this.loadMap();

		// Set configuration with defaults
		this.baseDepth = config.baseDepth ?? 5;
		this.baseXOffset = config.baseXOffset ?? 1;
		this.seesawDepth = config.seesawDepth ?? 11;
		const rows = config.rows ?? 10;
		const width = config.width ?? 12;

		let depthIndex = 1;

		// First section - straight line
		this.addSeesaw({ x: this.baseXOffset, y: 0, z: this.baseDepth + this.seesawDepth * depthIndex++ });
		this.addSeesaw({ x: this.baseXOffset + 5, y: 0, z: this.baseDepth + this.seesawDepth * depthIndex++ });
		this.addSeesaw({ x: this.baseXOffset, y: 0.5, z: this.baseDepth + this.seesawDepth * depthIndex++ });

		depthIndex += 2;

		// Second section - three in a row including sides
		this.addSeesaw({ x: this.baseXOffset, y: 0, z: this.baseDepth + this.seesawDepth * depthIndex++ });
		this.addSeesaw({ x: this.baseXOffset + width, y: 0, z: this.baseDepth + this.seesawDepth * depthIndex });
		this.addSeesaw({ x: this.baseXOffset - width, y: 0, z: this.baseDepth + this.seesawDepth * depthIndex });

		depthIndex += 3;

		// Third section - more complex pattern
		this.addSeesaw({ x: this.baseXOffset + width, y: 0, z: this.baseDepth + this.seesawDepth * depthIndex });
		this.addSeesaw({ x: this.baseXOffset - width, y: 0, z: this.baseDepth + this.seesawDepth * depthIndex });

		depthIndex++;

		this.addSeesaw({ x: this.baseXOffset + width * 2, y: 0, z: this.baseDepth + this.seesawDepth * depthIndex });
		this.addSeesaw({ x: this.baseXOffset - width * 2, y: 0, z: this.baseDepth + this.seesawDepth * depthIndex });
		this.addSeesaw({ x: this.baseXOffset, y: 0, z: this.baseDepth + this.seesawDepth * depthIndex });


		depthIndex++;

		this.addSeesaw({ x: this.baseXOffset + width, y: 0, z: this.baseDepth + this.seesawDepth * depthIndex });
		this.addSeesaw({ x: this.baseXOffset - width, y: 0, z: this.baseDepth + this.seesawDepth * depthIndex });

		depthIndex++;

		this.addSeesaw({ x: this.baseXOffset, y: 0, z: this.baseDepth + this.seesawDepth * depthIndex });

		depthIndex += 3;

		// Final section
		this.addSeesaw({ x: this.baseXOffset, y: 0, z: this.baseDepth + this.seesawDepth * depthIndex++ });

		// Double seesaw challenge
		this.addSeesaw({ x: this.baseXOffset - width, y: 0, z: this.baseDepth + this.seesawDepth * depthIndex });
		this.addSeesaw({ x: this.baseXOffset + width, y: 0, z: this.baseDepth + this.seesawDepth * depthIndex });

		depthIndex++;

		this.addSeesaw({ x: this.baseXOffset, y: 0, z: this.baseDepth + this.seesawDepth * depthIndex++ });
		this.addSeesaw({ x: this.baseXOffset, y: 0, z: this.baseDepth + this.seesawDepth * depthIndex++ });

		/*
		// Setup start and finish areas
		this.setStartArea(
			{ x: 10, y: 0, z: -7 },
			{ x: -10, y: 5, z: 0 },
			1 // Set spawn height
		);
  
		// Add finish area
		this.setFinishArea(
			{ x: this.baseXOffset - 8, y: 0, z: this.baseDepth + this.seesawDepth * depthIndex - 5 },
			{ x: this.baseXOffset + 8, y: 4, z: this.baseDepth + this.seesawDepth * depthIndex + 5 }
		);
		*/

		console.log(`Created seesaw course with ${this.seesaws.length} seesaws`);
	}

	/**
	 * Add a single seesaw at the specified position
	 * @param position Position to place the seesaw
	 */
	public addSeesaw(position: Vector3Like): SeesawEntity {
		const seesaw = new SeesawEntity();

		// Apply difficulty settings
		if (this.difficulty === 'easy') {
			// Make seesaws more stable for easy difficulty
			// Implementation depends on SeesawEntity's API
		} else if (this.difficulty === 'hard') {
			// Make seesaws less stable for hard difficulty
			// Implementation depends on SeesawEntity's API
		}

		// Spawn the seesaw
		seesaw.spawn(this.world, position);

		// Add to our lists
		this.seesaws.push(seesaw);

		return seesaw;
	}

	/**
	 * Reset all seesaws to their default position
	 */
	public resetSeesaws(): void {
		for (const seesaw of this.seesaws) {
			if (seesaw.isSpawned) {
				// Reset rotation to horizontal
				seesaw.setRotation({ x: 0, y: 0, z: 0, w: 1 });

				// Reset angular velocity
				seesaw.setAngularVelocity({ x: 0, y: 0, z: 0 });
			}
		}
	}

	// Implement abstract methods from LevelController
	public startRound(players: Player[]): void {
		// Reset all seesaws before starting the round
		this.resetSeesaws();

		console.log(`[SeesawLevelController] Starting round with ${players.length} players`);

		// Trigger round end after a delay (temporary)
		setTimeout(() => {
			const qualified = players.map(p => p.id);
			const eliminated: string[] = [];
			this.events.emit('RoundEnd', { q: qualified, e: eliminated });
		}, 60000); // 1 minute round
	}

	/**
	 * Clean up this level before unloading
	 */
	public cleanup(): void {
		console.log(`[SeesawLevelController] Cleaning up Seesaw level`);
		
		// Clear any seesaws created by this level
		if (this.seesaws.length > 0) {
			console.log(`[SeesawLevelController] Despawning ${this.seesaws.length} seesaws`);
			this.seesaws.forEach(seesaw => {
				if (seesaw.isSpawned) {
					seesaw.despawn();
				}
			});
			this.seesaws = [];
		}
		
		// Clear map data by loading an empty map
		if (this.world) {
			console.log(`[SeesawLevelController] Clearing map data`);
			this.world.loadMap({ blocks: {} });
		}
		
		console.log(`[SeesawLevelController] Cleanup complete`);
	}

	/**
	 * Check if a player has fallen off the course
	 * @param player The player entity to check
	 * @returns Whether the player has fallen off
	 */
	public hasPlayerFallenOff(player: PlayerEntity): boolean {
		// Simple check if player is below a certain Y level
		return player.position.y < -5;
	}

	/**
	 * Get seesaw count
	 */
	public getSeesawCount(): number {
		return this.seesaws.length;
	}
} 