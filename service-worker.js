const VK_ACCESS_TOKEN_STORAGE_KEY = 'pf_vkaccess_token';
const VK_API_URL = "https://api.vk.com/method";
const VK_API_VERSION = "5.101";
const ITEMS_PER_PAGE = 100;
const VK_APP_ID = "xxxx";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const action = request.action || "";
    (async () => {
        if (action === "auth") {
            const registerLink = `https://oauth.vk.com/authorize?client_id=${VK_APP_ID}&display=page&redirect_uri=https://oauth.vk.com/blank.html&scope=messages&response_type=token&v=${VK_API_VERSION}&state=123456`;
            const tab = await chrome.tabs.create({url: registerLink, selected: true});
            chrome.storage.local.set({authTabId: tab.id})
            sendResponse({result: "Ok"});
        }

        if (action === "fetchPhotoAttachments") {
            request.messageId = request.messageId || "";
            if (request.messageId === "") {
                sendResponse({error: "Empty message id"});
                return;
            }
            const peerId = Number.parseInt(request.messageId);
            if (isNaN(peerId)) {
                sendResponse({error: "Wrong message id"});
                return;
            }
            const items = await chrome.storage.local.get({[VK_ACCESS_TOKEN_STORAGE_KEY]: {}});
            const vkAccessToken = items[VK_ACCESS_TOKEN_STORAGE_KEY];
            let apiRequestUrl = `${VK_API_URL}/messages.getHistoryAttachments?peer_id=${peerId}&access_token=${vkAccessToken}&media_type=photo&photo_sizes=1&count=${ITEMS_PER_PAGE}&v=${VK_API_VERSION}`;
            if (request.nextFrom !== undefined && request.nextFrom !== "0") {
                apiRequestUrl += "&start_from=" + request.nextFrom;
            }
            try {
                const response = await fetch(apiRequestUrl)
                if (!response.ok) {
                    sendResponse({error: `VK messages.getHistoryAttachments api call error. ${response.status}: ${response.statusText}`})
                    return;
                }
                const responseData = await response.json();
                if (responseData.error) {
                    sendResponse({error: responseData.error});
                    return;
                }
                sendResponse({result: responseData.response});
            } catch (error) {
                sendResponse({error: error.message});
            }
        }
    })();

    return true;
});

const filter = {
    url: [
        {
            urlMatches: 'https://oauth.vk.com/',
        },
    ],
};

chrome.webNavigation.onCompleted.addListener(async ({tabId, url}) => {
    const { authTabId } = await chrome.storage.local.get(["authTabId"]);
    if (authTabId === tabId && url) {
        const vkAccessToken = fetchParamValueFromUrl(url, "access_token");
        if (vkAccessToken === "") {
            let error = fetchParamValueFromUrl(changeInfo.url, "error_description");
            if (error === "") {
                error = "Unknown VK auth error";
            }
            await chrome.runtime.sendMessage({resultType: "auth", result: "error", msg: error});
            return;
        }
        await chrome.storage.local.set({[VK_ACCESS_TOKEN_STORAGE_KEY]: vkAccessToken});
        await chrome.tabs.remove(tabId);
        await chrome.runtime.sendMessage({resultType: "auth", result: "success"})
    }
}, filter);

const fetchParamValueFromUrl = (url, param) => {
    const urlParamsString = url.substr(url.indexOf("#") + 1);
    const urlParams = urlParamsString.split("&");
    for (let i = 0; i < urlParams.length; i++) {
        const paramKeyValue = urlParams[i].split("=");
        if (paramKeyValue[0] === param) {
            return paramKeyValue[1];
        }
    }
    return "";
}


