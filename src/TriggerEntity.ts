import { 
    World, 
    Entity, 
    EntityEvent, 
    RigidBodyType, 
    ColliderShape, 
    Vector3, 
    type Vector3Like, 
    type EntityOptions, 
    type EventPayloads, 
    CollisionGroup, 
    PlayerEntity, 
    Player,
    type ColliderOptions 
} from 'hytopia';
import { AreaComponent } from './AreaComponent';

type TriggerCallback = (playerEntity: PlayerEntity) => void;

/**
 * An invisible entity that triggers a callback when a Player enters its area.
 * Uses a sensor collider.
 */
export class TriggerEntity extends Entity {
    private area: AreaComponent;
    private onEnterCallback: TriggerCallback;
    private spawnPosition: Vector3Like; // Store spawn position

    constructor(area: AreaComponent, onEnterCallback: TriggerCallback, name: string = 'Trigger Area') {
		
		const center = area.getCenter();
		const size = area.getSize();

		const colliderOpts: ColliderOptions = {
			shape: ColliderShape.BLOCK, // Try uppercase BOX again
			halfExtents: { x: size.x / 2, y: size.y / 2, z: size.z / 2 },
			isSensor: true,
			collisionGroups: {
				belongsTo: [CollisionGroup.ENTITY_SENSOR],
				collidesWith: [CollisionGroup.PLAYER]
			}
		};
		
		const entityOptions: EntityOptions = {
			name: name,
			modelUri: 'models/empty.gltf',
			// Position removed from here, set on spawn
			rigidBodyOptions: {
				type: RigidBodyType.KINEMATIC_POSITION,
				colliders: [colliderOpts]
			},
		};

		super(entityOptions);

		this.spawnPosition = center; // Store center for spawning
        
        this.area = area;
        this.onEnterCallback = onEnterCallback;

        this.on(EntityEvent.SPAWN, this.onSpawned);
        // Try COLLISION_STARTED again for the event name
        this.on(EntityEvent.ENTITY_COLLISION, this.onCollisionStarted); 
    }

    private onSpawned = (): void => {
        // Set position when spawned using the stored value
        this.setPosition(this.spawnPosition); 
        console.log(`[TriggerEntity ${this.id}] '${this.name}' spawned at ${JSON.stringify(this.position)}`);
    }

    // Use COLLISION_STARTED event payload structure (Guessing structure)
    private onCollisionStarted = (payload: EventPayloads[EntityEvent.ENTITY_COLLISION]): void => { 
        // Try accessing the other entity directly - This is a guess!
		const otherEntity = payload.otherEntity;

		console.log(`[TriggerEntity ${this.id}] Collision started with ${otherEntity.id}`);

        if (otherEntity instanceof PlayerEntity && otherEntity.player) {
             console.log(`[TriggerEntity ${this.id}] Player ${otherEntity.player.id} entered '${this.name}'.`);
             if (this.onEnterCallback) {
                 this.onEnterCallback(otherEntity);
             }
        }
    }

    public override despawn(): void {
        console.log(`[TriggerEntity ${this.id}] Despawning '${this.name}'.`);
        this.off(EntityEvent.SPAWN, this.onSpawned);
		this.off(EntityEvent.ENTITY_COLLISION, this.onCollisionStarted); // Use COLLISION_STARTED
        super.despawn();
    }
} 