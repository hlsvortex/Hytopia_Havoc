import { World, PlayerEntity, Entity, type Vector3Like, Player } from 'hytopia';
import { CourseLevelController } from '../core/CourseLevelController';
import { type LevelConfiguration } from '../config/LevelConfiguration';
import { UIBridge } from '../core/UIBridge';
import RotatingBeamEntity, { type RotatingBeamOptions } from '../obsticals/RotatingBeamEntity';
import { SurvivalLevelController } from '../core/SurvivalLevelController';
import { GameManager } from '../core/GameManager';
import { Team } from '../enums/Team';

/**
 * Specialized level controller for rotating beam obstacle course levels
 */
export class JumpClubLevelController extends SurvivalLevelController {
    private beams: RotatingBeamEntity[] = [];
    private difficulty: 'easy' | 'medium' | 'hard' = 'medium';
    private lowerBeam: RotatingBeamEntity | null = null;  // Track the lower beam specifically
    private speedIncreaseInterval: NodeJS.Timeout | null = null;  // Timer for speed increases
    private speedIncreaseFactor: number = 1.2;  // Factor to multiply speed by each interval
    private baseSpeed: number = 25;  // Initial speed of lower beam
    private speedIncreaseSeconds: number = 10;  // Interval between speed increases
   
    /**
     * Create a new rotating beam level controller
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
        
        // Check if team mode is enabled in config
        //this.isTeamMode = Boolean(config.teamMode);
        //console.log(`[JumpClubLevelController] Team Mode: ${this.isTeamMode}`);
        
        // Check if config specifies custom speed increase settings
        if (config && typeof (config as any).speedIncreaseFactor === 'number') {
            this.speedIncreaseFactor = (config as any).speedIncreaseFactor;
        }
        
        if (config && typeof (config as any).speedIncreaseSeconds === 'number') {
            this.speedIncreaseSeconds = (config as any).speedIncreaseSeconds;
        }
        
        if (config && typeof (config as any).baseSpeed === 'number') {
            this.baseSpeed = (config as any).baseSpeed;
        }
    }

   
    /**
     * Activate this level - load the map and create obstacles
     */
	public override loadLevel(): void {
        this.loadMap();
        this.setupCourseBoundaries(); // Set up start area first
        this.createBeamCourse(); // Create obstacles
    }

	/**
	 * Define start areas for JumpClub level.
	 * In team mode, creates separate start areas for each team.
	 * In normal mode, creates multiple start areas for better player distribution.
	 */
	protected setupCourseBoundaries(): void {
       
		// Left area
		this.addStartArea(
			{ x: -7, y: 2, z: -12 },
			{ x: -3, y: 2, z: -8 },
			2 // Spawn Height
		);
		
		this.addStartArea(
			{ x: 13, y: 2, z: -2 },
			{ x: 10, y: 2, z: -8 },
			2 // Spawn Height
		);

		this.addStartArea(
			{ x: 14, y: 2, z: 3 },
			{ x: 10, y: 2, z: 8 },
			2 // Spawn Height
		);

		// Center area
		this.addStartArea(
			{ x: 9, y: 2, z: -13 },
			{ x: 4, y: 2, z: -8 },
			2 // Spawn Height
		);
		
		
		// Right area
		this.addStartArea(
			{ x: 8, y: 2, z: 10 },
			{ x: 3, y: 2, z: 14 },
			2 // Spawn Height
		);
		
    }

    /**
     * Get a spawn position for a player with the specified team.
     * In team mode, players spawn in their team's area.
     * In normal mode, players spawn in a random area.
     * 
     * @param team The player's team
     * @returns A spawn position
     */
    public getSpawnPositionForTeam(team: Team): Vector3Like | null {
        if (this.config.teamMode && team !== Team.None) {
            // Get a spawn position specific to the player's team
            return this.getTeamSpawnPosition(team);
        } else {
            // Get a random spawn position from any area
            return this.getStartSpawnPosition();
        }
    }

    /**
     * Create a layout of rotating beams as a course
     */
    protected createBeamCourse(): void {
        // Add the beams to the course
        console.log(`[JumpClubLevelController] Creating beam course - ${this.difficulty} difficulty`);
        
		// Upper beam - constant speed
		this.addRotatingBeam({ x: 1, y: 4, z: 1 }, {
			beamType: 'large',
			rotationSpeed: 12,
			clockwise: true,
			beamColor: 0x3498db // Blue
		});
		
		// Lower beam - will increase in speed
		this.lowerBeam = this.addRotatingBeam({ x: 1, y: 1.8, z: 1 }, {
			beamType: 'small',
			rotationSpeed: this.baseSpeed,
			clockwise: false,
			beamColor: 0xe74c3c // Red
		});
		
        console.log(`[JumpClubLevelController] Created beam course with ${this.beams.length} beams`);
	}

    /**
     * Add a single rotating beam at the specified position
     * @param position Position to place the beam
     * @param options Configuration options for the beam
     */
    public addRotatingBeam(position: Vector3Like, options: Partial<RotatingBeamOptions> = {}): RotatingBeamEntity {
        // Create the beam entity
        const beam = new RotatingBeamEntity({
            rotationSpeed: options.rotationSpeed,
            clockwise: options.clockwise,
            beamType: options.beamType || 'large',
            beamColor: options.beamColor
        }, this);
        
        // Spawn it in the world
        beam.spawn(this.world, position);
        
        // Store it in the array for later reference
        this.beams.push(beam);
        
        // Register the beam as an obstacle with the level controller
        this.registerObstacle(beam);
        //console.log(`[JumpClubLevelController] Registered beam obstacle: ${beam.id}`);
        
        return beam;
    }

    /**
     * Reset all beams to their default state
     */
    public override resetObstacles(): void {
        //console.log(`[JumpClubLevelController] Resetting ${this.beams.length} beams`);
        for (const beam of this.beams) {
            if (beam.isSpawned) {
                beam.resetState();
            }
        }
        
        // Reset the lower beam speed to initial value
        if (this.lowerBeam && this.lowerBeam.isSpawned) {
            this.lowerBeam.setRotationSpeed(this.baseSpeed);
        }
    }

    /**
     * Start the round and setup the speed increase interval
     */
    public override startRound(players: Player[], qualificationTarget: number): void {
        console.log(`[JumpClubLevelController] Starting round with ${players.length} players. Target: ${qualificationTarget}`);
        super.startRound(players, qualificationTarget);
		this.setPausePlayersIds(Array.from(this.startingPlayerIds), true);
        this.resetObstacles();
        
        // Start the speed increase interval
        this.startSpeedIncreaseInterval();
    }
    
    /**
     * Begin gameplay and activate obstacles
     */
    public override beginGameplay(): void {
        super.beginGameplay();
        
        // Make sure speed increase is active when gameplay begins
        this.startSpeedIncreaseInterval();
    }
    
    /**
     * Start the interval to periodically increase the lower beam speed
     */
    private startSpeedIncreaseInterval(): void {
        // Clear any existing interval first
        this.clearSpeedIncreaseInterval();
        
        // Setup new interval
        this.speedIncreaseInterval = setInterval(() => {
            this.increaseBeamSpeed();
        }, this.speedIncreaseSeconds * 1000);
        
        console.log(`[JumpClubLevelController] Speed increase interval started (every ${this.speedIncreaseSeconds} seconds)`);
    }
    
    /**
     * Clear the speed increase interval
     */
    private clearSpeedIncreaseInterval(): void {
        if (this.speedIncreaseInterval) {
            clearInterval(this.speedIncreaseInterval);
            this.speedIncreaseInterval = null;
            console.log('[JumpClubLevelController] Speed increase interval cleared');
        }
    }
    
    /**
     * Increase the speed of the lower beam
     */
    private increaseBeamSpeed(): void {
        if (!this.lowerBeam || !this.lowerBeam.isSpawned) return;
        
        // Get current speed
        const currentSpeed = this.lowerBeam.getRotationSpeed();
        
        // Calculate new speed
        const newSpeed = currentSpeed * this.speedIncreaseFactor;
        
        // Set the new speed
        this.lowerBeam.setRotationSpeed(newSpeed);
        
        console.log(`[JumpClubLevelController] Lower beam speed increased: ${currentSpeed.toFixed(1)} → ${newSpeed.toFixed(1)} degrees/sec`);
    }

    /**
     * Clean up the level
     */
	public override cleanup(): void {
        console.log(`[JumpClubLevelController] Cleaning up level`);
        
        // Clear the speed increase interval
        this.clearSpeedIncreaseInterval();
        
        // First cleanup local resources
        if (this.beams.length > 0) {
            console.log(`[JumpClubLevelController] Despawning ${this.beams.length} beams`);
            this.beams.forEach(beam => {
                if (beam.isSpawned) {
                    beam.despawn();
                }
            });
            this.beams = [];
        }
        
        // Reset reference to lower beam
        this.lowerBeam = null;
        
        // Then call parent class cleanup
        console.log(`[JumpClubLevelController] Calling SurvivalLevelController cleanup`);
        super.cleanup();
        
        console.log(`[JumpClubLevelController] Cleanup complete`);
    }

    /**
     * Get the number of beams in this level
     */
    public getBeamCount(): number {
        return this.beams.length;
    }
} 