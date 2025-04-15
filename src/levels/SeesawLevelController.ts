import { World, PlayerEntity, Entity, type Vector3Like, Player } from 'hytopia';
import { CourseLevelController } from '../core/CourseLevelController';
import { type LevelConfiguration } from '../config/LevelConfiguration';
import SeesawEntity from '../obsticals/SeesawEntity';
import { UIBridge } from '../core/UIBridge';
import { GameManager } from '../core/GameManager';
/**
 * Specialized level controller for seesaw obstacle course levels
 */
export class SeesawLevelController extends CourseLevelController {
	private seesaws: SeesawEntity[] = [];
	private baseDepth: number = 5;
	private seesawDepth: number = 11;
	private baseXOffset: number = 1;
	private difficulty: 'easy' | 'medium' | 'hard' = 'medium';
	private courseRowCount: number = 0;

	/**	
	 * Create a new seesaw level controller
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
		console.log(`Created seesaw level with ${this.difficulty} difficulty`);
	}

	/**
	 * Define start/finish areas specifically for Seesaw level.
	 */
	protected setupCourseBoundaries(): void {
		this.clearAndSetStartArea(
			{ x: 10, y: 2, z: -7 },
			{ x: -10, y: 2, z: 7 },
			2 // Spawn Height
		);

		// Example Finish Area (needs coordinates from the end of the map)
		// Calculate Z based on the last obstacle added

		

		this.addCheckpointArea(
			{ x: 3, y: 3, z:89 },//225
			{ x: -2, y: 5, z: 95 }//237	
		);

		this.addCheckpointArea(
			{ x: 17, y: 3, z: 89 },//225
			{ x: 13, y: 5, z: 95 }//237	
		);
		this.addCheckpointArea(
			{ x: -17, y: 3, z: 89 },//225
			{ x: -13, y: 5, z: 95 }//237	
		);


		this.setFinishArea(
			{ x: 10, y: 1, z: 225 },//225
			{ x: -10, y: 5, z: 237 }//237	
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

	
	public override eliminatePlayer(playerEntity: PlayerEntity): void {
		//console.log(`[SeesawLevelController] Eliminating player ${playerEntity.player?.id}`);
		//playerEntity.despawn();
	}


	/**
	 * Create a layout of seesaws in a line with default configuration
	 */
	protected createCourse(config: {
		baseDepth?: number;			
		baseXOffset?: number;
		seesawDepth?: number;
		rows?: number;
		width?: number;
	} = {}): void {
		this.loadMap();

		this.baseDepth = config.baseDepth ?? 5;
		this.baseXOffset = config.baseXOffset ?? 1;
		this.seesawDepth = config.seesawDepth ?? 11;
		const rows = config.rows ?? 10;
		const width = config.width ?? 12;

		let depthIndex = 1;

		this.addSeesaw({ x: this.baseXOffset, y: 0, z: this.baseDepth + this.seesawDepth * depthIndex++ });
		this.addSeesaw({ x: this.baseXOffset + 5, y: 0, z: this.baseDepth + this.seesawDepth * depthIndex++ });
		this.addSeesaw({ x: this.baseXOffset, y: 0.5, z: this.baseDepth + this.seesawDepth * depthIndex++ });

		depthIndex += 2;

		this.addSeesaw({ x: this.baseXOffset, y: 0, z: this.baseDepth + this.seesawDepth * depthIndex++ });
		this.addSeesaw({ x: this.baseXOffset + width, y: 0, z: this.baseDepth + this.seesawDepth * depthIndex });
		this.addSeesaw({ x: this.baseXOffset - width, y: 0, z: this.baseDepth + this.seesawDepth * depthIndex });

		depthIndex += 3;

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

		this.addSeesaw({ x: this.baseXOffset, y: 0, z: this.baseDepth + this.seesawDepth * depthIndex++ });

		this.addSeesaw({ x: this.baseXOffset - width, y: 0, z: this.baseDepth + this.seesawDepth * depthIndex });
		this.addSeesaw({ x: this.baseXOffset + width, y: 0, z: this.baseDepth + this.seesawDepth * depthIndex });

		depthIndex++;

		this.addSeesaw({ x: this.baseXOffset, y: 0, z: this.baseDepth + this.seesawDepth * depthIndex++ });
		this.addSeesaw({ x: this.baseXOffset, y: 0, z: this.baseDepth + this.seesawDepth * depthIndex++ });
		
		this.courseRowCount = depthIndex;

		console.log(`Created seesaw course with ${this.seesaws.length} seesaws`);
	}

	/**
	 * Add a single seesaw at the specified position
	 * @param position Position to place the seesaw
	 */
	public addSeesaw(position: Vector3Like): SeesawEntity {
		const seesaw = new SeesawEntity({}, this, this.world);	


		seesaw.spawn(this.world, position);

		this.seesaws.push(seesaw);

		return seesaw;
	}

	/**
	 * Reset all seesaws to their default position
	 */
	public resetSeesaws(): void {
		for (const seesaw of this.seesaws) {
			if (seesaw.isSpawned) {
				seesaw.setRotation({ x: 0, y: 0, z: 0, w: 1 });
				seesaw.setAngularVelocity({ x: 0, y: 0, z: 0 });
			}
		}
	}

	public startRound(players: Player[], qualificationTarget: number): void {
		console.log(`[SeesawLevelController] Starting round with ${players.length} players. Qualification target: ${qualificationTarget} players will qualify`);
		super.startRound(players, qualificationTarget);
		this.resetSeesaws();
	}

	public cleanup(): void {
		console.log(`[SeesawLevelController] Cleaning up Seesaw level`);
		if (this.seesaws.length > 0) {
			console.log(`[SeesawLevelController] Despawning ${this.seesaws.length} seesaws`);
			this.seesaws.forEach(seesaw => {
				if (seesaw.isSpawned) {
					seesaw.despawn();
				}
			});
			this.seesaws = [];
		}


		console.log(`[SeesawLevelController] Calling base class cleanup for course areas and map clearing`);
		super.cleanup();
		console.log(`[SeesawLevelController] Cleanup complete`);
	}


	public getSeesawCount(): number {
		return this.seesaws.length;
	}
} 