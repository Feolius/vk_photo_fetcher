const VK_ACCESS_TOKEN_STORAGE_KEY = 'pf_vkaccess_token';
$(function () {
    "use strict";
    initLayout();
    let currentUrl = window.location.href;
    let urlParser = document.createElement('a');
    urlParser.href = currentUrl;
    let paramsKeysValues = urlParser.search.substring(1).split("&");
    let messageId = "";
    for (let paramsKeysValue of paramsKeysValues) {
        let paramKeyValue = paramsKeysValue.split("=");
        if (paramKeyValue[0] === "messageId") {
            messageId = paramKeyValue[1];
        }
    }

    class PhotoFetcher {
        constructor() {
            this.photos = {};
            this._nextFrom = "0";
        }

        fetchNext() {
            return new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: "fetchPhotoAttachments",
                    messageId: messageId,
                    nextFrom: this._nextFrom
                }, (response) => {
                    if (response.error !== undefined) {
                        reject(response.error);
                    } else if (response.result !== undefined) {
                        // Get rid of duplicates here using photo id.
                        let photos = [];
                        for (let item of response.result.items) {
                            const photo = item.attachment.photo;
                            const originalSizes = photo.sizes.slice();
                            const sizes = {};
                            for (let size of originalSizes) {
                                sizes[size.type] = size;
                            }
                            photo.sizes = sizes;
                            photos.push(photo);
                            this.photos[photo.id] = photo;
                        }
                        this._nextFrom = response.result.next_from;
                        resolve(photos);
                    }

                });
            });
        }
    }

    chrome.storage.local.get({[VK_ACCESS_TOKEN_STORAGE_KEY]: {}}, (items) => {
        const imagesContainer = $('.images-container');
        let photosChosenCounter = 0;

        function pushPhotosIntoSelect(photos, select) {
            for (let photo of photos) {
                const thumbLink = getPhotoThumbnailLink(photo);
                if (thumbLink !== "") {
                    select.append('<option data-img-src="' + thumbLink + '" value="' + photo.id + '">Option' + photo.id + '</option>');
                }
            }
            select.imagepicker({
                changed: function (oldValues, newValues) {
                    photosChosenCounter = photosChosenCounter + newValues.length - oldValues.length;
                    $('.photos-chosen-counter').html(photosChosenCounter);
                    if (photosChosenCounter === 0) {
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
            photoFetcher.fetchNext()
                .then((photos) => {
                    pushPhotosIntoSelect(photos, select);
                }, errorHandler);
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
                photoFetcher.fetchNext()
                    .then((photos) => {
                        pushPhotosIntoSelect(photos, select);
                        $('html, body').animate({
                            scrollTop: divider.offset().top
                        }, 1000);
                    }, errorHandler);
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

    function errorHandler(error) {
        if (response.error.error_code !== undefined && response.error.error_code === 5) {
            chrome.storage.local.remove(VK_ACCESS_TOKEN_STORAGE_KEY, () => {
                location.reload(true);
            });
        } else {
            displayErrors([`Photo fetch error: ${response.error}`]);
        }
    }

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
        const sizePriority = ["w", "z", "y", "x", "m", "s"];
        for (let size of sizePriority) {
            if (photo.sizes[size] !== undefined) {
                link = photo.sizes[size].url;
                break;
            }
        }
        return link;
    }

    function getPhotoThumbnailLink(photo) {
        let link = "";
        const sizePriority = ["x", "m", "s"];
        for (let size of sizePriority) {
            if (photo.sizes[size] !== undefined) {
                link = photo.sizes[size].url;
                break;
            }
        }
        return link;
    }

});