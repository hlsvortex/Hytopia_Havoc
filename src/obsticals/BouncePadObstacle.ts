import { World, Entity, EntityEvent, RigidBodyType, ColliderShape, Vector3, type Vector3Like, type EntityOptions, type EventPayloads, CollisionGroup, PlayerEntity } from 'hytopia';
import ObstacleEntity from './ObstacleEntity';
import type { LevelController } from '../core/LevelController';
import { GameSFX } from '../sfx';
// Define bounce pad sizes
export type BouncePadSize = 'small' | 'medium' | 'large';

// Options interface for bounce pad creation
export interface BouncePadObstacleOptions {
	bounceForce?: number;      // Force to apply when bouncing players upward
	cooldownTime?: number;     // Cooldown between bounces (ms)
	size?: BouncePadSize;      // Size of the bounce pad model to use
	movementAxis?: 'x' | 'y' | 'z'; // Axis for the pad to move along (if moving)
	moveEnabled?: boolean;     // Whether the pad should move
	moveDistance?: number;     // How far the pad moves in its direction
	moveSpeed?: number;        // Speed of the movement (units per second)
}

export class BouncePadObstacle extends ObstacleEntity {
	private bounceForce: number;
	private cooldownTime: number;
	private padSize: BouncePadSize;
	private lastBounceTime: number = 0;

	// Movement properties
	private moveEnabled: boolean;
	private movementAxis: 'x' | 'y' | 'z';
	private moveDistance: number;
	private moveSpeed: number;
	private originPosition: Vector3 = new Vector3(0, 0, 0);
	private targetPosition: Vector3 = new Vector3(0, 0, 0);
	private movingForward: boolean = true;

	constructor(options: BouncePadObstacleOptions & EntityOptions = {}, levelController: LevelController, world: World) {
		// Determine pad size and select appropriate model
		const padSize = options.size || 'medium';
		let modelPath = '';
		let modelScale = 1.0; // Default uniform scale
		let colliderSize = { x: 1, y: 0.25, z: 1 }; // Default collider size

		// Set model path based on size
		switch (padSize) {
			case 'small':
				modelPath = 'models/obstacles/bounce_pad_small.gltf';
				modelScale = 5;
				colliderSize = { x: 0.8, y: 0.2, z: 0.8 };
				break;
			case 'medium':
				modelPath = 'models/obstacles/bounce_pad_medium.gltf';
				modelScale = 6.0;
				colliderSize = { x: 1, y: 0.25, z: 1 };
				break;
			case 'large':
				modelPath = 'models/obstacles/bounce_pad_large.gltf';
				modelScale = 6;
				colliderSize = { x: 1.2, y: 0.3, z: 1.2 };
				break;
			default:
				modelPath = 'models/obstacles/bounce_pad_small.gltf'; // Default fallback
				modelScale = 5;
				colliderSize = { x: 1, y: 0.25, z: 1 };
		}

		// Define default entity options
		const defaultOptions: EntityOptions = {
			name: `Bounce Pad (${padSize})`,
			modelUri: modelPath,
			modelScale: modelScale,
			rigidBodyOptions: {
				type: RigidBodyType.KINEMATIC_POSITION,
			}
		};

		super({ ...defaultOptions, ...options }, levelController);

		// Store properties
		this.padSize = padSize;
		this.bounceForce = options.bounceForce ?? 10; // Default bounce force
		this.cooldownTime = options.cooldownTime ?? 100; // Default cooldown in ms

		// Movement properties
		this.moveEnabled = options.moveEnabled ?? false;
		this.movementAxis = options.movementAxis ?? 'y';
		this.moveDistance = options.moveDistance ?? 2;
		this.moveSpeed = options.moveSpeed ?? 1;

		// Register event handlers
		this.on(EntityEvent.SPAWN, this.onSpawned);
		this.on(EntityEvent.ENTITY_CONTACT_FORCE, this.handleContactForce);
	}

	private onSpawned = (): void => {
		// Store starting position
		this.originPosition = Vector3.fromVector3Like(this.position);

		// Calculate target position based on movement axis and distance
		this.targetPosition = new Vector3(
			this.originPosition.x + (this.movementAxis === 'x' ? this.moveDistance : 0),
			this.originPosition.y + (this.movementAxis === 'y' ? this.moveDistance : 0),
			this.originPosition.z + (this.movementAxis === 'z' ? this.moveDistance : 0)
		);

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

		if(this.moveSpeed < 0) {
			const currentPos = Vector3.fromVector3Like(this.position);
			const newComponent = this.getAxisComponent(currentPos, this.movementAxis);
			this.moveSpeed = -this.moveSpeed;
			this.movingForward = false;
			
			const newPosition = new Vector3(
				this.movementAxis === 'x' ? newComponent - this.moveDistance : currentPos.x,
				this.movementAxis === 'y' ? newComponent - this.moveDistance : currentPos.y,
				this.movementAxis === 'z' ? newComponent - this.moveDistance : currentPos.z
			);

			this.setNextKinematicPosition(newPosition);
			
		}


		console.log(`[BouncePadObstacle ${this.id}] Spawned ${this.padSize} bounce pad at position: ${JSON.stringify(this.position)}`);
		console.log(`[BouncePadObstacle ${this.id}] Bounce force: ${this.bounceForce}, Movement: ${this.moveEnabled ? 'enabled' : 'disabled'}`);
	}

	private handleContactForce = (payload: EventPayloads[EntityEvent.ENTITY_CONTACT_FORCE]): void => {
		//console.log(`[BouncePadObstacle ${this.id}] Contact force detected`);
		//console.log(`[BouncePadObstacle ${this.id}] Contact force data: ${JSON.stringify(payload.contactForceData)}`);
		
		const otherEntity = payload.otherEntity;
		if (!otherEntity) return;

	
		// The entity must be a PlayerEntity
		if (otherEntity instanceof PlayerEntity && 
			 otherEntity.position.y > this.position.y) {
			
			if (otherEntity.linearVelocity.y > 0.5 + this.linearVelocity.y) {
			
				return;
			}
				// Apply upward velocity to the player
			// Apply upward velocity to the player
			const mass = otherEntity.mass;

			otherEntity.applyImpulse({
				x: 0,
				y: this.bounceForce * mass, // Multiply by mass for proper physics
				z: 0
			});
			
			if (this.worldActive) {
				this.playGameSound(GameSFX.BOUNCE_PAD, this.worldActive);
			}
		}	
	}

	private handleCollision = (payload: EventPayloads[EntityEvent.ENTITY_COLLISION]): void => {
		// Only process if activated and not on cooldown
		//if (!this.activated) return;

		///const now = Date.now();
		//if (now - this.lastBounceTime < this.cooldownTime) return;
		//console.log(`[BouncePadObstacle ${this.id}] Collision detected`);

		// Check if the other entity is a player
		const otherEntity = payload.otherEntity;
		if (!otherEntity) return;

		console.log(`[BouncePadObstacle ${this.id}] Collision detected with entity: ${otherEntity.name}`);

		// The entity must be a PlayerEntity
		if (otherEntity instanceof PlayerEntity) {
			console.log(`[BouncePadObstacle ${this.id}] Player collision detected`);

			// Apply upward velocity to the player
			const mass = otherEntity.mass;
			otherEntity.applyImpulse({
				x: payload.otherEntity.linearVelocity.x,
				y: this.bounceForce * mass, // Multiply by mass for proper physics
				z: payload.otherEntity.linearVelocity.z
			});
		}
	};

	/**
	 * Handle movement of the bounce pad if enabled
	 */
	public override onPhysicsUpdate(payload: EventPayloads[EntityEvent.TICK]): void {
		if (!this.activated || !this.moveEnabled || !this.isSpawned) return;

		const { tickDeltaMs } = payload;
		const deltaTimeS = tickDeltaMs / 1000; // Convert to seconds

		// Handle movement logic
		this.updateMovement(deltaTimeS);
	}

	/**
	 * Update the movement of the bounce pad along its configured axis
	 */
	private updateMovement(deltaTimeS: number): void {
		const currentPos = Vector3.fromVector3Like(this.position);
		const currentComponent = this.getAxisComponent(currentPos, this.movementAxis);
		const targetComponent = this.getAxisComponent(
			this.movingForward ? this.targetPosition : this.originPosition,
			this.movementAxis
		);

		// Helper to get a component value from a vector based on axis
		const distance = targetComponent - currentComponent;
		const direction = Math.sign(distance);

		if (Math.abs(distance) < 0.01) {
			// Reached target, change direction
			this.movingForward = !this.movingForward;
			return;
		}

		const moveStep = this.moveSpeed * deltaTimeS;
		const actualMove = Math.min(moveStep, Math.abs(distance));
		const newComponent = currentComponent + direction * actualMove;

		// Create new position vector
		const newPosition = new Vector3(
			this.movementAxis === 'x' ? newComponent : currentPos.x,
			this.movementAxis === 'y' ? newComponent : currentPos.y,
			this.movementAxis === 'z' ? newComponent : currentPos.z
		);

		this.setNextKinematicPosition(newPosition);
	}

	/**
	 * Helper method to get a component from a vector based on the specified axis
	 */
	private getAxisComponent(vector: Vector3Like, axis: 'x' | 'y' | 'z'): number {
		return vector[axis];
	}

	/**
	 * Override the activate method from ObstacleEntity
	 */
	public override activate(): void {
		super.activate();
		console.log(`[BouncePadObstacle ${this.id}] Activated`);
	}

	/**
	 * Override the deactivate method from ObstacleEntity
	 */
	public override deactivate(): void {
		super.deactivate();
		console.log(`[BouncePadObstacle ${this.id}] Deactivated`);
	}

	public override reset(): void {
		super.reset();
		console.log(`[BouncePadObstacle ${this.id}] Resetting state...`);
		this.setPosition(this.originPosition);
		this.movingForward = true;
		this.lastBounceTime = 0;
		console.log(`[BouncePadObstacle ${this.id}] Reset complete`);
	}
} 