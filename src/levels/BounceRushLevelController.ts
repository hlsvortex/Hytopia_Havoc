import { World, PlayerEntity, Entity, type Vector3Like, Player } from 'hytopia';
import { CourseLevelController } from '../core/CourseLevelController';
import { type LevelConfiguration } from '../config/LevelConfiguration';
import { UIBridge } from '../core/UIBridge';
import { GameManager } from '../core/GameManager';
import { BouncePadObstacle, type BouncePadSize } from '../obsticals/BouncePadObstacle';

/**
 * Specialized level controller for bounce pad obstacle course levels
 */
export class BounceRushLevelController extends CourseLevelController {
	private bouncePads: BouncePadObstacle[] = [];
	private baseDepth: number = 5;
	private padSpacing: number = 11;
	private baseXOffset: number = 1;
	private difficulty: 'easy' | 'medium' | 'hard' = 'medium';
	private courseRowCount: number = 0;

	/**	
	 * Create a new bounce rush level controller
	 * @param world Game world
	 * @param config Level configuration
	 * @param uiBridge UI bridge
	 */
	constructor(
		world: World,
		config: LevelConfiguration,
		uiBridge: UIBridge | null = null,
		gameManager: GameManager
	) {
		super(world, config, uiBridge, gameManager);
		this.difficulty = config.difficulty || 'medium';
		console.log(`Created bounce rush level with ${this.difficulty} difficulty`);
	}

	/**
	 * Define start/finish areas for the bounce rush level
	 */
	protected setupCourseBoundaries(): void {
		this.clearAndSetStartArea(
			{ x: 10, y: 2, z: -7 },
			{ x: -10, y: 2, z: 7 },
			2 // Spawn Height
		);

		this.setFinishArea(
			{ x: 13, y: 1, z: 222-150 },
			{ x: -13, y: 22, z: 236-150 }
		);
	}

	/**
	* Activate this level - load the map and create obstacles
	*/
	public override loadLevel(): void {
		this.loadMap();
		this.setupCourseBoundaries(); // Set up start area first
		this.createCourse();
	}

	/**
	 * Create a layout of bounce pads with default configuration
	 */
	protected createCourse(config: {
		baseDepth?: number;			
		baseXOffset?: number;
		padSpacing?: number;
		rows?: number;
		width?: number;
	} = {}): void {
		this.baseDepth = config.baseDepth ?? 5;
		this.baseXOffset = config.baseXOffset ?? 1;
		this.padSpacing = config.padSpacing ?? 11;
		const rows = config.rows ?? 10;
		const width = config.width ?? 12;

		let depthIndex = 1;

		// First section - basic path
		this.addBouncePad({ x: this.baseXOffset - 6, y: 0, z: this.baseDepth + this.padSpacing * depthIndex }, 'large');
		this.addBouncePad({ x: this.baseXOffset + 6, y: 0, z: this.baseDepth + this.padSpacing * depthIndex++ }, 'large');
		this.addBouncePad({ x: this.baseXOffset, y: 0, z: this.baseDepth + this.padSpacing * depthIndex++ }, 'medium');
		this.addBouncePad({ x: this.baseXOffset, y: 0, z: this.baseDepth + this.padSpacing * depthIndex++ }, 'large', true);

		depthIndex += 2;

		// FIrst check point
		let spcX = 6;

		this.addBouncePad({ x: this.baseXOffset + 5, y: 0, z: this.baseDepth - spcX + this.padSpacing * depthIndex }, 'medium');
		this.addBouncePad({ x: this.baseXOffset - 5, y: 0, z: this.baseDepth - spcX + this.padSpacing * depthIndex }, 'medium');

		spcX = 5
		depthIndex += 1;

		this.addBouncePad({ x: this.baseXOffset + 6, y: 3, z: this.baseDepth - spcX + this.padSpacing * depthIndex },
			'medium', true, "x", 3, -2);
		this.addBouncePad({ x: this.baseXOffset - 9, y: 3, z: this.baseDepth - spcX + this.padSpacing * depthIndex },
			'medium', true, "x", 3, 2);

		depthIndex += 1;


		this.addBouncePad({ x: this.baseXOffset + 7, y: 6, z: this.baseDepth-spcX + this.padSpacing * depthIndex }, 
			'medium', true, "x", 3, -2);
		this.addBouncePad({ x: this.baseXOffset - 10, y: 6, z: this.baseDepth-spcX + this.padSpacing * depthIndex }, 
			'medium', true, "x", 3, 2);
		this.addBouncePad({ x: this.baseXOffset , y: 6, z: this.baseDepth - spcX + (this.padSpacing * depthIndex )-1}, 
			'small', true, "z", 2, );

			depthIndex += 1;

		this.addBouncePad({ x: this.baseXOffset + 7, y: 7, z: this.baseDepth - spcX + this.padSpacing * depthIndex },
			'small', true, "y", 3, 3);
		this.addBouncePad({ x: this.baseXOffset - 7, y: 7, z: this.baseDepth - spcX + this.padSpacing * depthIndex },
			'small', true, "y", 3, 3); 
		this.addBouncePad({ x: this.baseXOffset, y: 7, z: this.baseDepth - spcX + this.padSpacing * depthIndex },
			'small', true, "y", 3, -3);

		// CHECK POINT 1
		depthIndex += 2;
		spcX = 1;

		this.addBouncePad({ x: this.baseXOffset + 8, y: 13, z: this.baseDepth - spcX + this.padSpacing * depthIndex },
			'medium', true, "z", 25, 3);
		this.addBouncePad({ x: this.baseXOffset - 8, y: 13, z: this.baseDepth - spcX + this.padSpacing * depthIndex },
			'medium', true, "z", 25, 3);
		this.addBouncePad({ x: this.baseXOffset , y: 13, z: this.baseDepth - spcX + this.padSpacing * depthIndex },
			'medium', true, "z", 25, -3);
		
		depthIndex += 4;
		spcX = 2;

		// CHECK POINT 2
		this.addBouncePad({ x: this.baseXOffset + 11, y: 14, z: this.baseDepth - spcX + this.padSpacing * depthIndex },
			'small', true, "z", 27, -4);
		this.addBouncePad({ x: this.baseXOffset + 5, y: 14, z: this.baseDepth - spcX + this.padSpacing * depthIndex },
			'small', true, "z", 25, 4);
		this.addBouncePad({ x: this.baseXOffset, y: 14, z: this.baseDepth - spcX + this.padSpacing * depthIndex },
			'small', true, "z", 25, -4);
		this.addBouncePad({ x: this.baseXOffset - 5, y: 14, z: this.baseDepth - spcX + this.padSpacing * depthIndex },
			'small', true, "z", 25, 4);
		this.addBouncePad({ x: this.baseXOffset - 11, y: 14, z: this.baseDepth - spcX + this.padSpacing * depthIndex },
			'small', true, "z", 27, -4);
		
		depthIndex += 3;

		// CHECK POINT 2
		this.addBouncePad({ x: this.baseXOffset -10, y: 15, z: this.baseDepth - spcX + this.padSpacing * depthIndex },
			'large', true, "x", 24, -3);
		
		depthIndex += 1;
	
		this.addBouncePad({ x: this.baseXOffset - 10, y: 16, z: this.baseDepth - spcX + this.padSpacing * depthIndex },
			'medium', true, "x", 20, 3);
		
		depthIndex += 1;
		spcX = 1;
		this.addBouncePad({ x: this.baseXOffset - 10, y: 17, z: this.baseDepth - spcX + this.padSpacing * depthIndex },
			'small', true, "x", 20, -3);

		

		
		this.courseRowCount = depthIndex;
		console.log(`Created bounce rush course with ${this.bouncePads.length} bounce pads`);
	}

	/**
	 * Add a single bounce pad at the specified position
	 * @param position Position to place the bounce pad
	 * @param size Size of the bounce pad (small, medium, large)
	 * @param moving Whether the pad should move
	 */
	public addBouncePad(position: Vector3Like, size: BouncePadSize = 'medium', moving: boolean = false, moveAxis: 'x' | 'y' | 'z' = 'y', moveDistance: number = 3, moveSpeed: number = 1): BouncePadObstacle {
		const bouncePad = new BouncePadObstacle({
			size: size,
			bounceForce: 25,//size === 'small' ? 15 : size === 'medium' ? 20 : 25,
			moveEnabled: moving,
			moveDistance: moveDistance,
			moveSpeed: moveSpeed,
			movementAxis: moveAxis
		}, this);

		bouncePad.spawn(this.world, position);
		this.bouncePads.push(bouncePad);
		return bouncePad;
	}

	/**
	 * Activate all bounce pads when the round starts
	 */
	public startRound(players: Player[], qualificationTarget: number): void {
		console.log(`[BounceRushLevelController] Starting round with ${players.length} players. Target: ${qualificationTarget}`);
		super.startRound(players, qualificationTarget);
		
		// Activate all bounce pads
		this.bouncePads.forEach(pad => {
			pad.activate();
		});
	}

	/**
	 * Clean up all bounce pads when the level is done
	 */
	public cleanup(): void {
		console.log(`[BounceRushLevelController] Cleaning up Bounce Rush level`);
		if (this.bouncePads.length > 0) {
			console.log(`[BounceRushLevelController] Despawning ${this.bouncePads.length} bounce pads`);
			this.bouncePads.forEach(pad => {
				if (pad.isSpawned) {
					pad.despawn();
				}
			});
			this.bouncePads = [];
		}

		console.log(`[BounceRushLevelController] Calling base class cleanup for course areas and map clearing`);
		super.cleanup();
		console.log(`[BounceRushLevelController] Cleanup complete`);
	}

	/**
	 * Get the number of bounce pads in the level
	 */
	public getBouncePadCount(): number {
		return this.bouncePads.length;
	}
} 