(function () {
    'use strict';

    if (window.lumio_addon_plugin_started) return;
    window.lumio_addon_plugin_started = true;

    var ADDON_VERSION = '1.1.0';
    var ADDON_TITLE   = 'Lumio Addon (AniLibria + AniLibria Top + Kodik)';

    console.log('[Lumio Addon]', 'Initializing version', ADDON_VERSION);

    /**
     * Форматирование карточки в стиле Lumio Prestige UI
     */
    function renderPrestigeItem(params) {
        var title = params.title || 'Без названия';
        var time  = params.time || '';
        var info  = params.info || '';
        var badge = params.badge || 'HD';
        var img   = params.img || '';

        var html = '<div class="lumio-prestige lumio-prestige--folder selector">' +
            '<div class="lumio-prestige__glow"></div>' +
            '<div class="lumio-prestige__media ' + (img ? 'lumio-prestige__media--poster' : 'lumio-prestige__media--voice') + '" style="' + (img ? 'background-image:url(' + img + ')' : '') + '">' +
                '<div class="lumio-prestige__logo"></div>' +
            '</div>' +
            '<div class="lumio-prestige__body">' +
                '<div class="lumio-prestige__head">' +
                    '<div class="lumio-prestige__title">' + title + '</div>' +
                    '<div class="lumio-prestige__time">' + time + '</div>' +
                '</div>' +
                '<div class="lumio-prestige__footer">' +
                    '<div class="lumio-prestige__info">' + info + '</div>' +
                    '<div class="lumio-prestige__badge nexus-badge--hd">' + badge + '</div>' +
                '</div>' +
            '</div>' +
        '</div>';

        return $(html);
    }

    /**
     * Провайдер 1: AniLibria (Основной поиск по Анилибрии)
     */
    var AniLibriaProvider = {
        name: 'anilibria',
        title: 'AniLibria (Аниме)',
        search: function (movie, callback, error) {
            var title = movie.title || movie.name || movie.original_title || '';
            if (!title) return error({ msg: 'Название контента не указано' });

            var cleanTitle = title.replace(/[\s:—\-+]+/g, ' ').trim();
            var url = 'https://api.anilibria.tv/v3/title/search?search=' + encodeURIComponent(cleanTitle) + '&limit=5';

            var network = new Lampa.Reguest();
            network.timeout(10000);
            network.native(url, function (json) {
                if (json && json.length) {
                    var item = json[0];
                    var seasons = {};

                    if (item.player && item.player.list) {
                        var episodeList = item.player.list;
                        var epKeys = Object.keys(episodeList);

                        epKeys.forEach(function (epNum) {
                            var epData = episodeList[epNum];
                            var hls = epData.hls || {};
                            var streamUrl = hls.fhd || hls.hd || hls.sd || '';

                            if (streamUrl) {
                                if (streamUrl.indexOf('http') !== 0) {
                                    streamUrl = 'https://' + (item.player.host || 'cache.libria.fun') + streamUrl;
                                }

                                if (!seasons[1]) seasons[1] = [];

                                seasons[1].push({
                                    title: 'Серия ' + epNum + (epData.name ? ' — ' + epData.name : ''),
                                    episode: parseInt(epNum, 10),
                                    url: streamUrl,
                                    quality: hls.fhd ? 'FHD 1080p' : 'HD 720p',
                                    poster: item.posters && item.posters.original ? ('https://anilibria.tv' + item.posters.original.url) : ''
                                });
                            }
                        });
                    }

                    callback({
                        balanser: 'anilibria',
                        name: 'AniLibria',
                        title: item.names ? (item.names.ru || item.names.en) : item.name,
                        poster: item.posters && item.posters.original ? ('https://anilibria.tv' + item.posters.original.url) : '',
                        seasons: seasons,
                        is_serial: Object.keys(seasons).length > 0
                    });
                } else {
                    error({ msg: 'Аниме на AniLibria не найдено' });
                }
            }, function () {
                error({ msg: 'Ошибка сети AniLibria' });
            });
        }
    };

    /**
     * Провайдер 2: AniLibria Top (Топ и свежие обновления Анилибрии)
     */
    var AniLibriaTopProvider = {
        name: 'anilibria_top',
        title: 'AniLibria Top (Топ Релизы)',
        search: function (movie, callback, error) {
            var url = 'https://api.anilibria.tv/v3/title/updates?limit=10';

            var network = new Lampa.Reguest();
            network.timeout(10000);
            network.native(url, function (json) {
                if (json && json.length) {
                    var item = json[0];
                    var seasons = {};

                    if (item.player && item.player.list) {
                        var episodeList = item.player.list;
                        var epKeys = Object.keys(episodeList);

                        epKeys.forEach(function (epNum) {
                            var epData = episodeList[epNum];
                            var hls = epData.hls || {};
                            var streamUrl = hls.fhd || hls.hd || hls.sd || '';

                            if (streamUrl) {
                                if (streamUrl.indexOf('http') !== 0) {
                                    streamUrl = 'https://' + (item.player.host || 'cache.libria.fun') + streamUrl;
                                }

                                if (!seasons[1]) seasons[1] = [];

                                seasons[1].push({
                                    title: 'Серия ' + epNum + (epData.name ? ' — ' + epData.name : ''),
                                    episode: parseInt(epNum, 10),
                                    url: streamUrl,
                                    quality: 'Top HD 1080p',
                                    poster: item.posters && item.posters.original ? ('https://anilibria.tv' + item.posters.original.url) : ''
                                });
                            }
                        });
                    }

                    callback({
                        balanser: 'anilibria_top',
                        name: 'AniLibria Top',
                        title: item.names ? (item.names.ru || item.names.en) : item.name,
                        poster: item.posters && item.posters.original ? ('https://anilibria.tv' + item.posters.original.url) : '',
                        seasons: seasons,
                        is_serial: Object.keys(seasons).length > 0
                    });
                } else {
                    error({ msg: 'AniLibria Top временно недоступен' });
                }
            }, function () {
                error({ msg: 'Ошибка запроса к AniLibria Top' });
            });
        }
    };

    /**
     * Провайдер 3: Kodik
     */
    var KodikProvider = {
        name: 'kodik',
        title: 'Kodik (Сериалы/Дорамы)',
        token: 'qWfKXLc1ajId',
        search: function (movie, callback, error) {
            var kp_id = movie.kinopoisk_id || (movie.ids && movie.ids.kp);
            var imdb_id = movie.imdb_id;
            var title = movie.title || movie.name;

            var params = 'token=' + this.token + '&limit=10&with_episodes=true';
            if (kp_id) params += '&kinopoisk_id=' + encodeURIComponent(kp_id);
            else if (imdb_id) params += '&imdb_id=' + encodeURIComponent(imdb_id);
            else params += '&title=' + encodeURIComponent(title);

            var url = 'https://kodik-api.com/search?' + params;

            var network = new Lampa.Reguest();
            network.timeout(10000);
            network.native(url, function (json) {
                if (json && json.results && json.results.length) {
                    var res = json.results[0];
                    var seasons = {};

                    if (res.seasons) {
                        Object.keys(res.seasons).forEach(function (sNum) {
                            var seasonData = res.seasons[sNum];
                            if (seasonData && seasonData.episodes) {
                                seasons[sNum] = [];
                                Object.keys(seasonData.episodes).forEach(function (epNum) {
                                    var link = seasonData.episodes[epNum];
                                    seasons[sNum].push({
                                        title: 'Серия ' + epNum,
                                        episode: parseInt(epNum, 10),
                                        url: link.indexOf('//') === 0 ? ('https:' + link) : link,
                                        quality: 'HD'
                                    });
                                });
                            }
                        });
                    }

                    callback({
                        balanser: 'kodik',
                        name: 'Kodik',
                        title: res.title || res.title_orig,
                        translation: res.translation ? res.translation.title : 'Оригинал',
                        seasons: seasons,
                        is_serial: Object.keys(seasons).length > 0
                    });
                } else {
                    error({ msg: 'Kodik контент не найден' });
                }
            }, function () {
                error({ msg: 'Ошибка Kodik API' });
            });
        }
    };

    /**
     * Внедрение в Lumio Component
     */
    function patchLumioComponent() {
        var originalComponent = Lampa.Component.get('nexusonline');
        if (!originalComponent || originalComponent.__lumio_addon_v11_patched) return;

        console.log('[Lumio Addon]', 'Patching nexusonline component for AniLibria, AniLibria Top & Kodik');

        var WrappedComponent = function (object) {
            var instance = new originalComponent(object);
            var origCreateSource = instance.createSource;

            instance.createSource = function (attempt) {
                var _this = this;

                if (origCreateSource) origCreateSource.call(this, attempt);

                if (object && object.movie) {
                    // Загружаем AniLibria
                    AniLibriaProvider.search(object.movie, function (data) {
                        if (_this.appendAddonSource) _this.appendAddonSource(data);
                    }, function () {});

                    // Загружаем AniLibria Top
                    AniLibriaTopProvider.search(object.movie, function (data) {
                        if (_this.appendAddonSource) _this.appendAddonSource(data);
                    }, function () {});

                    // Загружаем Kodik
                    KodikProvider.search(object.movie, function (data) {
                        if (_this.appendAddonSource) _this.appendAddonSource(data);
                    }, function () {});
                }
            };

            instance.appendAddonSource = function (sourceData) {
                try {
                    if (this.sources) {
                        this.sources[sourceData.balanser] = {
                            name: sourceData.name + (sourceData.translation ? ' (' + sourceData.translation + ')' : ''),
                            url: sourceData.raw_link || '',
                            addon_data: sourceData
                        };
                    }

                    if (this.updateSourceFilter) {
                        this.updateSourceFilter();
                    }
                } catch (e) {
                    console.error('[Lumio Addon]', 'appendAddonSource error:', e);
                }
            };

            return instance;
        };

        WrappedComponent.__lumio_addon_v11_patched = true;
        Lampa.Component.add('nexusonline', WrappedComponent);
    }

    if (Lampa.Listener && Lampa.Listener.follow) {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') {
                setTimeout(patchLumioComponent, 500);
                setTimeout(patchLumioComponent, 2000);
            }
        });

        Lampa.Listener.follow('full', function (e) {
            setTimeout(patchLumioComponent, 100);
        });
    }

    setTimeout(patchLumioComponent, 1000);

})();
