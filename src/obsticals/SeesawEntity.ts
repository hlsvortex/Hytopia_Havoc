import { type EntityOptions, EntityEvent, type EventPayloads, RigidBodyType, Quaternion, Collider, CoefficientCombineRule } from 'hytopia';
import ObstacleEntity from './ObstacleEntity';

// --- Configuration for Seesaw Physics ---
// How strongly the seesaw tries to return to center (higher = stronger)
const SPRING_STRENGTH = 100; // Reduced strength for more natural movement
// How much the seesaw resists rotation (higher = more damping)
const DAMPING_FACTOR = 20; // Reduced damping for more natural movement
// Maximum allowed rotation angle in radians (about 35 degrees)
const MAX_ANGLE = 0.65;
// ----------------------------------------

export default class SeesawEntity extends ObstacleEntity {
	constructor(options: EntityOptions = {}) {
		// Extract potential overrides, defaulting if not provided
		const frictionOverride = options.rigidBodyOptions?.colliders?.[0]?.friction;
		const frictionCombineRuleOverride = options.rigidBodyOptions?.colliders?.[0]?.frictionCombineRule;

		const defaultFriction = 0.7;
		const defaultCombineRule = CoefficientCombineRule.Average;

		const defaultOptions: EntityOptions = {
			name: 'Seesaw',
			modelUri: 'models/obstacles/seesaw_platform.gltf',
			modelScale: 7,
			rigidBodyOptions: {
				type: RigidBodyType.DYNAMIC,
				additionalSolverIterations: 50,
				enabledPositions: { x: false, y: false, z: false },
				enabledRotations: { x: false, y: false, z: true }, // Allow only Z rotation
				// NOTE: Adding collider back based on modelddddd
				colliders: [
					{
						// Derive shape/size from model
						...Collider.optionsFromModelUri('models/obstacles/seesaw_platform.gltf', 7),
						// Set friction properties using defaults or overrides
						friction: 0.2, // Physical friction coefficient
						frictionCombineRule: CoefficientCombineRule.Min // How friction is combined with other objects
					}
				],
				// Mass and friction are often part of the collider definition or calculated automatically.
				// We will access this.mass later in the physics update.
				// Set a higher center of mass to make it less stable initially if needed
				// centerOfMass: { x: 0, y: 0.1, z: 0 }
				// Increase angular damping if it spins too freely
				angularDamping: 0.3,
				ccdEnabled: true,
			},
		};
		
		// Merge default options with any provided options
		super({ ...defaultOptions, ...options });
		
		// Register our physics update method to replace the parent class's event handler
		this.off(EntityEvent.TICK, this.onPhysicsUpdate);
		this.on(EntityEvent.TICK, this.onPhysicsUpdate);
	}

	/**
	 * Applies simple angle clamping and gentle center-returning force to the seesaw.
	 */
	public override onPhysicsUpdate = (payload: EventPayloads[EntityEvent.TICK]): void => {
		if (!this.isSpawned || !this.rawRigidBody) return;

		// Extract current Z rotation angle from quaternion
		const currentQuat = Quaternion.fromQuaternionLike(this.rotation);
		const currentZAngle = 2 * Math.asin(Math.abs(currentQuat.z)) * Math.sign(currentQuat.z);
		
		
		// Simple clamping - if beyond max angle, set rotation to max angle
		if (Math.abs(currentZAngle) > MAX_ANGLE) {
			// Clamp the angle to the maximum allowed
			const clampedAngle = MAX_ANGLE * Math.sign(currentZAngle);
			const halfAngle = clampedAngle / 2;
			
			// Create quaternion for Z-axis rotation with clamped angle
			const clampedQuat = new Quaternion(0, 0, Math.sin(halfAngle), Math.cos(halfAngle));
			
			// Set the rotation directly
			this.setRotation(clampedQuat);
		}
		
	}
} 