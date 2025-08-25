import { test, expect } from '@playwright/test';
import { HomePage } from '../../pages/homePage';
import { FTSE100Page } from '../../pages/ftse100Page';


test.describe('London Stock Exchange FTSE-100 Tests', { tag: '@regression' }, () => {
    let homePage: HomePage;
    let ftse100Page: FTSE100Page;

    test.beforeEach('Go to FTSE-100 Page', async ({ page }) => {
        homePage = new HomePage(page);
        ftse100Page = new FTSE100Page(page);
        await homePage.goto();

        await expect(page).toHaveURL(/.*exchange/);
        const title = await page.title();
        expect(title).toBe('London Stock Exchange homepage | London Stock Exchange');
        expect(homePage.marketsHeader).toHaveText('Markets latest ');
        await ftse100Page.navigateToFTSE100();

    });

    test('Top 10 FTSE-100 constituents with highest percentage change', async ({ page }) => {
        await ftse100Page.navigateToConstituents();

        const className = await ftse100Page.getPercentageChangeHeader();

        if (className !== 'indented clickable') {
            await ftse100Page.clickHighToLowPercentageChange();
        }
        const top10Constituents = await ftse100Page.getTop10ConstituentsByPercentageChange();
        const filePath = './highestTop10Constituents.json';
        await ftse100Page.writeToFile(top10Constituents, filePath);
    });

    test('Top 10 FTSE-100 constituents with lowest percentage change', async ({ page }) => {
        await ftse100Page.navigateToConstituents();

        await ftse100Page.clickLowToHighPercentageChange();
        const percentageChangeClass = await ftse100Page.getPercentageChangeHeader();
        await expect(percentageChangeClass).toBe('indented clickable reverse');

        // Wait for the table to be sorted correctly by checking the order of percentage changes
        await ftse100Page.page.waitForFunction(() => {
            const percentages = Array.from(document.querySelectorAll('table.full-width tbody tr td.instrument-percentualchange'))
                .map(el => parseFloat(el.textContent?.trim() || '0'));

            return percentages.length > 0 && percentages[0] < percentages[percentages.length - 1];
        });
        const top10Constituents = await ftse100Page.getTop10ConstituentsByPercentageChange();
        const filePath = './lowestTop10Constituents.json';
        await ftse100Page.writeToFile(top10Constituents, filePath);
    });

    test('Get all FTSE-100 constituents where Market Cap exceeds 7 million', async ({ page }) => {
        await ftse100Page.navigateToConstituents();

        await ftse100Page.clickHighToLowMarketCap();
        const constituents = await ftse100Page.getAllConstituentsWithMarketCapExceeding(7000000);
        // const constituents = await ftse100Page.getAllConstituentsWithMarketCapExceeding(7000000000);

        const filePath = './constituentsWithMarketCap.json';
        await ftse100Page.writeToFile(constituents, filePath);
    });

    test('Get month which has lowest average index value over the past three years', async ({ page }) => {
        const toDate = new Date();
        const fromDate = new Date();
        fromDate.setFullYear(toDate.getFullYear() - 3); // Sets the date to three years ago

        const fromYear = fromDate.getFullYear();
        await ftse100Page.enterFromDateYear(fromYear);
        await ftse100Page.selectPeriodicityOption('Monthly');
        await ftse100Page.page.waitForLoadState('networkidle');
        const monthlyAverages = await ftse100Page.getMonthlyAverageIndexValues();
        if (monthlyAverages) {
            console.log(`Lowest index value: ${monthlyAverages.price} in ${monthlyAverages.monthYear}`);
        } else {
            console.log("No valid index values found.");
        }
    });

});
