import { Entity, World, type Vector3Like, type EntityOptions, Vector3, EntityEvent, type EventPayloads, Quaternion, RigidBodyType, ColliderShape, CoefficientCombineRule, CollisionGroup, Collider } from 'hytopia';
import ObstacleEntity from './ObstacleEntity';
import type { LevelController } from '../core/LevelController';
// Define beam size options
export type BeamType = 'small' | 'large';

export interface RotatingBeamOptions {
	beamType?: BeamType;  // Size property for beam type
	rotationSpeed?: number; // degrees per second
    clockwise?: boolean;
    beamColor?: number;
    bounciness?: number; // Restitution/bounciness coefficient
}

/**
 * A rotating beam obstacle that spins continuously
 */
export default class RotatingBeamEntity extends ObstacleEntity {
    private pivotEntity: Entity | null = null;
    private rotationSpeed: number;
    private clockwise: boolean;
    private active: boolean = false;
    private currentRotation: number = 0;
	private beamType: BeamType;
    private beamColor: number;
    private bounciness: number;

    /**
     * Create a new rotating beam obstacle
     * @param options Configuration options for the beam
     */
    constructor(options: RotatingBeamOptions & EntityOptions = {}, levelController: LevelController) {
        // Determine beam size and set appropriate model
        const beamType = options.beamType || 'large';
        let modelPath = '';
        let modelScale = 5.0; // Default uniform scale
        
        // Set model path based on size
        switch (beamType) {
            case 'small':
                modelPath = 'models/obstacles/beam_small.gltf';
                break;
            case 'large':
            default:
                modelPath = 'models/obstacles/beam_large.gltf';
                break;
        }
        
        // Get bounciness value from options or use default
        const bounciness = options.bounciness ?? 0.5; // Default medium bounciness
        
        // Base entity options
        const entityOptions: EntityOptions = {
            name: `Rotating Beam (${beamType})`,
            modelUri: modelPath,
            modelScale: modelScale,
            rigidBodyOptions: {
                type: RigidBodyType.KINEMATIC_POSITION,
                // We'll set the bounciness via code after spawning
				colliders: [
					{
						// Derive shape/size from model
						...Collider.optionsFromModelUri(modelPath, modelScale),
						// Set friction properties using defaults or overrides
						friction: 0.0, // Physical friction coefficient
						frictionCombineRule: CoefficientCombineRule.Min, // How friction is combined with other objects
					}
				],
            },
            ...options
        };
        
        // Call parent constructor
        super(entityOptions, levelController);
        
        // Store configuration
        this.beamType = beamType;
        this.beamColor = options.beamColor ?? 0xff5555;
        this.rotationSpeed = options.rotationSpeed ?? 30;
        this.clockwise = options.clockwise ?? true;
        this.bounciness = bounciness;
        
        // Register event handler for spawning
        this.on(EntityEvent.SPAWN, this.onSpawned);
    }
    
    /**
     * Called when the beam is spawned
     */
    private onSpawned = (): void => {
        if (!this.isSpawned || !this.world) return;

        // Log beam properties
        console.log(`[RotatingBeamEntity] Spawned ${this.beamType} beam with bounciness: ${this.bounciness}`);
    };
    
    /**
     * Apply physics updates for rotation
     */
    public override onPhysicsUpdate(payload: EventPayloads[EntityEvent.TICK]): void {
        if (!this.active || !this.isSpawned || this.paused) return;
        
        // Calculate rotation change based on delta time
        const deltaTimeS = payload.tickDeltaMs / 1000.0;
        const rotationChange = (this.clockwise ? -1 : 1) * (this.rotationSpeed * deltaTimeS);
        this.currentRotation += rotationChange;
        
        // Calculate and set rotation
        const radians = this.currentRotation * (Math.PI / 180);
        const halfRadians = radians / 2;
        const quat = { x: 0, y: Math.sin(halfRadians), z: 0, w: Math.cos(halfRadians) };
        
        this.setNextKinematicRotation(quat);
    }

    /**
     * Start the rotation of the beam
     */
    public startRotation(): void {
        this.active = true;
    }

    /**
     * Stop the rotation of the beam
     */
    public stopRotation(): void {
        this.active = false;
    }

    /**
     * Reset the beam to its starting position
     */
    public resetState(): void {
        // First deactivate to reset the activated flag
        this.deactivate();
        
		console.log(`[RotatingBeamEntity] Resetting state ${this.name}`);
        // Reset rotation
        this.currentRotation = 0;
        this.setNextKinematicRotation({ x: 0, y: 0, z: 0, w: 1 });
    }

    /**
     * Despawn the beam and clean up
     */
    public override despawn(): void {
        this.stopRotation();
        
        if (this.pivotEntity && this.pivotEntity.isSpawned) {
            this.pivotEntity.despawn();
        }
        this.pivotEntity = null;
        
        super.despawn();
    }
    
    /**
     * Get the type of this beam
     */
    public getBeamType(): BeamType {
        return this.beamType;
    }
    
    /**
     * Get the bounciness value of this beam
     */
    public getBounciness(): number {
        return this.bounciness;
    }
    
    /**
     * Set the bounciness value and update collider if spawned
     */
    public setBounciness(value: number): void {
        this.bounciness = Math.max(0, Math.min(1, value)); // Clamp between 0 and 1
        
        // If entity is spawned, update the bounciness value
        if (this.isSpawned && this.rawRigidBody) {
            try {
                const colliders = this.rawRigidBody.colliders();
                for (const collider of colliders) {
                    if (typeof collider.setRestitution === 'function') {
                        collider.setRestitution(this.bounciness);
                    }
                }
            } catch (error) {
                console.error(`[RotatingBeamEntity] Failed to update bounciness: ${error}`);
            }
        }
    }
    
    /**
     * Override the activate method from ObstacleEntity
     * Start the beam's rotation when activated
     */
    public override activate(): void {
        // Only log and start rotation if not already activated
        if (!this.isActivated()) {
            super.activate(); // Call parent activate which will set activated=true and log
            console.log(`[RotatingBeamEntity ${this.name || this.id}] Starting rotation`);
            this.startRotation();
        }
    }
    
    /**
     * Override the deactivate method from ObstacleEntity
     * Stop the beam's rotation when deactivated
     */
    public override deactivate(): void {
        super.deactivate(); // Call parent deactivate first
        console.log(`[RotatingBeamEntity ${this.name || this.id}] Stopping rotation`);
        this.stopRotation();
    }
} 