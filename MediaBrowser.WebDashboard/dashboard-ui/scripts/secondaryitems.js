﻿define(['libraryBrowser', 'jQuery'], function (libraryBrowser, $) {

    return function (view, params) {

        var data = {};

        function addCurrentItemToQuery(query, item) {

            if (item.Type == "Person") {
                query.PersonIds = item.Id;
            }
            else if (item.Type == "Genre") {
                query.Genres = item.Name;
            }
            else if (item.Type == "MusicGenre") {
                query.Genres = item.Name;
            }
            else if (item.Type == "GameGenre") {
                query.Genres = item.Name;
            }
            else if (item.Type == "Studio") {
                query.StudioIds = item.Id;
            }
            else if (item.Type == "MusicArtist") {
                query.ArtistIds = item.Id;
            } else {
                query.ParentId = item.Id;
            }
        }

        function getQuery(parentItem) {

            var key = getSavedQueryKey();
            var pageData = data[key];

            if (!pageData) {
                pageData = data[key] = {
                    query: {
                        SortBy: "SortName",
                        SortOrder: "Ascending",
                        Recursive: params.recursive !== 'false',
                        Fields: "PrimaryImageAspectRatio,SortName,SyncInfo",
                        ImageTypeLimit: 1,
                        EnableImageTypes: "Primary,Backdrop,Banner,Thumb",
                        StartIndex: 0,
                        Limit: libraryBrowser.getDefaultPageSize()
                    }
                };

                var type = params.type;
                if (type) {
                    pageData.query.IncludeItemTypes = type;

                    if (type == 'Audio') {
                        pageData.query.SortBy = 'Album,SortName';
                    }
                }

                var filters = params.filters;
                if (type) {
                    pageData.query.Filters = filters;
                }

                if (parentItem) {
                    addCurrentItemToQuery(pageData.query, parentItem);
                }

                libraryBrowser.loadSavedQueryValues(key, pageData.query);
            }
            return pageData.query;
        }

        function getSavedQueryKey() {

            return libraryBrowser.getSavedQueryKey();
        }

        function onListItemClick(e) {

            var info = libraryBrowser.getListItemInfo(this);

            if (info.mediaType == 'Photo') {
                var query = getQuery();

                require(['scripts/photos'], function () {
                    Photos.startSlideshow(view, query, info.id);
                });
                return false;
            }
        }

        function reloadItems(parentItem) {

            Dashboard.showLoadingMsg();

            var query = getQuery(parentItem);

            ApiClient.getItems(Dashboard.getCurrentUserId(), query).then(function (result) {

                // Scroll back up so they can see the results from the beginning
                window.scrollTo(0, 0);

                var html = '';
                var pagingHtml = libraryBrowser.getQueryPagingHtml({
                    startIndex: query.StartIndex,
                    limit: query.Limit,
                    totalRecordCount: result.TotalRecordCount,
                    showLimit: false
                });

                view.querySelector('.listTopPaging').innerHTML = pagingHtml;

                if (query.IncludeItemTypes == "Audio") {

                    html = '<div style="max-width:1000px;margin:auto;">' + libraryBrowser.getListViewHtml({
                        items: result.Items,
                        playFromHere: true,
                        defaultAction: 'playallfromhere',
                        smallIcon: true
                    }) + '</div>';

                } else {
                    var posterOptions = {
                        items: result.Items,
                        shape: "auto",
                        centerText: true,
                        lazy: true
                    };

                    if (query.IncludeItemTypes == "MusicAlbum") {
                        posterOptions.overlayText = false;
                        posterOptions.showParentTitle = true;
                        posterOptions.showTitle = true;
                        posterOptions.overlayPlayButton = true;
                    }
                    else if (query.IncludeItemTypes == "MusicArtist") {
                        posterOptions.overlayText = false;
                        posterOptions.overlayPlayButton = true;
                    }
                    else if (query.IncludeItemTypes == "Episode") {
                        posterOptions.overlayText = false;
                        posterOptions.showParentTitle = true;
                        posterOptions.showTitle = true;
                        posterOptions.overlayPlayButton = true;
                    }

                    // Poster
                    html = libraryBrowser.getPosterViewHtml(posterOptions);
                }

                var elem = view.querySelector('#items');
                elem.innerHTML = html + pagingHtml;
                ImageLoader.lazyChildren(elem);

                $('.btnNextPage', view).on('click', function () {
                    query.StartIndex += query.Limit;
                    reloadItems(parentItem);
                });

                $('.btnPreviousPage', view).on('click', function () {
                    query.StartIndex -= query.Limit;
                    reloadItems(parentItem);
                });
                Dashboard.hideLoadingMsg();
            });
        }

        $(view).on('click', '.mediaItem', onListItemClick);

        view.addEventListener('viewbeforeshow', function (e) {
            if (params.parentId) {
                ApiClient.getItem(Dashboard.getCurrentUserId(), params.parentId).then(function (parent) {
                    LibraryMenu.setTitle(parent.Name);

                    reloadItems(parent);
                });
            }

            else {
                reloadItems();
            }
        });
    };


});