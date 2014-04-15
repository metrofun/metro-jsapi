/* global ymaps */

ymaps.ready(function () {
    /**
     * TransportMap.
     * Instance of this class is exposed to the user
     * through the 'createTransportMap' factory.
     * TransportMap creates a map and inserts SchemeLayer into it.
     *
     * Has an EventManager, which is a parent for all Events on maps & stations
     *
     * Exposes "StationCollection" via "stations" property
     *
     *
     * Note: constructor returns a promise, not an instanceof TransportMap
     *
     * @constructor
     *
     * @param {String} city (e.g. 'minsk', 'moscow')
     * @param {Element} container
     * @param {Object} [state]
     * @param {Array<Number>} [state.center] geo point
     * @param {Boolean} [state.shaded] Boolean flag to shade or not a map
     * @param {Array<Number>} [state.selection] List of selected station codes
     * @param {Object} [options]
     * @param {Number} [options.maxZoom]
     * @param {Number} [options.minZoom]
     * @param {String} [options.path] A path to the metro-data
     */
    function TransportMap(city, container, state, options) {
        this._schemeId = this._schemeIdByCity[city];

        this._options = ymaps.util.extend({
            path: 'node_modules/metro-data/',
            minZoom: 0,
            maxZoom: 3
        }, options);
        this._state = ymaps.util.extend({
            center: [0, 0],
            shaded: false,
            selection: []
        }, state);

        if (typeof container === 'string') {
            this._container = document.getElementById(container);
        } else {
            this._container = container;
        }
        if (!this._state.hasOwnProperty('zoom')) {
            this._state.zoom = SchemeLayer.getFitZoom(this._container);
        }

        //NOTE promise is returned from constructor
        return this._loadScheme().then(
            this._onSchemeLoad.bind(this),
            function (e) {
                setTimeout(function () {throw e; });
            }
        );
    }
    TransportMap.prototype = {
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
                    domParser = new window.DOMParser();
                    try {
                        node = domParser.parseFromString(xhr.responseText, "text/xml");
                        deferred.resolve(node.firstChild);
                    } catch (e) {
                        deferred.reject(e);
                    }
                }
            };
            xhr.onerror = function (e) {
                deferred.reject(e);
            };
            //FIXME russian is hardcoded
            xhr.open('GET', this._options.path + this._schemeId + '.ru.svg', true);
            xhr.send(null);

            return deferred.promise();
        },
        _onSchemeLoad: function (node) {
            this._schemeView = new SchemeView(node);
            this._map = this._createMap();
            if (this._state.shaded) {
                this.shade();
            }
            this._map.layers.add(new SchemeLayer(this._schemeView));

            this.stations = new StationCollection(this._schemeView);
            this._map.layers.add(this.stations);
            this.stations.select(this._state.selection);

            // Event manager added
            // Enable event bubbling
            this.events = new ymaps.event.Manager();
            this._map.events.setParent(this.events);
            this.stations.events.setParent(this.events);

            return this;
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
        /**
         * Fades in the map without animation
         */
        shade: function () {
            this._schemeView.fadeIn();
            this.events.fire('shadechange', {type: 'shade', target: this});
        },
        /**
         * Fades out the map without animation
         */
        unshade: function () {
            this._schemeView.fadeOut();
            this.events.fire('shadechange', {type: 'unshade', target: this});
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
    }
    ymaps.util.augment(SchemeLayer, ymaps.collection.Item, {
        /**
         * Init function. Sets everything when layer is added to the map
         *
         * @override ymaps.collection.Item
         */
        onAddToMap: function (map) {
            var ground;
            SchemeLayer.superclass.onAddToMap.call(this, map);

            map.events.add('actiontick', function (e) {
                var tick = e.get('tick');

                this._schemeView.setTranslate(tick.globalPixelCenter);
                this._schemeView.setScale(SchemeLayer.getScaleFromZoom(tick.zoom));
            }.bind(this));

            this._schemeView.setBaseSize(SchemeLayer.SQUARE_SIZE, SchemeLayer.SQUARE_SIZE);
            this._schemeView.setTranslate(map.getGlobalPixelCenter());
            this._schemeView.setScale(SchemeLayer.getScaleFromZoom(map.getZoom()));
            this._centerScheme();

            ground = map.panes.get('ground').getElement();
            ground.parentNode.insertBefore(this._schemeView.getNode(), ground);
        },
        _centerScheme: function () {
            var BOUNDS = -99999;

            ymaps.util.extend(this._schemeView.getNode().style, {
                position: 'absolute',
                margin: 'auto',
                top: BOUNDS + 'px',
                bottom: BOUNDS  + 'px',
                left: BOUNDS  + 'px',
                right: BOUNDS  + 'px'
            });
        }
    });
    /**
     * Calculates zoom to fit layer into the container
     * @param {HTMLElement} containerNode
     *
     * @returns {Number}
     */
    SchemeLayer.getFitZoom = function (containerNode) {
        return this.getZoomFromScale(Math.min(
            containerNode.clientWidth / this.SQUARE_SIZE,
            containerNode.clientHeight / this.SQUARE_SIZE
        ));
    };
    /**
     * Size of the layer with zoom = 0
     *
     * @see http://api.yandex.ru/maps/doc/jsapi/beta/ref/reference/projection.Cartesian.xml
     */
    SchemeLayer.SQUARE_SIZE = 256;
    /**
     * Translates an image scale into a map zoom
     *
     * @param {Number} zoom
     *
     * @returns {Number}
     */
    SchemeLayer.getScaleFromZoom = function (zoom) {
        return Math.pow(2, zoom);
    };
    /**
     * Translates a map zoom into an image scale
     *
     * @param {Number} zoom
     *
     * @returns {Number}
     */
    SchemeLayer.getZoomFromScale = function (scale) {
        return Math.log(scale) * Math.LOG2E;
    };

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
        getWidth: function () {
            var scale = this._relativeScale * this._baseScale,
                metadata = this.getMetaData();

            return metadata.width * scale;
        },
        getHeight: function () {
            var scale = this._relativeScale * this._baseScale,
                metadata = this.getMetaData();

            return metadata.height * scale;
        },
        fadeOut: function () {
            this._node.getElementById('scheme-layer').style.opacity = '';
        },
        fadeIn: function () {
            this._node.getElementById('scheme-layer').style.opacity = 0.5;
        },
        /**
         * Sets the base size of a scheme image.
         * Scaling will be relative to this size
         *
         * For example SchemeLayer is 256x256 by default
         * and moscow svg image is 1080x1040,
         * therefore SchemeLayer need to set a base size
         * ti simplify further scaling
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
         * Returns a scale that fits the scheme into the base size.
         *
         * @returns {Number}
         */
        getBaseScale: function () {
            return this._baseScale;
        },
        /**
         * Move an image.
         * Relative to the initial position
         *
         * @param {Array} vector An array of dx and dy values
         */
        setTranslate: function (vector) {
            var value = 'translate(' + (- vector[0]) + 'px,' + (- vector[1]) + 'px)';

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

    /**
     * Station manager.
     * Responsible for selection/deselection of stations
     *
     * Has an EventManager, which is a parent for all Stations' EventManagers
     *
     * @constructor
     * @inherits ymaps.Collection
     *
     * @param {SchemeView} schemeView
     * @param {ymap.Map} ymap
     */
    function StationCollection(schemeView) {
        StationCollection.superclass.constructor.call(this);

        var code, metadata = schemeView.getMetaData().stations, station;

        this._stationsMap = {};

        for (code in metadata) {
            station = new Station(metadata[code], schemeView);
            // event bubbling
            this._stationsMap[code] = station;
            this.add(station);
            station.events.setParent(this.events);
        }
    }
    ymaps.util.augment(StationCollection, ymaps.Collection, {
        /**
         * Selects  stations by cods
         *
         * @param {Array<Number>|Number} codes
         */
        select: function (codes) {
            [].concat(codes).forEach(function (code) {
                this.getByCode(code).select();
            }, this);
        },
        /**
         * Deselects stations
         *
         * @param {Array<Number>|Number} codes
         */
        deselect: function (codes) {
            [].concat(codes).forEach(function (code) {
                this.getByCode(code).deselect();
            }, this);
        },
        /**
         * Returns codes of all selected stations
         *
         * @returns {Array<Number>}
         */
        getSelection: function () {
            var codes = [];
            // this.stations instanceof StationCollection
            this.each(function (station) {
                if (station.selected) {
                    codes.push(station.code);
                }
            });
            return codes;
        },
        getByCode: function (code) {
            return this._stationsMap[code];
        },
        /**
         * Search stations by words starting with the letters "request"
         *
         * @param {String} request
         *
         * @returns {ymaps.vow.Promise} Resolves to an array of stations
         */
        search: function (request) {
            return new ymaps.vow.fulfill(this.filter(function (station) {
                return station.title.split(' ').some(function (token) {
                    return token.substr(0, request.length) === request;
                });
            }));
        }
    });
    /**
     * Station instance
     * Is exposed via StationCollection#each
     *
     * Has an Event Manager, that fires custom event "selectionchange"
     * For more events please see
     * @see http://api.yandex.ru/maps/doc/jsapi/beta/ref/reference/GeoObject.xml#events-summary
     *
     * @constructor
     * @inherits ymaps.Collection.Item
     *
     * @param {Object} metadata Metadata for the station
     * @param {SchemeView} SchemeView
     * @param {ymap.Map} ymap
     */
    function Station(metadata, schemeView, options) {
        Station.superclass.constructor.call(this, options);

        this.code = metadata.labelId;
        this.title = metadata.name;
        this._schemeView = schemeView;
        this.selected = false;

        this.events.add('click', this._onClick, this);
    }
    ymaps.util.augment(Station, ymaps.collection.Item, {
        /**
         * @override ymaps.collection.Item
         */
        onAddToMap: function () {
            Station.superclass.onAddToMap.apply(this, arguments);

            this._getGeoObjects().forEach(function (geoObject) {
                // event bubbling
                geoObject.events.setParent(this.events);
            }, this);
        },
        _onClick: function () {
            //toggle select
            this[this.selected ? 'deselect':'select']();
        },
        /**
         * Selects current station
         */
        select: function () {
            var rectNode = this.getLabelNode().getElementsByTagName('rect')[0];

            this.selected = true;
            rectNode.style.stroke = '#bbb';
            rectNode.style.opacity = 1;

            this.events.fire('selectionchange', {type: 'select', target: this});
        },
        /**
         * Deselects current station
         */
        deselect: function () {
            var rectNode = this.getLabelNode().getElementsByTagName('rect')[0];

            this.selected = false;
            rectNode.style.stroke = '';
            rectNode.style.opacity = '';

            this.events.fire('selectionchange', {type: 'deselect', target: this});
        },
        _createGeoObject: function (svgNode) {
            var rectangle = new ymaps.Rectangle(
                this._getGeoBBox(svgNode),
                {},
                {fill: true, opacity: 0}
            );
            this.getMap().geoObjects.add(rectangle);
            return rectangle;
        },
        _getGeoObjects: function () {
            if (!this._geoObjects) {
                var svgNodes = [this.getLabelNode()],
                labelMeta = this._schemeView.getMetaData().labels[this.code];

                svgNodes = svgNodes.concat(labelMeta.stationIds.map(function (id) {
                    return this._schemeView.getNode().getElementById('station-' + id);
                }, this));

                this._geoObjects = svgNodes.map(this._createGeoObject, this);
            }
            return this._geoObjects;
        },
        _getGeoBBox: function (svgNode) {
            var globalBBox = svgNode.getBBox(),
                projection = this.getMap().options.get('projection'),
                schemeMeta = this._schemeView.getMetaData(),
                center = {x: schemeMeta.width / 2, y: schemeMeta.height / 2},
                baseZoom = - SchemeLayer.getZoomFromScale(this._schemeView.getBaseScale()),

                topLeftPoint = projection.fromGlobalPixels([
                    globalBBox.x - center.x,
                    globalBBox.y - center.y
                ], baseZoom),
                bottomRightPoint = projection.fromGlobalPixels([
                    globalBBox.x - center.x + globalBBox.width,
                    globalBBox.y - center.y + globalBBox.height
                ], baseZoom);

            return [topLeftPoint, bottomRightPoint];
        },
        /**
         * Non-cacheble getter for label node.
         * Too many labels on the map to cache them all
         *
         * @returns {HTMLElement}
         */
        getLabelNode: function () {
            return this._schemeView.getNode().getElementById('label-' + this.code);
        }
    });
});
