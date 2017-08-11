"use strict";
chrome.storage.local.get({'pf_vkaccess_token': {}}, function (items) {
    if (items.pf_vkaccess_token.length === undefined) {
        // We need to insert button for VK auth.
        let authBtnWrapper = document.createElement("div");
        let authBtn = document.createElement("button");
        let authBtnText = document.createTextNode("Auth");
        authBtn.appendChild(authBtnText);
        authBtnWrapper.appendChild(authBtn);
        document.body.appendChild(authBtnWrapper);
        authBtn.addEventListener("click", function () {
            chrome.runtime.sendMessage({action: "auth"}, function (response) {
                console.log("oops");
                alert(response);
                // if(response.error !== undefined) {
                //     showErrors([response.error]);
                // } else {
                //     if(response.token !== undefined) {
                //         console.log(response);
                //         chrome.storage.local.set({'pf_vkaccess_token': response.token});
                //     } else {
                //         showErrors(["Oops! Something went wrong. Token is not sent."]);
                //     }
                // }
            });

        });
    } else {
        showErrors(["authorised"])
    }
});

function showErrors(errors) {
    let errorsContainer = document.getElementById("errors-container");
    while (errorsContainer.firstChild) {
        errorsContainer.removeChild(errorsContainer.firstChild);
    }
    for (let i = 0; i < errors.length; i++) {
        let errorText = document.createTextNode(errors[i]);
        let errorElement = document.createElement("div");
        errorElement.className = "error";
        errorElement.appendChild(errorText);
        errorsContainer.appendChild(errorElement);
    }
}