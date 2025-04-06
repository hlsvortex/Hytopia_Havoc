export class BasePanel {
	constructor(containerId) {
		this.checkContainer(containerId);
		console.log('BaseMenu container element:', this.container);
		this.isOpen = false;
		this.ignoreMenuControls = false;
	}

	checkContainer(containerId) {
		this.container = document.getElementById(containerId);

		if (!this.container) {
			this.container = document.createElement('div');
			this.container.id = containerId;
			
			// Check if this is a panel that should go in the game panels container
			if (['inventory-panel', 'equipment-panel', 'loot-panel', 'loot-ui'].includes(containerId)) {
				const panelContainer = document.getElementById('game-panels-container');
				if (panelContainer) {
					panelContainer.appendChild(this.container);
				} else {
					document.body.appendChild(this.container);
				}
			} else {
				document.body.appendChild(this.container);
			}
		}
	}

	togglePanel() {
		this.isOpen ? this.closePanel() : this.openPanel();
	}

	openPanel() {
		if (!this.container) return;
		this.container.style.display = 'block';
		this.isOpen = true;
	}

	closePanel() {
		if (!this.container) return;
		this.container.style.display = 'none';
		this.isOpen = false;
	}
} 