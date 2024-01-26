import fetch from 'node-fetch';
import cheerio from 'cheerio';
import TurndownService from 'turndown';
import { promises as fs } from 'fs';
import path from 'path';

const turndownService = new TurndownService();

function getFolderNameFromUrl(url) {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/\./g, '_');
}

function getFileNameFromUrl(url, folderName) {
    const urlObj = new URL(url);
    const fileName = urlObj.pathname.replace(/\//g, '_') || 'index';
    return path.join(folderName, fileName + '.md');
}

async function ensureDirectoryExists(folderName) {
    try {
        await fs.mkdir(folderName, { recursive: true });
    } catch (err) {
        console.error(`Error creating directory ${folderName}:`, err);
        throw err;
    }
}

async function scrapeAllLinks(baseUrl) {
    try {
        const response = await fetch(baseUrl);
        const html = await response.text();
        const $ = cheerio.load(html);
        const links = [baseUrl]; // Start with the base URL

        $('a').each((i, link) => {
            const href = $(link).attr('href');
            if (href) {
                const linkUrl = new URL(href, baseUrl); // Resolve relative URLs
                if (linkUrl.origin === new URL(baseUrl).origin && !links.includes(linkUrl.href)) {
                    links.push(linkUrl.href);
                }
            }
        });

        return links;
    } catch (err) {
        console.error(`Error fetching ${baseUrl}:`, err);
        return [];
    }
}

async function scrapeAndSave(url, folderName) {
    try {
        const response = await fetch(url);
        const html = await response.text();
        const markdown = turndownService.turndown(html);
        const outputFile = getFileNameFromUrl(url, folderName);

        await fs.writeFile(outputFile, markdown);
        console.log(`Markdown saved to ${outputFile}`);
    } catch (err) {
        console.error(`Error processing ${url}:`, err);
    }
}

async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error('Please provide a base URL as an argument.');
        return;
    }

    const startUrl = args[0];
    try {
        const folderName = getFolderNameFromUrl(startUrl);
        await ensureDirectoryExists(folderName);
        const links = await scrapeAllLinks(startUrl);

        for (const url of links) {
            await scrapeAndSave(url, folderName);
        }
        console.log('All pages processed.');
    } catch (err) {
        console.error('Error in main function:', err);
    }
}

main();
