import { World, Player, PlayerEntity, type Vector3Like } from 'hytopia';
import { LevelController } from './LevelController';
import { type LevelConfiguration } from '../config/LevelConfiguration';
import { AreaComponent } from '../AreaComponent'; // Import AreaComponent

export abstract class CourseLevelController extends LevelController {
    protected startArea: AreaComponent | null = null;
    protected finishArea: AreaComponent | null = null;
    protected checkpoints: AreaComponent[] = [];
    
    constructor(world: World, config: LevelConfiguration) {
        super(world, config);
        this.setupCourseBoundaries(); // Call method to set up areas
    }
    
    /**
     * Abstract method for subclasses to define their specific start/finish areas.
     * This is called automatically by the constructor.
     */
    protected abstract setupCourseBoundaries(): void;

    /**
     * Defines the starting area for the course.
     * @param corner1 One corner of the starting area.
     * @param corner2 The opposite corner of the starting area.
     * @param spawnHeight Optional fixed Y-level for spawning within the area.
     */
    protected setStartArea(corner1: Vector3Like, corner2: Vector3Like, spawnHeight?: number): void {
        this.startArea = new AreaComponent(corner1, corner2, spawnHeight);
        console.log(`[${this.constructor.name}] Start area set.`);
    }

    /**
     * Defines the finish area for the course.
     * @param corner1 One corner of the finish area.
     * @param corner2 The opposite corner of the finish area.
     */
    protected setFinishArea(corner1: Vector3Like, corner2: Vector3Like): void {
        this.finishArea = new AreaComponent(corner1, corner2);
        console.log(`[${this.constructor.name}] Finish area set.`);
    }

    /**
     * Adds a checkpoint area to the course.
     * @param corner1 One corner of the checkpoint area.
     * @param corner2 The opposite corner of the checkpoint area.
     * @param respawnHeight Optional fixed Y-level for respawning within this checkpoint.
     */
    protected addCheckpointArea(corner1: Vector3Like, corner2: Vector3Like, respawnHeight?: number): void {
        const checkpoint = new AreaComponent(corner1, corner2, respawnHeight);
        this.checkpoints.push(checkpoint);
        console.log(`[${this.constructor.name}] Checkpoint area ${this.checkpoints.length} added.`);
    }

    /**
     * Gets a random spawn position within the defined start area.
     * @returns A spawn position or null if start area is not defined.
     */
    public getSpawnPosition(): Vector3Like | null {
        return this.startArea ? this.startArea.getRandomPosition() : null;
    }

    /**
     * Checks if a given position is within the finish area.
     * @param position The position to check.
     * @returns True if the position is inside the finish area, false otherwise.
     */
    public isInFinishArea(position: Vector3Like): boolean {
        return this.finishArea ? this.finishArea.contains(position) : false;
    }

    /**
     * Finds the appropriate checkpoint respawn position for a given player position.
     * Iterates through checkpoints in reverse order (latest checkpoint first).
     * @param playerPosition The current position of the player.
     * @returns The respawn position of the last checkpoint the player passed, or the start area spawn position if none found.
     */
    public getCheckpointRespawnPosition(playerPosition: Vector3Like): Vector3Like | null {
        for (let i = this.checkpoints.length - 1; i >= 0; i--) {
            // Simple check: Has the player moved past the center Z of the checkpoint?
            // More robust checks might be needed depending on level layout.
            if (playerPosition.z > this.checkpoints[i].getCenter().z) {
                return this.checkpoints[i].getRandomPosition();
            }
        }
        // If no checkpoint passed, return start area spawn
        return this.getSpawnPosition(); 
    }
    
     // Override cleanup to potentially clear areas (though AreaComponent has no despawn)
    public cleanup(): void {
        super.cleanup(); // Call base cleanup first (clears map etc)
        this.startArea = null;
        this.finishArea = null;
        this.checkpoints = [];
        console.log(`[${this.constructor.name}] Course areas cleared.`);
    }
    
    // Ensure subclasses implement startRound
    abstract startRound(players: Player[]): void;

} 