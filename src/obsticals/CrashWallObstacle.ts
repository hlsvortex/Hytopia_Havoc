import { World, Entity, EntityEvent, RigidBodyType, ColliderShape, Vector3, type Vector3Like, type EntityOptions, type EventPayloads, CollisionGroup } from 'hytopia';
import * as path from 'path';
import ObstacleEntity from './ObstacleEntity'; // Import the parent class
import type { LevelController } from '../core/LevelController';

// Define possible states for the wall's movement cycle
type MovementState = 'DELAYING' | 'MOVING_UP' | 'WAITING_TOP' | 'MOVING_DOWN' | 'WAITING_BOTTOM';

// Define the wall size options
type WallSize = 'small' | 'medium' | 'large';

// Interface for custom options, doesn't need to extend EntityOptions here
export interface CrashWallObstacleOptions {
	startDelay?: number;    // Delay before starting the first movement cycle (ms)
	moveDistance?: number;  // How far the wall moves down/up from its origin
	moveSpeed?: number;     // Speed of the up/down movement (units per second)
	waitTime?: number;      // Time to wait at the top position (ms)
	size?: WallSize;        // Size of the wall model to use (small, medium, large)
}

// Extend ObstacleEntity instead of Entity
export class CrashWallObstacle extends ObstacleEntity {
	private startDelay: number;
	private moveDistance: number;
	private moveSpeed: number;
	private waitTime: number;
	private bottomWaitTime: number;
	private wallSize: WallSize;

	private originPosition: Vector3 = new Vector3(0, 0, 0);
	private targetPosition: Vector3 = new Vector3(0, 0, 0);
	private downPosition: Vector3 = new Vector3(0, 0, 0);
	private movementState: MovementState = 'DELAYING';
	private timeAccumulator: number = 0;
	private isMovementActive: boolean = false;

	constructor(options: CrashWallObstacleOptions & EntityOptions = {}, levelController: LevelController) {
		// Determine wall size and select appropriate model
		const wallSize = options.size || 'medium';
		let modelPath = '';
		let modelScale = 7.5; // Default scale
		
		// Set model path based on size
		switch (wallSize) {
			case 'small':
				modelPath = 'models/obstacles/crash_wall_small_obstical.gltf';
				modelScale = 6.0;
				break;
			case 'medium':
				modelPath = 'models/obstacles/crash_wall_med_obstical.gltf';
				modelScale = 7.5;
				break;
			case 'large':
				modelPath = 'models/obstacles/crash_wall_large_obstical.gltf';
				modelScale = 9.0;
				break;
			default:
				modelPath = 'models/obstacles/crash_wall_obstical.gltf'; // Fallback to original
				modelScale = 7.5;
		}
		
		const defaultOptions: EntityOptions = {
			name: `Crash Wall (${wallSize})`,
			modelUri: modelPath,
			modelScale: modelScale,
			rigidBodyOptions: {
				type: RigidBodyType.KINEMATIC_POSITION,
			},
		};

		super({ ...defaultOptions, ...options }, levelController); // Call ObstacleEntity constructor
		
		// Store the size AFTER super() call
		this.wallSize = wallSize;

		// Initialize custom properties
		this.startDelay = options.startDelay ?? 0;
		this.moveDistance = options.moveDistance ?? 3;
		this.moveSpeed = options.moveSpeed ?? 2;
		this.waitTime = options.waitTime ?? 1000; // Wait time at the top
		this.bottomWaitTime = options.waitTime ?? 1000; // Use same waitTime for bottom by default

		this.on(EntityEvent.SPAWN, this.onSpawned);
	}

	private onSpawned = (): void => {
		// Store starting position as top position
		this.originPosition = Vector3.fromVector3Like(this.position);

		// Calculate downPosition with guaranteed move distance
		this.downPosition = new Vector3(
			this.originPosition.x,
			this.originPosition.y - this.moveDistance, // Force downPosition to be lower
			this.originPosition.z
		);

		// Initialize state
		this.movementState = 'DELAYING';
		this.timeAccumulator = 0;
		this.isMovementActive = true;

		// Set collision groups
		this.setCollisionGroupsForSolidColliders(
			{
				belongsTo: [CollisionGroup.ENTITY],
				collidesWith: [
					CollisionGroup.ENTITY,
					CollisionGroup.PLAYER,
					CollisionGroup.ENTITY_SENSOR
				]
			}
		);

		this.rawRigidBody.friction = 0;

		// Log spawn with size info
		console.log(`[CrashWallObstacle ${this.id}] Spawned ${this.wallSize} wall at position: ${JSON.stringify(this.position)}`);
		console.log(`[CrashWallObstacle ${this.id}] Origin: ${JSON.stringify(this.originPosition)}, Down: ${JSON.stringify(this.downPosition)}`);
	}

	// Define as a standard method with override
	public override onPhysicsUpdate(payload: EventPayloads[EntityEvent.TICK]): void {
		if (!this.isMovementActive || !this.isSpawned || this.paused) return;

		const deltaTimeS = payload.tickDeltaMs / 1000.0;
		this.timeAccumulator += payload.tickDeltaMs;

		const previousState = this.movementState;
		let stateChanged = false; // Flag to log only on change

		switch (this.movementState) {
			case 'DELAYING':
				if (this.timeAccumulator >= this.startDelay) {
					this.movementState = 'MOVING_DOWN'; // Start by ensuring it's down
					this.targetPosition = this.downPosition;
					this.timeAccumulator = 0;
					stateChanged = true;
				}
				break;

			case 'MOVING_UP':
			    // Log position during upward movement
			    // console.log(`[${this.id}] Moving Up: y=${this.position.y.toFixed(2)}, target=${this.targetPosition.y.toFixed(2)}`);
				if (this.moveTowards(this.targetPosition, deltaTimeS)) {
				    // Reached Target (Top)
					this.movementState = 'WAITING_TOP';
					this.timeAccumulator = 0;
					stateChanged = true;
				}
				break;

			case 'WAITING_TOP':
				if (this.timeAccumulator >= this.waitTime) {
					this.movementState = 'MOVING_DOWN';
					this.targetPosition = this.downPosition;
					this.timeAccumulator = 0;
					stateChanged = true;
				}
				break;

			case 'MOVING_DOWN':
			    const distToBottom = Math.abs(this.position.y - this.downPosition.y);
			    // Log position and distance during downward movement
			    // console.log(`[${this.id}] Moving Down: y=${this.position.y.toFixed(2)}, target=${this.targetPosition.y.toFixed(2)}, dist=${distToBottom.toFixed(2)}`);
			    
				if (distToBottom < 0.05) { // Use a small threshold
				    // Reached Target (Bottom)
					this.movementState = 'WAITING_BOTTOM';
					this.timeAccumulator = 0;
					stateChanged = true;
				} else {
					this.moveTowards(this.targetPosition, deltaTimeS);
				}
				break;

			case 'WAITING_BOTTOM':
				if (this.timeAccumulator >= this.bottomWaitTime) {
					this.movementState = 'MOVING_UP';
					this.targetPosition = this.originPosition;
					this.timeAccumulator = 0;
					stateChanged = true;
				}
				break;
		}

	}

	private moveTowards(target: Vector3Like, deltaTimeS: number): boolean {
		const currentPos = Vector3.fromVector3Like(this.position);
		const targetY = target.y;
		const currentY = currentPos.y;
		const distanceY = targetY - currentY;
		const directionY = Math.sign(distanceY);
	
		if (Math.abs(distanceY) < 0.01) { // Reduced threshold slightly
		    // Snap to exact target position if very close to prevent overshooting
		    if (currentY !== targetY) { 
		        this.setNextKinematicPosition(new Vector3(currentPos.x, targetY, currentPos.z));
		    }
			return true; // Already at target
		}

		const moveStep = this.moveSpeed * deltaTimeS;
		let actualMoveDistance = Math.min(moveStep, Math.abs(distanceY));
		const newY = currentY + directionY * actualMoveDistance;
		
		let finalY = newY;
		let reachedTargetThisFrame = false;
		// Check if the new position has passed or reached the target
		if ((directionY > 0 && newY >= targetY) || (directionY < 0 && newY <= targetY)) {
			finalY = targetY; // Snap to target if passed
			actualMoveDistance = Math.abs(distanceY); // Ensure we didn't move more than needed
			reachedTargetThisFrame = true;
		}

		const newPosition = new Vector3(currentPos.x, finalY, currentPos.z);
		this.setNextKinematicPosition(newPosition);

		return reachedTargetThisFrame;
	}

	public stopMovement(): void {
		this.isMovementActive = false;
		console.log(`[CrashWallObstacle ${this.id}] Movement stopped.`);
	}

	/**
	 * Override the activate method from ObstacleEntity
	 * Start the wall's movement cycle when activated
	 */
	public override activate(): void {
		super.activate(); // Call parent activate first
		console.log(`[CrashWallObstacle ${this.id}] Activated - starting movement cycle`);
		this.isMovementActive = true;
	}
	
	/**
	 * Override the deactivate method from ObstacleEntity
	 * Stop the wall's movement when deactivated
	 */
	public override deactivate(): void {
		super.deactivate(); // Call parent deactivate first
		console.log(`[CrashWallObstacle ${this.id}] Deactivated - stopping movement`);
		this.stopMovement();
	}

	public resetState(): void {
		if (!this.isSpawned) return;
		console.log(`[CrashWallObstacle ${this.id}] Resetting state...`); // Log reset
		this.setPosition(this.downPosition); // Ensure starting down
		this.movementState = 'DELAYING';
		this.timeAccumulator = 0;
		this.isMovementActive = true; // Ensure movement is re-enabled
		console.log(`[CrashWallObstacle ${this.id}] State reset complete. Pos y: ${this.position.y.toFixed(2)}, State: ${this.movementState}`);
	}

	public override despawn(): void {
		this.stopMovement();
		super.despawn();
	}
} 