import { type Vector3Like } from 'hytopia';
import { Team } from './enums/Team';

/**
 * Represents a 3D area in the world defined by two corner coordinates.
 */
export class AreaComponent {
	// The minimum corner of the area
	private min: Vector3Like;

	// The maximum corner of the area
	private max: Vector3Like;

	// Optional height override for the area
	private height: number | null = null;
	
	// Optional team assignment for this area
	private team: Team = Team.None;

	/**
	 * Creates a new area component.
	 * @param corner1 First corner position
	 * @param corner2 Second corner position (opposite from corner1)
	 * @param height Optional fixed height override for the area
	 * @param team Optional team assignment for this area
	 */
	constructor(corner1: Vector3Like, corner2: Vector3Like, height?: number, team: Team = Team.None) {
		// Calculate min and max for each axis
		this.min = {
			x: Math.min(corner1.x, corner2.x),
			y: Math.min(corner1.y, corner2.y),
			z: Math.min(corner1.z, corner2.z)
		};

		this.max = {
			x: Math.max(corner1.x, corner2.x),
			y: Math.max(corner1.y, corner2.y),
			z: Math.max(corner1.z, corner2.z)
		};

		if (height !== undefined) {
			this.height = height;
		}
		
		this.team = team;
	}

	/**
	 * Get the team assigned to this area
	 */
	public getTeam(): Team {
		return this.team;
	}
	
	/**
	 * Set the team for this area
	 */
	public setTeam(team: Team): void {
		this.team = team;
	}

	/**
	 * Check if a position is inside this area.
	 * @param position The position to check
	 * @returns True if the position is inside the area
	 */
	public contains(position: Vector3Like): boolean {
		return (
			position.x >= this.min.x && position.x <= this.max.x &&
			position.y >= this.min.y && position.y <= this.max.y &&
			position.z >= this.min.z && position.z <= this.max.z
		);
	}

	/**
	 * Get a random position within this area.
	 * @returns A random position within the area
	 */
	public getRandomPosition(): Vector3Like {
		const x = this.min.x + Math.random() * (this.max.x - this.min.x);

		// Use either the random Y or the fixed height
		const y = this.height !== null ?
			this.height :
			this.min.y + Math.random() * (this.max.y - this.min.y);

		const z = this.min.z + Math.random() * (this.max.z - this.min.z);

		return { x, y, z };
	}

	/**
	 * Get the center position of this area.
	 * @returns The center position of the area
	 */
	public getCenter(): Vector3Like {
		return {
			x: (this.min.x + this.max.x) / 2,
			y: this.height !== null ? this.height : (this.min.y + this.max.y) / 2,
			z: (this.min.z + this.max.z) / 2
		};
	}

	/**
	 * Get the size of this area.
	 * @returns The dimensions of the area
	 */
	public getSize(): Vector3Like {
		return {
			x: this.max.x - this.min.x,
			y: this.max.y - this.min.y,
			z: this.max.z - this.min.z
		};
	}

	/**
	 * Create an area from block coordinates.
	 * @param corner1 First block coordinate
	 * @param corner2 Second block coordinate
	 * @param height Optional fixed height
	 * @param team Optional team assignment
	 * @returns A new AreaComponent
	 */
	public static fromBlockCoordinates(
		corner1: { x: number, y: number, z: number },
		corner2: { x: number, y: number, z: number },
		height?: number,
		team: Team = Team.None
	): AreaComponent {
		return new AreaComponent(corner1, corner2, height, team);
	}
} 