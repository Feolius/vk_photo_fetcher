const VK_ACCESS_TOKEN_STORAGE_KEY = 'pf_vkaccess_token';
$(function () {
    "use strict";
    initLayout();
    let currentUrl = window.location.href;
    let urlParser = document.createElement('a');
    urlParser.href = currentUrl;
    let paramsKeysValues = urlParser.search.substring(1).split("&");
    let messageId = "";
    for (let i = 0; i < paramsKeysValues.length; i++) {
        let paramKeyValue = paramsKeysValues[i].split("=");
        if (paramKeyValue[0] === "messageId") {
            messageId = paramKeyValue[1];
        }
    }

    chrome.storage.local.get({[VK_ACCESS_TOKEN_STORAGE_KEY]: {}}, (items) => {
        const imagesContainer = $('.images-container');
        let photosChosenCounter = 0;

        class PhotoFetcher {
            constructor() {
                this.photos = [];
                this._nextFrom = "0";
            }

            fetchNext(callback) {
                chrome.runtime.sendMessage({
                    action: "fetchPhotoAttachments",
                    messageId: messageId,
                    nextFrom: this._nextFrom
                }, (response) => {
                    if (response.error !== undefined) {
                        if (response.error.error_code !== undefined && response.error.error_code === 5) {
                            chrome.storage.local.remove(VK_ACCESS_TOKEN_STORAGE_KEY, () => {
                                location.reload(true);
                            });
                        } else {
                            displayErrors([`Photo fetch error: $(response.error)`]);
                        }
                    } else if (response.result !== undefined) {
                        // Get rid of duplicates here using photo id.
                        let photos = [];
                        for (let item of response.result.items) {
                            let photo = item.attachment.photo;
                            this.photos[photo.id] = photo;
                            photos[photo.id] = photo;
                        }
                        this._nextFrom = response.result.next_from;
                        callback.call(this, photos);
                    }

                });
            }
        }

        function pushPhotosIntoSelect(photos, select) {
            for (let id in photos) {
                if (photos.hasOwnProperty(id)) {
                    let photo = photos[id];
                    select.append('<option data-img-src="' + photo.photo_604 + '" value="' + id + '">Option' + id + '</option>');
                }
            }
            select.imagepicker({
                changed: function (oldValues, newValues) {
                    photosChosenCounter = photosChosenCounter + newValues.length - oldValues.length;
                    $('.photos-chosen-counter').html(photosChosenCounter);
                    if(photosChosenCounter === 0) {
                        $('.download-btn').prop("disabled", true);
                    } else {
                        $('.download-btn').prop("disabled", false);
                    }
                }
            });
            const pickerContainer = select.next("ul.thumbnails");
            pickerContainer.imagesLoaded(() => {
                pickerContainer.masonry({
                    itemSelector: "li",
                });
            });
        }

        if (items[VK_ACCESS_TOKEN_STORAGE_KEY].length === undefined) {
            initLayout();
            displayErrors([chrome.i18n.getMessage("authNeededMsg")]);
            const authBtn = $('<button type="button" class="btn btn-primary vk-auth-btn">' +
                chrome.i18n.getMessage("authBtnTxt") + '</button>');
            const container = $(".container");
            container.append(authBtn);
            authBtn.click(() => {
                chrome.runtime.sendMessage({action: "auth"}, (response) => {
                    if (response.error !== undefined) {
                        initLayout();
                        displayErrors([response.error]);
                    } else {
                        location.reload(true);
                    }
                });
            });
        } else {
            const selectClass = 'photo-select';
            const selectTag = '<select multiple="multiple" class="image-picker masonry">';
            const select = $(selectTag);
            select.addClass(selectClass);
            imagesContainer.append(select);
            const photoFetcher = new PhotoFetcher();
            photoFetcher.fetchNext((photos) => {
                pushPhotosIntoSelect(photos, select);
            });
            const btnWrapper = $('.btn-wrapper');
            const btnLabelWrapper = $('<div class="btn-label-wrapper">' + chrome.i18n.getMessage("photosCounterLabel") +
                '<span class="photos-chosen-counter">0</span></div>');
            btnWrapper.append(btnLabelWrapper);
            const moreBtn = $('<button type="button" class="btn btn-primary more-btn">' +
                chrome.i18n.getMessage("getMorePhotosBtnTxt") + '</button>');
            btnWrapper.append(moreBtn);
            moreBtn.click(() => {
                const divider = $('<hr />');
                imagesContainer.append(divider);
                const select = $(selectTag);
                select.addClass(selectClass);
                imagesContainer.append(select);
                photoFetcher.fetchNext((photos) => {
                    pushPhotosIntoSelect(photos, select);
                    $('html, body').animate({
                        scrollTop: divider.offset().top
                    }, 1000);
                });
            });
            const downloadBtn = $('<button type="button" class="btn btn-primary download-btn" disabled>' +
                chrome.i18n.getMessage("downloadBtnTxt") + '</button>');
            btnWrapper.append(downloadBtn);
            downloadBtn.click(() => {
                $(`.${selectClass}`).children('option:selected').each((index, element) => {
                    const id = element.value;
                    const photo = photoFetcher.photos[id];
                    const link = getPhotoBestResolutionLink(photo);
                    chrome.downloads.download({
                        url: link
                    });
                });
            });
        }
    });

    function displayErrors(errors) {
        const errorsContainer = $('.errors-container');
        errorsContainer.empty();
        for (let error of errors) {
            errorsContainer.append('<div class="error">' + error + '</div>');
        }
    }

    function initLayout() {
        const container = $(".container");
        container.empty();
        const errorContainer = $('<div class="errors-container bg-danger"></div>');
        container.append(errorContainer);
        const imagesContainer = $('<div class="images-container"></div>');
        container.append(imagesContainer);
        const btnWrapper = $('<div class="btn-wrapper"></div>');
        container.append(btnWrapper);
    }

    function getPhotoBestResolutionLink(photo) {
        let link = "";
        let sizePriorities = ["2560", "1280", "807", "604", "130", "75"];
        for (let sizePriority of sizePriorities) {
            if(photo["photo_" + sizePriority] !== undefined) {
                link = photo["photo_" + sizePriority];
                break;
            }
        }
        return link;
    }

});