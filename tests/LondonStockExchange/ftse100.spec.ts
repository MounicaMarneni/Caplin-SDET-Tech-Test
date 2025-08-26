import { test, expect } from '@playwright/test';
import { HomePage } from '../../pages/homePage';
import { FTSE100Page } from '../../pages/ftse100Page';


test.describe('London Stock Exchange FTSE-100 Tests', { tag: '@regression' }, () => {
    let homePage: HomePage;
    let ftse100Page: FTSE100Page;

    test.beforeEach('Navigate to FTSE-100 Page', async ({ page }) => {
        homePage = new HomePage(page);
        ftse100Page = new FTSE100Page(page);
        // Go to LSE homepage
        await homePage.goto();
        await expect(page).toHaveURL(/.*exchange/);
        // Verify homepage title and header
        const title = await page.title();
        expect(title).toBe('London Stock Exchange homepage | London Stock Exchange');
        expect(homePage.marketsHeader).toHaveText('Markets latest ');
        // Navigate to FTSE-100 section
        await ftse100Page.navigateToFTSE100();

    });

    test('Extract top 10 risers in FTSE-100 by percentage change', async () => {
        await ftse100Page.navigateToConstituents();
        // Ensure table is sorted high-to-low
        const percentageChangeHeaderClass = await ftse100Page.getPercentageChangeHeader();
        if (percentageChangeHeaderClass !== 'indented clickable') {
            await ftse100Page.clickHighToLowPercentageChange();
        }
        // Get top 10 risers and save to file
        const top10Constituents = await ftse100Page.getTop10ConstituentsByPercentageChange();
        const filePath = './highestTop10Constituents.json';
        await ftse100Page.writeToFile(top10Constituents, filePath);
    });

    test('Extract top 10 fallers in FTSE-100 by percentage change', async () => {
        await ftse100Page.navigateToConstituents();
        // Sort table low-to-high
        await ftse100Page.clickLowToHighPercentageChange();
        const percentageChangeClass = await ftse100Page.getPercentageChangeHeader();
        await expect(percentageChangeClass).toBe('indented clickable reverse');
        // Get top 10 fallers and save to file
        const top10Constituents = await ftse100Page.getTop10ConstituentsByPercentageChange();
        const filePath = './lowestTop10Constituents.json';
        await ftse100Page.writeToFile(top10Constituents, filePath);
    });

    test('Get all FTSE-100 constituents where Market Cap exceeds 7 million', async () => {
        await ftse100Page.navigateToConstituents();
        // Sort by Market Cap descending
        await ftse100Page.clickHighToLowMarketCap();
        // Filter constituents and verify
        const constituents = await ftse100Page.getAllConstituentsWithMarketCapExceeding(7000000);
        expect(constituents.length).toBeGreaterThan(0);
        // Save to file
        const filePath = './constituentsWithMarketCap.json';
        await ftse100Page.writeToFile(constituents, filePath);
    });

    test('Identify month with lowest average FTSE-100 index value over the past three years', async () => {
        // Set date range to past 3 years
        const toDate = new Date();
        const fromDate = new Date();
        fromDate.setFullYear(toDate.getFullYear() - 3); 
        const fromYear = fromDate.getFullYear();
        await ftse100Page.enterFromDateYear(fromYear);
        // Wait for chart to load
        await expect(ftse100Page.loadingIndicatorChart).toBeHidden();
        await expect(ftse100Page.highchartsRoot).toBeVisible();
        await ftse100Page.page.waitForLoadState('networkidle');
        // Select monthly periodicity
        await ftse100Page.selectPeriodicityOption('Monthly');
        await expect(ftse100Page.loadingIndicatorChart).toBeHidden();
        await ftse100Page.page.waitForLoadState('networkidle');
        // Get the month with lowest average index value
        const lowestMonthlyAverage = await ftse100Page.getLowestMonthlyAverageIndexValue();
        if (lowestMonthlyAverage) {
            console.log(`Lowest index value: ${lowestMonthlyAverage.price} in ${lowestMonthlyAverage.monthYear}`);
        } else {
            console.log("No valid index values found.");
        }
        expect(lowestMonthlyAverage).not.toBeNull();
    });

});
