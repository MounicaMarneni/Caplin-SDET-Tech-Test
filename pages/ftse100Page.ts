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


    constructor(page: Page) {
        this.page = page;
        this.ftseIndexTable = page.locator('//table[(contains(@class,"ftse-index-table-table"))]');
        this.percentageChangeHeader = page.locator('th.percentualchange.hide-on-landscape > span:first-of-type');
        this.tableRows = page.locator('table.full-width tbody tr');
        this.constituents = page.getByRole('link', { name: 'Constituents' });
        this.quickLinksFtse = page.locator('//table[@class="table-in-rich-text"]//td[2]//a').first();
        this.lowToHighPerChange = page.getByRole('listitem').filter({ hasText: 'Lowest – highest' }).locator('div');
        this.highToLowPerChange = page.getByRole('listitem').filter({ hasText: 'Highest – lowest' }).locator('div');
        this.ftseHeroTitle = page.locator('//h1[contains(@class, "ftse-hero-title font-bold")]');
        this.marketCapHighToLow = page.getByRole('listitem').filter({ hasText: 'Highest – lowest' }).locator('div');
        this.marketCap = page.getByText('Market cap (m)');
        this.pagination = page.locator('//a[contains(@class,"page-number")]');
        this.fromDateYearInput = page.locator('//input[@aria-label="Year in from date"]');
        this.periodicityDropdown = page.locator('//div[contains(@class,"periodicity")]');
        this.monthlyLowIndex = page.locator('//*[contains(@aria-label,"Price of base")]');
        this.highchartsRoot = page.locator('//*[@class="highcharts-root"]');
        this.loadingIndicatorChart = page.locator('//div[@class="v-loader__item"]');
    }

    async navigateToFTSE100() {
        await expect(this.quickLinksFtse).toBeVisible();
        await this.quickLinksFtse.click();
        await this.page.waitForLoadState('networkidle');
        await expect(this.page).toHaveURL(/.*ftse-100/);
    }

    async navigateToConstituents() {
        // await expect(this.ftseHeroTitle).toBe('"FTSE 100"');

        await expect(this.constituents).toBeVisible();
        await this.constituents.click();
        await this.page.waitForLoadState('networkidle');
        await expect(this.page).toHaveURL(/.*ftse-100\/constituents.*/);
    }

    async getPercentageChangeHeader() {
        await expect(this.ftseIndexTable).toBeVisible();
        return await this.percentageChangeHeader.getAttribute('class');
    }

    async getTop10ConstituentsByPercentageChange() {
        const top10Rows = await this.tableRows.evaluateAll((rows) => {
            return rows.slice(0, 10).map((row) => {
                const name = row.querySelector('td.instrument-name')?.textContent?.trim();
                const percentageChange = parseFloat(
                    row.querySelector('td.instrument-percentualchange')?.textContent?.trim() || '0'
                );
                const marketCap = parseFloat(
                    row.querySelector('td.instrument-marketcapitalization')?.textContent?.trim() || '0'
                );
                return { name, percentageChange, marketCap };
            });
        });
        return top10Rows;
    }

    async writeToFile(data: { name: string; percentageChange: number; marketCap: number }[], filePath: string): Promise<void> {
        writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`Data written to file: ${filePath}`);
    }

    async clickLowToHighPercentageChange() {
        await expect(this.percentageChangeHeader).toBeVisible();
        await this.percentageChangeHeader.click();
        await expect(this.lowToHighPerChange).toBeVisible();
        await this.lowToHighPerChange.click();
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
    }

    async getAllConstituentsWithMarketCapExceeding(threshold: number): Promise<Constituent[]> {
        let allConstituents: Constituent[] = [];
        let currentPageNumber = 1;
        while (true) {
            await this.page.waitForLoadState('networkidle');
            await this.tableRows.first().waitFor({ state: 'visible' });

            if (await this.tableRows.count() === 0) {
                break;
            }

            const pageData = await this.tableRows.evaluateAll((rows, threshold) => {
                const pageConstituents = rows.map(row => {
                    const name = row.querySelector('td.instrument-name')?.textContent?.trim() || '';
                    const percentageChange = parseFloat(
                        row.querySelector('td.instrument-percentualchange')?.textContent?.trim() || '0'
                    );
                    const marketCapText = row.querySelector('td.instrument-marketcapitalization')?.textContent?.trim() || '0';
                    const marketCap = parseFloat(marketCapText.replace(/,/g, '')) * 1_000_000;
                    return { name, percentageChange, marketCap };
                });

                const constituentsAboveThreshold = pageConstituents.filter(c => c.marketCap > threshold);
                console.log("Constituents above threshold on this page:", constituentsAboveThreshold.length);

                return { constituents: constituentsAboveThreshold };

            }, threshold);

            allConstituents = allConstituents.concat(pageData.constituents);

            // Navigate to the next page if it exists
            const nextPageNumber = currentPageNumber + 1;
            const nextPageLink = this.page.locator(`//a[contains(@class, "page-number") and text()="${nextPageNumber}"]`);

            if (await nextPageLink.isVisible() && await nextPageLink.isEnabled()) {
                await nextPageLink.click();
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
        const option = this.page.locator(`//div[contains(text(),"${optionText}")]`);
        await expect(option).toBeVisible();
        await option.click();
    }

    async getMonthlyAverageIndexValues(): Promise<PriceInfo | null> {
        await this.loadingIndicatorChart.waitFor({ state: 'hidden' });
        const labels: string[] = await this.monthlyLowIndex.evaluateAll(elements =>
            elements.map(el => el.getAttribute('aria-label') || '')
        );
        const extracted: PriceInfo[] = [];

        for (const text of labels) {
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

        return extracted.reduce((min, item) => (item.price < min.price ? item : min));
    }

}
