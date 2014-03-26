/* global ymaps */

// TODO wrap ymaps.ready
ymaps.ready(function () {
    function SchemeLayer(scheme) {
        var node;
        SchemeLayer.superclass.constructor.call(this);

        this._scheme = scheme;
        node = this._scheme.getNode();
        ymaps.util.extend(node.style, {
            position: 'absolute',
            margin: 'auto',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0
        });
    }
    ymaps.util.augment(SchemeLayer, ymaps.collection.Item, {
        onAddToMap: function (map) {
            var ymapsSchemeLayer, node;
            SchemeLayer.superclass.onAddToMap.call(this, map);

            ymapsSchemeLayer = document.createElement('div');
            ymapsSchemeLayer.className = 'ymaps-scheme-layer';
            ymapsSchemeLayer.appendChild(this._scheme.getNode());

            this._pane = this.options.get('pane', map.panes.get('ground'));
            this._pane.events.add('zoomchange', function () {
                console.log('zoomchange');
            });
            node = this._pane.getElement();
            node.style.width = '100%';
            node.style.height = '100%';
            node.appendChild(ymapsSchemeLayer);
            this._scale = this._calculateFitScale();
            this.update();
        },
        _calculateFitScale: function () {
            var metadata = this._scheme.getMetaData(),
                paneNode = this._pane.getElement();

            return Math.min(
                paneNode.clientWidth / metadata.width,
                paneNode.clientHeight / metadata.height
            );
        },
        update: function () {
            var node = this._scheme.getNode(),
                metadata = this._scheme.getMetaData();

            ymaps.util.extend(node.style, {
                width: this._scale * metadata.width + 'px',
                height: this._scale * metadata.height + 'px',
            });
            this._scheme.setScale(this._scale);
        },
        getPane: function () {
            return this._pane;
        }
    });

    function Scheme(node) {
        this._node = node;
        this._scale = 1;
    }
    Scheme.prototype = {
        getMetaData: function () {
            var metadataNode;

            if (!this._metadata) {
                metadataNode = this._node.getElementsByTagName('metadata')[0];
                this._metadata = JSON.parse(metadataNode.firstChild.data);

                this._node.removeChild(metadataNode);
            }

            return this._metadata;
        },
        getNode: function () {
            return this._node;
        },
        getTransform: function () {
            if (!this._transform) {
                this._transform = this._node.getElementById('transform-wrapper').transform.baseVal.getItem(0);
            }
            return this._transform;
        },
        setScale: function (scale) {
            this._scale = scale;
            this.getTransform().setScale(scale, scale);
        }
    };
    Scheme.DEFAULT_SCHEMES = [
        {
            id: 1,
            defaultLang: 'ru',
            alias: 'moscow',
            mapId: 2000,
            regionId: 213,
            parentRegionId: 1,
            localizedNames: {
                ru: 'Москва',
                en: 'Moscow'
            },
        },
        {
            id: 2,
            defaultLang: 'ru',
            alias: 'spb',
            mapId: 500,
            regionId: 2,
            parentRegionId: 10174,
            localizedNames: {
                ru: 'Санкт-Петербург',
                en: 'Saint Petersburg'
            }
        },
        {
            id: 8,
            defaultLang: 'ukr',
            alias: 'kiev',
            mapId: 1600,
            regionId: 143,
            parentRegionId: 20544,
            localizedNames: {
                ukr: 'Київ',
                ru: 'Киев',
                en: 'Kiev'
            }
        },
        {
            id: 9,
            defaultLang: 'ukr',
            alias: 'kharkov',
            mapId: 2500,
            regionId: 147,
            parentRegionId: 20538,
            localizedNames: {
                ukr: 'Харків',
                ru: 'Харьков',
                en: 'Kharkiv'
            }
        },
        {
            id: 13,
            defaultLang: 'bel',
            alias: 'minsk',
            mapId: 157,
            regionId: 157,
            parentRegionId: 29630,
            localizedNames: {
                bel: 'Мінск',
                ru: 'Минск',
                en: 'Minsk'
            }
        }
    ];
    Scheme.getIdByAlias = function (alias) {
        if (!this._idByAlias) {
            this._idByAlias = this.DEFAULT_SCHEMES.reduce(function (memo, meta) {
                memo[meta.alias] = meta.id;
                return memo;
            }, {});
        }
        return this._idByAlias[alias];
    };

    function TransportMap(city, container, state, options) {
        this._schemeId = Scheme.getIdByAlias(city);
        this._options = ymaps.util.extend({
            path: '/node_modules/metro-data/'
        }, options);

        this._container = container;
        this._map = this._createMap();

        this._loadScheme().then(function (node) {
            this._scheme = new Scheme(node);

            this._map.layers.add(new SchemeLayer(this._scheme));

            return this;
        }.bind(this));
    }
    TransportMap.prototype = {
        getSchemeId: function () {
            return this._schemeId;
        },
        _loadScheme: function () {
            var domParser, node,
                xhr = new XMLHttpRequest(),
                deferred = new ymaps.vow.Deferred();

            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200)  {
                        domParser = new window.DOMParser();
                        try {
                            node = domParser.parseFromString(xhr.responseText, "text/xml");
                            deferred.resolve(node.firstChild);
                        } catch (e) {
                            deferred.reject(e);
                        }
                    } else {
                        deferred.reject(xhr.status);
                    }
                }
            };
            xhr.onerror = function (e) {
                deferred.reject(e);
            };
            xhr.open('GET', this._options.path + this._schemeId + '.ru.svg', true);
            xhr.send(null);

            return deferred.promise();
        },
        // TODO dummy map
        _createMap: function () {
            return new ymaps.Map(
                this._container,
                {
                    behaviors: ['drag', 'multiTouch'],
                    controls: [],
                    type: null,
                    // the center of the viewport is set in the center of the coordinate system
                    center: {
                        x: 512,
                        y: 512
                    },
                    zoom: 2
                },
                {
                    maxZoom: 3,
                    minZoom: 1,
                    autoFitToViewport: 'always',
                    avoidFractionalZoom: false,
                    // inverted Cartesian projection, so that the beginning of the map coordinate system
                    // matches the beginning of the image coordinate system
                    projection: new ymaps.projection.Cartesian([
                        [1024, 0],
                        [0, 1024]
                    ])
                }
            );
        },
    };

    ymaps.createTransportMap = function (alias, container) {
        var deferred = new ymaps.vow.Deferred();

        ymaps.ready(function () {
            deferred.resolve(new TransportMap(alias, container));
        });

        return deferred.promise();
    };
});
