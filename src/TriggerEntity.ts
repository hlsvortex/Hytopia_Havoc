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
    type ColliderOptions,
	Collider,
	BlockType
} from 'hytopia';
import { AreaComponent } from './AreaComponent';

type TriggerCallback = (playerEntity: PlayerEntity) => void;

/**
 * An invisible entity that triggers a callback when a Player enters its area.
 * Uses a sensor collider.
 */
export class TriggerEntity  {
    private area: AreaComponent;
    private onEnterCallback: TriggerCallback | null;
    private spawnPosition: Vector3Like; // Store spawn position
	private collider: Collider | null;
	public isSpawned: boolean = false;

    constructor(area: AreaComponent, onEnterCallback: TriggerCallback, name: string = 'Trigger Area', world: World) {
		
		const center = area.getCenter();
		const size = area.getSize();
		this.collider = null;
		
		this.createCollider(world, center, size);

		this.spawnPosition = center; // Store center for spawning
        
        this.area = area;

		this.onEnterCallback = onEnterCallback;

		this.spawn(world);
        //this.on(EntityEvent.SPAWN, this.onSpawned);
        // Try COLLISION_STARTED again for the event name
        //this.on(EntityEvent.ENTITY_COLLISION, this.onCollisionStarted); 
    }

	createCollider(world: World, center: Vector3Like, size: Vector3Like): void {
		this.collider = new Collider({
			shape: ColliderShape.BLOCK,
			halfExtents: { x: size.x / 2, y: size.y / 2, z: size.z / 2 },
			isSensor: true,
			// When not a child of rigid body,
			// relative position is relative to the world, 
			// equivalent to a typical world position.
			relativePosition: center,
			onCollision: (other: BlockType | Entity, started: boolean) => {

				if (other instanceof PlayerEntity && other.player) {
					if (this.onEnterCallback) {
						this.onEnterCallback(other);
					}
				}
			},
			collisionGroups: {
				belongsTo: [CollisionGroup.ENTITY_SENSOR],
				collidesWith: [CollisionGroup.PLAYER]
			}
		});
	}

	public spawn(world: World): void {
		
		if (!this.collider) {
			console.error(`[TriggerEntity  Collider is null. Cannot spawn.`);
			return;
		}

		if (!this.isSpawned) {
			this.collider.addToSimulation(world.simulation);
			this.isSpawned = true;
		}
	}


    // Use COLLISION_STARTED event payload structure (Guessing structure)
    private onCollisionStarted = (payload: EventPayloads[EntityEvent.ENTITY_COLLISION]): void => { 
        // Try accessing the other entity directly - This is a guess!
		const otherEntity = payload.otherEntity;

		//console.log(`[TriggerEntity ${this.id}] Collision started with ${otherEntity.id}`);

        if (otherEntity instanceof PlayerEntity && otherEntity.player) {
             //console.log(`[TriggerEntity ${this.id}] Player ${otherEntity.player.id} entered '${this.name}'.`);
             if (this.onEnterCallback) {
                 this.onEnterCallback(otherEntity);
             }
        }
    }

    public despawn(): void {
        //console.log(`[TriggerEntity ${this.id}] Despawning '${this.name}'.`);
        //this.off(EntityEvent.SPAWN, this.onSpawned);
		//this.off(EntityEvent.ENTITY_COLLISION, this.onCollisionStarted); // Use COLLISION_STARTED
        //super.despawn();
		this.collider?.removeFromSimulation();
		this.isSpawned = false;
	}
} 