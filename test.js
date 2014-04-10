/* global chai, ymaps, mocha, describe, it, mochaPhantomJS */
ymaps.ready(function () {
    var expect = chai.expect,
        mapContainer = document.createElement('div');

    mapContainer.id = 'mapContainer';
    mapContainer.style.width = '512px';
    mapContainer.style.height = '512px';
    document.body.appendChild(mapContainer);

    ymaps.createTransportMap('moscow', mapContainer).then(function (transportMap) {
        transportMap.stations.select([1, 2, 3, 4, 182]);
        transportMap.stations.getSelection();
        transportMap.stations.deselect([182]);
    }).done();

    chai.should();
    mocha.setup('bdd');

    function randomDecimal(min, max) {
        return min + Math.floor(Math.random() * (max - min));
    }
    function randomUniqueDecimals(minLength, maxLength, minValue, maxValue) {
        var array = [], runner, id;

        for (runner = randomDecimal(minLength, maxLength); runner; runner--) {
            id = randomDecimal(minValue, maxValue);
            if (array.indexOf(id) === -1) {
                array.push(id);
            }
        }

        return array;
    }

    chai.Assertion.addMethod('equalAsSets', function (otherArray) {
        var array = this._obj;

        expect(array).to.be.an.instanceOf(Array);
        expect(otherArray).to.be.an.instanceOf(Array);
        expect(array.length).to.equal(otherArray.length);

        this.assert(
            array.every(function (elem) {return ~otherArray.indexOf(elem); }),
            "expected #{this} to be equal to #{exp} (as sets, i.e. no order)",
            array,
            otherArray
        );
    });

    if (!Function.prototype.bind) {
        Function.prototype.bind = function (oThis) {
            if (typeof this !== "function") {
                // closest thing possible to the ECMAScript 5 internal IsCallable function
                throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
            }

            var aArgs = Array.prototype.slice.call(arguments, 1),
                fToBind = this,
                FNop = function () {},
                fBound = function () {
                    return fToBind.apply(this instanceof FNop && oThis
                        ? this
                        : oThis,
                        aArgs.concat(Array.prototype.slice.call(arguments)));
                };

            FNop.prototype = this.prototype;
            fBound.prototype = new FNop();

            return fBound;
        };
    }

    describe('createTransportMap', function () {
        it('should exist', function () {
            ymaps.should.have.property('createTransportMap');
            ymaps.createTransportMap.should.be.a('function');
        });
        it('should be a function', function () {
            ymaps.createTransportMap.should.be.a('function');
        });
    });

    describe('TransportMap constructor', function () {
        it('city alias should be supported', function () {
            return ymaps.vow.all([
                ymaps.createTransportMap('moscow', mapContainer),
                ymaps.createTransportMap('minsk', mapContainer)
            ]).spread(function (transportMap1, transportMap2) {
                expect(transportMap1.getSchemeId()).not.to.equal(transportMap2.getSchemeId());

                transportMap1.destroy();
                transportMap2.destroy();
            });
        });
        it('should accept container id', function () {
            return ymaps.createTransportMap('moscow', 'mapContainer', {
            }).then(function (transportMap) {
                expect(mapContainer.firstChild).to.be.an('object');
                transportMap.destroy();
            });
        });
        it('should accept container element', function () {
            return ymaps.createTransportMap('moscow', mapContainer, {
            }).then(function (transportMap) {
                expect(mapContainer.firstChild).to.be.an('object');
                transportMap.destroy();
            });
        });
        it('should center scheme by default', function () {
            return ymaps.createTransportMap('moscow', mapContainer, {
            }).then(function (transportMap) {
                expect(transportMap.getCenter).to.be.an('function');
                expect(transportMap.getCenter()).to.deep.equal([0, 0]);
                transportMap.destroy();
            });
        });
        it('should accept center coordinates', function () {
            var point = [0.1, 0.1];

            return ymaps.createTransportMap('moscow', mapContainer, {
                center: point
            }).then(function (transportMap) {
                expect(transportMap.getCenter).to.be.an('function');
                expect(transportMap.getCenter()).to.deep.equal(point);
                transportMap.destroy();
            });
        });
        it('should accept fractional zoom', function () {
            var initialZoom = 1.3;

            return ymaps.createTransportMap('moscow', mapContainer, {
                zoom: initialZoom
            }).then(function (transportMap) {
                expect(transportMap.getZoom).to.be.an('function');
                expect(transportMap.getZoom()).to.equal(initialZoom);
                transportMap.destroy();
            });
        });
        it('should fit container if a zoom ommited', function () {
            return ymaps.createTransportMap('moscow', mapContainer, {
            }).then(function (transportMap) {
                expect(transportMap.getZoom).to.be.an('function');
                // container is 512x512 and a tile without zoom is 256x256
                // so zoom must equal "1" o fit it
                expect(transportMap.getZoom()).to.equal(1);
                transportMap.destroy();
            });
        });

        it('should follow shade property', function () {
            // TODO How to draw an SVGElement into canvas?
        });
        it('should accept selection property', function () {
            var initialSelection = randomUniqueDecimals(1, 10, 1, 20);

            return ymaps.createTransportMap('spb', mapContainer, {
                selection: initialSelection
            }).then(function (transportMap) {
                expect(transportMap.stations.getSelection()).to.equalAsSets(initialSelection);
                transportMap.destroy();
            });
        });
    });

    describe('TransportMap instance', function () {
        it('should implement getCenter', function () {
            var point = [0.1, 0.1];

            return ymaps.createTransportMap('moscow', mapContainer, {
                center: point
            }).then(function (transportMap) {
                expect(transportMap.getCenter(point)).to.deep.equal(point);
                transportMap.destroy();
            });
        });
        it('should implement setCenter', function () {
            var point = [0.1, 0.1];

            return ymaps.createTransportMap('moscow', mapContainer, {
            }).then(function (transportMap) {
                expect(transportMap.setCenter(point)).to.be.an.instanceof(ymaps.vow.Promise);

                transportMap.setCenter(point).then(function () {
                    expect(transportMap.getCenter()).to.deep.equal(point);
                });
                transportMap.destroy();
            });
        });
        it('should implement getZoom', function () {
            var initialZoom = 2.5;

            return ymaps.createTransportMap('moscow', mapContainer, {
                zoom: initialZoom
            }).then(function (transportMap) {
                expect(transportMap.getZoom()).to.equal(initialZoom);
                transportMap.destroy();
            });
        });
        it('should implement setZoom', function () {
            var zoom = 2;

            return ymaps.createTransportMap('moscow', mapContainer, {
            }).then(function (transportMap) {
                expect(transportMap.setZoom(zoom)).to.be.an.instanceof(ymaps.vow.Promise);
                transportMap.setZoom(zoom).then(function () {
                    expect(transportMap.getZoom()).to.equal(zoom);
                });

                transportMap.destroy();
            });
        });
        it('should have "stations" property', function () {
            return ymaps.createTransportMap('moscow', mapContainer, {
            }).then(function (transportMap) {
                expect(transportMap).to.have.a.property('stations');
                expect(transportMap.stations).to.be.an('object');

                transportMap.destroy();
            });
        });

    });

    describe('StationCollection instance', function () {
        it('should have an EventManager', function () {
            return ymaps.createTransportMap('moscow', mapContainer, {
            }).then(function (transportMap) {
                expect(transportMap.stations).to.have.a.property('events');
                expect(transportMap.stations.events).to.be.instanceOf(ymaps.event.Manager);

                transportMap.destroy();
            });
        });
        it('should fire "selectionchange" event on select', function (done) {
            ymaps.createTransportMap('moscow', mapContainer).then(function (transportMap) {
                transportMap.stations.events.add('selectionchange', function (e) {
                    expect(e.get('type')).to.equal('select');
                    done();
                });
                transportMap.stations.select([1]);
            }).done();
        });
        it('should fire "selectionchange" event on deselect', function (done) {
            ymaps.createTransportMap('moscow', mapContainer).then(function (transportMap) {
                transportMap.stations.events.add('selectionchange', function (e) {
                    expect(e.get('type')).to.equal('deselect');
                    done();
                });
                transportMap.stations.deselect([4]);
            }).done();
        });
        it('should implement getSelection', function () {
            var initialSelection = randomUniqueDecimals(1, 10, 1, 10);

            return ymaps.createTransportMap('moscow', mapContainer, {
                selection: initialSelection
            }).then(function (transportMap) {
                expect(transportMap.stations).to.respondTo('getSelection');
                expect(transportMap.stations.getSelection()).to.equalAsSets(initialSelection);

                transportMap.destroy();
            });
        });
        it('should implement select', function () {
            return ymaps.createTransportMap('kharkov', mapContainer, {
            }).then(function (transportMap) {
                var selection = randomUniqueDecimals(1, 10, 1, 20);

                expect(transportMap.stations).to.respondTo('select');
                transportMap.stations.select(selection);
                expect(transportMap.stations.getSelection()).to.equalAsSets(selection);

                transportMap.destroy();
            });
        });
        it('should implement deselect', function () {
            var deselection = randomUniqueDecimals(1, 4, 1, 10);

            return ymaps.createTransportMap('moscow', mapContainer, {
                selection: randomUniqueDecimals(1, 10, 1, 10)
            }).then(function (transportMap) {
                expect(transportMap.stations).to.respondTo('deselect');

                transportMap.stations.deselect(deselection);
                expect(transportMap.stations.getSelection()).to.not.have.members(deselection);
                transportMap.destroy();
            });
        });
        it('should implement each', function () {
            var initialSelection = randomUniqueDecimals(1, 10, 1, 10);

            return ymaps.createTransportMap('moscow', mapContainer, {
                selection: initialSelection
            }).then(function (transportMap) {
                expect(transportMap.stations).to.respondTo('each');

                transportMap.stations.each(function (station) {
                    expect(station).to.be.an('object');
                });

                transportMap.destroy();
            });
        });
    });
    describe('Station instance', function () {
        it('should have "code" property', function () {
            var initialSelection = randomUniqueDecimals(1, 10, 1, 10);

            return ymaps.createTransportMap('moscow', mapContainer, {
                selection: initialSelection
            }).then(function (transportMap) {
                transportMap.stations.each(function (station) {
                    expect(station).to.have.property('code');
                });

                transportMap.destroy();
            });
        });
        it('should have "title" property', function () {
            var initialSelection = randomUniqueDecimals(1, 10, 1, 10);

            return ymaps.createTransportMap('moscow', mapContainer, {
                selection: initialSelection
            }).then(function (transportMap) {
                transportMap.stations.each(function (station) {
                    expect(station).to.have.property('title');
                });

                transportMap.destroy();
            });
        });
    });

    if (window.mochaPhantomJS) {
        mochaPhantomJS.run();
    } else {
        mocha.run();
    }
});
