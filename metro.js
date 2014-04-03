/* global ymaps */

ymaps.ready(function () {
    /**
     * TransportMap.
     * Instance of this class is exposed to the user
     * through the 'createTransportMap' factory.
     * TransportMap creates a map and inserts SchemeLayer into it.
     *
     * Note: constructor returns a promise, not an instanceof TransportMap
     *
     * @constructor
     *
     * @param {String} city (e.g. 'minsk', 'moscow')
     * @param {Element} container
     * @param {Object} state Todo, is ignored
     * @param {Object} options Todo, is ignored
     */
    function TransportMap(city, container, state, options) {
        var _this = this;

        this._schemeId = this._schemeIdByCity[city];
        this._options = ymaps.util.extend({
            path: 'node_modules/metro-data/',
            minZoom: 0,
            maxZoom: 3
        }, options);
        this._state = ymaps.util.extend({
            zoom: 0,
            center: [0, 0],
            shaded: false,
            selection: []
        }, state);
        if (typeof container === 'string') {
            this._container = document.getElementById(container);
        } else {
            this._container = container;
        }

        //NOTE promise is returned from constructor
        return _this._loadScheme().then(function (node) {
            _this._schemeView = new SchemeView(node);

            _this._map = _this._createMap();
            if (_this._state.shaded) {
                _this.shade();
            }
            _this._map.layers.add(new SchemeLayer(_this._schemeView));

            return _this;
        }, function (e) {throw e; });
    }
    TransportMap.prototype = {
        shade: function () {
            this._schemeView.fadeIn();
        },
        unshade: function () {
            this._schemeView.fadeOut();
        },
        /**
         * Returns coordinates of center in abstract scheme coordinates
         *
         * @returns {Array<Number>}
         */
        getCenter: function () {
            return this._map.getCenter();
        },
        /**
         * Sets coordinates of center.
         * Changing of a center position is async
         *
         * @see http://api.yandex.ru/maps/doc/jsapi/beta/ref/reference/Map.xml#setCenter
         *
         * @param {Array<Number>} center
         * @param {Number} [zoom]
         * @param {Object} [options]
         *
         * @returns {Vow.Promise}
         */
        setCenter: function () {
            return this._map.setCenter.apply(this._map, arguments);
        },
        /**
         * Get a current map zoom
         *
         * @returns {Number}
         */
        getZoom: function () {
            return this._map.getZoom();
        },
        /**
         * Sets new zoom
         *
         * @see http://api.yandex.ru/maps/doc/jsapi/beta/ref/reference/Map.xml#setZoom
         *
         * @param {Number} zoom
         * @param {Object} [options]
         *
         * @returns {Vow.Promise}
         */
        setZoom: function () {
            return this._map.setZoom.apply(this._map, arguments);
        },
        /**
         * @returns {Number}
         */
        getSchemeId: function () {
            return this._schemeId;
        },
        _schemeIdByCity: {
            moscow: 1,
            spb: 2,
            kiev: 8,
            kharkov: 9,
            minsk: 13
        },
        /**
         * Loads an svg scheme
         * and returns promise that provides an SVGElement
         *
         * TODO implement i18n
         *
         * @returns {ymaps.vow.Promise}
         */
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
            //TODO russian locale is hardcoded
            xhr.open('GET', this._options.path + this._schemeId + '.ru.svg', true);
            xhr.send(null);

            return deferred.promise();
        },
        _createMap: function () {
            var SQUARE_SIZE = 1, map;

            map = new ymaps.Map(
                this._container,
                {
                    behaviors: ['drag', 'scrollZoom', 'multiTouch'],
                    controls: [],
                    center: this._state.center,
                    zoom: this._state.zoom
                },
                {
                    minZoom: this._options.minZoom,
                    maxZoom: this._options.maxZoom,
                    autoFitToViewport: 'always',
                    avoidFractionalZoom: false,
                    restrictMapArea: [
                        [-SQUARE_SIZE, SQUARE_SIZE],
                        [SQUARE_SIZE, -SQUARE_SIZE]
                    ],
                    projection: new ymaps.projection.Cartesian([
                        [SQUARE_SIZE, 0],
                        [0, SQUARE_SIZE]
                    ])
                }
            );
            return map;
        },
        destroy: function () {
            this._map.destroy();
        }
    };

    ymaps.createTransportMap = function (alias, container, state, options) {
        return new TransportMap(alias, container, state, options);
    };

    /**
     * Creates a layer with a scheme,
     * that should be added to the map.
     * Proxies events from a map to the SchemeView
     *
     * @constructor
     * @inherits ymaps.collection.Item
     *
     * @param {SchemeView} schemeView
     */
    function SchemeLayer(schemeView) {
        SchemeLayer.superclass.constructor.call(this);

        this._schemeView = schemeView;
        this._centerScheme();
    }
    ymaps.util.augment(SchemeLayer, ymaps.collection.Item, {
        _centerScheme: function () {
            var BOUNDS = '-9999px';

            ymaps.util.extend(this._schemeView.getNode().style, {
                position: 'absolute',
                margin: 'auto',
                top: BOUNDS,
                bottom: BOUNDS,
                left: BOUNDS,
                right: BOUNDS
            });
        },
        /**
         * Translates an image scale into a map zoom
         *
         * @param {Number} zoom
         *
         * @returns {Number}
         */
        getScaleFromZoom: function (zoom) {
            return Math.pow(2, zoom);
        },
        /**
         * Translates a map zoom into an image scale
         *
         * @param {Number} zoom
         *
         * @returns {Number}
         */
        getZoomFromScale: function (scale) {
            return Math.log(scale) * Math.LOG2E;
        },
        /**
         * @override ymaps.collection.Item
         */
        onAddToMap: function (map) {
            var ground;
            SchemeLayer.superclass.onAddToMap.call(this, map);

            // TODO implement map.container "sizechange"
            map.events.add('actiontick', function (e) {
                var tick = e.get('tick');

                this._schemeView.setTranslate(tick.globalPixelCenter);
                this._schemeView.setScale(this.getScaleFromZoom(tick.zoom));
            }.bind(this));

            this._schemeView.setBaseSize.apply(this._schemeView, map.container.getSize());
            this._schemeView.setTranslate(map.getGlobalPixelCenter());
            this._schemeView.setScale(this.getScaleFromZoom(map.getZoom()));

            ground = map.panes.get('ground').getElement();
            ground.parentNode.insertBefore(this._schemeView.getNode(), ground);
        }
    });

    /**
     * View on a scheme image.
     * Responsible for moving and scaling.
     * Contains meta data  from a scheme
     *
     * @constructor
     *
     * @param {SVGElement} scheme Root node of a scheme image
     */
    function SchemeView(node) {
        this._node = node;
        this._baseScale = 1;
        this._relativeScale = 1;
    }
    SchemeView.prototype = {
        fadeOut: function () {
            this._node.getElementById('scheme-layer').style.opacity = '';
        },
        fadeIn: function () {
            this._node.getElementById('scheme-layer').style.opacity = 0.5;
        },
        /*
         * Sets the base size of a scheme image.
         * Scaling will be relative to this size
         * TODO impelement mode
         *
         * @param {Number} width
         * @param {Number} height
         */
        setBaseSize: function (width, height) {
            var metadata = this.getMetaData();

            this._baseScale = Math.min(
                width  / metadata.width,
                height / metadata.height
            );

            this.setScale(this._relativeScale);
        },
        /**
         * Move an image.
         * Relative to the initial position
         *
         * @param {Array} vector An array of dx and dy values
         */
        setTranslate: function (vector) {
            var value = 'translate(' + (-vector[0]) + 'px,' + (-vector[1]) + 'px)';

            ['-webkit-', '-moz-', '-ms-', '-o-', ''].forEach(function (prefix) {
                this._node.style[prefix + 'transform'] = value;
            }, this);
        },
        /**
         * @returns {Object}
         */
        getMetaData: function () {
            var metadataNode;

            if (!this._metadata) {
                metadataNode = this._node.getElementsByTagName('metadata')[0];
                this._metadata = JSON.parse(metadataNode.firstChild.data);

                this._node.removeChild(metadataNode);
            }

            return this._metadata;
        },
        /**
         * @returns {SVGElement}
         */
        getNode: function () {
            return this._node;
        },
        _getTransform: function () {
            if (!this._transform) {
                this._transform = this._node.getElementById('transform-wrapper').transform.baseVal.getItem(0);
            }
            return this._transform;
        },
        /**
         * Scales a scheme image, relative to the base size.
         * Base size is an image size from the metadata.
         * Base size usually is overwrited  by "setBaseSize'
         *
         * @param {Number} relativeScale
         */
        setScale: function (relativeScale) {
            var scale = relativeScale * this._baseScale,
                metadata = this.getMetaData();

            this._relativeScale = relativeScale;
            this._getTransform().setScale(scale, scale);

            ymaps.util.extend(this._node.style, {
                width: (metadata.width * scale) + 'px',
                height: (metadata.height * scale)  + 'px',
            });
        }
    };
});
