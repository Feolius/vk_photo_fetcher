/**
 * @typedef {Object} Error
 * @property {?number} error_code
 * @property {?string} error_msg
 */
const VK_ACCESS_TOKEN_STORAGE_KEY = 'pf_vkaccess_token';
$(function () {
    "use strict";
    initLayout();
    const urlParser = new URL(window.location.href);
    const chatId = urlParser.searchParams.get("chatId");
    const photoStorage = {};

    class PhotoFetcher {
        constructor() {
            this._nextFrom = "";
        }

        fetchNext() {
            return new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: "fetchPhotoAttachments",
                    chatId: chatId,
                    nextFrom: this._nextFrom
                }, (response) => {
                    if (response.error !== undefined) {
                        reject(response.error);
                    } else if (response.result !== undefined) {
                        const photos = [];
                        for (let item of response.result.items) {
                            const photo = item.attachment.photo;
                            // Add photo only if it was not added before. Duplicates can be here due to messages reposts.
                            if (photoStorage[photo.id] === undefined) {
                                // Make sizes accessible by keys.
                                const originalSizes = photo.sizes.slice();
                                const sizes = {};
                                for (let size of originalSizes) {
                                    sizes[size.type] = size;
                                }
                                photo.sizes = sizes;
                                photos.push(photo);
                                photoStorage[photo.id] = photo;
                            }
                        }
                        // Undefined next_from means that there is no more photos to download.
                        this._nextFrom = response.result.next_from !== undefined ? response.result.next_from : "";
                        resolve(photos);
                    }
                });
            });
        }
    }

    class PhotosDisplayHandler {
        constructor(container) {
            this._container = container;
            // Store info about currently selected photos grouped by date.
            this._dayBlocksSelected = {};
            // Store info about all photos inside container grouped by date. Why map? Because order is important!
            this._dayBlocks = new Map();
            // Array of subscribers to notify about changes in photos selection.
            this._onSelectPhotoObservers = [];
        }

        addPhotos(photos) {
            let isFirstCall = false;
            if (this._dayBlocks.size === 0) {
                isFirstCall = true;
            }
            const dayBlocks = new Map();
            for (let photo of photos) {
                const dateStr = PhotosDisplayHandler.getDayBlockKey(photo);
                if (!dayBlocks.has(dateStr)) {
                    dayBlocks.set(dateStr, []);
                }
                dayBlocks.get(dateStr).push(photo);
            }
            this._mergeDayBlocks(dayBlocks);

            // Remove first day block container if exists to avoid merged photos conflicts or duplicates.
            const firstDayBlockDate = dayBlocks.keys().next().value;
            $(`#day-block-${firstDayBlockDate}`).remove();

            const selectTag = '<select multiple="multiple" class="image-picker photo-select">';
            for (let dayBlockKey of dayBlocks.keys()) {
                const dayBlockWrapper = $(`<div id="day-block-${dayBlockKey}" class="day-block"></div>`);
                const dayBlockDate = $(`<div class="day-block-date">${PhotosDisplayHandler.getDayBlockLabelByKey(dayBlockKey)}</div>`);
                dayBlockWrapper.append(dayBlockDate);
                const select = $(selectTag);
                dayBlockWrapper.append(select);
                for (let photo of dayBlocks.get(dayBlockKey)) {
                    const thumbLink = PhotosDisplayHandler.getPhotoThumbnailLink(photo);
                    if (thumbLink !== "") {
                        select.append('<option data-img-src="' + thumbLink + '" value="' + photo.id + '">Option' + photo.id + '</option>');
                    }
                }
                this._container.append(dayBlockWrapper);
                select.imagepicker({
                    changed: (oldPhotoIds, newPhotoIds) => {
                        this._imagepickerOnChanged(oldPhotoIds, newPhotoIds);
                    }
                });
            }
            if (!isFirstCall) {
                $('html, body').animate({
                    scrollTop: $(`#day-block-${firstDayBlockDate}`).offset().top
                }, 1000);
            }
        }

        _imagepickerOnChanged(oldPhotoIds, newPhotoIds) {
            const addedPhotoIds = newPhotoIds.filter((photoId) => oldPhotoIds.indexOf(photoId) < 0);
            const removedPhotoIds = oldPhotoIds.filter((photoId) => newPhotoIds.indexOf(photoId) < 0);
            for (let photoId of addedPhotoIds) {
                const photo = photoStorage[photoId];
                this._selectPhoto(photo);
            }
            for (let photoId of removedPhotoIds) {
                const photo = photoStorage[photoId];
                this._deselectPhoto(photo);
            }
        }

        _selectPhoto(photo) {
            const dayBlockKey = PhotosDisplayHandler.getDayBlockKey(photo);
            if (this._dayBlocksSelected[dayBlockKey] === undefined) {
                this._dayBlocksSelected[dayBlockKey] = {};
            }
            this._dayBlocksSelected[dayBlockKey][photo.id] = photo;
            this._notifyOnSelectObservers();
        }

        _deselectPhoto(photo) {
            const dayBlockKey = PhotosDisplayHandler.getDayBlockKey(photo);
            delete this._dayBlocksSelected[dayBlockKey][photo.id];
            this._notifyOnSelectObservers();
        }

        // This method merge new day blocks with existing. Takes care about correct boundary day block merging.
        _mergeDayBlocks(dayBlocks) {
            // First of all, need to check if first key in new map exists in storage map.
            const firstDate = dayBlocks.keys().next().value;
            if (this._dayBlocks.has(firstDate)) {
                // We need to merge boundary photos.
                const mergedPhotos = this._dayBlocks.get(firstDate).concat(dayBlocks.get(firstDate));
                dayBlocks.set(firstDate, mergedPhotos);
            }
            for (let date of dayBlocks.keys()) {
                this._dayBlocks.set(date, dayBlocks.get(date));
            }
        }

        static getDayBlockKey(photo) {
            const date = new Date(photo.date * 1000);
            return `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
        }

        static getDayBlockLabelByKey(dayBlockKey) {
            const dayBlockKeyParts = dayBlockKey.split('-');
            return `${dayBlockKeyParts[2]}.${dayBlockKeyParts[1].toString().padStart(2, "0")}.${dayBlockKeyParts[0].toString().padStart(2, "0")}`;
        }

        getPhotosIdsSelected() {
            const photoIds = [];
            for (let date of Object.keys(this._dayBlocksSelected)) {
                for (let photoId of Object.keys(this._dayBlocksSelected[date])) {
                    photoIds.push(photoId);
                }
            }
            return photoIds;
        }

        selectAll() {
            $('.day-block select option').prop('selected', true);
            $('.day-block select').each((index, selectElement) => {
                $(selectElement).data('picker').sync_picker_with_select();
            });
            this._dayBlocksSelected = {};
            for(let dayBlockKey of this._dayBlocks.keys()) {
                const photos = this._dayBlocks.get(dayBlockKey);
                this._dayBlocksSelected[dayBlockKey] = {};
                for(let photo of photos) {
                    this._dayBlocksSelected[dayBlockKey][photo.id] = photo;
                }
            }
            this._notifyOnSelectObservers();
        }

        deselectAll() {
            $('.day-block select option').prop('selected', false);
            $('.day-block select').each((index, selectElement) => {
                $(selectElement).data('picker').sync_picker_with_select();
            });
            this._dayBlocksSelected = {};
            this._notifyOnSelectObservers();
        }

        static getPhotoThumbnailLink(photo) {
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

        _notifyOnSelectObservers() {
            const photoIdsSelected = this.getPhotosIdsSelected();
            this._onSelectPhotoObservers.forEach((observer) => observer(photoIdsSelected));
        }

        onSelectPhotoSubscribe(fn) {
            this._onSelectPhotoObservers.push(fn);
        }

        onSelectPhotoUnsubscribe(fn) {
            this._onSelectPhotoObservers = this._onSelectPhotoObservers.filter((observer) => observer === fn);
        }
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        const type = request.resultType || "";
        if (type === "auth") {
            if (request.result === "success") {
                location.reload();
            }
            if (type.result === "error") {
                initLayout();
                displayErrors([response.msg]);
            }
        }
    });

    chrome.storage.local.get({[VK_ACCESS_TOKEN_STORAGE_KEY]: {}}, (items) => {
        const imagesContainer = $('.images-container');
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
                    }
                });
            });
            return;
        }
        const displayHandler = new PhotosDisplayHandler(imagesContainer);
        const photoFetcher = new PhotoFetcher();
        photoFetcher.fetchNext()
            .then((photos) => {
                displayHandler.addPhotos(photos);
            }, errorHandler);

        const btnWrapper = $('.btn-wrapper');

        const btnLabelWrapper = $('<div class="btn-label-wrapper">' + chrome.i18n.getMessage("photosCounterLabel") +
            '<span class="photos-chosen-counter">0</span></div>');
        btnWrapper.append(btnLabelWrapper);

        const moreBtn = $('<button type="button" class="btn btn-primary more-btn">' +
            chrome.i18n.getMessage("getMorePhotosBtnTxt") + '</button>');
        btnWrapper.append(moreBtn);
        moreBtn.click(() => {
            photoFetcher.fetchNext()
                .then((photos) => {
                    if (photos.length > 0) {
                        displayHandler.addPhotos(photos);
                    } else {
                        // That means there is no more photos to download.
                        moreBtn.prop("disabled", true);
                        moreBtn.html(chrome.i18n.getMessage("noMorePhotosMsg"));
                    }
                }, errorHandler);
        });

        const folderTxtField = $(`
<span class="label label-default">${chrome.i18n.getMessage("folderLabelTxt")}</span>
<div class="input-group">
    <span class="input-group-addon">${chrome.i18n.getMessage("downloadsFolder")}/</span>
    <input id="downloads-folder" type="text" class="form-control" value="VK-photos" />
</div>`);
        btnWrapper.append(folderTxtField);

        const groupByDateCheckbox = $(`
<div class="checkbox">
  <label>
    <input id="date-group" type="checkbox" value="">
    ${chrome.i18n.getMessage("groupByDateLabel")}
  </label>
</div>`);
        btnWrapper.append(groupByDateCheckbox);
        const downloadBtn = $('<button type="button" class="btn btn-success download-btn" disabled>' +
            chrome.i18n.getMessage("downloadBtnTxt") + '</button>');
        btnWrapper.append(downloadBtn);
        downloadBtn.click(async () => {
            const photoIds = displayHandler.getPhotosIdsSelected();
            const folderParts = $("#downloads-folder").val().split("/").filter((el) => el !== "");
            const groupByDate = $("#date-group").is(":checked");
            for (let photoId of photoIds) {
                const photo = photoStorage[photoId];
                const link = getPhotoBestResolutionLink(photo);
                const fileName = new URL(link).pathname.split("/").slice(-1)[0];
                const filePathParts = [...folderParts];
                if (groupByDate) {
                    const date = new Date(photo.date * 1000);
                    filePathParts.push(
                        `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`
                    );
                }
                filePathParts.push(fileName);
                const filePath = filePathParts.join("/");
                try {
                    await chrome.downloads.download({
                        url: getPhotoBestResolutionLink(photo),
                        filename: filePath
                    });
                } catch (e) {
                    displayErrors([e]);
                    break;
                }
            }
        });

        const selectAllBtn = $('<button type="button" class="btn btn-primary select-all-btn">' +
            chrome.i18n.getMessage("selectAllBtnTxt") + '</button>');
        btnWrapper.append(selectAllBtn);
        selectAllBtn.click(() => {
            displayHandler.selectAll();
        });

        const deselectAllBtn = $('<button type="button" class="btn btn-danger clear-all-btn" disabled>' +
            chrome.i18n.getMessage("deselectAllBtnTxt") + '</button>');
        btnWrapper.append(deselectAllBtn);
        deselectAllBtn.click(() => {
            displayHandler.deselectAll();
        });

        displayHandler.onSelectPhotoSubscribe((photoIdsSelected) => {
            $('.photos-chosen-counter').html(photoIdsSelected.length);
            if (photoIdsSelected.length === 0) {
                downloadBtn.prop("disabled", true);
                deselectAllBtn.prop("disabled", true);
            } else {
                downloadBtn.prop("disabled", false);
                deselectAllBtn.prop("disabled", false);
            }
        });
    });

    /**
     * @param {Error} error
     */
    function errorHandler(error) {
        if (error.error_code !== undefined && error.error_code === 5) {
            chrome.storage.local.remove(VK_ACCESS_TOKEN_STORAGE_KEY, () => {
                location.reload(true);
            });
        } else if (error.error_msg !== undefined) {
            displayErrors([`Error occurred: ${error.error_msg}`]);
        } else {
            displayErrors([`Unexpected error occurred`]);
            console.log(error);
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

});
