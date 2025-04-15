// Placeholder for GateCrashLevelController
import { World, PlayerEntity, Entity, type Vector3Like, Player } from 'hytopia';
import { CourseLevelController } from '../core/CourseLevelController';
import { CrashWallObstacle, type CrashWallObstacleOptions } from '../obsticals/CrashWallObstacle';
import { type LevelConfiguration } from '../config/LevelConfiguration';
import { UIBridge } from '../core/UIBridge';
import { GameManager } from '../core/GameManager';
/**
 * Specialized level controller for gate crash obstacle course levels
 */
export class GateCrashLevelController extends CourseLevelController {
    private difficulty: 'easy' | 'medium' | 'hard' = 'medium';
    private wallHeight: number = 4;
    private wallWidth: number = 3;

    /**
     * Create a new gate crash level controller
     * @param world Game world
     * @param config Level configuration
     * @param uiBridge UI bridge (optional)
     */
    constructor(world: World, config: LevelConfiguration, uiBridge: UIBridge | null = null, gameManager: GameManager) {
        super(world, config, uiBridge, gameManager);
        this.difficulty = config.difficulty || 'medium';
        console.log(`Created gate crash level with ${this.difficulty} difficulty`);
    }
    
    /**
     * Define start/finish areas specifically for GateCrash level.
     */
    protected setupCourseBoundaries(): void {
        // Example - Adjust these coordinates based on your actual map layout
        this.clearAndSetStartArea(
            { x: 12, y: 2, z: -7 }, 
            { x: -12, y: 2, z: 7 }, 
            2 // Spawn Height
        );
        
        // Example Finish Area (needs coordinates from the end of the map)
        // Calculate Z based on the last obstacle added
        
        
        this.setFinishArea(
            { x: 8, y: 0, z: 161-100 }, 
            { x: -8, y: 10, z: 181-100 }
        );
        
        // TODO: Add Checkpoint Areas if needed
        // this.addCheckpointArea(...);
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
     * Create the course layout with CrashWallObstacles
     */
    protected createCourse(): void {
        console.log(`[GateCrash] Creating course with ${this.difficulty} difficulty...`);
        
        // First ensure map is loaded before adding obstacles
        this.loadMap();
        
        const rows = 5;
        const wallsPerRow = 4;

        // First wall with 1 second delay - small size
        const wallOptions = {
            startDelay: 1000,
            moveDistance: 3,
            moveSpeed: 1,
            waitTime: 1000,
            size: 'small' as const
        };

        // Second wall with longer delay - medium size
        const wallOptions2 = {
            startDelay: 5000,
            moveDistance: 3,
            moveSpeed: 1,
            waitTime: 1000,
            size: 'medium' as const
        };
        
		const startDepth = 25;
		const baseOffsetX = 1;
		const baseOffsetY = 2;
		const depthAmount = 11;

		this.addCrashWall({ x: baseOffsetX - 9, y: baseOffsetY, z: startDepth }, wallOptions, 'large');
		this.addCrashWall({ x: baseOffsetX, y: baseOffsetY, z: startDepth }, wallOptions2, 'large');
		this.addCrashWall({ x: baseOffsetX + 9, y: baseOffsetY, z: startDepth }, wallOptions, 'large');

		let depthIndex = 2;

		// section 2
		this.addCrashWall({ x: baseOffsetX - 10.5, y: baseOffsetY, z: startDepth + (depthIndex * depthAmount) }, wallOptions, 'medium');
		this.addCrashWall({ x: baseOffsetX - 3.5, y: baseOffsetY, z: startDepth + (depthIndex * depthAmount) }, wallOptions2, 'medium');
		this.addCrashWall({ x: baseOffsetX + 3.5, y: baseOffsetY, z: startDepth + (depthIndex * depthAmount) }, wallOptions, 'medium');
		this.addCrashWall({ x: baseOffsetX + 10.5, y: baseOffsetY, z: startDepth + (depthIndex * depthAmount) }, wallOptions2, 'medium');

		depthIndex = 4;

		let offsetY = 3;
		// section 2
		this.addCrashWall({ x: baseOffsetX - 9, y: baseOffsetY + offsetY, z: startDepth + (depthIndex * depthAmount) }, wallOptions2, 'large');
		this.addCrashWall({ x: baseOffsetX + 9, y: baseOffsetY + offsetY, z: startDepth + (depthIndex * depthAmount) }, wallOptions, 'large');

		depthIndex = 6;

		// section 2
		this.addCrashWall({ x: baseOffsetX - 10.5, y: baseOffsetY + offsetY, z: startDepth + (depthIndex * depthAmount) }, wallOptions, 'medium');
		this.addCrashWall({ x: baseOffsetX - 3.5, y: baseOffsetY + offsetY, z: startDepth + (depthIndex * depthAmount) }, wallOptions2, 'medium');
		this.addCrashWall({ x: baseOffsetX + 3.5, y: baseOffsetY + offsetY, z: startDepth + (depthIndex * depthAmount) }, wallOptions, 'medium');
		this.addCrashWall({ x: baseOffsetX + 10.5, y: baseOffsetY + offsetY, z: startDepth + (depthIndex * depthAmount) }, wallOptions2, 'medium');

		depthIndex = 8;
		offsetY = 5;

		// section 3
		this.addCrashWall({ x: baseOffsetX - 5, y: baseOffsetY + offsetY, z: startDepth + (depthIndex * depthAmount) }, wallOptions2, 'small');
		this.addCrashWall({ x: baseOffsetX - 8.5, y: baseOffsetY + offsetY, z: startDepth + (depthIndex * depthAmount) }, wallOptions, 'small');
		this.addCrashWall({ x: baseOffsetX - 12, y: baseOffsetY + offsetY, z: startDepth + (depthIndex * depthAmount) }, wallOptions2, 'small');

		this.addCrashWall({ x: baseOffsetX + 5, y: baseOffsetY + offsetY, z: startDepth + (depthIndex * depthAmount) }, wallOptions, 'small');
		this.addCrashWall({ x: baseOffsetX + 8.5, y: baseOffsetY + offsetY, z: startDepth + (depthIndex * depthAmount) }, wallOptions2, 'small');
		this.addCrashWall({ x: baseOffsetX + 12, y: baseOffsetY + offsetY, z: startDepth + (depthIndex * depthAmount) }, wallOptions, 'small');

		// section 4
		depthIndex = 10;
		offsetY = 7;

		this.addCrashWall({ x: baseOffsetX - 7.5, y: baseOffsetY + offsetY, z: startDepth + (depthIndex * depthAmount) }, wallOptions2, 'small');
		this.addCrashWall({ x: baseOffsetX - 3.5, y: baseOffsetY + offsetY, z: startDepth + (depthIndex * depthAmount) }, wallOptions, 'small');
		this.addCrashWall({ x: baseOffsetX, y: baseOffsetY + offsetY, z: startDepth + (depthIndex * depthAmount) }, wallOptions2, 'small');
		this.addCrashWall({ x: baseOffsetX + 3.5, y: baseOffsetY + offsetY, z: startDepth + (depthIndex * depthAmount) }, wallOptions, 'small');
		this.addCrashWall({ x: baseOffsetX + 7.5, y: baseOffsetY + offsetY, z: startDepth + (depthIndex * depthAmount) }, wallOptions2, 'small');

		//end section
		depthIndex = 11;
		offsetY = 5;
		this.addCrashWall({ x: baseOffsetX - 6, y: baseOffsetY + offsetY, z: startDepth + (depthIndex * depthAmount) }, wallOptions2, 'medium');
		this.addCrashWall({ x: baseOffsetX, y: baseOffsetY + offsetY, z: startDepth + (depthIndex * depthAmount) }, wallOptions, 'medium');
		this.addCrashWall({ x: baseOffsetX + 6, y: baseOffsetY + offsetY, z: startDepth + (depthIndex * depthAmount) }, wallOptions2, 'medium');


        console.log(`[GateCrash] Course creation complete with ${this.obstacles.length} walls.`);
    }


    private calculateWallPositions(count: number, width: number, z: number): Vector3Like[] {
        const positions: Vector3Like[] = [];
        const totalWallWidth = count * this.wallWidth;
        const totalGapWidth = width - totalWallWidth;
        const gapSize = totalGapWidth / (count + 1);
        
        let currentX = -width / 2 + gapSize + this.wallWidth / 2;

        for (let i = 0; i < count; i++) {
            positions.push({ x: currentX, y: this.wallHeight / 2, z: z });
            currentX += this.wallWidth + gapSize;
        }
        return positions;
    }

    private addCrashWall(position: Vector3Like, options: CrashWallObstacleOptions = {}, size?: 'small' | 'medium' | 'large'): void {
        // If size is provided, override the options.size
        const finalOptions = { ...options };
        if (size) {
            finalOptions.size = size;
        }
        
        const wall = new CrashWallObstacle(finalOptions, this);
        wall.spawn(this.world, position);
        this.obstacles.push(wall);
        
        // Register the wall as an obstacle with the level controller
        this.registerObstacle(wall);
        console.log(`[GateCrash] Registered crash wall obstacle: ${wall.id}`);
    }

   

    public startRound(players: Player[], qualificationTarget: number): void {
        console.log(`[GateCrash] Round started with ${players.length} players. Qualification target: ${qualificationTarget} players will qualify`);
        super.startRound(players, qualificationTarget);
        this.resetObstacles();
        
        // TODO: Implement actual round end condition based on finished players
        // Temporary timer removed, round end triggered by handlePlayerFinished
        // setTimeout(() => {
        //     const qualified = players.map(p => p.id);
        //     const eliminated: string[] = [];
        //     this.events.emit('RoundEnd', { q: qualified, e: eliminated });
        // }, 60000); 
    }
    
    public cleanup(): void {
        console.log('[GateCrash] Cleaning up Gate Crash level...');
        // First cleanup local resources
        for (const obstacle of this.obstacles) {
            obstacle.deactivate();
            if (obstacle.isSpawned) {
                obstacle.despawn();
            }
        }

        this.obstacles = [];
        
        // Then call parent class cleanup
        console.log('[GateCrash] Calling parent class cleanup');
        super.cleanup();
        
        console.log('[GateCrash] Cleanup complete');
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
     * Get obstacle count
     */
    public getObstacleCount(): number {
        return this.obstacles.length;
    }
    
    // Required methods from abstract base class
    protected onTick(payload: any): void {
        // Check for fallen players and handle as needed
        // Base class already handles checkpoints and finish line
    }
    
    protected checkRoundOverConditions(): void {
        // Implement game-specific round over conditions
    }
} 