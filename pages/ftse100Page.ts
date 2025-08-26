import { expect, Page, Locator } from '@playwright/test';
import { writeFileSync } from 'fs';

export interface Constituent {
    name: string;
    percentageChange: number;
    marketCap: number;
}

type PriceInfo = {
    price: number;
    monthYear: string;
};

export class FTSE100Page {
    readonly page: Page;
    readonly ftseIndexTable: Locator;
    readonly percentageChangeHeader: Locator;
    readonly tableRows: Locator;
    readonly constituents: Locator;
    readonly quickLinksFtse: Locator;
    readonly lowToHighPerChange: Locator;
    readonly highToLowPerChange: Locator;
    readonly ftseHeroTitle: Locator;
    readonly marketCap: Locator
    readonly marketCapHighToLow: Locator;
    readonly pagination: Locator;
    readonly fromDateYearInput: Locator;
    readonly periodicityDropdown: Locator;
    readonly highchartsRoot: Locator;
    readonly monthlyLowIndex: Locator;
    readonly loadingIndicatorChart: Locator;
    readonly activePageLink: Locator;
    readonly ftse100Idx: Locator;


    constructor(page: Page) {
        this.page = page;
        this.ftseIndexTable = page.locator('table.ftse-index-table-table');
        this.percentageChangeHeader = page.locator('th.percentualchange.hide-on-landscape > span:first-of-type');
        this.tableRows = page.locator('table.full-width tbody tr');
        this.constituents = page.getByRole('link', { name: 'Constituents' });
        this.quickLinksFtse = page.locator('table.table-in-rich-text td:nth-child(2) a').first();
        this.lowToHighPerChange = page.getByRole('listitem').filter({ hasText: 'Lowest – highest' }).locator('div');
        this.highToLowPerChange = page.getByRole('listitem').filter({ hasText: 'Highest – lowest' }).locator('div');
        this.ftseHeroTitle = page.locator('h1.ftse-hero-title.font-bold');
        this.marketCapHighToLow = page.getByRole('listitem').filter({ hasText: 'Highest – lowest' }).locator('div');
        this.marketCap = page.getByText('Market cap (m)');
        this.pagination = page.locator('a.page-number');
        this.fromDateYearInput = page.getByLabel('Year in from date');
        this.periodicityDropdown = page.locator('//div[contains(@class,"periodicity")]');
        this.monthlyLowIndex = page.locator('[aria-label*="Price of base"]');
        this.highchartsRoot = page.locator('.highcharts-root');
        this.loadingIndicatorChart = page.locator('div.v-loader__item');
        this.activePageLink = this.page.locator(`//a[contains(@class,'active')]`);
        this.ftse100Idx = page.locator('//div[contains(@class,"highcharts-legend-item")]//span');   
    }

    async navigateToFTSE100() {
        await expect(this.quickLinksFtse).toBeVisible();
        await this.quickLinksFtse.click();
        await this.page.waitForLoadState('networkidle');
        await expect(this.page).toHaveURL(/.*ftse-100/);
    }

    async navigateToConstituents() {
        await expect(this.constituents).toBeVisible();
        await this.constituents.click();
        await this.page.waitForLoadState('networkidle');
        await expect(this.page).toHaveURL(/.*ftse-100\/constituents.*/);
    }

    async getPercentageChangeHeader(): Promise<string | null> {
        await expect(this.ftseIndexTable).toBeVisible();
        return await this.percentageChangeHeader.getAttribute('class');
    }

    async getTop10ConstituentsByPercentageChange(): Promise<Constituent[]> {
        const top10Rows = await this.tableRows.evaluateAll((rows) => {
            return rows.slice(0, 10).map((row) => {
                const name = row.querySelector('td.instrument-name')?.textContent?.trim() || '';
                const percentageChange = parseFloat(
                    row.querySelector('td.instrument-percentualchange')?.textContent?.trim() || '0'
                );
                const marketCapText = row.querySelector('td.instrument-marketcapitalization')?.textContent?.trim() || '0';
                const marketCap = parseFloat(marketCapText.replace(/,/g, ''));
                return { name, percentageChange, marketCap };
            });
        });
        return top10Rows;
    }

    async writeToFile(data: Constituent[], filePath: string): Promise<void> {
        writeFileSync(filePath, JSON.stringify(data, null, 2));
    }

    async clickLowToHighPercentageChange() {
        await expect(this.percentageChangeHeader).toBeVisible();
        await this.percentageChangeHeader.click();
        await expect(this.lowToHighPerChange).toBeVisible();
        await this.lowToHighPerChange.click();
         // Wait for the table to be sorted correctly by checking the order of percentage changes
         await this.page.waitForFunction(() => {
            const percentages = Array.from(document.querySelectorAll('table.full-width tbody tr td.instrument-percentualchange'))
                .map(el => parseFloat(el.textContent?.trim() || '0'));

            return percentages.length > 0 && percentages[0] < percentages[percentages.length - 1];
        });
    }

    async clickHighToLowPercentageChange() {
        await expect(this.percentageChangeHeader).toBeVisible();
        await this.percentageChangeHeader.click();
        await expect(this.highToLowPerChange).toBeVisible();
        await this.highToLowPerChange.click();
    }

    async clickHighToLowMarketCap() {
        await expect(this.marketCap).toBeVisible();
        await this.marketCap.click();
        await expect(this.marketCapHighToLow).toBeVisible();
        await this.marketCapHighToLow.click();
        await this.page.waitForLoadState('networkidle');
        await this.tableRows.first().waitFor({ state: 'visible'});
        // Wait for the table to be sorted correctly by checking the order of market caps
        await this.page.waitForFunction(() => {
            const marketCaps = Array.from(document.querySelectorAll('table.full-width tbody tr td.instrument-marketcapitalization'))
                .map(el => parseFloat(el.textContent?.trim() || '0'));

            return marketCaps.length > 0 && marketCaps[0] > marketCaps[marketCaps.length - 1];
        });

    }

    async getAllConstituentsWithMarketCapExceeding(threshold: number): Promise<Constituent[]> {
        let allConstituents: Constituent[] = [];
        let currentPageNumber = 1;
        while (true) {
            if (await this.tableRows.count() === 0) {
                break;
            }
            const pageConstituents = await this.tableRows.evaluateAll((rows, innerThreshold) => {
                const pageConstituents = rows.map(row => {
                    const name = row.querySelector('td.instrument-name')?.textContent?.trim() || '';
                    const percentageChange = parseFloat(
                        row.querySelector('td.instrument-percentualchange')?.textContent?.trim() || '0'
                    );
                    const marketCapText = row.querySelector('td.instrument-marketcapitalization')?.textContent?.trim() || '0';
                    const marketCap = parseFloat(marketCapText.replace(/,/g, '')) * 1_000_000;
                    return { name, percentageChange, marketCap };
                });

                return pageConstituents.filter(c => c.marketCap > innerThreshold);
            }, threshold);

            allConstituents = allConstituents.concat(pageConstituents);
            console.log(`found ${pageConstituents.length} constituents exceeding threshold.`);

            // Navigate to the next page if it exists
            const nextPageNumber = currentPageNumber + 1;
            const nextPageLink = this.page.locator(`//a[contains(@class, "page-number") and text()="${nextPageNumber}"]`);

            if (await nextPageLink.isVisible() && await nextPageLink.isEnabled()) {
                await nextPageLink.click();
                await this.page.waitForLoadState('networkidle');
                await expect(this.page).toHaveURL(new RegExp(`page=${nextPageNumber}`));

                // Wait until the active page button shows the correct number
                await this.page.waitForFunction(
                    (expected) => {
                        const active = document.querySelector('a.active');
                        return active?.textContent?.trim() === expected;
                    },
                    nextPageNumber.toString(),
                    { timeout: 5000 }
                );
                // Assert that the active page button matches the page we clicked
                const activeText = await this.activePageLink.textContent();
                expect(activeText?.trim()).toBe(nextPageNumber.toString());
                currentPageNumber++;
            } else {
                break;
            }
        }
        return allConstituents;
    }

    async enterFromDateYear(year: number) {
        await expect(this.fromDateYearInput).toBeVisible();
        await this.fromDateYearInput.fill(year.toString());
        await this.fromDateYearInput.press('Enter');
    }

    async selectPeriodicityOption(optionText: string) {
        await expect(this.periodicityDropdown).toBeVisible();
        await this.periodicityDropdown.click();
        const option = this.page.getByText(optionText, { exact: true });
        await expect(option).toBeVisible();
        await option.click();
    }

    async getLowestMonthlyAverageIndexValue(): Promise<PriceInfo | null> {
        await this.loadingIndicatorChart.waitFor({ state: 'hidden' });
        await expect(this.highchartsRoot).toBeVisible();
        const idx = await this.ftse100Idx.textContent();
        await expect(idx).toBe("FTSE 100 IDX");
        await this.monthlyLowIndex.first().waitFor({ state: 'visible', timeout: 20000 });
        // Extract aria-label attributes from the monthlyLowIndex elements
        const labels: string[] = await this.monthlyLowIndex.evaluateAll(elements =>
            elements.map(el => el.getAttribute('aria-label') || '')
        );
        const extracted: PriceInfo[] = [];
        for (const text of labels) {
            // Extract price and month-year using regex from aria-label text
            const priceMatch = text.match(/is\s+([\d\s,]+)/);
            const price = priceMatch ? parseFloat(priceMatch[1].replace(/\s/g, '').replace(',', '.')) : NaN;

            const monthYearMatch = text.match(/(\d{1,2} [A-Za-z]+ \d{4})/);
            const monthYearFull = monthYearMatch ? monthYearMatch[1] : '';
            const monthYear = monthYearFull ? monthYearFull.replace(/^\d{1,2} /, '') : '';

            if (!isNaN(price) && monthYear) {
                extracted.push({ price, monthYear });
            }
        }
        if (extracted.length === 0) {
            return null;
        }
        return extracted.reduce((min, item) => (item.price < min.price ? item : min), extracted[0]);
    }

}
