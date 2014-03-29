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

    describe('TransportMap', function () {
        var map = document.createElement('div'), transportMap;

        map.style.width = '900px';
        map.style.height = '900px';

        document.body.appendChild(map);

        it('should have correct scheme id', function () {
            return ymaps.createTransportMap('moscow', map).then(function (transportMap) {
                expect(transportMap.getSchemeId()).to.not.be.an('undefined');
            });
        });
    });


    mocha.checkLeaks();
    mocha.run();
});
