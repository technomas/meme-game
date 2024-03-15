import { Container, NineSlicePlane, Sprite, Texture } from 'pixi.js';
import { navigation } from '../utils/navigation';
import { GameScreen } from './GameScreen';
import gsap from 'gsap';
import { i18n } from '../utils/i18n';
import { LargeButton } from '../ui/LargeButton';
import { registerCustomEase } from '../utils/animation';
import { waitFor } from '../utils/asyncUtils';
import { RippleButton } from '../ui/RippleButton';
import { InfoPopup } from '../popups/InfoPopup';
import { SettingsPopup } from '../popups/SettingsPopup';
import { bgm } from '../utils/audio';
import { app } from '../main';
import { Label } from '../ui/Label';
import { SmokeCloud } from '../ui/SmokeCloud';

/** Custom ease curve for y animation of the base to reveal the screen */
const easeSoftBackOut = registerCustomEase(
    'M0,0,C0,0,0.05,0.228,0.09,0.373,0.12,0.484,0.139,0.547,0.18,0.654,0.211,0.737,0.235,0.785,0.275,0.864,0.291,0.896,0.303,0.915,0.325,0.944,0.344,0.97,0.356,0.989,0.38,1.009,0.413,1.039,0.428,1.073,0.604,1.074,0.72,1.074,0.822,1.035,0.91,1.011,0.943,1.002,1,1,1,1',
);

/** The first screen that shows up after loading */
export class CouponScreen extends Container {
    /** Assets bundles required by this screen */
    public static assetBundles = ['home', 'common'];
    /** Button that leads to gameplay */
    private playButton: LargeButton;
    private exitButton: LargeButton;
    /** Button that opens the info panel */
    private infoButton: RippleButton;
    /** Button that opens the settings panel */
    private settingsButton: RippleButton;
    /** The footer base, also used for transition in */
    private base: NineSlicePlane;
    /** The centered box area containing the results */
    private panel: Container;
    /** The panel background */
    private panelBase: Sprite;
    /** The current game mode label */
    private mode: Label;
    /** The cloud animation at the top */
    private cloud: SmokeCloud;

    constructor() {
        super();

        this.cloud = new SmokeCloud();
        this.addChild(this.cloud);

        this.base = new NineSlicePlane(Texture.from('rounded-rectangle'), 32, 32, 32, 32);
        this.base.tint = 0x6aa84f;
        this.addChild(this.base);

        this.infoButton = new RippleButton({
            image: 'icon-info',
            ripple: 'icon-info-stroke',
        });
        this.infoButton.onPress.connect(() => navigation.presentPopup(InfoPopup));
        this.addChild(this.infoButton);

        this.settingsButton = new RippleButton({
            image: 'icon-settings',
            ripple: 'icon-settings-stroke',
        });
        this.settingsButton.onPress.connect(() => navigation.presentPopup(SettingsPopup));
        this.addChild(this.settingsButton);

        this.playButton = new LargeButton({ text: i18n.playButton });
        this.playButton.onPress.connect(() => navigation.showScreen(GameScreen));
        this.addChild(this.playButton);

        this.panel = new Container();
        this.addChild(this.panel);

        this.panelBase = Sprite.from('result-base');
        this.panelBase.anchor.set(0.5);
        this.panel.addChild(this.panelBase);

        this.mode = new Label('Сюда что-то пишем и меняем цвет блоку', { fill: 0x000, fontSize: 12 });
        this.mode.y = -140;
        this.mode.alpha = 0.5;
        this.panel.addChild(this.mode);

        this.exitButton = new LargeButton({ text: 'exit' });
        this.exitButton.onPress.connect(async () => {
            await this.hidePanel();
            this.playButton.hide();
            // Make the cloud cover the entire screen in a flat colour
            gsap.killTweensOf(this.cloud);
            await gsap.to(this.cloud, {
                height: app.renderer.height,
                duration: 1,
                ease: 'quad.in',
                delay: 0.5,
            });
            window.parent.postMessage('showCoupons', "*")
        });
        this.panel.addChild(this.exitButton);
    }

    /** Resize the screen, fired whenever window size changes  */
    public resize(width: number, height: number) {
        this.playButton.x = width * 0.5;
        this.playButton.y = height - 130;
        this.base.width = width;
        this.base.y = height - 140;
        this.infoButton.x = 30;
        this.infoButton.y = 30;
        this.settingsButton.x = width - 30;
        this.settingsButton.y = 30;
        this.panel.x = width * 0.5;
        this.panel.y = height * 0.5;
        this.cloud.y = 0;
        this.cloud.width = width;
    }

    /** Show screen with animations */
    public async show() {
        bgm.play('common/bgm-main.mp3', { volume: 0.7 });

        // Reset visual state, hide things that will show up later
        this.playButton.hide(false);
        this.exitButton.hide(false);
        this.infoButton.hide(false);
        this.settingsButton.hide(false);

        await this.showPanel();

        // Play reveal animation
        this.playRevealAnimation();

        // Show remaining components in sequence
        await waitFor(0.5);
        await this.playButton.show();
        await this.exitButton.show();
        this.interactiveChildren = true;
        // this.infoButton.show();
        await this.settingsButton.show();
    }

    /** Hide screen with animations */
    public async hide() {
        this.playButton.hide();
        this.exitButton.hide();
        this.infoButton.hide();
        await waitFor(0.1);
        gsap.to(this.base.pivot, { y: -200, duration: 0.3, ease: 'back.in' });
        await waitFor(0.1);
        await this.hidePanel();
        await waitFor(0.1);
    }

    /** Animation for revealing the screen behind the purple sprite */
    private async playRevealAnimation() {
        const duration = 1;
        const ease = easeSoftBackOut;

        gsap.killTweensOf(this.base);
        gsap.killTweensOf(this.base.pivot);

        // Make the flat colour base cover the entire screen, matching the visual state
        // left from loading screen
        this.base.height = navigation.height * 1.25;
        this.base.pivot.y = navigation.height;

        // Animate it to uncover the screen and rest at the bottom
        gsap.to(this.base, {
            height: 200,
            duration,
            ease,
        });
        await gsap.to(this.base.pivot, {
            y: 0,
            duration,
            ease,
        });
    }

    /** Show the container box panel animated */
    private async showPanel() {
        gsap.killTweensOf(this.panel.scale);
        this.panel.visible = true;
        this.panel.scale.set(0);
        await gsap.to(this.panel.scale, {
            x: 1,
            y: 1,
            duration: 0.4,
            ease: 'back.out',
        });
    }

    /** Hide the container box panel animated */
    private async hidePanel() {
        gsap.killTweensOf(this.panel.scale);
        await gsap.to(this.panel.scale, {
            x: 0,
            y: 0,
            duration: 0.3,
            ease: 'back.in',
        });
    }
}
