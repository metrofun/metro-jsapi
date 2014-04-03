/* global ymaps, mocha, describe, it, expect */
ymaps.ready(function () {
    var assert = chai.assert,
        expect = chai.expect,
        should = chai.should();
    mocha.setup('bdd');

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
        var map = document.createElement('div'), transportMap;

        map.id = 'map';
        map.style.width = '400px';
        map.style.height = '400px';

        document.body.appendChild(map);
        ymaps.createTransportMap('moscow', map);

        it('city alias should be supported', function () {
            return ymaps.vow.all([
                ymaps.createTransportMap('moscow', map),
                ymaps.createTransportMap('minsk', map)
            ]).spread(function (transportMap1, transportMap2) {
                expect(transportMap1.getSchemeId()).not.to.equal(transportMap2.getSchemeId());
                transportMap1.destroy();
                transportMap2.destroy();
            });
        });
        it('should accept container id', function () {
            return ymaps.createTransportMap('moscow', 'map', {
            }).then(function (transportMap) {
                expect(map.firstChild).to.be.an('object');
                transportMap.destroy();
            });
        });
        it('should accept container element', function () {
            return ymaps.createTransportMap('moscow', map, {
            }).then(function (transportMap) {
                expect(map.firstChild).to.be.an('object');
                transportMap.destroy();
            });
        });
        it('should center scheme by default', function () {
            return ymaps.createTransportMap('moscow', map, {
            }).then(function (transportMap) {
                expect(transportMap.getCenter).to.be.an('function');
                expect(transportMap.getCenter()).to.deep.equal([0, 0]);
                transportMap.destroy();
            });
        });
        it('should accept center coordinates', function () {
            var point = [0.1, 0.1];

            return ymaps.createTransportMap('moscow', map, {
                center: point
            }).then(function (transportMap) {
                expect(transportMap.getCenter).to.be.an('function');
                expect(transportMap.getCenter()).to.deep.equal(point);
                transportMap.destroy();
            });
        });
        it('should accept fractional zoom', function () {
            var initialZoom = 1.3;

            return ymaps.createTransportMap('moscow', map, {
                zoom: initialZoom
            }).then(function (transportMap) {
                expect(transportMap.getZoom).to.be.an('function');
                expect(transportMap.getZoom()).to.equal(initialZoom);
                transportMap.destroy();
            });
        });
        it('should follow shade property', function () {
            // TODO How to draw an SVGElement into canvas?
        });
    });

    describe('TransportMap instance', function () {
        it('should implement getCenter', function () {
            var point = [0.1, 0.1];

            return ymaps.createTransportMap('moscow', map, {
                center: point
            }).then(function (transportMap) {
                expect(transportMap.getCenter(point)).to.deep.equal(point);
                transportMap.destroy();
            });
        });
        it('should implement setCenter', function () {
            var point = [0.1, 0.1];

            return ymaps.createTransportMap('moscow', map, {
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

            return ymaps.createTransportMap('moscow', map, {
                zoom: initialZoom
            }).then(function (transportMap) {
                expect(transportMap.getZoom()).to.equal(initialZoom);
                transportMap.destroy();
            });
        });
        it('should implement setZoom', function () {
            var zoom = 2;

            return ymaps.createTransportMap('moscow', map, {
            }).then(function (transportMap) {
                expect(transportMap.setZoom(zoom)).to.be.an.instanceof(ymaps.vow.Promise);

                transportMap.setZoom(zoom).then(function () {
                    expect(transportMap.getZoom()).to.equal(zoom);
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
