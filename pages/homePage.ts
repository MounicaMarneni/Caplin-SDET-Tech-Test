import { Page, Locator } from '@playwright/test';

export class HomePage {
    readonly page: Page;
    readonly marketsHeader: Locator;
    readonly ftse100Button: Locator;
    readonly ftseHeroTitle: Locator;
    readonly cookiesButton: Locator;

    constructor(page:Page) {
        this.page = page;
        this.marketsHeader = page.locator('h2.bold-font-weight.title');
        this.ftse100Button = page.getByRole('link', { name: 'View FTSE' });
        this.marketsHeader = page.locator('h2.bold-font-weight.title');
        this.ftseHeroTitle = page.locator('//h1[contains(@class, "ftse-hero-title font-bold")]');
        this.cookiesButton = page.getByRole('button', { name: 'Accept all cookies' });
    }

    async goto() {
        await this.page.goto('https://www.londonstockexchange.com/');
        await this.page.waitForLoadState('networkidle');

        // Handle cookies popup
        if (await this.cookiesButton.isVisible()) {
            await this.cookiesButton.click();
        }
    }
    
}