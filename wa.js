const puppeteer = require("puppeteer");

let browser = null;
let page = null;
/**
 * Initialize browser, page and setup page desktop mode
 */
async function start() {
    if(page){
        return 'Started'
    }
    browser = await puppeteer.launch({
        headless: true,
        // userDataDir: './storage',
        args: ["--no-sandbox"]
    });
    page = await browser.newPage();
    // prevent dialog blocking page and just accept it(necessary when a message is sent too fast)
    page.on("dialog", async dialog => { await dialog.accept(); });
    // fix the chrome headless mode true issues
    // https://gitmemory.com/issue/GoogleChrome/puppeteer/1766/482797370
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36");
    page.setDefaultTimeout(60000);

    let qrCode = await generateQRCode();

    return qrCode
}

/**
 * Access whatsapp web page, get QR Code data and generate it on terminal
 */
async function generateQRCode() {
    await page.goto("https://web.whatsapp.com");
    await page.waitForSelector("div[data-ref]", { timeout: 60000 });
    const qrcodeData = await page.evaluate(() => {
        let qrcodeDiv = document.querySelector("div[data-ref]");
        return qrcodeDiv.getAttribute("data-ref");
    });

    return qrcodeData
}

/**
 * @param {string} phone phone number: '5535988841854'
 * @param {string} message Message to send to phone number
 * Send message to a phone number
 */
async function sendTo(phone, message) {
    try {
        await page.goto(`https://web.whatsapp.com/send?phone=${phone}&text=${message}`);
        await page.waitForSelector("div#startup", { hidden: true, timeout: 15000 });
        await page.waitForSelector('div[data-tab="1"]', { timeout: 15000 });
        await page.keyboard.press("Enter");
        await page.waitFor(1000);
        return `${phone} Sent`;
    } catch (err) {
        return `error`;
    }
}

/**
 * @param {array} phones Array of phone numbers: ['5535988841854', ...]
 * @param {string} message Message to send to every phone number
 * Send same message to every phone number
 */
async function send(phones, message) {
    let results = []
    for (let phone of phones) {
        let status = await sendTo(phone, message);
        results.push({status})
    }
    return results
}

/**
 * @param {array} contacts Array of contacts
 * @param {string} message Custom message to send to every phone number
 * Send custom message to every phone number
 */
async function sendCustom(contacts, messagePrototype) {
    for (let contact of contacts) {
        await sendTo(contact.phone, generateCustomMessage(contact, messagePrototype));
    }
    await end();
}

/**
 * @param {object} contact contact with several properties defined by the user
 * @param {string} messagePrototype Custom message to send to every phone number
 * @returns {string} message
 * Replace all text between {{}} to respective contact property
 */
function generateCustomMessage(contact, messagePrototype) {
    let message = messagePrototype;
    for (let property in contact) {
        message = message.replace(new RegExp(`{{${property}}}`, "g"), contact[property]);
    }
    return message;
}

/**
 * Close browser and show results(number of messages sent and failed)
 */
async function end() {
    await browser.close();
    page = null
}

module.exports = {
    start,
    send,
    sendTo,
    sendCustom,
    end
}