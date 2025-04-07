import { BasePanel } from '../BasePanel.js';

export default class ExamplePanel extends BasePanel {
    constructor() {
        super('example-panel');
        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div id="class-select-menu" class="class-select-menu">
                <div class="class-buttons">
                    <div class="class-button wizard" data-class="wizard">
                        <div class="class-icon"></div>
                        <div class="class-info">
                            <h3>Wizard</h3>
                            <p>
                                <strong>LMB</strong><span>Fireball</span><br>
                                <strong>RMB</strong><span>Fire Darts</span><br>
                                <strong>SPACE</strong><span>Flight</span>
                            </p>
                        </div>
                    </div>
                    <div class="class-button fighter" data-class="fighter">
                        <div class="class-icon"></div>
                        <div class="class-info">
                            <h3>Barbarian</h3>
                            <p>
                                <strong>LMB</strong><span>Spirit Axe</span><br>
                                <strong>RMB</strong><span>Charge Slash</span><br>
                                <strong>SPACE</strong><span>Glide</span>
                            </p>
                        </div>
                    </div>
                    <div class="class-button archer" data-class="archer">
                        <div class="class-icon"></div>
                        <div class="class-info">
                            <h3>Archer</h3>
                            <p>
                                <strong>LMB</strong><span>Precision Shot</span><br>
                                <strong>RMB</strong><span>Fuse Bomb</span><br>
                                <strong>SPACE</strong><span>Double Jump</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.addEventListeners();
    }

    addEventListeners() {
		this.container.querySelectorAll('.class-button').forEach(button => {
			button.addEventListener('click', (e) => {
				const className = button.dataset.class;
				this.handleClassSelect(className);
			});
		});


		hytopia.onData(data => {
			if (data.type === 'SHOW_CLASS_SELECT') {

				this.openPanel();
				hytopia.sendData({
					type: 'TOGGLE_POINTER_LOCK',
					enabled: true
				});
			}
		});
    }


	handleClassSelect(className) {
		hytopia.sendData({
			type: 'CLASS_CHANGE',
			className: className
		});

		this.closePanel();

		hytopia.sendData({
			type: 'TOGGLE_POINTER_LOCK',
			enabled: false
		});
	}

    updateTarget(targetData) {
        if (!targetData) {
            this.closePanel();
            return;
        }

        this.openPanel();
        this.nameElement.textContent = targetData.name;

        if (targetData.health) {
            const healthPercent = (targetData.health.activeValue / targetData.health.max) * 100;
            this.healthFill.style.width = `${healthPercent}%`;
            this.healthText.textContent = `${Math.round(targetData.health.activeValue)}/${Math.round(targetData.health.max)}`;
        }

        if (targetData.mana) {
            const manaPercent = (targetData.mana.activeValue / targetData.mana.max) * 100;
            this.manaFill.style.width = `${manaPercent}%`;
            this.manaText.textContent = `${Math.round(targetData.mana.activeValue)}/${Math.round(targetData.mana.max)}`;
        }
    }
} 