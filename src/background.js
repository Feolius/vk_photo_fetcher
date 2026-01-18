const VK_ACCESS_TOKEN_STORAGE_KEY = 'pf_vkaccess_token';
const VK_API_URL = "https://api.vk.com/method";
const VK_API_VERSION = "5.199";
const ITEMS_PER_PAGE = 100;
const VK_APP_ID = "xxxx";
const REDIRECT_URL = "https://oauth.vk.com/blank.html";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const action = request.action || "";
    (async () => {
        if (action === "auth") {
            const codeVerifier = generateCodeVerifier();
            const codeChallenge = await generateCodeChallenge(codeVerifier);
            const registerLink = `https://id.vk.ru/authorize?response_type=code&client_id=${VK_APP_ID}&scope=messages&redirect_uri=${REDIRECT_URL}&state=123456&code_challenge=${codeChallenge}&code_challenge_method=S256`
            const tab = await chrome.tabs.create({url: registerLink, selected: true});
            await chrome.storage.local.set({authTabId: tab.id, codeVerifier})
            sendResponse({result: "Ok"});
            return;
        }

        if (action === "fetchPhotoAttachments") {
            request.chatId = request.chatId || "";
            if (request.chatId === "") {
                sendResponse({error: {error_msg: "Empty chat id"}});
                return;
            }
            const peerId = Number.parseInt(request.chatId);
            if (isNaN(peerId)) {
                sendResponse({error: {error_msg: "Wrong chat id"}});
                return;
            }
            const items = await chrome.storage.local.get({[VK_ACCESS_TOKEN_STORAGE_KEY]: {}});
            const vkAccessToken = items[VK_ACCESS_TOKEN_STORAGE_KEY];
            const apiRequestUrl = new URL(`${VK_API_URL}/messages.getHistoryAttachments`);
            apiRequestUrl.searchParams.set("peer_id", peerId);
            if (request.groupId && !isNaN(Number.parseInt(request.groupId))) {
                apiRequestUrl.searchParams.set("group_id", request.groupId)
            }
            apiRequestUrl.searchParams.set("access_token", vkAccessToken);
            apiRequestUrl.searchParams.set("media_type", "photo");
            apiRequestUrl.searchParams.set("photo_sizes", "1");
            apiRequestUrl.searchParams.set("count", ITEMS_PER_PAGE.toString());
            apiRequestUrl.searchParams.set("v", VK_API_VERSION);
            if (request.nextFrom !== undefined && request.nextFrom !== "0") {
                apiRequestUrl.searchParams.set("start_from", request.nextFrom);
            }
            try {
                const response = await fetch(apiRequestUrl.toString())
                if (!response.ok) {
                    sendResponse({error: {error_msg: `VK messages.getHistoryAttachments api call error. ${response.status}: ${response.statusText}`}})
                    return;
                }
                const responseData = await response.json();
                if (responseData.error) {
                    sendResponse({error: responseData.error});
                    return;
                }
                sendResponse({result: responseData.response});
            } catch (error) {
                sendResponse({error: {error_msg: error.message}});
            }
        }
    })();

    return true;
});

const filter = {
    url: [
        {
            urlPrefix: REDIRECT_URL,
        },
    ],
};

chrome.webNavigation.onCompleted.addListener(async ({tabId, url}) => {
    const {authTabId, codeVerifier} = await chrome.storage.local.get(["authTabId", "codeVerifier"]);
    if (authTabId === tabId && url) {
        const authParams = fetchAuthParamsFromUrl(url);
        try {
            const res = await fetch('https://id.vk.ru/oauth2/auth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code: authParams.code,
                    code_verifier: codeVerifier,
                    client_id: VK_APP_ID,
                    device_id: authParams.device_id,
                    redirect_uri: REDIRECT_URL,
                    state: authParams.state,
                })
            });
            const authData = await res.json();
            if (authData.access_token === undefined) {
                const error = authData.error_description ?? "Unknown VK auth error";
                throw new Error(error);
            }
            await chrome.storage.local.set({[VK_ACCESS_TOKEN_STORAGE_KEY]: authData.access_token});
            await chrome.runtime.sendMessage({resultType: "auth", result: "success"})
        } catch (err) {
            await chrome.runtime.sendMessage({resultType: "auth", result: "error", msg: err.message});
        } finally {
            await chrome.storage.local.remove(["authTabId", "codeVerifier"]);
            await chrome.tabs.remove(tabId);
        }
    }
}, filter);

function generateCodeVerifier(length = 128) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    // Convert to base64url-safe string without padding
    return btoa(String.fromCharCode(...array))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

async function generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}


/**
 * @param {string} url
 * @return {{code: string, state: string, device_id: string}}
 */
function fetchAuthParamsFromUrl(url) {
    const urlParser = new URL(url);
    return {
        code: urlParser.searchParams.get("code"),
        state: urlParser.searchParams.get("state"),
        device_id: urlParser.searchParams.get("device_id"),
    }
}


