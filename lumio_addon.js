(function () {
    'use strict';

    if (window.prestige_online_plugin_started) return;
    window.prestige_online_plugin_started = true;

    var PLUGIN_VERSION = '2.0.0';
    var PLUGIN_TITLE   = 'Lumio Online';
    var COMPONENT_NAME = 'lumio_online';

    // ── 1. Внедрение стилей Lumio Prestige UI ─────────────────────────────
    function injectStyles() {
        if (document.getElementById('lumio-prestige-styles')) return;
        var styleEl = document.createElement('style');
        styleEl.id = 'lumio-prestige-styles';
        styleEl.textContent =
            '.lumio-prestige {' +
                'position: relative;' +
                'overflow: hidden;' +
                'border-radius: .55em;' +
                'background: linear-gradient(110deg, rgba(15,23,42,.76), rgba(7,11,22,.48));' +
                'border: 1px solid rgba(255,255,255,.12);' +
                'box-shadow: 0 .45em 1.2em rgba(0,0,0,.22);' +
                'display: -webkit-box; display: flex;' +
                'min-height: 5.4em;' +
                'margin-bottom: 0.8em;' +
                'cursor: pointer;' +
            '}' +
            '.lumio-prestige__glow {' +
                'position: absolute;' +
                'inset: -45% -10% auto auto;' +
                'width: 12em; height: 12em;' +
                'background: radial-gradient(circle, rgba(18,214,223,.25), rgba(155,92,255,0) 68%);' +
                'pointer-events: none;' +
            '}' +
            '.lumio-prestige__body {' +
                'padding: 1.05em 1.15em;' +
                'line-height: 1.3;' +
                'flex-grow: 1;' +
                'position: relative;' +
                'min-width: 0;' +
            '}' +
            '.lumio-prestige__head, .lumio-prestige__footer {' +
                'display: flex;' +
                'justify-content: space-between;' +
                'align-items: center;' +
                'gap: .8em;' +
            '}' +
            '.lumio-prestige__title {' +
                'font-size: 1.35em;' +
                'font-weight: 600;' +
                'overflow: hidden;' +
                'text-overflow: ellipsis;' +
                'white-space: nowrap;' +
                'color: #fff;' +
            '}' +
            '.lumio-prestige__info {' +
                'font-size: 0.95em;' +
                'color: rgba(255,255,255,.72);' +
                'overflow: hidden;' +
                'text-overflow: ellipsis;' +
                'white-space: nowrap;' +
            '}' +
            '.lumio-prestige__badge {' +
                'font-size: .86em;' +
                'padding: .28em .58em;' +
                'border-radius: .45em;' +
                'background: rgba(18,214,223,.18);' +
                'color: #bdfaff;' +
                'white-space: nowrap;' +
            '}' +
            '.nexus-badge--fhd { background: rgba(155,92,255,.24); color: #e4d4ff; }' +
            '.nexus-badge--hd { background: rgba(34,197,94,.20); color: #9dffc0; }' +
            '.lumio-prestige.focus {' +
                'background: linear-gradient(110deg, rgba(18,214,223,.28), rgba(155,92,255,.30)), rgba(7,11,22,.88);' +
                'border-color: #12d6df;' +
                'box-shadow: 0 0 1.5em rgba(18,214,223,.4);' +
            '}' +
            '.lumio-prestige.focus:after {' +
                'content: "";' +
                'position: absolute;' +
                'inset: -0.22em;' +
                'border-radius: .75em;' +
                'border: solid .2em #fff;' +
                'pointer-events: none;' +
            '}' +
            '.lumio-loader {' +
                'padding: 3em 1em;' +
                'text-align: center;' +
                'color: #fff;' +
                'font-size: 1.4em;' +
            '}';
        document.head.appendChild(styleEl);
    }
    injectStyles();

    // ── 2. Легкие Балансеры без прокси ─────────────────────────────────────
    
    // Провайдер 1: AniLibria (Прямой API)
    function searchAniLibria(movie, callback) {
        var title = (movie.title || movie.name || movie.original_title || '').replace(/[\s:—\-+]+/g, ' ').trim();
        if (!title) return callback([]);

        var url = 'https://api.anilibria.tv/v3/title/search?search=' + encodeURIComponent(title) + '&limit=5';
        new Lampa.Reguest().native(url, function (json) {
            if (json && json.length) {
                var item = json[0];
                var list = item.player && item.player.list || {};
                var eps = [];
                Object.keys(list).forEach(function (ep) {
                    var hls = list[ep].hls || {};
                    var stream = hls.fhd || hls.hd || hls.sd || '';
                    if (stream) {
                        if (stream.indexOf('http') !== 0) stream = 'https://' + (item.player.host || 'cache.libria.fun') + stream;
                        eps.push({
                            title: 'Серия ' + ep + (list[ep].name ? ' — ' + list[ep].name : ''),
                            url: stream,
                            quality: hls.fhd ? 'FHD 1080p' : 'HD 720p',
                            source: 'AniLibria'
                        });
                    }
                });
                return callback(eps);
            }
            callback([]);
        }, function () { callback([]); });
    }

    // Провайдер 2: Kodik (Прямой API)
    function searchKodik(movie, callback) {
        var kp_id = movie.kinopoisk_id || (movie.ids && movie.ids.kp);
        var imdb_id = movie.imdb_id;
        var title = movie.title || movie.name;

        var params = 'token=qWfKXLc1ajId&limit=10&with_episodes=true';
        if (kp_id) params += '&kinopoisk_id=' + encodeURIComponent(kp_id);
        else if (imdb_id) params += '&imdb_id=' + encodeURIComponent(imdb_id);
        else if (title) params += '&title=' + encodeURIComponent(title);
        else return callback([]);

        var url = 'https://kodik-api.com/search?' + params;
        new Lampa.Reguest().native(url, function (json) {
            if (json && json.results && json.results.length) {
                var res = json.results[0];
                var eps = [];
                if (res.seasons) {
                    Object.keys(res.seasons).forEach(function (sNum) {
                        var sObj = res.seasons[sNum];
                        if (sObj && sObj.episodes) {
                            Object.keys(sObj.episodes).forEach(function (eNum) {
                                var link = sObj.episodes[eNum];
                                var direct = link.indexOf('//') === 0 ? ('https:' + link) : link;
                                eps.push({
                                    title: 'Сезон ' + sNum + ', Серия ' + eNum,
                                    url: direct,
                                    quality: 'HD 720p',
                                    source: 'Kodik'
                                });
                            });
                        }
                    });
                }
                return callback(eps);
            }
            callback([]);
        }, function () { callback([]); });
    }

    // ── 3. Компонент интерфейса Lumio Prestige ──────────────────────────────
    function Component(object) {
        var scroll = new Lampa.Scroll({ mask: true, over: true });
        var files = new Lampa.Files();

        this.create = function () {
            var _this = this;
            this.activity.loader(true);

            scroll.minus();
            scroll.body().addClass('torrent-list');
            files.appendFiles(scroll.render());

            this.loadContent();
            return files.render();
        };

        this.loadContent = function () {
            var _this = this;
            var movie = object.movie || {};

            scroll.clear();
            scroll.append($('<div class="lumio-loader">Загрузка серий Lumio...</div>'));

            // Ищем параллельно в AniLibria и Kodik
            searchAniLibria(movie, function (aniEps) {
                searchKodik(movie, function (kodikEps) {
                    var allEps = aniEps.concat(kodikEps);
                    _this.renderEpisodes(allEps);
                });
            });
        };

        this.renderEpisodes = function (episodes) {
            var _this = this;
            scroll.clear();

            if (!episodes || !episodes.length) {
                scroll.append($('<div class="lumio-loader">Видеопотоки не найдены</div>'));
                this.activity.loader(false);
                return;
            }

            episodes.forEach(function (item) {
                var badgeClass = item.quality && item.quality.indexOf('1080p') >= 0 ? 'nexus-badge--fhd' : 'nexus-badge--hd';
                var html =
                    '<div class="lumio-prestige selector">' +
                        '<div class="lumio-prestige__glow"></div>' +
                        '<div class="lumio-prestige__body">' +
                            '<div class="lumio-prestige__head">' +
                                '<div class="lumio-prestige__title">' + item.title + '</div>' +
                            '</div>' +
                            '<div class="lumio-prestige__footer">' +
                                '<div class="lumio-prestige__info">Источник: ' + item.source + '</div>' +
                                '<div class="lumio-prestige__badge ' + badgeClass + '">' + item.quality + '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>';

                var el = $(html);
                el.on('hover:enter', function () {
                    Lampa.Player.play({
                        title: (object.movie.title || object.movie.name) + ' — ' + item.title,
                        url: item.url
                    });
                });

                scroll.append(el);
            });

            this.activity.loader(false);

            if (Lampa.Controller) {
                Lampa.Controller.enable('content');
            }
        };
    }

    // Регистрируем компонент в Лампе
    Lampa.Component.add(COMPONENT_NAME, Component);

    // ── 4. Кнопка "Lumio Online" на карточке фильма/аниме ───────────────────
    var buttonHtml =
        '<div class="full-start__button selector view--online lumio--button">' +
            '<svg class="nexus-logo-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="currentColor">' +
                '<path d="M8 5v14l11-7z"/>' +
            '</svg>' +
            '<span>Lumio Online</span>' +
        '</div>';

    function openLumio(movie) {
        Lampa.Activity.push({
            url: '',
            title: 'Lumio Online',
            component: COMPONENT_NAME,
            movie: movie,
            page: 1
        });
    }

    if (window.Lampa && Lampa.Plugins && Lampa.Plugins.register) {
        try {
            Lampa.Plugins.register({
                type: 'online',
                name: 'Lumio Online',
                description: 'Прямой просмотр AniLibria + Kodik в стиле Lumio Prestige UI',
                icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
                onSelect: function (movie) {
                    openLumio(movie);
                }
            });
        } catch (e) {}
    }

    if (Lampa.Listener && Lampa.Listener.follow) {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite' || e.type === 'build' || e.type === 'render' || e.type === 'start') {
                var scope = (e.object && e.object.activity && e.object.activity.render) ? e.object.activity.render() : ((e.render) ? e.render : $('.full').last());
                if (!scope || !scope.length) return;
                if (scope.find('.lumio--button').length) return;

                var btn = $(buttonHtml);
                btn.on('hover:enter', function () {
                    var movie = e.data && e.data.movie ? e.data.movie : (Lampa.Activity.active() && Lampa.Activity.active().movie);
                    if (movie) openLumio(movie);
                });

                var target = scope.find('.view--torrent').first();
                if (!target.length) target = scope.find('.view--online:not(.lumio--button)').first();
                if (!target.length) target = scope.find('.full-start__button').last();
                if (!target.length) target = scope.find('.full-start__buttons');

                if (target.length) {
                    if (target.hasClass('full-start__buttons')) target.append(btn);
                    else target.after(btn);
                }
            }
        });
    }

})();