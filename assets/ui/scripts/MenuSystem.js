import { MenuType } from './MenuType.js';
import ExamplePanel from './panels/ExamplePanel.js';
import MainMenuPanel from './panels/MainMenuPanel.js';
import LevelSelectPanel from './panels/LevelSelectPanel.js';
import HudPanel from './panels/HudPanel.js';
import AnimatedTextPanel from './panels/AnimatedTextPanel.js';

export class MenuSystem {
    constructor() {
        this.panels = new Map();
        this.setupPanelContainer();
        this.registerPanels();
        this.initGlobalListeners();

		//this.openMenu(MenuType.CLASS_SELECT);
		//this.openMenu(MenuType.HUD);
        this.openMenu(MenuType.MAIN_MENU, true);

        // Add timeout to ensure DOM is ready
        setTimeout(() => {
            this.openMenu(MenuType.MAIN_MENU, true);
        }, 1000);
        
        // Initialize cursor manager
        console.log('MenuSystem initialized with CursorManager');
    }
    
    setupPanelContainer() {
        // Get or create the panel container
        this.panelContainer = document.getElementById('panels-container');
        if (!this.panelContainer) {
            this.panelContainer = document.createElement('div');
            this.panelContainer.id = 'panels-container';
            this.panelContainer.className = 'panels-container';
            document.body.appendChild(this.panelContainer);
        }
    }

    registerPanels() {
        // Register HUD panels (always visible when in-game)
       
        // Register Main Menu panel
        this.registerPanel(
            MenuType.MAIN_MENU,
            new MainMenuPanel()
        );
        
        // Register Level Select panel
        this.registerPanel(
            MenuType.LEVEL_SELECT,
            new LevelSelectPanel()
        );
        
        // Register HUD Panel
        this.registerPanel(
            MenuType.HUD,
            new HudPanel()
        );
        
        // Register Animated Text Panel
        this.registerPanel(
            MenuType.ANIMATED_TEXT,
            new AnimatedTextPanel()
        );
	
		/*
		this.registerPanel(
			MenuType.CLASS_SELECT,
			new ClassSelectPanel()
		);
		*/
        /*
        this.registerPanel(MenuType.HUD, [
            new PlayerStatusPanel(),
            new CapturePointPanel(),
            new GameStatusPanel(),
            new CrosshairPanel()
        ]);
        this.registerPanel(
            MenuType.ROUND_WINNER,
            new RoundWinnerPanel()
        );
        this.registerPanel(
            MenuType.MATCH_STATS,
            new MatchStatsPanel()
        );
        */
    }

    registerPanel(menuType, ...panels) {
        if (!this.panels.has(menuType)) {
            this.panels.set(menuType, []);
        }
        
        this.panels.get(menuType).push(...panels);
    }

    openMenu(menuType, closeOtherMenus = false) {
        console.log(`Opening menu: ${menuType}`);

        if (closeOtherMenus) {
            this.closeAllMenusExcept(menuType);
        }

        const panels = this.panels.get(menuType) || [];
        for (const panel of panels) {
            if (!panel.ignoreMenuControls) {
                panel.openPanel();
            }
        }
    }

    closeMenu(menuType) {
        console.log(`Closing menu: ${menuType}`);
        const panels = this.panels.get(menuType) || [];
        for (const panel of panels) {
            panel.closePanel();
        }
    }

    closeAllMenus() {
        this.panels.forEach((panels, menuType) => {
            if (menuType !== MenuType.HUD) { // Don't close HUD panels
                panels.forEach(panel => panel.closePanel());
            }
        });
    }
    
    closeAllMenusExcept(exceptMenuType) {
        this.panels.forEach((panels, menuType) => {
            if (menuType !== MenuType.HUD && menuType !== exceptMenuType) {
                panels.forEach(panel => panel.closePanel());
            }
        });
    }

    initGlobalListeners() {
        console.log('Setting up global listeners');
        
        // Add global key listeners for menu navigation
        document.addEventListener('keydown', (e) => {
            // Handle Escape key for closing menus
            if (e.key === 'Escape') {
                // Close all menus except HUD
                this.closeAllMenus();
                return;
            }
        });
        
        // Prevent cursor locking when clicking on UI elements
        document.addEventListener('click', (e) => {
            // Check if the click is on a UI element
            //const isUIClick = e.target.closest('.inventory-ui, .equipment-ui, .loot-ui');
            /*
            if (isUIClick) {
                // Prevent the click from propagating to the document
              //  e.stopPropagation();
            }
            */
        }, true); // Use capture phase to intercept before other handlers
    }

    toggleMenu(menuType) {
        console.log(`Toggling menu: ${menuType}`);
        
        // Check if any panel in this menu is open
        const panels = this.panels.get(menuType) || [];
        const isAnyPanelOpen = panels.some(panel => panel.isOpen);
        
        if (isAnyPanelOpen) {
            this.closeMenu(menuType);
        } else {
            this.openMenu(menuType);
        }
    }
}

// Initialize the menu system
window.menuSystem = new MenuSystem();
console.log('MenuSystem instance created:', window.menuSystem);
